#!/usr/bin/env bash
# Refresh files under app/static/vendor/ to the latest upstream release.
#
# Usage:
#   scripts/update-vendor.sh                    # update everything
#   scripts/update-vendor.sh pdfjs wllama       # update only listed packages
#   scripts/update-vendor.sh wllama --no-compat # skip the wllama-compat bundle
#   scripts/update-vendor.sh --help
#
# Targets: pdfjs tesseract js-yaml xlsx wllama tessdata
#
# Options:
#   --compat 0|1   when the wllama target runs, also refresh the separate
#                  @wllama/wllama-compat fallback bundle (default 1).
#                  --no-compat is shorthand for --compat 0 and leaves the
#                  vendored compat/ files untouched (e.g. when they were
#                  built from source via scripts/build-wllama.sh).
#
# The pinned versions in app/static/vendor/VERSIONS.md are rewritten
# automatically; review the diff (and the smoke tests on a major bump).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="$REPO_ROOT/app/static/vendor"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "missing required tool: $1" >&2; exit 1; }
}
need npm
need node
need curl
need tar

# Whether the wllama target also refreshes the separate @wllama/wllama-compat
# fallback bundle (compat/wllama.{js,wasm}). Toggled by --compat / --no-compat
# in main(); mirrors build-wllama.sh's --build-compat / --no-compat.
WITH_COMPAT=1

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

log() { printf '[update-vendor] %s\n' "$*"; }

# Per-target failure flag. The main loop resets FAIL=0 before invoking
# each updater, runs the updater with `|| true` (so a non-zero exit does
# not trip the outer `set -e`), and inspects FAIL afterwards. Helpers
# like copy_file, pack_pkg, fetch_url set FAIL=1 on error so the loop
# can report which target failed without aborting the whole run.
FAIL=0
mark_fail() { FAIL=1; }

# Summary entries are stored in a file so record_summary calls inside
# updaters survive subprocess boundaries and so we can skip the summary
# line for any target that flipped FAIL.
SUMMARY_FILE="$WORK/summary.tsv"
: > "$SUMMARY_FILE"
record_summary() {
  if [[ ${FAIL:-0} -ne 0 ]]; then return 0; fi
  printf '%s\t%s\n' "$1" "$2" >> "$SUMMARY_FILE"
}

npm_latest() {
  npm view "$1" version 2>/dev/null
}

pack_pkg() {
  local pkg="$1" ver="$2"
  local dir; dir="$WORK/$(printf '%s' "${pkg}-${ver}" | tr '/@' '__')"
  mkdir -p "$dir"
  if ! ( cd "$dir" && npm pack "${pkg}@${ver}" --silent >/dev/null ); then
    log "  ERROR: npm pack failed for ${pkg}@${ver}" >&2
    mark_fail
    return 1
  fi
  local tgz; tgz="$(ls -1 "$dir"/*.tgz 2>/dev/null | head -n1)"
  if [[ -z "$tgz" ]]; then
    log "  ERROR: no tarball produced for ${pkg}@${ver}" >&2
    mark_fail
    return 1
  fi
  if ! tar -xzf "$tgz" -C "$dir"; then
    log "  ERROR: tar -xzf failed for ${tgz}" >&2
    mark_fail
    return 1
  fi
  printf '%s\n' "$dir/package"
}

copy_file() {
  local src="$1" dest="$2"
  if [[ ! -f "$src" ]]; then
    log "  ERROR: missing in tarball: ${src#${WORK}/}" >&2
    mark_fail
    return 1
  fi
  if ! mkdir -p "$(dirname "$dest")"; then
    log "  ERROR: mkdir failed for $(dirname "$dest")" >&2
    mark_fail
    return 1
  fi
  if ! cp "$src" "$dest"; then
    log "  ERROR: cp failed for $dest" >&2
    mark_fail
    return 1
  fi
  log "  wrote ${dest#${REPO_ROOT}/}"
}

fetch_url() {
  local url="$1" dest="$2"
  if ! curl -fsSL "$url" -o "$dest"; then
    log "  ERROR: curl failed for $url" >&2
    mark_fail
    return 1
  fi
  log "  wrote ${dest#${REPO_ROOT}/}"
}

update_pdfjs() {
  local ver; ver="$(npm_latest pdfjs-dist)"
  log "pdfjs-dist -> $ver"
  local pkg; pkg="$(pack_pkg pdfjs-dist "$ver")"
  # v4+ ships ESM only. The consumer loads pdf.min.mjs via dynamic import()
  # and sets GlobalWorkerOptions.workerSrc to pdf.worker.min.mjs; pdfjs spawns
  # the worker with `new Worker(workerSrc, { type: "module" })` internally.
  copy_file "$pkg/build/pdf.min.mjs"        "$VENDOR/pdfjs/pdf.min.mjs"
  copy_file "$pkg/build/pdf.worker.min.mjs" "$VENDOR/pdfjs/pdf.worker.min.mjs"
  record_summary "pdfjs-dist" "$ver"
}

