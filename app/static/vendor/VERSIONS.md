# Vendored client-side libraries

These files are committed into the repo so the application runs without
fetching any third-party JavaScript at runtime. This matches the air-gap
posture in `CLAUDE.md` section 2.

All sources are public github mirrors of the official npm packages.

## pdf.js (`pdfjs/`)

- Package: `pdfjs-dist@6.0.227`
- Source: <https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.0.227.tgz>
- Files: `pdf.min.mjs`, `pdf.worker.min.mjs`
- v4+ is ESM-only. The library is loaded from `smoke.js` via dynamic
  `import()`, and pdfjs spawns its worker internally with
  `new Worker(workerSrc, { type: "module" })` after we set
  `GlobalWorkerOptions.workerSrc` to the vendored `pdf.worker.min.mjs`.
- The optional `wasm/` decoders (jbig2, openjpeg, qcms, quickjs-eval) are
  not vendored. They are only needed for PDFs that use JBIG2 / JPEG2000
  encoded images. Add them under `pdfjs/wasm/` and set
  `GlobalWorkerOptions.wasmUrl` if a survey scan ever hits a decoder fault.

## tesseract.js + tesseract.js-core (`tesseract/`)

- Packages: `tesseract.js@7.0.0` and `tesseract.js-core@7.0.0`
- Sources:
  - tesseract.js: <https://registry.npmjs.org/tesseract.js/-/tesseract.js-7.0.0.tgz>
  - tesseract.js-core: <https://registry.npmjs.org/tesseract.js-core/-/tesseract.js-core-7.0.0.tgz>
- Files: `tesseract.esm.min.js`, `worker.min.js`, `tesseract-core-relaxedsimd-lstm.{wasm.js,wasm}`, `tesseract-core-simd-lstm.{wasm.js,wasm}`, `tesseract-core-lstm.{wasm.js,wasm}`
  - The worker picks one variant at runtime via `wasm-feature-detect`:
    relaxed-SIMD when the browser supports it (modern Chrome/Edge),
    plain SIMD as the modern fallback, plain LSTM when SIMD is missing.
  - npm's `latest` dist-tag on `tesseract.js-core` currently points at
    `6.1.2`, but `tesseract.js@7` declares `tesseract.js-core: ^7.0.0`
    in its dependencies and the worker requests the relaxed-SIMD core
    paths that only ship in 7.x. The vendor script reads the version
    from `tesseract.js`'s `dependencies` rather than the `latest` tag
    to keep these in lockstep.
  - LSTM-only variants are used because the project only does printed-text OCR.
  - The `.wasm.js` suffix is required: the worker calls
    `importScripts(corePath + 'tesseract-core-simd-lstm.wasm.js')`, so
    the upstream `.js` loader must be renamed to `.wasm.js` for it to load.
  - The worker, esm, and core files must be colocated. The Emscripten core
    loader computes its base path from the worker's `self.location.href`
    (no `locateFile` hook is injected by `worker.min.js`), so the `.wasm`
    binary has to sit next to `worker.min.js`. The createWorker call also
    passes `workerBlobURL: false` so that `self.location.href` is the real
    worker URL rather than a `blob:` URL (which has no resolvable parent).

## js-yaml (`js-yaml/`)

- Package: `js-yaml@4.2.0`
- Source: <https://registry.npmjs.org/js-yaml/-/js-yaml-4.2.0.tgz>
- Files: `js-yaml.min.js`, `js-yaml.mjs`, `LICENSE`
- Used by the admin UI to serialise the in-memory `Survey` to YAML before
  POSTing to `/api/surveys`. ESM build is loaded dynamically from
  `admin-save.js`.

## Tesseract language packs (`tesseract-lang/`)

- Package: `tessdata_fast` (4.0.0)
- Source: <https://github.com/naptha/tessdata> gh-pages @ `806cd9adc8c6e8abc11c782db1818c990576bebc` (`4.0.0_fast/`)
- Files: `eng.traineddata.gz`, `fra.traineddata.gz`

## SheetJS Community Edition (`xlsx/`)

- Package: `xlsx@0.20.3` (Apache-2.0, SheetJS LLC)
- Source: <https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js>
- Files: `xlsx.mini.min.js`, `LICENSE`
- Loaded via a dynamically-injected `<script>` tag from `user-export.js`
  so the bundle parses only when the researcher actually exports. The
  mini build covers the formats this app emits (XLSX) and skips legacy
  formats; the user-side CSV path uses vanilla string building and
  does not need SheetJS.

## wllama (`wllama/`)

- Packages: `@wllama/wllama@3.4.1`, `@wllama/wllama-compat@3.4.1`
- Source: <https://cdn.jsdelivr.net/npm/@wllama/wllama@3.4.1/> (npm)
- Files:
  - `index.min.js` (ESM entry, exports `Wllama` plus helpers)
  - `multi-thread/wllama.wasm` (SIMD + threads main bundle; the user-side
    pipeline is gated behind the capability banner that requires SIMD +
    crossOriginIsolated, so this is the default).
  - `compat/wllama.js`, `compat/wllama.wasm` (ASYNCIFY fallback, no
    JSPI / wasm64 / WebGPU). These come from the SEPARATE
    `@wllama/wllama-compat` package, not from `@wllama/wllama`, and must be
    refreshed alongside the main bundle (`scripts/update-vendor.sh` fetches
    both in lockstep; `scripts/build-wllama.sh` produces both from source).
- `app/static/app/user-llm.js` passes the multi-thread `.wasm` URL as
  `pathConfig.default`. In wllama v3.x that field is the absolute URL
  of the wasm binary itself (it is forwarded straight to the worker
  for `WebAssembly.compileStreaming`); pointing it at a directory
  returns a 404 JSON that fails the magic-word check. `wllama.setCompat()`
  is pointed at the locally vendored `compat/` bundle (WLLAMA_COMPAT_PATHS)
  rather than `null`, so the ASYNCIFY fallback (mobile Safari, current
  mobile Chrome, forced CPU-only path) loads from our own origin and the
  runtime never reaches out to wllama's jsdelivr CDN.

## eruda (`eruda/`)

- Package: `eruda@3.4.3` (MIT, liriliri)
- Source: <https://registry.npmjs.org/eruda/-/eruda-3.4.3.tgz>
- Files: `eruda.js`
- Mobile devtools console. Loaded by `app/static/app/eruda-loader.js`,
  which is included from `base.html` on every page. The loader only
  injects the script when the user-agent looks like an Android phone
  (`Android` + `Mobile` tokens) AND `localStorage.afp_eruda_enabled`
  is `"1"`. The flag is set on `/admin` (only reachable when the admin
  session cookie validates) and cleared on `/admin/login`, so eruda
  unlocks per-device after a successful admin login and disappears on
  logout.

## TODO

- Bump these in lockstep with upstream security fixes.
