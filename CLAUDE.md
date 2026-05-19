# AiFormParser

## 1. Project summary

AiFormParser is a Python webapp that helps researchers and clinicians convert
images of paper clinical surveys into structured CSV data. An **admin** defines
a survey template once by drawing bounding boxes over a reference scan and
labelling each box with a header (CSV column name), a description (LLM
instruction), an answer type, and optional choices. A **researcher** then
uploads a filled-in survey scan (PDF or image) and gets back a CSV.

Because of clinical research privacy requirements in the user's country, **all
per-patient processing must run client-side in the browser**. The server stores
only blank survey templates (YAML + reference page images). It never receives
patient images, OCR output, or any data extracted from a patient form.

## 2. Architectural invariants

These constraints are load-bearing. Do not relax them without an explicit,
recorded decision from the user.

- All per-patient OCR and LLM inference runs **in the browser**, via
  `tesseract.js` and `wllama`. The server must never receive patient images or
  any data derived from them.
- The server only stores: (a) admin-authored survey templates (YAML + reference
  template page images), (b) the admin password (env var), (c) static frontend
  assets, (d) optionally self-hosted LLM weights that the admin places directly
  on the data volume (no upload endpoint).
- Client-side stack:
  - `pdf.js` for PDF rasterisation (admin and user).
  - `tesseract.js` for OCR (admin and user), with French and English language
    packs loaded by default. Other languages can be added later.
  - `wllama` for multimodal LLM inference with tool calling (user only).
- Browser baseline: any modern browser. The client detects capabilities
  (WASM threads, SIMD, WebGPU) at startup and degrades gracefully, falling
  back to slower CPU-only paths where necessary. If a hard dependency is
  missing, the UI surfaces a clear unsupported-browser message instead of
  failing silently.
- User upload page count must match the template page count exactly. Validate
  up front and refuse to proceed if it does not.
- Anchor matching uses **OCR-text anchors** at two granularities, both
  captured at admin time and stored in the YAML:
  - `ocr_tokens`: individual words with bboxes and confidences.
  - `ocr_blocks`: phrases / sentences, each with its constituent words and
    their bboxes.
  At user time the matcher fuzzy-matches whole blocks in the user image
  (robust to repeated single words like "Yes"), then derives each box's
  user-image position from the **relative offsets** between that box and the
  block's constituent words. Page-level alignment uses an **affine fit**
  across confidently matched anchors, with a **per-box translation fallback**
  when residual error is high or too few anchors match.
- Pages are rasterised at **200 DPI** by `pdf.js` on both admin and user
  sides. Box coordinates are stored in that full-resolution pixel space; the
  admin UI must offer interactive **zoom** so boxes can be drawn accurately
  without lowering the underlying resolution.
- Optional Umami analytics ships with the app. Umami collects page paths and
  event names only, never patient data. Event names passed to `umami.track()`
  must therefore remain **static, hand-authored strings**, never values
  derived from a survey template, a filled-in form, or any per-patient
  state. Admin vs researcher traffic is split in Umami by URL path
  (`/admin*` vs `/`), so a single `UMAMI_WEBSITE_ID` is enough.

## 3. Tech stack and intended layout

- Python 3.13 (pinned).
- FastAPI + uvicorn.
- Jinja2 templates, vanilla JavaScript (no build step).
- pyyaml, pydantic for the YAML schema.
- pytest for backend tests, Playwright for e2e tests.
- Docker Compose is the supported runtime.

```
AiFormParser/
  CLAUDE.md
  README.md
  requirements.txt       # FastAPI, uvicorn, pyyaml, pydantic, itsdangerous, multipart
  requirements-dev.txt   # pytest, httpx, playwright
  pytest.ini             # pytest config (testpaths, filterwarnings)
  docker-compose.yml
  Dockerfile
  .env.example
  app/
    main.py              # FastAPI entrypoint
    auth.py              # admin password gate, session cookie
    schema.py            # Pydantic models for the YAML survey schema
    routes/
      admin.py           # admin UI + template CRUD endpoints
      user.py            # user UI + template-fetch endpoints
    templates/           # Jinja2 HTML
    static/              # vendored pdf.js, tesseract.js, wllama, app JS
  data/                  # bound Docker volume; empty in git (.gitkeep only)
    <survey-slug>/       # one folder per survey
      survey.yaml
      page-1.png
      page-2.png
    models/              # optional self-hosted GGUFs; admin places files here directly
      <model-name>/      # one folder per model
        <file>.gguf      # the model weights
        mmproj*.gguf     # optional projector for multimodal support
      <name>.gguf        # flat layout still works for projector-less models
  tests/
    test_yaml_schema.py
    test_routes.py
    e2e/                 # Playwright
```