update_tesseract() {
  local ver; ver="$(npm_latest tesseract.js)"
  log "tesseract.js -> $ver"
  local pkg; pkg="$(pack_pkg tesseract.js "$ver")"
  copy_file "$pkg/dist/tesseract.esm.min.js" "$VENDOR/tesseract/tesseract.esm.min.js"
  copy_file "$pkg/dist/worker.min.js"        "$VENDOR/tesseract/worker.min.js"
  # Upstream ships sourceMappingURL trailers but no .map files, so devtools
  # logs a 404 for each. Strip the trailer to silence it.
  sed -i '/^\/\/# sourceMappingURL=/d' \
    "$VENDOR/tesseract/tesseract.esm.min.js" \
    "$VENDOR/tesseract/worker.min.js"
  record_summary "tesseract.js" "$ver"

  # npm's `latest` dist-tag on tesseract.js-core lags behind (currently
  # 6.1.2, missing the relaxed-SIMD wasm), but tesseract.js@7 pins
  # `tesseract.js-core: ^7.0.0` and the worker requests the relaxed-SIMD
  # core that only ships in 7.x. Read the version straight off the
  # worker package's declared dependency range so the two stay in
  # lockstep.
  #
  # `npm view <pkg> dependencies.<key>` parses the key on dots, so a
  # dotted dependency name like `tesseract.js-core` is read as
  # `dependencies -> tesseract -> js-core` and returns empty. Fetch the
  # full dependencies map as JSON and pick the value out with node.
  local crange; crange="$(npm view "tesseract.js@${ver}" --json dependencies 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{process.stdout.write(JSON.parse(s||"{}")["tesseract.js-core"]||"")}catch(e){}})')"
  local cver=""
  if [[ -n "$crange" ]]; then
    # `npm view <pkg>@<range> version --json` returns a JSON string for
    # a single match or an array for multiple; pick the last element.
    cver="$(npm view "tesseract.js-core@${crange}" version --json 2>/dev/null \
      | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{const v=JSON.parse(s||"null");process.stdout.write(Array.isArray(v)?(v[v.length-1]||""):(v||""))}catch(e){}})')"
  fi
  if [[ -z "$cver" ]]; then
    log "  WARNING: could not resolve tesseract.js-core for tesseract.js@${ver}, falling back to npm latest" >&2
    cver="$(npm_latest tesseract.js-core)"
  fi
  log "tesseract.js-core -> $cver"
  local cpkg; cpkg="$(pack_pkg tesseract.js-core "$cver")"
  # Upstream ships the loaders as *.js; the worker calls
  # importScripts('tesseract-core-<variant>.wasm.js'), so rename on copy.
  # All three LSTM variants are shipped: the worker chooses one at runtime
  # via wasm-feature-detect (relaxed SIMD on modern Chrome/Edge, plain
  # SIMD elsewhere, plain LSTM when SIMD is missing).
  copy_file "$cpkg/tesseract-core-relaxedsimd-lstm.wasm" "$VENDOR/tesseract/tesseract-core-relaxedsimd-lstm.wasm"
  copy_file "$cpkg/tesseract-core-relaxedsimd-lstm.js"   "$VENDOR/tesseract/tesseract-core-relaxedsimd-lstm.wasm.js"
  copy_file "$cpkg/tesseract-core-simd-lstm.wasm"        "$VENDOR/tesseract/tesseract-core-simd-lstm.wasm"
  copy_file "$cpkg/tesseract-core-simd-lstm.js"          "$VENDOR/tesseract/tesseract-core-simd-lstm.wasm.js"
  copy_file "$cpkg/tesseract-core-lstm.wasm"             "$VENDOR/tesseract/tesseract-core-lstm.wasm"
  copy_file "$cpkg/tesseract-core-lstm.js"               "$VENDOR/tesseract/tesseract-core-lstm.wasm.js"
  record_summary "tesseract.js-core" "$cver"
}

update_js_yaml() {
  local ver; ver="$(npm_latest js-yaml)"
  log "js-yaml -> $ver"
  local pkg; pkg="$(pack_pkg js-yaml "$ver")"
  copy_file "$pkg/dist/js-yaml.min.js" "$VENDOR/js-yaml/js-yaml.min.js"
  copy_file "$pkg/dist/js-yaml.mjs"    "$VENDOR/js-yaml/js-yaml.mjs"
  copy_file "$pkg/LICENSE"             "$VENDOR/js-yaml/LICENSE"
  record_summary "js-yaml" "$ver"
}

