#!/usr/bin/env bash
# Corre tests y lint del backend y del frontend.
# Guarda toda la salida en .loop/verify.log y sale con 0 solo si todo pasa.
# No corta en el primer fallo: corre todos los chequeos para que el log sea completo.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 1

LOG=".loop/verify.log"
mkdir -p .loop
[ -f .loop/.gitignore ] || printf '*\n' > .loop/.gitignore
: > "$LOG"

FALLARON=""

# chequeo <nombre> <comando...>
chequeo() {
  local nombre="$1"
  shift
  printf '\n===== %s =====\n$ %s\n' "$nombre" "$*" >> "$LOG"
  if "$@" >> "$LOG" 2>&1; then
    printf '  ok     %s\n' "$nombre"
    printf -- '----- %s: OK -----\n' "$nombre" >> "$LOG"
  else
    printf '  FALLA  %s\n' "$nombre"
    printf -- '----- %s: FALLA -----\n' "$nombre" >> "$LOG"
    FALLARON="${FALLARON}${FALLARON:+, }${nombre}"
  fi
}

echo "Verificando (detalle en ${LOG})"

chequeo "backend: pytest"       uv run --directory backend pytest -q
chequeo "backend: ruff check"   uv run --directory backend ruff check .
chequeo "backend: ruff format"  uv run --directory backend ruff format --check .
chequeo "frontend: vitest"      npm --prefix frontend test
chequeo "frontend: eslint"      npm --prefix frontend run lint
chequeo "frontend: typecheck"   npm --prefix frontend run typecheck
chequeo "frontend: prettier"    npm --prefix frontend run format:check

if [ -n "$FALLARON" ]; then
  printf '\n===== RESULTADO: FALLA (%s) =====\n' "$FALLARON" >> "$LOG"
  echo "FALLA: ${FALLARON}"
  exit 1
fi

printf '\n===== RESULTADO: OK =====\n' >> "$LOG"
echo "OK: todo pasa"
exit 0