TODO: the `Dockerfile` base image and exact dependency pins need to be chosen
at implementation time.

## 4. YAML survey schema (canonical)

```yaml
name: "Depression screening v3"
slug: "depression-screening-v3"
created_at: "2026-05-19T10:00:00Z"
recommended_model: "Qwen3.5-4B-Q4_K_M"   # optional; free-form. Avoid IQ imatrix quants (IQ1_*, IQ2_*, IQ3_*, IQ4_*): per the wllama README they are significantly slower than K-quants.
pages:
  - index: 0
    image: "page-1.png"
    width: 2480           # pixels of the admin reference image
    height: 3508
    rasterised_dpi: 200    # DPI used by pdf.js at admin time
    ocr_tokens:            # word-level anchors
      - text: "Question"
        bbox: [x, y, w, h]
        confidence: 0.92
    ocr_blocks:            # phrase / sentence anchors (primary matcher)
      - id: "B1"
        text: "Question 1 of 5"
        bbox: [x, y, w, h]
        words:
          - text: "Question"
            bbox: [x, y, w, h]
          - text: "1"
            bbox: [x, y, w, h]
          - text: "of"
            bbox: [x, y, w, h]
          - text: "5"
            bbox: [x, y, w, h]
    boxes:
      - id: "Q1"
        header: "Q1"
        description: "Patient's reported sleep quality, 1-5 Likert"
        type: "multi-choice"     # text | number | checkbox | date | multi-choice | multi-select
        choices: ["1", "2", "3", "4", "5"]
        bbox: [x, y, w, h]       # in admin reference pixel coordinates
        missing_is_empty: false  # optional; see "missing handling" below
```

Field roles:

- `header`: becomes a column name in the exported CSV or XLSX. **Headers
  must be unique across all pages of the survey.** This is validated at
  admin save time; a collision refuses the save.
- `description`: passed to the LLM as instruction context for that box.
- `type` and `choices`: constrain the LLM output (via tool-call schema).
  - `multi-choice` returns exactly one of `choices`.
  - `multi-select` returns a subset (possibly empty) of `choices`. For
    CSV export the cell joins the picks with `;` so the delimiter
    coexists with the CSV's `,` field separator. XLSX export uses the
    same joined-string form so a row round-trips identically between
    the two formats. The delimiter lives in
    `app/static/app/user-export.js` as `MULTI_SELECT_DELIMITER`.
- `ocr_tokens`: word-level anchors. Used as a fallback signal and for the
  affine fit when block matching is weak.
- `ocr_blocks`: phrase-level anchors. The primary matcher fuzzy-matches block
  text in the user image, then aligns each box using the relative offsets to
  the block's constituent words. Tolerates skew, missing words, and curved
  lines.
- `recommended_model` (optional, top-level): free-form string naming the
  GGUF the survey author would prefer the researcher to use. Matched by
  exact string against entries returned from `GET /api/models` on the
  researcher's instance. If the local catalogue has a match, the
  researcher's model picker defaults to that entry; otherwise the
  default falls through to the first available model. The field is
  intentionally a plain string (not a URL or hash) so YAMLs stay
  portable between instances whose model inventory differs. The admin
  editor offers a "Pick from available" dropdown that copies a
  catalogue name into the input as a convenience; the input itself
  remains authoritative.
- `missing_is_empty` (default `false`): the LLM can always signal that a box
  has no visible answer (a `__missing__` sentinel inside the enum for
  `multi-choice` / `multi-select`, or a parallel `missing: true` field for the
  other types). When this signal fires:
  - flag `false`: the cell exports as the literal string `MISSING`.
  - flag `true`: the cell exports as the type's empty value (`false` for
    `checkbox`, `""` for `text`, `[]` for `multi-select`, empty for
    `number` / `date` / `multi-choice`).
  Missing signals are auto-accepted and **do not** enter the review queue.
  An untrustworthy crop (no anchors matched) still flags for review even if
  the LLM signalled missing.

## 5. HTTP endpoints

- `GET /`: user UI. Pick a survey, drop a PDF/image, run inference locally,
  download results as CSV or XLSX (user picks the format before export).
- `GET /admin`: admin UI (password-gated).
- `POST /admin/login`: set session cookie.
- `GET /api/surveys`: list templates (slugs + display names).
- `GET /api/surveys/{slug}`: fetch one template (YAML + reference image URLs).
- `POST /api/surveys`: create or update a template (admin only). Body: YAML
  payload plus multipart reference page images.
