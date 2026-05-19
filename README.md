# AiFormParser

> [!WARNING]
> **Super early, highly experimental project.** This is a work in progress and
> nothing about it is stable: APIs, the YAML schema, the UI, and the processing
> pipeline can all change without notice, and things are expected to break.
> Do not rely on it for anything important yet.
>
> A live demo runs at **https://aiformparser.olicorne.org**, but it is very
> experimental and often down, slow, or mid-redeploy. If it does not load,
> that is expected; try again later or run it locally (see below).

Browser-side OCR and LLM extraction of paper clinical surveys into CSV.

An admin defines a survey template by drawing bounding boxes on a reference
scan. A researcher then uploads filled-in copies of that template and gets back
a CSV. All per-patient processing runs in the browser via `pdf.js`,
`tesseract.js`, and `wllama`; the server only stores blank templates.

See `CLAUDE.md` for the full specification.

## Run

Copy `.env.example` to `.env`, set `ADMIN_PASSWORD` and `SESSION_SECRET`, then:

```
sudo docker compose up
```

The app listens on `http://localhost:8000`.

## Tests

```
pip install -r requirements-dev.txt
pytest
```

## Browser and OS compatibility

Per-patient OCR and LLM inference run entirely in the researcher's browser,
so what works in practice depends on the browser's WASM (SIMD + threads) and
WebGPU support, and on the host OS's GPU driver stack. The notes below mirror
what is shown on the in-app `/about` page; keep the two in sync if you edit
either.

**Use a Chromium-based browser.** Per the
[wllama compatibility notes](https://github.com/ngxson/wllama/blob/master/compat/README.md),
Firefox and Safari are not supported here: Firefox cannot use WebGPU
acceleration in wllama's default mode, and Safari requires a slow compat
build that we deliberately disable via `wllama.setCompat(null)`. The app
shows a dismissible banner on non-Chromium browsers. Recommended browsers:
Chromium, Chrome, Brave, Edge, Opera.

To inspect what your browser actually exposes (WebGPU status, GPU vendor,
backend in use, any blocklisted features), open:

- Chromium-based browsers (Chrome, Chromium, Brave, Edge, Opera): `chrome://gpu`.
  The "Graphics Feature Status" table at the top is the quick read; WebGPU
  should say "Hardware accelerated" if it is actually being used.
- Mozilla Firefox: `about:support` and scroll to the "Graphics" section.
  Look at "Compositing", "WebGPU" and "Features" rows. For more detail on
  the active WebGPU adapter, `about:webgpu` is available in recent builds.

### Linux

#### Ubuntu 22.04, Intel UHD 620 integrated graphics (no external GPU)

Tested on a Lenovo laptop. Out of the box Chromium reported every graphics
feature as "Software only" and the LLM was slow (warmup around 70 s, per-box
around 30 s). The fix was, on the host:

```
sudo apt install mesa-vulkan-drivers vulkan-tools libvulkan1
sudo usermod -aG render $USER
# fully log out and log back in
groups          # must include "render"
vulkaninfo --summary | head -20   # must list the Intel UHD device
```

Then in `chrome://flags`: enable `#enable-unsafe-webgpu`, `#enable-vulkan`,
and `#ignore-gpu-blocklist`.

Caveat: even with all of the above in place, llama.cpp's WebGPU backend
currently fails to load on Intel Gen9 GPUs with an
`Entry-point uses workgroup_size(288, 1, 1) that exceeds the maximum allowed
(256, 256, 64)` error in its `memset` compute pipeline. Until that is fixed
upstream, you must turn `#enable-unsafe-webgpu` back off on Gen9 hardware
and use the CPU-only path.

#### Ubuntu 24.04, external NVIDIA GPU

TODO: fill in once tested end to end (proprietary driver version, whether
the Vulkan driver needs to be installed separately, any chrome flags
required, observed WebGPU performance vs CPU baseline).

### macOS

Not tested yet.

### Windows

Not tested yet.

### Browsers

| Browser | Version | Status |
|---|---|---|
| Brave | v1.90.124 (Chromium 148.1.90.124) | Works end to end in CPU-only mode on Ubuntu 22.04. WebGPU not enabled in this test. |
| Chromium (snap) | 148.0.7778.167 on Ubuntu 22.04 | CPU-only mode works. WebGPU could not be made to work: even with drivers and flags set, the Gen9 workgroup-size error above prevented the WebGPU backend from initialising. |

## Status

The admin and researcher pipelines are wired end to end: admin draws and
labels boxes over a 200 DPI scan with tesseract OCR captured into the
YAML, and the researcher side rasterises uploads, runs OCR, fuzzy-matches
anchors with an affine + translation-fallback, runs `wllama` per box
with a forced tool call for typed output, surfaces failures in a review
queue, and exports CSV or XLSX. The remaining open question (CLAUDE.md
§8) is whether the configured GGUF actually delivers good multimodal +
tool-calling behaviour in practice; the plumbing is in place either way.
There are no Playwright end-to-end tests yet; backend coverage is via
pytest.

## Attribution

The project skeleton, specification, and code were drafted with the help of
Claude Code (Anthropic).
