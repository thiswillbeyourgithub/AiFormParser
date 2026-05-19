#!/usr/bin/env bash
# Build wllama (and llama.cpp) from source, then vendor the resulting
# wasm + JS into app/static/vendor/wllama/.
#
# Usage:
#   scripts/build-wllama.sh [options]   (see --help)
#
# Repositories live under scripts/cache/ so you manage them directly:
# checkout branches, apply patches, switch remotes, etc. The script
# never pulls, resets, or modifies their working trees.
#
#   scripts/cache/wllama/      ngxson/wllama
#   scripts/cache/llama.cpp/   ggml-org/llama.cpp
#
# If a repo is missing it is cloned at HEAD. Before building,
# scripts/cache/wllama/llama.cpp is replaced with a symlink to
# ../llama.cpp so wllama's CMake picks up your standalone checkout
# instead of its own submodule. A non-empty real directory there
# blocks the run (so an initialised submodule is not silently
# overwritten).
#
# Options (all have sensible defaults; see --help):
#   --docker CMD             docker command, default "sudo docker"
#   --emsdk-image TAG        emscripten image tag
#   --dawn-tag TAG           Dawn release for emdawnwebgpu_pkg
#   --extra-cmake-flags STR  appended to wllama's CMake invocation,
#                            e.g. --extra-cmake-flags "-DGGML_WEBGPU=ON"
#   --build-compat 0|1       build + vendor the compat (ASYNCIFY) fallback
#                            variant, default 1. 0 (or --no-compat) skips
#                            stage 3 and roughly halves build time while
#                            iterating on the main bundle.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE="$REPO_ROOT/scripts/cache"
WLLAMA_DIR="$CACHE/wllama"
LLAMACPP_DIR="$CACHE/llama.cpp"
VENDOR="$REPO_ROOT/app/static/vendor/wllama"

WLLAMA_REPO="https://github.com/ngxson/wllama"
LLAMACPP_REPO="https://github.com/ggml-org/llama.cpp"

DOCKER="sudo docker"
# Pinned to the same emsdk tag wllama's own build_wasm.sh uses, so any
# emscripten / Dawn / pthread interactions match what upstream tests.
EMSDK_IMAGE="emscripten/emsdk:4.0.20"
# Dawn release that wllama's build_wasm.sh currently pins (emdawnwebgpu_pkg).
# Bump in lockstep if wllama's docker-compose entrypoint changes.
DAWN_TAG="v20260317.182325"
EXTRA_CMAKE_FLAGS=""
# Override the main (wasm64) bundle's -sMAXIMUM_MEMORY. Empty keeps wllama's
# built-in 2048MB cap (the wasm32 ArrayBuffer ceiling). wllama hardcodes the
# value via add_link_options, which CMake emits BEFORE CMAKE_EXE_LINKER_FLAGS,
# so a -D override silently loses the emscripten last-wins race. We instead
# append -sMAXIMUM_MEMORY via EMCC_CFLAGS (added at the end of the link line)
# on the main stage only; the compat bundle is wasm32 and stays capped at 2GB.
MAX_MEMORY=""
# --debug-version turns on ggml's WebGPU debug output (-DGGML_WEBGPU_DEBUG=ON)
# for the main bundle. Off by default: it is verbose and slows the backend, so
# it is opt-in for diagnosing WebGPU issues. No effect on the compat bundle,
# which has WebGPU disabled entirely.
WEBGPU_DEBUG="0"
# Build + vendor the compat (ASYNCIFY) fallback alongside the main bundle.
# Pass --build-compat 0 (or --no-compat) to skip stage 3 (faster iteration
# on the main build).
BUILD_COMPAT="1"