- `DELETE /api/surveys/{slug}`: delete a template (admin only).
- `POST /admin/upload-yaml`: accept an existing YAML so the admin UI can
  rehydrate boxes and headers for editing.
- `POST /api/surveys/{slug}/duplicate`: admin-only. Copy an existing survey
  to a new slug as a starting point. Body specifies the new slug; refuses if
  it already exists.
- `POST /api/surveys/{slug}/rename`: admin-only. Rename a survey's slug
  (renames the folder under `${DATA_DIR}/` and updates the YAML). Refuses
  if the new slug already exists.
- `GET /api/models`: list available self-hosted GGUFs. Scans `${MODELS_DIR}`
  for one folder per model (`${MODELS_DIR}/<model-name>/<file>.gguf`, with an
  optional sibling `*mmproj*.gguf` projector) and also surfaces any flat
  `.gguf` files sitting at the top of `${MODELS_DIR}` as projector-less
  models. The admin places files on disk directly; no upload endpoint.
- `GET /static/models/<model-name>/<file>.gguf` (or `/static/models/<file>.gguf`
  for the flat layout): serves the self-hosted weight to the browser. This is
  **blank template data**, not patient data, and does not violate the privacy
  invariant.

**Red flag check**: any endpoint that accepts patient data (e.g. something
named `/api/process`, `/api/ocr`, `/api/infer`) violates the privacy invariant
and must not be added. GGUF weights contain no patient information, but the
project intentionally avoids a server-side model upload endpoint anyway:
multi-GB uploads were not worth the complexity, and the admin can place files
on the data volume directly.

## 6. Client-side flow (user / researcher)

1. Fetch `/api/surveys`; user picks a survey from a dropdown.
2. Fetch `/api/surveys/{slug}`: YAML template plus reference image URLs.
   The model-picker dropdown defaults to the template's
   `recommended_model` when that name matches an entry returned from
   `GET /api/models`; otherwise it keeps its prior selection (first
   model on initial load). A manual change pins the choice for the
   session, surviving subsequent template switches. The picker locks
   once "Start processing" kicks off the wllama load, since the
   instance is module-cached and a swap requires a page reload.
3. User drops one or more PDFs or images. Each upload represents one filled-in
   copy of the chosen template. `pdf.js` rasterises pages locally.
4. For every uploaded survey, validate that its page count matches the
   template's. If not, surface the mismatch for that upload and skip it (the
   others continue).
5. For each page of each upload:
   - `tesseract.js` OCRs the user image.
   - The anchor matcher first fuzzy-matches each template `ocr_blocks` entry
     against the user-image OCR output. For every matched block it derives a
     per-box position from the relative offsets between the box and the
     block's constituent words.
   - A page-level **affine fit** is computed across the confident matches. If
     the fit's residual error is high or fewer than three well-spread anchors
     match, the page falls back to **per-box translation** using the local
     block matches.
6. For each box, crop the transformed region from the user image and pass
   `(crop, header, description, type, choices)` to `wllama` (multimodal, with
   tool calling for structured output).
7. **LLM failure UX**: a box is flagged for review only when a hard rule
   fails: tool call failed, response is invalid JSON, returned value is
   outside `choices` for `multi-choice` / `multi-select`, non-numeric for
   `number`, non-parseable for `date`, and so on. No probabilistic confidence
   threshold is used. Processing **does not halt**: the pipeline continues
   through every remaining box and every remaining uploaded survey, then
   surfaces all flagged boxes in a single review queue at the end. For each
   flagged box the UI shows the cropped image, the box's
   `header`/`description`/`type`/`choices`, and the raw LLM output. The
   researcher accepts, edits, or skips each one before the export is
   finalised.
8. Aggregate results into a tabular dataset. **One row per uploaded survey**,
   multiple uploads produce multiple rows. All boxes from all pages of a
   given survey flatten into a single row keyed by `header` (uniqueness
   already enforced at admin save). For `multi-select` boxes the cell joins
   picks with the chosen delimiter (see section 4 TODO). Skipped boxes
   leave empty cells.
9. Before download, the user picks the output format: **CSV** (default) or
   **XLSX**. CSV is written with vanilla JS; XLSX is written client-side
   via a vendored SheetJS build (`app/static/vendor/xlsx/`). Both formats
   use the same row array, so the column order and cell contents are
   identical. The download is triggered via a `Blob`. No network call is
   made with patient data.

## 7. Client-side flow (admin)

1. Log in at `/admin` with the shared password. Auth is implemented behind a
   minimal `auth.py` interface so per-user accounts can drop in later without
   rewriting the routes that depend on it.
