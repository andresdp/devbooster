#!/bin/sh
# Container smoke checks for the kanban app (spec 004, research R14).
#
# Requires only Docker (with Compose) and curl on the host. No jq or Python:
# JSON is parsed inside the freshly built backend image (json_get) and
# container state is read with Go templates.
#
# Safety: everything runs in the throwaway Compose project "kanban-smoke"
# (and "kanban-alt" for the settings checks) on port $SMOKE_PORT (default 8089).
# It builds images tagged ":smoke", so it never retags the ":local" images your
# own app uses, and it NEVER touches project "kanban" or its data volume.
#
# Usage: scripts/docker-smoke.sh        Exit code: 0 = every check passed.
set -eu

cd "$(dirname "$0")/.."

PROJECT=kanban-smoke
ALT_PROJECT=kanban-alt
export KANBAN_PORT="${SMOKE_PORT:-8089}"
export KANBAN_IMAGE_TAG=smoke

# Compose also reads KANBAN_* from the root .env for interpolation, even with -p. Pin the
# documented defaults so a developer's .env (e.g. KANBAN_BIND_ADDRESS=0.0.0.0,
# KANBAN_SEED_ON_STARTUP=false, KANBAN_CORS_ORIGINS=*) cannot change this throwaway stack.
# Shell variables take precedence over .env, even when empty.
export KANBAN_BIND_ADDRESS=127.0.0.1
export KANBAN_SEED_ON_STARTUP=true
export KANBAN_CORS_ORIGINS=
export KANBAN_DATABASE_URL=sqlite:////data/kanban.db
export KANBAN_BACKEND_UPSTREAM=http://backend:8000
BASE="http://127.0.0.1:$KANBAN_PORT"
FAILURES=0
PASSES=0

compose() { docker compose -p "$PROJECT" "$@"; }

pass() {
  PASSES=$((PASSES + 1))
  echo "  PASS  $1"
}

fail() {
  FAILURES=$((FAILURES + 1))
  echo "  FAIL  $1: $2"
}

# expect_eq NAME EXPECTED ACTUAL
expect_eq() {
  if [ "$2" = "$3" ]; then pass "$1"; else fail "$1" "expected '$2', got '$3'"; fi
}

# expect_contains NAME NEEDLE HAYSTACK
expect_contains() {
  case "$3" in
    *"$2"*) pass "$1" ;;
    *) fail "$1" "'$2' not found" ;;
  esac
}

# check NAME COMMAND... — pass if the command succeeds, fail otherwise.
check() {
  name=$1
  shift
  if "$@" >/dev/null 2>&1; then pass "$name"; else fail "$name" "command failed: $*"; fi
}

http_status() { curl -s -o /dev/null -w '%{http_code}' "$@" || true; }
http_body() { curl -s "$@" || true; }
http_headers() { curl -s -D - -o /dev/null "$@" || true; }

# header_value NAME < headers — prints the value of one response header (case-insensitive).
header_value() {
  tr -d '\r' | awk -v n="$1" 'tolower($0) ~ "^" tolower(n) ":" { sub(/^[^:]*:[ \t]*/, ""); print; exit }'
}

# wait_up — start/restart the stack and wait until healthy; on failure, show why.
wait_up() {
  if ! out=$(compose up -d --wait 2>&1); then
    printf '%s\n' "$out" | tail -n 5 | sed 's/^/        /'
    compose ps -a --format '        {{.Service}}: {{.Status}}' 2>/dev/null || true
    for svc in backend frontend; do
      docker inspect -f "        $svc health log:{{range .State.Health.Log}} [{{.Start.Format \"15:04:05\"}} exit={{.ExitCode}}]{{end}}" \
        "$(compose ps -aq "$svc")" 2>/dev/null || true
    done
    compose logs --no-color --tail 8 frontend 2>/dev/null | sed 's/^/        /' || true
    return 1
  fi
}

health() { docker inspect -f '{{.State.Health.Status}}' "$(compose ps -q "$1")" 2>/dev/null || echo missing; }

# json_get PY_EXPR — reads JSON on stdin, prints the expression evaluated with the JSON as `d`.
json_get() {
  docker run --rm -i --entrypoint python "kanban-backend:$KANBAN_IMAGE_TAG" \
    -c 'import json,sys; d=json.load(sys.stdin); print(eval(sys.argv[1]))' "$1"
}

