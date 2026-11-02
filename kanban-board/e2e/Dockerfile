# syntax=docker/dockerfile:1

# E2E runner: the existing Playwright suite in its external mode (BASE_URL + API_URL).
#
# Version coupling: the image tag MUST equal the @playwright/test version locked in
# package-lock.json (1.64.1), so the bundled browsers match the test runner. Bump both together.
FROM mcr.microsoft.com/playwright:v1.64.1-noble

LABEL org.opencontainers.image.title="kanban-e2e" \
      org.opencontainers.image.description="Playwright E2E runner for the kanban app" \
      org.opencontainers.image.source="https://github.com/andresdp/devbooster"

WORKDIR /e2e

# Browsers ship in the base image; npm ci only installs the test runner.
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    npm ci

COPY --link package.json package-lock.json playwright.config.js global-setup.js ./
COPY --link support/ ./support/
COPY --link tests/ ./tests/

# pwuser (built into the image) must own /e2e to write test-results/ and playwright-report/.
RUN chown -R pwuser:pwuser /e2e
USER pwuser

CMD ["npx", "playwright", "test"]
