#!/usr/bin/env bash
# Benchmark every GGUF under data/models/ with llama-bench (CPU only).
#
# Usage:
#   scripts/bench-models.sh                       # default -p 512 -n 128
#   scripts/bench-models.sh -p 256 -n 64          # forward extra args to llama-bench
#   THREADS=8 scripts/bench-models.sh             # override thread count
#   LLAMA_IMAGE=ghcr.io/ggml-org/llama.cpp:full-cuda scripts/bench-models.sh
#
# Prints prompt-eval and token-generation throughput per model so you can
# compare laptop CPU performance against what the browser path achieves.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODELS_DIR="${MODELS_DIR:-$REPO_ROOT/data/models}"
IMAGE="${LLAMA_IMAGE:-ghcr.io/ggml-org/llama.cpp:full}"
THREADS="${THREADS:-$(nproc)}"

if [[ ! -d "$MODELS_DIR" ]]; then
  echo "models dir not found: $MODELS_DIR" >&2
  exit 1
fi

# Collect every .gguf except the multimodal projector siblings. For models
# split by llama-gguf-split (see app/model_split.py) only the first shard
# (-00001-of-NNNNN.gguf) is kept; llama.cpp follows the chain from there.
# Smallest file first so the quick models warm up the cache and the long
# runs land at the end. For split models the "size" is just the first
# shard, which is fine for ordering.
mapfile -d '' models < <(
  find "$MODELS_DIR" -type f -name '*.gguf' \
    ! -name '*mmproj*' \
    ! \( -name '*-of-*.gguf' ! -name '*-00001-of-*.gguf' \) \
    -printf '%s\t%p\0' \
    | sort -z -n \
    | sed -z 's/^[0-9]*\t//'
)

if [[ ${#models[@]} -eq 0 ]]; then
  echo "no GGUFs found under $MODELS_DIR" >&2
  exit 1
fi

echo "[bench-models] $((${#models[@]})) model(s), $THREADS threads, image $IMAGE"

for path in "${models[@]}"; do
  rel="${path#"$MODELS_DIR"/}"
  echo
  echo "===== $rel ====="
  sudo docker run --rm \
    -v "$MODELS_DIR":/models \
    "$IMAGE" --bench \
    -m "/models/$rel" \
    -t "$THREADS" \
    "$@"
done