log() { printf '[build-wllama] %s\n' "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

usage() {
  cat <<EOF
Build wllama (and llama.cpp) from source, then vendor the resulting
wasm + JS into app/static/vendor/wllama/.

Usage:
  scripts/build-wllama.sh [options]

Repositories live under scripts/cache/ so you manage them directly:
checkout branches, apply patches, switch remotes, etc. The script
never pulls, resets, or modifies their working trees. If a repo is
missing it is cloned at HEAD.

  scripts/cache/wllama/      ngxson/wllama
  scripts/cache/llama.cpp/   ggml-org/llama.cpp

Options:
  -h, --help                  show this help and exit
  --docker CMD                docker command (default "$DOCKER")
  --emsdk-image TAG           emscripten image tag (default "$EMSDK_IMAGE")
  --dawn-tag TAG              Dawn release for emdawnwebgpu_pkg
                              (default "$DAWN_TAG")
  --extra-cmake-flags STR     appended to wllama's CMake invocation
                              (e.g. --extra-cmake-flags "-DGGML_WEBGPU=ON")
  --max-memory SIZE           override the main (wasm64) bundle's
                              -sMAXIMUM_MEMORY, e.g. "4096MB" (default: keep
                              wllama's built-in 2048MB). Has no effect on the
                              wasm32 compat bundle, which stays capped at 2GB.
  --build-compat 0|1          build + vendor the compat (ASYNCIFY) fallback
                              variant (default "$BUILD_COMPAT"; 0 skips stage 3
                              and roughly halves build time while iterating)
  --no-compat                 shorthand for --build-compat 0
  --debug-version             build the main bundle with ggml WebGPU debug
                              output (-DGGML_WEBGPU_DEBUG=ON). Off by default;
                              verbose and slower, for diagnosing WebGPU issues.
EOF
}

# Some options take a value in the next argument; this errors out clearly
# when it is missing rather than silently swallowing the following flag.
need_value() { [[ $# -ge 2 ]] || die "missing value for $1"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --docker)            need_value "$@"; DOCKER="$2"; shift 2 ;;
    --emsdk-image)       need_value "$@"; EMSDK_IMAGE="$2"; shift 2 ;;
    --dawn-tag)          need_value "$@"; DAWN_TAG="$2"; shift 2 ;;
    --extra-cmake-flags) need_value "$@"; EXTRA_CMAKE_FLAGS="$2"; shift 2 ;;
    --max-memory)        need_value "$@"; MAX_MEMORY="$2"; shift 2 ;;
    --build-compat)      need_value "$@"; BUILD_COMPAT="$2"; shift 2 ;;
    --no-compat)         BUILD_COMPAT="0"; shift ;;
    --debug-version)     WEBGPU_DEBUG="1"; shift ;;
    *) die "unknown argument: $1 (try -h)" ;;
  esac
done

case "$BUILD_COMPAT" in
  0|1) ;;
  *) die "--build-compat must be 0 or 1 (got: $BUILD_COMPAT)" ;;
esac

# emscripten accepts a plain byte count or a number with a KB/MB/GB suffix.
# Catch typos here rather than after a long build.
if [[ -n "$MAX_MEMORY" && ! "$MAX_MEMORY" =~ ^[0-9]+(KB|MB|GB|kb|mb|gb)?$ ]]; then
  die "--max-memory must be a byte count or N{KB,MB,GB} (got: $MAX_MEMORY)"
fi

command -v git >/dev/null 2>&1 || die "missing required tool: git"

mkdir -p "$CACHE"

clone_if_missing() {
  local url="$1" dest="$2" name="$3"
  if [[ -d "$dest/.git" ]]; then
    log "$name: using existing checkout at ${dest#$REPO_ROOT/}"
    return 0
  fi
  if [[ -e "$dest" ]]; then
    die "$dest exists but is not a git checkout"
  fi
  log "$name: cloning $url -> ${dest#$REPO_ROOT/}"
  git clone "$url" "$dest"
}

clone_if_missing "$WLLAMA_REPO"   "$WLLAMA_DIR"   "wllama"
clone_if_missing "$LLAMACPP_REPO" "$LLAMACPP_DIR" "llama.cpp"

link_target="$WLLAMA_DIR/llama.cpp"
if [[ -L "$link_target" ]]; then
  current="$(readlink "$link_target")"
  if [[ "$current" != "../llama.cpp" ]]; then
    log "fixing symlink wllama/llama.cpp (was: $current)"
    rm "$link_target"
    ln -s "../llama.cpp" "$link_target"
  fi
elif [[ -d "$link_target" ]]; then
  if [[ -z "$(ls -A "$link_target")" ]]; then
    rmdir "$link_target"
    ln -s "../llama.cpp" "$link_target"
  else
    die "$link_target is a non-empty directory. Remove it so the build can
       symlink wllama/llama.cpp -> ../llama.cpp (the standalone checkout
       under scripts/cache/llama.cpp). If you initialised wllama's submodule
       with 'git submodule update', undo that first."
  fi
