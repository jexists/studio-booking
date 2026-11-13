#!/usr/bin/env bash
# DB 접속·스키마 확인 → 마이그레이션 → NestJS 개발 서버 실행. 어느 위치에서 실행해도 된다: ./backend.sh
# DB는 backend/.env 의 DATABASE_URL(외부 PostgreSQL 링크, ?schema=hackathon)을 사용한다.
# 포트는 backend/.env 의 PORT (또는 PORT=4001 ./backend.sh)
set -Eeuo pipefail

SCRIPT_NAME="backend.sh"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ROOT_DIR/scripts/common.sh"
trap 'on_error "$LINENO" "$BASH_COMMAND" "$?"' ERR

# 1) 도구·의존성·환경변수
require_node_pnpm
ensure_deps "$ROOT_DIR/backend/node_modules/.bin/nest"
ensure_env "backend/.env" "backend/.env.example"

if [ -z "$(read_env "$ROOT_DIR/backend/.env" DATABASE_URL)" ]; then
  die "backend/.env 에 DATABASE_URL(PostgreSQL 링크)이 없습니다. backend/.env.example 형식을 참고하세요."
fi

BACKEND_PORT="${PORT:-$(read_env "$ROOT_DIR/backend/.env" PORT)}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
ensure_port_free "$BACKEND_PORT" "backend"

cd "$ROOT_DIR/backend"

# 2) DB 접속 확인 + 스키마 생성(이미 있으면 그대로)
log "DB 접속 확인 및 스키마 준비 (pnpm db:schema)."
pnpm db:schema || die "DB에 접속하지 못했습니다. backend/.env 의 DATABASE_URL(주소·계정·sslmode)과 네트워크를 확인하세요."

# 3) Prisma: 마이그레이션 적용 (기존 마이그레이션만 적용, 데이터 삭제 없음)
if compgen -G "prisma/migrations/*/migration.sql" >/dev/null; then
  log "Prisma 마이그레이션 적용 (prisma migrate deploy)."
  pnpm exec prisma migrate deploy || die "마이그레이션 적용 실패. 위 로그를 확인하세요."
fi

set +e
pnpm exec prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --exit-code >/dev/null 2>&1
diff_code=$?
set -e
case "$diff_code" in
  0) ;;
  2) warn "schema.prisma 변경이 DB에 반영되지 않았습니다. 새 터미널에서 'pnpm db:migrate' 로 마이그레이션을 만드세요." ;;
  *) warn "DB 스키마 비교에 실패했습니다. DATABASE_URL(backend/.env)을 확인하세요." ;;
esac

# 4) NestJS 실행 (dev 스크립트가 prisma generate 후 nest start --watch)
log "Prisma Client 생성 후 NestJS 개발 서버 시작 → http://localhost:$BACKEND_PORT/api/health"
exec pnpm dev
