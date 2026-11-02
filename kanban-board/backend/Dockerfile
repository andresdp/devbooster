# syntax=docker/dockerfile:1

# Kanban backend: FastAPI served by uvicorn, dependencies installed by uv from uv.lock.
# Base image tags are pinned in specs/004-containerize-app/research.md ("Pinned versions").

# ---- build: resolve the locked runtime dependencies into /app/.venv ----
FROM python:3.12.16-slim-trixie AS build
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.13.6 /uv /uvx /bin/

# Compile bytecode for faster starts, copy (not hard-link) from the cache mount,
# and always use the image's own Python so the venv works in the runtime stage.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

# --locked fails the build if uv.lock is out of date with pyproject.toml
# (--frozen would silently install the stale lock).
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync --locked --no-dev --no-install-project

# ---- runtime: slim image with the venv and the app code only ----
FROM python:3.12.16-slim-trixie AS runtime
WORKDIR /app

LABEL org.opencontainers.image.title="kanban-backend" \
      org.opencontainers.image.description="Kanban ticketing REST API (FastAPI + SQLite)" \
      org.opencontainers.image.source="https://github.com/andresdp/devbooster"

# Fixed non-root user; /data holds the SQLite database (mount a volume there).
RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin app \
    && mkdir /data \
    && chown 10001:10001 /data

COPY --link --chown=10001:10001 --from=build /app/.venv /app/.venv
COPY --link --chown=10001:10001 app/ /app/app/

ENV PATH=/app/.venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    DATABASE_URL=sqlite:////data/kanban.db \
    CORS_ORIGINS= \
    SEED_ON_STARTUP=true

USER 10001:10001
EXPOSE 8000

# GET /api/v1/boards touches the database, so "healthy" means "can serve requests".
HEALTHCHECK --interval=5s --timeout=3s --retries=5 --start-period=15s --start-interval=1s \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/boards', timeout=2)"]

# Production mode: no --reload, one worker (SQLite writes are serialized in-process).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