else
  ln -s "../llama.cpp" "$link_target"
fi

log "wllama:    $(git -C "$WLLAMA_DIR"    rev-parse --abbrev-ref HEAD) @ $(git -C "$WLLAMA_DIR"    rev-parse --short HEAD)"
log "llama.cpp: $(git -C "$LLAMACPP_DIR" rev-parse --abbrev-ref HEAD) @ $(git -C "$LLAMACPP_DIR" rev-parse --short HEAD)"

# Wipe the previously vendored artefacts so a rebuild that lays out fewer
# files cannot leave a stale copy behind. compat/ is always removed, even
# when BUILD_COMPAT=0: skipping the compat stage must never silently ship a
# stale compat bundle from a prior build.
log "removing previously vendored artefacts before rebuild"
rm -vf "$VENDOR/index.min.js" "$VENDOR/multi-thread/wllama.wasm"
rm -vrf "$VENDOR/compat"

# Two stages inside the same container:
#   1. emcmake + emmake compile llama.cpp -> wllama.{js,wasm}, mirroring
#      wllama's scripts/build_wasm.sh entrypoint (so a patched llama.cpp
#      under scripts/cache/llama.cpp/ actually lands in the binary).
#      `npm run build` alone does NOT recompile: it only repackages the
#      prebuilt wllama.wasm shipped in the wllama repo.
#   2. npm install + npm run build re-packages the TypeScript wrapper
#      with the freshly built wasm/js shim.
#   3. A second emcmake/emmake pass with -DWLLAMA_COMPAT=ON builds the
#      ASYNCIFY (no memory64, no JSPI, no WebGPU) variant that wllama
#      falls back to on browsers without JSPI/wasm64 (mobile Safari,
#      current mobile Chrome). Vendored alongside the main bundle so
#      runtime never has to reach wllama's jsdelivr CDN.
log "running build inside $EMSDK_IMAGE ..."
$DOCKER run --rm \
  -v "$CACHE:/work" \
  -w /work/wllama \
  -e EXTRA_CMAKE_FLAGS="$EXTRA_CMAKE_FLAGS" \
  -e MAX_MEMORY="$MAX_MEMORY" \
  -e WEBGPU_DEBUG="$WEBGPU_DEBUG" \
  -e DAWN_TAG="$DAWN_TAG" \
  -e BUILD_COMPAT="$BUILD_COMPAT" \
  "$EMSDK_IMAGE" \
  bash -lc '
    set -euo pipefail
    # The cache repos are owned by the host user but the container runs
    # as root, so git refuses to operate on them ("dubious ownership").
    # build_worker.sh shells out to git inside llama.cpp, so we need to
    # whitelist both checkouts.
    git config --global --add safe.directory /work/wllama
    git config --global --add safe.directory /work/llama.cpp

    # emscripten/emsdk ships emcmake/emmake/python3 but not node, curl,
    # or unzip. Install lazily so re-runs of an existing container layer
    # are a no-op.
    if ! command -v node >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
      apt-get update
      apt-get install -y --no-install-recommends nodejs npm curl
    fi
    node --version
    npm --version
    emcc --version | head -1

    # A changed CMake configuration (wllama'\''s CMakeLists.txt, or a patched
    # llama.cpp CMake file) can flip the memory model, e.g. toggling
    # -sMEMORY64 on the wllama target and, via add_compile_options, on the
    # ggml/llama objects. CMake'\''s incremental rebuild does NOT reliably
    # recompile the already-built ggml/llama objects when only those global
    # flags change, so they get linked against the new flags and wasm-ld
    # aborts with:
    #   "must specify -mwasm64 to process wasm64 object files".
    # Stamp each build dir with a hash of its CMake inputs AND the resolved
    # cmake flags, then wipe it when that hash changes, so a config change
    # forces a clean reconfigure while pure source edits stay fast and
    # incremental.
    #
    # Crucially the memory model is selected by cmake FLAGS (main bundle:
    # wasm64; compat bundle: wasm32), not by any file content, so config_hash()
    # below cannot see it: the CMakeLists bytes are identical for both configs.
    #
    # Two flags must agree on the memory model or wasm-ld aborts:
    #   - wllama'\''s own -DWLLAMA_COMPAT picks the wllama-target options
    #     (MEMORY64 + JSPI vs ASYNCIFY).
    #   - llama.cpp'\''s -DLLAMA_WASM_MEM64 (introduced upstream, DEFAULTS ON)
    #     stamps -sMEMORY64=1 onto every ggml/llama object via add_subdirectory.
    #     Left at its default it forces wasm64 ggml objects even in the compat
    #     stage, so the wasm32 wllama link hits "must specify -mwasm64 to
    #     process wasm64 object files". We therefore pin it per stage below.
    # Folding the per-stage flags into
    # the stamp is what makes a flag flip (compat<->main, a different
    # EXTRA_CMAKE_FLAGS, WebGPU/JSPI toggles) actually trigger the wipe.
    # Without it, CMake silently reuses ggml objects built for the other
    # memory model and wasm-ld aborts with the error quoted above.
    config_hash() {
      find -L CMakeLists.txt llama.cpp \( -name CMakeLists.txt -o -name "*.cmake" \) \
        -type f -print0 2>/dev/null | sort -z | xargs -0 sha256sum 2>/dev/null \
        | sha256sum | cut -d" " -f1
    }
    CONFIG_HASH="$(config_hash)"
    # Resolved cmake flags per stage. Used verbatim in the cmake invocations
    # below AND mixed into the stamp, so the two can never drift apart.
    # -DGGML_WASM_SINGLE_FILE=OFF is pinned defensively on both stages. ggml
    # defaults it ON under emscripten (ggml/CMakeLists.txt), which would embed
    # the wasm as base64 inside the JS and leave no standalone wllama.wasm for
    # the vendoring step below to find. Pinning it OFF keeps the artefact layout
    # stable even if an upstream default flips.
    MAIN_CMAKE_FLAGS="-DGGML_WEBGPU=ON -DGGML_WEBGPU_JSPI=ON -DLLAMA_WASM_MEM64=ON -DGGML_WASM_SINGLE_FILE=OFF"
    # WebGPU debug is main-bundle only (the compat bundle has WebGPU off). Added
    # before EXTRA_CMAKE_FLAGS so a user override still has the last word. It is
    # part of MAIN_CMAKE_FLAGS, which already feeds the stamp, so toggling
    # --debug-version forces a clean rebuild automatically.
    if [[ "${WEBGPU_DEBUG:-0}" == "1" ]]; then
      MAIN_CMAKE_FLAGS="$MAIN_CMAKE_FLAGS -DGGML_WEBGPU_DEBUG=ON"
    fi
    MAIN_CMAKE_FLAGS="$MAIN_CMAKE_FLAGS ${EXTRA_CMAKE_FLAGS}"
    COMPAT_CMAKE_FLAGS="-DWLLAMA_COMPAT=ON -DGGML_WEBGPU=OFF -DGGML_WEBGPU_JSPI=OFF -DLLAMA_WASM_MEM64=OFF -DGGML_WASM_SINGLE_FILE=OFF ${EXTRA_CMAKE_FLAGS}"
    # Optional -sMAXIMUM_MEMORY override for the main bundle, appended to the
    # link via EMCC_CFLAGS (emscripten adds it last, so it wins over wllama'\''s
    # hardcoded add_link_options 2048MB). Empty unless --max-memory was passed.
    MAIN_EMCC_CFLAGS=""
    if [[ -n "${MAX_MEMORY:-}" ]]; then
      MAIN_EMCC_CFLAGS="-sMAXIMUM_MEMORY=${MAX_MEMORY}"
    fi
    stamp_for() { printf "%s\n%s\n" "$CONFIG_HASH" "$1" | sha256sum | cut -d" " -f1; }
    ensure_clean_build_dir() {
      local dir="$1" want="$2" stamp="$1/.config-hash"
      if [[ -d "$dir" && ( ! -f "$stamp" || "$(cat "$stamp")" != "$want" ) ]]; then
        echo "[build-wllama] CMake config changed; wiping $dir for a clean rebuild"
        rm -rf "$dir"
      fi
      mkdir -p "$dir"
    }

    # --- Stage 1: compile llama.cpp -> wllama.{js,wasm} ---
    # MAIN_EMCC_CFLAGS is folded into the stamp: it is a link-time env var, not
    # a CMake input, so make would NOT relink on an --max-memory change alone.
    # Mixing it into the stamp wipes build/ when it changes, forcing a clean
    # relink that actually picks up the new -sMAXIMUM_MEMORY.
    MAIN_STAMP="$(stamp_for "$MAIN_CMAKE_FLAGS|emcc=$MAIN_EMCC_CFLAGS")"
    ensure_clean_build_dir build "$MAIN_STAMP"
    # Cache emdawn outside build/ so a config-change wipe does not force a
    # re-download of the (large) Dawn package.
    EMDAWNWEBGPU_DIR="/work/wllama/.emdawn/emdawnwebgpu_pkg"
    if [[ ! -d "$EMDAWNWEBGPU_DIR" ]]; then
      echo "downloading emdawnwebgpu_pkg-${DAWN_TAG}"
      mkdir -p .emdawn
      curl -L -o .emdawn/emdawn.zip \
        "https://github.com/google/dawn/releases/download/${DAWN_TAG}/emdawnwebgpu_pkg-${DAWN_TAG}.zip"
      python3 -c "import zipfile; zipfile.ZipFile(\".emdawn/emdawn.zip\").extractall(\".emdawn\")"
    fi

    cd build
    # Re-run cmake every time so a re-build picks up any CMakeLists tweak,
    # but emmake will only relink/rebuild changed objects (incremental).
    emcmake cmake .. \
      ${MAIN_CMAKE_FLAGS} \
      -DEMDAWNWEBGPU_DIR="${EMDAWNWEBGPU_DIR}"
    # EMCC_CFLAGS scoped to this make so it reaches the link without touching
    # the compat stage. emscripten appends it after the cmake-emitted flags, so
    # any -sMAXIMUM_MEMORY here wins the last-flag-wins race. When empty it is a
    # no-op. (Compile steps may print a harmless "linker setting ignored during
    # compilation" notice; only the final link consumes it.)
    EMCC_CFLAGS="$MAIN_EMCC_CFLAGS" emmake make wllama -j"$(nproc)"
    echo "$MAIN_STAMP" > .config-hash
    cd ..

    cp build/wllama.js   src/wasm/wllama.js
    cp build/wllama.wasm src/wasm/wllama.wasm

    # --- Stage 2: package the wrapper ---
    if [[ -f package-lock.json ]]; then
      npm ci
    else
      npm install
    fi
    # Regenerate src/glue/messages.ts from cpp/glue.hpp so any glue field
    # tweaks under scripts/cache/wllama/cpp/ land in the TS bundle.
    # `npm run build` does NOT call build:glue itself.
    npm run build:glue
    npm run build

    # --- Stage 3: compat (ASYNCIFY, no MEMORY64, no JSPI, no WebGPU) ---
    # wllama loads these raw artefacts directly via setCompat({worker, wasm}),
    # so no npm repackaging is needed for the compat variant. Skipped when
    # BUILD_COMPAT=0 (roughly halves total build time during iteration).
    if [[ "${BUILD_COMPAT:-1}" == "1" ]]; then
      COMPAT_STAMP="$(stamp_for "$COMPAT_CMAKE_FLAGS")"
      ensure_clean_build_dir build-compat "$COMPAT_STAMP"
      cd build-compat
      emcmake cmake .. \
        ${COMPAT_CMAKE_FLAGS}
      emmake make wllama -j"$(nproc)"
      echo "$COMPAT_STAMP" > .config-hash
      cd ..
    else
      echo "[build-wllama] BUILD_COMPAT=0; skipping compat (ASYNCIFY) stage"
    fi
  '