update_xlsx() {
  # SheetJS stopped publishing to npm; the canonical fetch path is the
  # CDN, which serves the current release at xlsx-latest.
  log "xlsx (SheetJS) -> resolving via cdn.sheetjs.com/xlsx-latest"
  mkdir -p "$VENDOR/xlsx"
  # Resolve the concrete release behind xlsx-latest by reading the
  # channel's package.json. The summary line and VERSIONS.md both need a
  # real semver pin, not the floating "latest" tag.
  local pkgjson="$WORK/xlsx-package.json"
  if ! curl -fsSL https://cdn.sheetjs.com/xlsx-latest/package/package.json -o "$pkgjson"; then
    log "  ERROR: could not fetch xlsx package.json to resolve version" >&2
    mark_fail
    return 1
  fi
  local ver
  ver="$(node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{process.stdout.write(JSON.parse(s||"{}").version||"")}catch(e){}})' < "$pkgjson")"
  if [[ -z "$ver" ]]; then
    log "  ERROR: could not parse version from xlsx package.json" >&2
    mark_fail
    return 1
  fi
  log "xlsx (SheetJS) -> $ver"
  fetch_url https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.mini.min.js \
    "$VENDOR/xlsx/xlsx.mini.min.js"
  fetch_url https://cdn.sheetjs.com/xlsx-latest/package/LICENSE \
    "$VENDOR/xlsx/LICENSE"
  record_summary "xlsx" "$ver"
}

update_wllama() {
  local ver; ver="$(npm_latest @wllama/wllama)"
  log "@wllama/wllama -> $ver"
  local pkg; pkg="$(pack_pkg @wllama/wllama "$ver")"

  # ESM entry: upstream layout has varied between releases.
  local entry=""
  for cand in "esm/index.js" "index.min.js" "dist/index.min.js" "esm/index.min.js"; do
    if [[ -f "$pkg/$cand" ]]; then entry="$pkg/$cand"; break; fi
  done
  if [[ -z "$entry" ]]; then
    log "  ERROR: could not find an ESM entry in @wllama/wllama@$ver" >&2
    find "$pkg" -maxdepth 3 -name 'index*.js' | sed 's/^/    found: /' >&2
    mark_fail
    return 1
  fi
  copy_file "$entry" "$VENDOR/wllama/index.min.js"

  # multi-thread WASM (SIMD + threads). Upstream renamed the directory
  # from multi-thread/ to wasm/ in 3.x; keep older candidates so the
  # script still works if we pin back. The ESM build's wasm matches the
  # ESM entry we just copied, so prefer that one.
  local wasm=""
  for cand in \
      "esm/wasm/wllama.wasm" \
      "src/wasm/wllama.wasm" \
      "esm/multi-thread/wllama.wasm" \
      "src/multi-thread/wllama.wasm" \
      "multi-thread/wllama.wasm"; do
    if [[ -f "$pkg/$cand" ]]; then wasm="$pkg/$cand"; break; fi
  done
  if [[ -z "$wasm" ]]; then
    log "  ERROR: could not find the multi-thread wllama.wasm in @wllama/wllama@$ver" >&2
    find "$pkg" -name 'wllama.wasm' | sed 's/^/    found: /' >&2
    mark_fail
    return 1
  fi
  copy_file "$wasm" "$VENDOR/wllama/multi-thread/wllama.wasm"

  # Record the npm version so storage._serialise_survey can stamp it into
  # every survey YAML. npm releases carry no git SHA, so commit stays empty.
  python3 - "$VENDOR/wllama/BUILD_INFO.json" "$ver" "" <<'PY'
import json, sys
path, version, commit = sys.argv[1:4]
with open(path, "w", encoding="utf-8") as f:
    json.dump({"version": version, "commit": commit}, f, indent=2)
    f.write("\n")
PY
  log "  wrote ${VENDOR#${REPO_ROOT}/}/wllama/BUILD_INFO.json (version=${ver}, commit=)"
  record_summary "@wllama/wllama" "$ver"

  # Compat (ASYNCIFY, no JSPI / wasm64 / WebGPU) fallback bundle. It ships as
  # a SEPARATE npm package, @wllama/wllama-compat, NOT inside @wllama/wllama,
  # so the main copy_file calls above would silently leave it stale. The user
  # UI loads it via wllama.setCompat() (see WLLAMA_COMPAT_PATHS in
  # user-llm.js) on browsers without JSPI/wasm64 (mobile Safari, current
  # mobile Chrome) and for the forced CPU-only path, so it must stay in
  # lockstep with the main bundle. Pin it to the same version; fall back to
  # the compat package's own latest only if that exact version was never
  # published. scripts/build-wllama.sh produces the same two files from
  # source; this keeps the npm-refresh path in sync with it.
  if [[ "${WITH_COMPAT:-1}" != "1" ]]; then
    log "  --no-compat: leaving vendored wllama/compat/ untouched"
    return 0
  fi
  local cver="$ver"
  if ! npm view "@wllama/wllama-compat@${ver}" version >/dev/null 2>&1; then
    log "  WARNING: @wllama/wllama-compat@${ver} not published; falling back to compat latest" >&2
    cver="$(npm_latest @wllama/wllama-compat)"
  fi
  log "@wllama/wllama-compat -> $cver"
  local cpkg; cpkg="$(pack_pkg @wllama/wllama-compat "$cver")"
  copy_file "$cpkg/wasm/wllama.js"   "$VENDOR/wllama/compat/wllama.js"
  copy_file "$cpkg/wasm/wllama.wasm" "$VENDOR/wllama/compat/wllama.wasm"
  record_summary "@wllama/wllama-compat" "$cver"
}

