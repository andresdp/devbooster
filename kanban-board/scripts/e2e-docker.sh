#!/bin/sh
# Run the existing Playwright E2E suite against the containerized app (spec 004, research R10).
#
# Requires only Docker (with Compose >= 2.24). Everything runs in the throwaway Compose project
# "kanban-e2e" (unseeded backend, no host port) with images tagged ":e2e", so it never touches
# your own "kanban" project, its data volume or its ":local" images.
#
# Usage:     scripts/e2e-docker.sh [playwright test args]   e.g. tests/move-ticket.spec.js
# Exit code: the Playwright runner's exit code (0 = every check passed); non-zero before any
#            check runs if the images fail to build or the app fails to start.
# Evidence:  e2e/test-results/ (trace + screenshot per failing check) and e2e/playwright-report/,
#            replaced on every run.
set -eu

cd "$(dirname "$0")/.."

PROJECT=kanban-e2e
RUNNER=kanban-e2e-runner
export KANBAN_IMAGE_TAG=e2e

# Compose also reads KANBAN_* from the root .env for interpolation, even with -p. Pin the
# documented defaults so a developer's .env (e.g. KANBAN_BIND_ADDRESS=0.0.0.0,
# KANBAN_SEED_ON_STARTUP=false, KANBAN_CORS_ORIGINS=*) cannot change this throwaway stack.
# Shell variables take precedence over .env, even when empty.
export KANBAN_BIND_ADDRESS=127.0.0.1
export KANBAN_SEED_ON_STARTUP=true
export KANBAN_CORS_ORIGINS=
export KANBAN_DATABASE_URL=sqlite:////data/kanban.db
export KANBAN_BACKEND_UPSTREAM=http://backend:8000

compose() { docker compose -p "$PROJECT" -f compose.yaml -f compose.e2e.yaml "$@"; }

cleanup() {
  code=$?
  trap - EXIT INT TERM
  docker rm -f "$RUNNER" >/dev/null 2>&1 || true
  # Destructive (down -v), but only on the throwaway kanban-e2e project — never "kanban".
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  exit "$code"
}
trap cleanup EXIT INT TERM

# A runner left over from an interrupted run would block --name.
docker rm -f "$RUNNER" >/dev/null 2>&1 || true

echo "==> Building images (project $PROJECT)"
compose build

echo "==> Starting the app and running the E2E suite"
status=0
compose run --name "$RUNNER" e2e npx playwright test "$@" || status=$?

echo "==> Copying evidence to e2e/"
rm -rf e2e/test-results e2e/playwright-report
docker cp "$RUNNER":/e2e/test-results e2e/ >/dev/null 2>&1 || true
docker cp "$RUNNER":/e2e/playwright-report e2e/ >/dev/null 2>&1 || true
[ -d e2e/test-results ] && echo "    Traces/screenshots: e2e/test-results/"
[ -f e2e/playwright-report/index.html ] && echo "    HTML report:        e2e/playwright-report/index.html"

exit "$status"