# Locate the produced artefacts. Candidate paths follow update-vendor.sh
# so the two scripts agree on what wllama currently lays out.
out_js=""
for cand in \
    "$WLLAMA_DIR/esm/index.js" \
    "$WLLAMA_DIR/dist/index.min.js" \
    "$WLLAMA_DIR/esm/index.min.js" \
    "$WLLAMA_DIR/index.min.js"; do
  if [[ -f "$cand" ]]; then out_js="$cand"; break; fi
done

out_wasm=""
for cand in \
    "$WLLAMA_DIR/esm/wasm/wllama.wasm" \
    "$WLLAMA_DIR/src/wasm/wllama.wasm" \
    "$WLLAMA_DIR/esm/multi-thread/wllama.wasm" \
    "$WLLAMA_DIR/src/multi-thread/wllama.wasm" \
    "$WLLAMA_DIR/multi-thread/wllama.wasm"; do
  if [[ -f "$cand" ]]; then out_wasm="$cand"; break; fi
done

if [[ -z "$out_js" || -z "$out_wasm" ]]; then
  echo "ERROR: could not locate build outputs under $WLLAMA_DIR" >&2
  echo "       JS:   ${out_js:-<not found>}" >&2
  echo "       WASM: ${out_wasm:-<not found>}" >&2
  echo "       Inspect the tree and add the actual paths to the candidate lists." >&2
  exit 1