cleanup() {
  status=$?
  trap - EXIT INT TERM
  # Destructive (down -v), but only on the throwaway kanban-smoke / kanban-alt projects.
  docker compose -p "$ALT_PROJECT" down -v --remove-orphans >/dev/null 2>&1 || true
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT INT TERM

check_us1() {
  # (a) both services healthy
  expect_eq "backend healthy" healthy "$(health backend)"
  expect_eq "frontend healthy" healthy "$(health frontend)"

  # (b) the board page
  expect_eq "GET / status" 200 "$(http_status "$BASE/")"
  index_html=$(http_body "$BASE/")
  expect_contains "GET / serves the SPA" '<div id="root"' "$index_html"

  # (c) deep link falls back to index.html, never cached
  expect_eq "GET /boards/1 status (SPA fallback)" 200 "$(http_status "$BASE/boards/1")"
  expect_contains "GET /boards/1 serves the SPA" '<div id="root"' "$(http_body "$BASE/boards/1")"
  expect_eq "index.html Cache-Control" no-cache \
    "$(http_headers "$BASE/boards/1" | header_value Cache-Control)"

  # (d) API through the single address, sample board seeded once
  expect_eq "GET /api/v1/boards status" 200 "$(http_status "$BASE/api/v1/boards")"
  expect_eq "exactly one board, named Sample Project" "['Sample Project']" \
    "$(http_body "$BASE/api/v1/boards" | json_get "[b['name'] for b in d]")"

  # (e)/(f) API docs under the app address
  expect_eq "GET /docs status" 200 "$(http_status "$BASE/docs")"
  expect_contains "GET /docs is Swagger UI" swagger-ui "$(http_body "$BASE/docs")"
  expect_eq "GET /openapi.json status" 200 "$(http_status "$BASE/openapi.json")"
  expect_contains "GET /openapi.json is an OpenAPI document" '"openapi"' "$(http_body "$BASE/openapi.json")"

  # (g)/(h) one published port, loopback only
  # Read the bindings directly: some Compose versions print "invalid IP:0" for unpublished ports.
  expect_eq "backend has no published port" "{}" \
    "$(docker inspect -f '{{json .HostConfig.PortBindings}}' "$(compose ps -q backend)" 2>/dev/null || true)"
  expect_eq "frontend published on loopback only" "127.0.0.1:$KANBAN_PORT" \
    "$(compose port frontend 8080 2>/dev/null || true)"

  # (i) unknown API path is answered by the backend's uniform JSON error, not nginx HTML
  expect_eq "unknown API path status" 404 "$(http_status "$BASE/api/v1/does-not-exist")"
  expect_eq "unknown API path uses the uniform error body" http_error \
    "$(http_body "$BASE/api/v1/does-not-exist" | json_get "d['error']['code']" 2>/dev/null || true)"

  # (j) no nginx version disclosed
  server=$(http_headers "$BASE/" | header_value Server)
  case "$server" in
    *[0-9]*) fail "Server header hides the nginx version" "got '$server'" ;;
    *) pass "Server header hides the nginx version" ;;
  esac

  # (k) hashed assets cached forever
  asset=$(printf '%s' "$index_html" | grep -o '/assets/[^"]*' | head -n 1 || true)
  if [ -z "$asset" ]; then
    fail "index.html references a hashed asset" "no /assets/ reference found"
  else
    expect_eq "GET $asset status" 200 "$(http_status "$BASE$asset")"
    expect_contains "assets Cache-Control is immutable" immutable \
      "$(http_headers "$BASE$asset" | header_value Cache-Control)"
  fi

  # (l) non-root processes (FR-017)
  expect_eq "backend runs as UID 10001" 10001 "$(compose exec -T backend id -u 2>/dev/null || true)"
  expect_eq "frontend runs as UID 101" 101 "$(compose exec -T frontend id -u 2>/dev/null || true)"

  # (m) image hygiene (FR-016)
  check "backend image has no tests, scripts, local DB or .env" \
    docker run --rm --entrypoint sh "kanban-backend:$KANBAN_IMAGE_TAG" -c \
    'test ! -e /app/tests && test ! -e /app/scripts && ! ls /app/kanban.db* 2>/dev/null && test ! -e /app/.env'
  check "backend image has no dev tools (pytest, ruff)" \
    docker run --rm --entrypoint python "kanban-backend:$KANBAN_IMAGE_TAG" -c \
    'import importlib.util as u, sys; sys.exit(any(u.find_spec(m) for m in ("pytest", "ruff")))'
  check "frontend image has no node_modules or .env files" \
    docker run --rm --entrypoint sh "kanban-frontend:$KANBAN_IMAGE_TAG" -c \
    'test -z "$(find / -xdev \( -name node_modules -o -name ".env*" \) 2>/dev/null)"'
  check "frontend bundle has no absolute API address (localhost:8000)" \
    docker run --rm --entrypoint sh "kanban-frontend:$KANBAN_IMAGE_TAG" -c \
    '! grep -rq "localhost:8000" /usr/share/nginx/html'

  # Compose reads the root .env for interpolation only: none of its names may reach a container.
  leaked=""
  if [ -f .env ]; then
    for name in $(sed -n 's/^[[:space:]]*\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env); do
      case "$name" in KANBAN_*) continue ;; esac
      for svc in backend frontend; do
        if compose exec -T "$svc" env 2>/dev/null | grep -q "^$name="; then leaked="$leaked $svc:$name"; fi
      done
    done
  fi
  expect_eq "root .env variables are not passed into containers" "" "$leaked"

  # (n) production mode (FR-013)
  cmdline=$(compose exec -T backend cat /proc/1/cmdline 2>/dev/null | tr '\0' ' ' || true)
  expect_contains "backend runs uvicorn" uvicorn "$cmdline"
  case "$cmdline" in
    *--reload*) fail "backend runs without --reload" "cmdline: $cmdline" ;;
    *) pass "backend runs without --reload" ;;
  esac

  # (o) health ordering (FR-005)
  config_json=$(compose config --format json 2>/dev/null || echo '{}')
  expect_eq "frontend waits for a healthy backend" service_healthy \
    "$(printf '%s' "$config_json" | json_get "d['services']['frontend']['depends_on']['backend']['condition']" 2>/dev/null || true)"
  expect_eq "both services define a healthcheck" True \
    "$(printf '%s' "$config_json" | json_get "all('healthcheck' in d['services'][s] for s in ('backend', 'frontend'))" 2>/dev/null || true)"

  # (p) network setting is configurable, loopback by default (config only)
  expect_eq "default bind address is 127.0.0.1" 127.0.0.1 \
    "$(printf '%s' "$config_json" | json_get "d['services']['frontend']['ports'][0]['host_ip']" 2>/dev/null || true)"
  expect_eq "KANBAN_BIND_ADDRESS=0.0.0.0 is honoured" 0.0.0.0 \
    "$(KANBAN_BIND_ADDRESS=0.0.0.0 compose config --format json 2>/dev/null |
      json_get "d['services']['frontend']['ports'][0]['host_ip']" 2>/dev/null || true)"

  # (q) API down -> uniform JSON 503 from nginx (Principle VII). Runs last: it stops the backend.
  compose stop backend >/dev/null 2>&1 || true
  down_dir=$(mktemp -d)
  result=$(curl -s -D "$down_dir/headers" -o "$down_dir/body" -w '%{http_code} %{time_total}' "$BASE/api/v1/boards" || true)
  status=${result%% *}
  seconds=${result#* }
  case "${seconds%%.*}" in
    [0-4]) pass "API down answers fast (${seconds}s)" ;;
    *) fail "API down answers within 5s" "took ${seconds}s" ;;
  esac
  case "$status" in
    502 | 503 | 504) pass "API down answers $status" ;;
    *) fail "API down answers 502/503/504" "got $status" ;;
  esac
  expect_contains "API down Content-Type is JSON" application/json \
    "$(header_value Content-Type <"$down_dir/headers")"
  expect_contains "API down body is the uniform error" '"service_unavailable"' "$(cat "$down_dir/body")"
  rm -rf "$down_dir"
  if ! wait_up; then
    fail "stack restarts after the API-down check" "compose up -d --wait failed"
  fi
}