2. Choose **New survey**, **Upload existing YAML to edit**, or pick an
   existing survey from the list. Existing surveys can be edited in place,
   duplicated (clone to a new slug as a starting point), renamed (change
   slug), or deleted with a confirmation modal.
3. Drop a PDF or image. `pdf.js` rasterises each page to a canvas at **200
   DPI**. The canvas supports interactive **zoom and pan** so the admin can
   draw boxes precisely without changing the underlying stored resolution.
4. Admin draws rectangles over a page. Each new box opens a side panel with
   fields: `header`, `description`, `type`, `choices`.
5. `tesseract.js` OCRs each template page once. Both word-level tokens
   (`ocr_tokens`) and grouped phrases (`ocr_blocks`, with their constituent
   words and bboxes) are captured and stored in the YAML for later anchor
   matching.
6. Before save, the admin UI validates that every `header` is **unique
   across all pages**. Collisions are surfaced inline and block the save.
7. Save: `POST /api/surveys` with the YAML and the page PNGs. The server
   writes them to `${DATA_DIR}/<slug>/`.
8. Self-hosted LLM weights are managed out-of-band: the admin creates one
   subdirectory per model under `${MODELS_DIR}` and drops the model GGUF plus
   its matching `*mmproj*.gguf` projector in there. The admin UI lists what's
   available via `GET /api/models` (each entry exposes `url` and an optional
   `mmproj_url`), and the user UI serves the weights from
   `/static/models/<model-name>/<file>.gguf`. A flat top-level
   `.gguf` is still accepted for projector-less models. There is intentionally
   no upload endpoint.
9. At FastAPI startup, `app.model_split.split_oversized_models` scans
   `${MODELS_DIR}` and shells out to `llama-gguf-split --split-max-size 512M`
   on any non-mmproj GGUF above 512MB, deleting the original once the shards
   land. This matches the wllama README recommendation (parallel chunked
   downloads, sidestep of the 2GB ArrayBuffer cap). Files matching
   `-NNNNN-of-NNNNN.gguf` are treated as already split and skipped, so the
   routine is idempotent across restarts. The `llama-gguf-split` binary is
   pulled into the runtime image via a multi-stage `COPY` from
   `ghcr.io/ggml-org/llama.cpp:full` (see `Dockerfile`); outside that image
   the routine logs a warning and leaves the file alone.

   TODO: mmproj projector files are **not** split, even when they exceed
   512MB. wllama's behaviour for split multimodal projectors has not been
   verified yet; once confirmed (either way), update `app/model_split.py`
   and remove this caveat. Oversized mmproj files surface as a startup
   warning so the operator can swap to a smaller quant in the meantime.

## 8. Configuration (env vars)

| Var | Purpose |
|---|---|
| `ADMIN_PASSWORD` | shared admin password (required) |
| `SESSION_SECRET` | session-cookie signing key (required) |
| `DATA_DIR` | path to surveys folder (default `/data`) |
| `MODELS_DIR` | path to self-hosted GGUFs (default `${DATA_DIR}/models`) |
| `UMAMI_URL` | optional self-hosted Umami instance URL (e.g. `https://analytics.example.com`). Falls back to `https://cloud.umami.is` when empty |
| `UMAMI_WEBSITE_ID` | Umami site ID. Leave empty to disable analytics entirely (no script tag is emitted) |
| `UMAMI_DO_NOT_TRACK` | respect browser `Do Not Track` (default `true`). Set to `false` to track regardless of DNT |

`docker-compose.yml` mounts `./data` to `/data` and reads env from `.env`.

Self-hosted weights are the only supported path: the admin drops a GGUF
(plus its `*mmproj*.gguf` projector for vision) under `${MODELS_DIR}` on
the data volume and the researcher's browser picks one from the dropdown
populated by `GET /api/models`. There is no server-side download fallback.

## 9. Rebuilding wllama from source

The repo vendors prebuilt wllama artefacts under `app/static/vendor/wllama/`,
but `scripts/build-wllama.sh` rebuilds them locally so we can iterate over
wllama or llama.cpp limitations without waiting on upstream releases (apply
a patch, rerun, reload the browser).

How it works:

- Clones `ngxson/wllama` and `ggml-org/llama.cpp` into `scripts/cache/` on
  first run. The script never pulls, resets, or otherwise touches the
  working trees once they exist, so locally checked-out branches, applied
  patches, or switched remotes are preserved across runs. Manage those
  checkouts directly with `git` as needed.