update_tessdata() {
  # tessdata_fast lives on the naptha/tessdata gh-pages branch, not npm.
  # gh-pages HEAD is treated as "latest" here.
  log "tessdata_fast (naptha/tessdata gh-pages HEAD)"
  local base="https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0_fast"
  mkdir -p "$VENDOR/tesseract-lang"
  for lang in eng fra; do
    fetch_url "$base/$lang.traineddata.gz" \
      "$VENDOR/tesseract-lang/$lang.traineddata.gz"
  done
  # Resolve gh-pages HEAD to a concrete commit SHA so VERSIONS.md can be
  # pinned precisely. The downloaded files don't carry the SHA, so query
  # the GitHub API. If the lookup fails the summary still lands but the
  # VERSIONS.md rewriter will leave the previous pin in place (it only
  # overwrites when given a real hex SHA).
  local sha=""
  local apijson="$WORK/tessdata-branch.json"
  if curl -fsSL https://api.github.com/repos/naptha/tessdata/branches/gh-pages -o "$apijson"; then
    sha="$(node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{process.stdout.write((JSON.parse(s||"{}").commit||{}).sha||"")}catch(e){}})' < "$apijson")"
  fi
  if [[ -z "$sha" ]]; then
    log "  WARNING: could not resolve gh-pages SHA; VERSIONS.md will keep its previous pin" >&2
    sha="gh-pages HEAD"
  fi
  record_summary "tessdata_fast" "$sha"
}