fi

mkdir -p "$VENDOR/multi-thread"

report() {
  local label="$1" before="$2" dest="$3"
  local after; after="$(stat -c %s "$dest")"
  local sha; sha="$(sha256sum "$dest" | cut -c1-12)"
  log "$label: ${before} -> ${after} bytes  sha256:${sha}  $(realpath --relative-to="$REPO_ROOT" "$dest")"
}

before_js="$(stat -c %s "$VENDOR/index.min.js" 2>/dev/null || echo -)"
before_wasm="$(stat -c %s "$VENDOR/multi-thread/wllama.wasm" 2>/dev/null || echo -)"

cp "$out_js"   "$VENDOR/index.min.js"
cp "$out_wasm" "$VENDOR/multi-thread/wllama.wasm"

report "js"   "$before_js"   "$VENDOR/index.min.js"
report "wasm" "$before_wasm" "$VENDOR/multi-thread/wllama.wasm"

# Vendor the compat (ASYNCIFY) artefacts produced by stage 3. wllama loads
# these straight off our origin via setCompat({worker, wasm}) when the
# browser lacks JSPI or memory64 (mobile Safari, current mobile Chrome).
compat_js="$WLLAMA_DIR/build-compat/wllama.js"
compat_wasm="$WLLAMA_DIR/build-compat/wllama.wasm"
if [[ "$BUILD_COMPAT" != "1" ]]; then
  log "BUILD_COMPAT=0; skipping compat vendoring (compat/ was cleared above)"