- Replaces `scripts/cache/wllama/llama.cpp` with a symlink to
  `../llama.cpp`, so wllama's CMake picks up the standalone checkout
  instead of its bundled submodule. A non-empty real directory there
  blocks the run rather than being silently overwritten (undo any
  `git submodule update` inside the wllama checkout first).
- Runs the build inside `emscripten/emsdk:4.0.20`, pinned to match
  wllama's own `build_wasm.sh`. Stage 1 invokes `emcmake` + `emmake make
  wllama` with `GGML_WEBGPU=ON` (and the Dawn package fetched from
  `DAWN_TAG`) to compile llama.cpp into `wllama.{js,wasm}`; stage 2 runs
  `npm run build:glue` then `npm run build` so the TypeScript wrapper is
  repackaged around the freshly built wasm. Stage 3 runs a second
  `emcmake`/`emmake` pass with `-DWLLAMA_COMPAT=ON` (and WebGPU/JSPI off) to
  produce the compat (ASYNCIFY, no MEMORY64, no JSPI, no WebGPU) variant that
  `@wllama/wllama-compat` ships on the CDN. wllama falls back to it at runtime
  on browsers without JSPI or wasm64 (mobile Safari, current mobile Chrome).
  Stage 3 is skippable with `--no-compat` (or `--build-compat 0`) to roughly
  halve build time while iterating on the main bundle.
- Copies the produced `esm/index.js` and `wllama.wasm` into
  `app/static/vendor/wllama/` and `app/static/vendor/wllama/multi-thread/`
  respectively, and the compat `wllama.{js,wasm}` into
  `app/static/vendor/wllama/compat/`. The user UI points
  `wllama.setCompat()` at that local `compat/` bundle (see
  `app/static/app/user-llm.js`) so no CDN round-trip is needed. Before/after
  byte sizes and a sha256 prefix are printed so a no-op rebuild is obvious.

CLI options (run `scripts/build-wllama.sh --help`): `--docker` (default
`sudo docker`), `--emsdk-image`, `--dawn-tag`, `--extra-cmake-flags`
(appended to the wllama CMake invocation, e.g. `-DGGML_WEBGPU=ON` is already
on by default), `--build-compat 0|1` (default `1`; `--no-compat` or
`--build-compat 0` skips the compat stage), `--max-memory SIZE` (override the
main wasm64 bundle's `-sMAXIMUM_MEMORY`, e.g. `4096MB`; off by default, keeps
wllama's built-in 2048MB; no effect on the wasm32 compat bundle), and
`--debug-version` (build the main bundle with ggml WebGPU debug output,
`-DGGML_WEBGPU_DEBUG=ON`; off by default, verbose and slower).

Both stages pin `-DGGML_WASM_SINGLE_FILE=OFF` defensively: ggml defaults it
ON under emscripten, which would embed the wasm as base64 in the JS and leave
no standalone `wllama.wasm` for the vendoring step to find. `--max-memory`
is injected via `EMCC_CFLAGS` (appended last on the link line) rather than a
`-D` flag, because wllama hardcodes `-sMAXIMUM_MEMORY` via `add_link_options`
and CMake emits that after `CMAKE_EXE_LINKER_FLAGS`, so a `-D` override would
lose emscripten's last-flag-wins race.

After a rebuild, reload the browser with the network panel set to disable
cache so the new wasm actually loads.

## 10. Working agreements for Claude Code

- **Never** add a server endpoint that accepts patient data, even behind a
  feature flag. This is the project's load-bearing privacy contract.
- Em-dashes are forbidden in any text produced for this project (code,
  comments, docs, commit messages, PR descriptions). Use commas, colons,
  parentheses, or rewrite the sentence.
- Do not duplicate code. If you notice duplication, flag it to the user before
  adding more.
- Prefer many small commits to large ones. If asked for several features, do
  one commit per feature.
- Use `TODO` markers for placeholders, and explicitly mention each TODO in your
  reply so it is not forgotten.
- Tests live under `tests/`. Pytest for backend, Playwright for e2e. Add a
  test alongside any non-trivial change.
- Supported runtime is `sudo docker compose up`. Do not introduce alternative
  deployment paths without asking.
- Use `python`, not `python3`.
- Logging: stdout only, via Python's `logging` module. No metrics endpoint.
- Browser/OS install and compatibility instructions live in **two** places
  that must stay in sync: the top-level `README.md` (so they are visible on
  GitHub without running the app) and the in-app `/about` page rendered
  from `app/templates/about.html`. When you learn something new about
  driver setup, browser flags, or per-platform quirks, update both.

## 11. Attribution

The project skeleton, specification, and this `CLAUDE.md` were drafted with
Claude Code (Anthropic). Future contributions will continue to use Claude Code
where helpful.