post_json() { curl -s -X POST -H 'Content-Type: application/json' -d "$2" "$1" || true; }

sample_board_count() {
  http_body "$BASE/api/v1/boards" | json_get "sum(1 for b in d if b['name'] == 'Sample Project')" 2>/dev/null || echo error
}

# assert_persisted LABEL KEY — the ticket, its comment and history survived; sample board once.
assert_persisted() {
  expect_eq "$1: ticket $2 exists" 200 "$(http_status "$BASE/api/v1/tickets/$2")"
  expect_eq "$1: comment kept" True \
    "$(http_body "$BASE/api/v1/tickets/$2/comments" | json_get "any(c['text'] == 'persist-comment' for c in d)" 2>/dev/null || echo error)"
  expect_eq "$1: history kept" True \
    "$(http_body "$BASE/api/v1/tickets/$2/history" | json_get "isinstance(d, list) and len(d) > 0" 2>/dev/null || echo error)"
  expect_eq "$1: Sample Project exactly once" 1 "$(sample_board_count)"
}

check_us2() {
  board_id=$(http_body "$BASE/api/v1/boards" | json_get "d[0]['id']" 2>/dev/null || true)
  title="persist-check-$(date +%s)"
  key=$(post_json "$BASE/api/v1/boards/$board_id/tickets" "{\"title\": \"$title\"}" |
    json_get "d['key']" 2>/dev/null || true)
  if [ -z "$key" ]; then
    fail "create a ticket to persist" "POST /api/v1/boards/$board_id/tickets returned no key"
    return 0
  fi
  post_json "$BASE/api/v1/tickets/$key/comments" '{"author": "smoke", "text": "persist-comment"}' >/dev/null
  assert_persisted "before restarts" "$key"

  for cycle in 1 2 3; do
    compose down >/dev/null 2>&1 # no -v: the data volume must survive
    if wait_up; then assert_persisted "down/up #$cycle" "$key"; else fail "down/up #$cycle" "stack did not come back"; fi
  done

  if compose up -d --build --wait >/dev/null 2>&1; then
    assert_persisted "rebuild" "$key"
  else
    fail "rebuild" "compose up --build failed"
  fi

  # Unexpected stop: SIGKILL, no clean shutdown.
  compose kill backend >/dev/null 2>&1 || true
  if wait_up; then assert_persisted "after kill" "$key"; else fail "after kill" "stack did not come back"; fi

  if docker volume ls --format '{{.Name}}' | grep -qx "${PROJECT}_kanban-data"; then
    pass "named volume ${PROJECT}_kanban-data exists"
  else
    fail "named volume ${PROJECT}_kanban-data exists" "not found"
  fi

  # Reset (destructive) — only ever on the throwaway kanban-smoke project.
  compose down -v >/dev/null 2>&1 || true
  if wait_up; then
    expect_eq "reset: Sample Project exactly once" 1 "$(sample_board_count)"
    expect_eq "reset: persisted ticket is gone" 404 "$(http_status "$BASE/api/v1/tickets/$key")"
  else
    fail "reset" "stack did not come back after down -v"
  fi
}

