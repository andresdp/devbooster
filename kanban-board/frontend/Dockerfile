# syntax=docker/dockerfile:1

# Kanban frontend: Vite build served by non-root nginx, which also proxies the API.
# Base image tags are pinned in specs/004-containerize-app/research.md ("Pinned versions").

# ---- build: type-check and bundle the React app ----
FROM node:24.22.2-trixie-slim AS build
WORKDIR /app

RUN --mount=type=cache,target=/root/.npm \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    npm ci

COPY . .

# Empty base URL (not a build ARG): client.ts uses `??`, so the app calls relative
# /api/v1/... URLs on its own origin and the image has no environment-specific address.
ENV VITE_API_BASE_URL=""

# `npm run build` runs `tsc -b`, so type errors fail the image build.
RUN npm run build \
    && if grep -rq "localhost:8000" dist/; then \
         echo "ERROR: dist/ contains an absolute API address (localhost:8000)" >&2; exit 1; \
       fi

# ---- runtime: static files + reverse proxy ----
FROM nginxinc/nginx-unprivileged:1.30.6-alpine AS runtime

LABEL org.opencontainers.image.title="kanban-frontend" \
      org.opencontainers.image.description="Kanban web app served by nginx, proxying /api to the backend" \
      org.opencontainers.image.source="https://github.com/andresdp/devbooster"

COPY --link --chown=101:101 --from=build /app/dist /usr/share/nginx/html
COPY --link nginx/default.conf.template /etc/nginx/templates/default.conf.template

# BACKEND_UPSTREAM must be scheme://host:port with no path. NGINX_ENTRYPOINT_LOCAL_RESOLVERS makes
# the entrypoint export NGINX_LOCAL_RESOLVERS (the container's DNS) for the template's resolver.
ENV BACKEND_UPSTREAM=http://backend:8000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    NGINX_ENVSUBST_FILTER="BACKEND_UPSTREAM|NGINX_LOCAL_RESOLVERS"

USER 101
EXPOSE 8080

# Probing through nginx proves static serving, proxying and backend readiness at once.
HEALTHCHECK --interval=5s --timeout=3s --retries=5 --start-period=15s --start-interval=1s \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/api/v1/boards"]