elif [[ -f "$compat_js" && -f "$compat_wasm" ]]; then
  mkdir -p "$VENDOR/compat"
  before_compat_js="$(stat -c %s "$VENDOR/compat/wllama.js" 2>/dev/null || echo -)"
  before_compat_wasm="$(stat -c %s "$VENDOR/compat/wllama.wasm" 2>/dev/null || echo -)"
  cp "$compat_js"   "$VENDOR/compat/wllama.js"
  cp "$compat_wasm" "$VENDOR/compat/wllama.wasm"
  report "compat-js"   "$before_compat_js"   "$VENDOR/compat/wllama.js"
  report "compat-wasm" "$before_compat_wasm" "$VENDOR/compat/wllama.wasm"
else
  echo "WARNING: compat artefacts missing under $WLLAMA_DIR/build-compat" >&2
  echo "         JS:   $compat_js" >&2
  echo "         WASM: $compat_wasm" >&2
fi

# Record the version and commit of the wllama checkout we just built from,
# so storage._serialise_survey can stamp the values into every survey YAML.
wllama_version="$(node -e 'process.stdout.write(require("'"$WLLAMA_DIR"'/package.json").version||"")' 2>/dev/null || true)"
wllama_commit="$(git -C "$WLLAMA_DIR" rev-parse --short HEAD 2>/dev/null || true)"
python3 - "$VENDOR/BUILD_INFO.json" "$wllama_version" "$wllama_commit" <<'PY'
import json, sys
path, version, commit = sys.argv[1:4]
with open(path, "w", encoding="utf-8") as f:
    json.dump({"version": version, "commit": commit}, f, indent=2)
    f.write("\n")
PY
log "build-info: version=${wllama_version:-?} commit=${wllama_commit:-?}  $(realpath --relative-to="$REPO_ROOT" "$VENDOR/BUILD_INFO.json")"

log "done. Reload the browser with the network panel set to disable cache."