# Rewrite the pinned versions inside app/static/vendor/VERSIONS.md from
# the summary entries collected during this run. Only targets that
# succeeded contribute to the summary, so a failing target leaves its
# previous pin untouched. The substitutions are deliberately narrow
# (anchored on backticked package names and the unique `/-/` segment of
# npm tarball URLs) so commentary like "tesseract.js@7 declares ..." or
# the "currently points at 6.1.2" note in the tesseract section is not
# accidentally rewritten.
update_versions_md() {
  local md="$VENDOR/VERSIONS.md"
  if [[ ! -f "$md" ]]; then
    log "  WARNING: $md not found, skipping VERSIONS.md rewrite" >&2
    return 0
  fi
  if [[ ! -s "$SUMMARY_FILE" ]]; then
    return 0
  fi
  log "rewriting pinned versions in app/static/vendor/VERSIONS.md"
  local key ver
  while IFS=$'\t' read -r key ver; do
    [[ -z "$key" ]] && continue
    case "$key" in
      pdfjs-dist)
        sed -i -E \
          -e "s|(\`pdfjs-dist@)[^\`]+(\`)|\1${ver}\2|" \
          -e "s|(/pdfjs-dist/-/pdfjs-dist-)[0-9][^/]*(\\.tgz)|\1${ver}\2|" \
          "$md"
        ;;
      tesseract.js)
        sed -i -E \
          -e "/^- Packages: / s|(\`tesseract\\.js@)[0-9][^\`]*(\`)|\1${ver}\2|" \
          -e "s|(/tesseract\\.js/-/tesseract\\.js-)[0-9][^/]*(\\.tgz)|\1${ver}\2|" \
          "$md"
        ;;
      tesseract.js-core)
        sed -i -E \
          -e "/^- Packages: / s|(\`tesseract\\.js-core@)[0-9][^\`]*(\`)|\1${ver}\2|" \
          -e "s|(/tesseract\\.js-core/-/tesseract\\.js-core-)[0-9][^/]*(\\.tgz)|\1${ver}\2|" \
          "$md"
        ;;
      js-yaml)
        sed -i -E \
          -e "s|(\`js-yaml@)[^\`]+(\`)|\1${ver}\2|" \
          -e "s|(/js-yaml/-/js-yaml-)[0-9][^/]*(\\.tgz)|\1${ver}\2|" \
          "$md"
        ;;
      xlsx)
        sed -i -E \
          -e "s|(\`xlsx@)[^\`]+(\`)|\1${ver}\2|" \
          -e "s|(cdn\\.sheetjs\\.com/xlsx-)[^/]+(/package)|\1${ver}\2|" \
          "$md"
        ;;
      @wllama/wllama)
        sed -i -E \
          -e "s|(\`@wllama/wllama@)[^\`]+(\`)|\1${ver}\2|" \
          -e "s|(cdn\\.jsdelivr\\.net/npm/@wllama/wllama@)[^/]+(/)|\1${ver}\2|" \
          "$md"
        ;;
      @wllama/wllama-compat)
        # Anchored on the `-compat` suffix so it does not collide with the
        # bare `@wllama/wllama@` pin rewritten just above.
        sed -i -E \
          -e "s|(\`@wllama/wllama-compat@)[^\`]+(\`)|\1${ver}\2|" \
          "$md"
        ;;
      tessdata_fast)
        # Only rewrite when we got a real SHA back; the fallback string
        # "gh-pages HEAD" must not land in the backticked pin slot.
        if [[ "$ver" =~ ^[0-9a-f]{7,}$ ]]; then
          sed -i -E \
            -e "s|(gh-pages @ \`)[0-9a-f]+(\`)|\1${ver}\2|" \
            "$md"
        fi
        ;;
    esac
  done < "$SUMMARY_FILE"
}

usage() {
  sed -n '2,18p' "$0"
}

main() {
  # Positional args are target names; flags toggle optional behaviour. Parse
  # both in one pass so --no-compat can sit anywhere on the line.
  local targets=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help) usage; exit 0 ;;
      --compat)
        [[ $# -ge 2 ]] || { log "missing value for --compat (expected 0 or 1)" >&2; exit 1; }
        WITH_COMPAT="$2"; shift 2 ;;
      --no-compat) WITH_COMPAT=0; shift ;;
      --*) log "unknown option: $1 (try --help)" >&2; exit 1 ;;
      *) targets+=("$1"); shift ;;
    esac
  done
  case "$WITH_COMPAT" in
    0|1) ;;
    *) log "--compat must be 0 or 1 (got: $WITH_COMPAT)" >&2; exit 1 ;;
  esac
  if [[ ${#targets[@]} -eq 0 ]]; then
    targets=(pdfjs tesseract js-yaml xlsx wllama tessdata)
  fi
  local failed=()
  for t in "${targets[@]}"; do
    local fn=""
    case "$t" in
      pdfjs)     fn=update_pdfjs ;;
      tesseract) fn=update_tesseract ;;
      js-yaml)   fn=update_js_yaml ;;
      xlsx)      fn=update_xlsx ;;
      wllama)    fn=update_wllama ;;
      tessdata)  fn=update_tessdata ;;
      *) log "unknown target: $t" >&2; exit 1 ;;
    esac
    # Reset the per-target FAIL flag, run the updater with `|| true` so
    # a non-zero return does not trip the outer `set -e`, then inspect
    # FAIL to decide whether to flag the target as failed. The helper
    # functions (copy_file, pack_pkg, fetch_url) set FAIL=1 on error.
    # Subsequent commands inside a failing updater may still run with
    # bad state, but they log clearly and do not corrupt other targets.
    FAIL=0
    "$fn" || true
    if [[ $FAIL -ne 0 ]]; then
      log "  FAILED: $t (continuing with remaining targets)" >&2
      failed+=("$t")
    fi
  done

  echo
  log "summary:"
  if [[ -s "$SUMMARY_FILE" ]]; then
    while IFS=$'\t' read -r k v; do
      printf '  %-22s %s\n' "$k" "$v"
    done < "$SUMMARY_FILE"
  fi
  echo
  update_versions_md
  log "review the diff in app/static/vendor/VERSIONS.md before committing."
  if [[ ${#failed[@]} -gt 0 ]]; then
    echo
    log "FAILED targets: ${failed[*]}"
    exit 1
  fi
}

main "$@"