image_ids() {
  docker image inspect -f '{{.Id}}' "kanban-backend:$KANBAN_IMAGE_TAG" "kanban-frontend:$KANBAN_IMAGE_TAG" 2>/dev/null | tr '\n' ' '
}

# preflight_origin BASE ORIGIN — the allowed origin returned for a CORS preflight, if any.
preflight_origin() {
  http_headers -X OPTIONS -H "Origin: $2" -H 'Access-Control-Request-Method: POST' \
    "$1/api/v1/boards" | header_value Access-Control-Allow-Origin
}

check_us4() {
  ids_before=$(image_ids)
  compose down >/dev/null 2>&1 || true # no -v

  alt_port=$((KANBAN_PORT + 1))
  alt_base="http://127.0.0.1:$alt_port"
  # Same ":smoke" images (KANBAN_IMAGE_TAG is inherited), no --build: settings come from outside.
  if ! KANBAN_PORT=$alt_port KANBAN_SEED_ON_STARTUP=false KANBAN_CORS_ORIGINS=https://example.test \
    docker compose -p "$ALT_PROJECT" up -d --wait >/dev/null 2>&1; then
    fail "start $ALT_PROJECT with outside settings" "compose up failed"
    return 0
  fi

  expect_eq "app answers on the configured port $alt_port" 200 "$(http_status "$alt_base/")"
  expect_eq "seeding off: no boards" "[]" \
    "$(http_body "$alt_base/api/v1/boards" | json_get "d" 2>/dev/null || echo error)"
  expect_eq "configured CORS origin is allowed" https://example.test \
    "$(preflight_origin "$alt_base" https://example.test)"
  expect_eq "other CORS origins are not allowed" "" \
    "$(preflight_origin "$alt_base" https://evil.test)"
  expect_eq "no image was rebuilt" "$ids_before" "$(image_ids)"

  # Destructive (down -v), but only on the throwaway kanban-alt project.
  docker compose -p "$ALT_PROJECT" down -v --remove-orphans >/dev/null 2>&1 || true
}

echo "==> Building and starting project $PROJECT on $BASE"
if ! compose up -d --build --wait; then
  echo "ERROR: 'docker compose up' failed for project $PROJECT; no checks were run." >&2
  exit 1
fi

echo "==> US1: one-command app, routing, hardening"
check_us1
echo "==> US2: data survives restarts"
check_us2
echo "==> US4: settings from outside the images"
check_us4

echo
echo "Summary: $PASSES passed, $FAILURES failed"
if [ "$FAILURES" -gt 0 ]; then exit 1; fi
exit 0
