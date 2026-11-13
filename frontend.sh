#!/usr/bin/env bash
# Next.js 개발 서버 실행. 어느 위치에서 실행해도 된다: ./frontend.sh
# 포트 변경: FRONTEND_PORT=3005 ./frontend.sh
set -Eeuo pipefail

SCRIPT_NAME="frontend.sh"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ROOT_DIR/scripts/common.sh"
trap 'on_error "$LINENO" "$BASH_COMMAND" "$?"' ERR

require_node_pnpm
ensure_deps "$ROOT_DIR/frontend/node_modules/.bin/next"

if [ ! -f "$ROOT_DIR/frontend/.env.local" ]; then
  warn "frontend/.env.local 이 없습니다. NEXT_PUBLIC_API_URL 로 백엔드 주소를 지정합니다."
  ensure_env "frontend/.env.local" "frontend/.env.example"
fi

export FRONTEND_PORT="${FRONTEND_PORT:-3000}"
ensure_port_free "$FRONTEND_PORT" "frontend"

API_URL="$(read_env "$ROOT_DIR/frontend/.env.local" NEXT_PUBLIC_API_URL)"
API_URL="${API_URL:-http://localhost:3001/api}"
if command -v curl >/dev/null 2>&1 && ! curl -fsS -m 2 "$API_URL/health" >/dev/null 2>&1; then
  warn "백엔드($API_URL/health)가 응답하지 않습니다. 화면의 Health 확인은 ./backend.sh 실행 후 동작합니다."
fi

log "Next.js 개발 서버 시작 → http://localhost:$FRONTEND_PORT"
cd "$ROOT_DIR/frontend"
exec pnpm dev
