#!/usr/bin/env bash
# Run a single prompt (optionally with an image) against one or every GGUF
# under data/models/. Complements bench-models.sh: that one reports raw
# throughput, this one lets you eyeball quality and latency on a real
# prompt, with or without a multimodal input.
#
# Usage:
#   scripts/test-prompt.sh -p "Bonjour, comment vas-tu?"
#   scripts/test-prompt.sh -m Qwen3.5-2B-Q8_0/Qwen3.5-2B-Q8_0.gguf -p "Hello"
#   scripts/test-prompt.sh -i ./tests/images/sample.png -p "Describe this image"
#
# Flags:
#   -m, --model    GGUF path relative to data/models/. If omitted, every
#                  non-mmproj GGUF is run in turn.
#   -i, --image    Optional image path. When set, the script switches to
#                  llama-mtmd-cli and auto-picks the sibling *mmproj*.gguf
#                  inside the model's folder. Models without a projector
#                  are skipped with a warning.
#   -p, --prompt   Prompt text (required).
#   -n             Max tokens to generate (default 128).
#
# Env overrides:
#   MODELS_DIR        defaults to ./data/models
#   LLAMA_IMAGE_LIGHT defaults to ghcr.io/ggml-org/llama.cpp:light (text only)
#   LLAMA_IMAGE_FULL  defaults to ghcr.io/ggml-org/llama.cpp:full  (with image)
#   THREADS           defaults to $(nproc)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODELS_DIR="${MODELS_DIR:-$REPO_ROOT/data/models}"
IMAGE_LIGHT="${LLAMA_IMAGE_LIGHT:-ghcr.io/ggml-org/llama.cpp:light}"
IMAGE_FULL="${LLAMA_IMAGE_FULL:-ghcr.io/ggml-org/llama.cpp:full}"
THREADS="${THREADS:-$(nproc)}"

MODEL=""
IMAGE_PATH=""
PROMPT=""
N_PREDICT="128"

usage() {
  sed -n '2,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//; /^set -euo/d'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--model)  MODEL="$2"; shift 2;;
    -i|--image)  IMAGE_PATH="$2"; shift 2;;
    -p|--prompt) PROMPT="$2"; shift 2;;
    -n)          N_PREDICT="$2"; shift 2;;
    -h|--help)   usage; exit 0;;
    *)           echo "unknown argument: $1" >&2; usage >&2; exit 2;;
  esac
done

if [[ -z "$PROMPT" ]]; then
  echo "missing required --prompt" >&2
  exit 2
fi

if [[ ! -d "$MODELS_DIR" ]]; then
  echo "models dir not found: $MODELS_DIR" >&2
  exit 1
fi

run_one() {
  local rel="$1"
  local dir
  dir="$(dirname "$MODELS_DIR/$rel")"

  echo
  echo "===== $rel ====="

  if [[ -n "$IMAGE_PATH" ]]; then
    local mmproj_host
    mmproj_host="$(find "$dir" -maxdepth 1 -type f -name '*mmproj*.gguf' | head -n1 || true)"
    if [[ -z "$mmproj_host" ]]; then
      echo "[skip] no sibling *mmproj*.gguf next to $rel, cannot run with --image" >&2
      return 0
    fi
    local mmproj_rel="${mmproj_host#"$MODELS_DIR"/}"
    local abs_image
    abs_image="$(readlink -f "$IMAGE_PATH")"
    if [[ ! -f "$abs_image" ]]; then
      echo "image not found: $IMAGE_PATH" >&2
      exit 1
    fi
    sudo docker run --rm \
      -v "$MODELS_DIR":/models \
      -v "$abs_image":/image.bin:ro \
      --entrypoint /app/llama-mtmd-cli \
      "$IMAGE_FULL" \
      -m "/models/$rel" \
      --mmproj "/models/$mmproj_rel" \
      --image /image.bin \
      -t "$THREADS" \
      -n "$N_PREDICT" \
      -p "$PROMPT"
  else
    sudo docker run --rm \
      -v "$MODELS_DIR":/models \
      "$IMAGE_LIGHT" \
      -m "/models/$rel" \
      -t "$THREADS" \
      -n "$N_PREDICT" \
      -no-cnv \
      -p "$PROMPT"
  fi
}

if [[ -n "$MODEL" ]]; then
  if [[ ! -f "$MODELS_DIR/$MODEL" ]]; then
    echo "model not found: $MODELS_DIR/$MODEL" >&2
    exit 1
  fi
  run_one "$MODEL"
else
  # Smallest file first so quick models run before the long ones.
  mapfile -d '' models < <(
    find "$MODELS_DIR" -type f -name '*.gguf' ! -name '*mmproj*' -printf '%s\t%p\0' \
      | sort -z -n \
      | sed -z 's/^[0-9]*\t//'
  )
  if [[ ${#models[@]} -eq 0 ]]; then
    echo "no GGUFs under $MODELS_DIR" >&2
    exit 1
  fi
  echo "[test-prompt] $((${#models[@]})) model(s), $THREADS threads"
  for path in "${models[@]}"; do
    rel="${path#"$MODELS_DIR"/}"
    run_one "$rel"
  done
fi
