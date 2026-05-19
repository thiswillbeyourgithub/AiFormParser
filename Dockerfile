# TODO: pin python:3.13-slim by digest once a base image is chosen for production.
# TODO: pin ghcr.io/ggml-org/llama.cpp:full by digest as well; it ships
# llama-gguf-split, which we use at startup to break oversized GGUFs into
# the 512MB chunks recommended by the wllama README.
FROM ghcr.io/ggml-org/llama.cpp:full AS llama-cpp

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_NO_CACHE=1 \
    UV_SYSTEM_PYTHON=1

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Bring in llama-gguf-split (and its sibling shared libraries) from the
# upstream llama.cpp image. The binaries dlopen libllama / libggml at run
# time, so the .so files have to land in the same directory. We expose the
# whole drop under /opt/llama-cpp and add it to PATH + LD_LIBRARY_PATH.
COPY --from=llama-cpp /app/llama-gguf-split /opt/llama-cpp/
COPY --from=llama-cpp /app/*.so* /opt/llama-cpp/
ENV PATH="/opt/llama-cpp:${PATH}" \
    LD_LIBRARY_PATH="/opt/llama-cpp:${LD_LIBRARY_PATH}"

WORKDIR /app

COPY requirements.txt ./
RUN uv pip install --system -r requirements.txt

COPY app ./app

# Run as a non-root user. UID/GID 1001 matches the docker-compose `user:`
# pin. The bind-mounted host data directory must be owned by 1001:1001
# (or be group/world writable) so admin saves and model_split.split_oversized_models
# can write under it; otherwise startup fails with EACCES.
RUN groupadd --system --gid 1001 aiformparser \
 && useradd --system --uid 1001 --gid 1001 --home-dir /home/aiformparser \
            --create-home --shell /usr/sbin/nologin aiformparser
USER 1001:1001

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
