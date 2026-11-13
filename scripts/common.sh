# frontend.sh / backend.sh 공용 함수. 직접 실행하지 않고 source 한다.

log()  { printf '\033[36m[%s]\033[0m %s\n' "$SCRIPT_NAME" "$*"; }
warn() { printf '\033[33m[%s] 경고:\033[0m %s\n' "$SCRIPT_NAME" "$*" >&2; }
die()  { printf '\033[31m[%s] 오류:\033[0m %s\n' "$SCRIPT_NAME" "$*" >&2; exit 1; }

on_error() {
  printf '\033[31m[%s] 오류:\033[0m %s 줄에서 실패한 명령: %s (종료 코드 %s)\n' \
    "$SCRIPT_NAME" "$1" "$2" "$3" >&2
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "$1 이(가) 설치되어 있지 않습니다. $2"
}

require_node_pnpm() {
  require_cmd node "Node.js 20 이상을 설치하세요: https://nodejs.org"
  require_cmd pnpm "corepack enable 또는 npm i -g pnpm 으로 설치하세요: https://pnpm.io/installation"
}

# node_modules 가 없을 때만 설치한다 (매번 재설치하지 않음).
ensure_deps() {
  local marker="$1"
  if [ ! -e "$marker" ]; then
    log "의존성이 없어 pnpm install 을 실행합니다."
    (cd "$ROOT_DIR" && pnpm install --frozen-lockfile) || die "pnpm install 실패. 위 로그를 확인하세요."
  fi
}

# .env 파일이 없으면 예시 파일에서 만들고 안내한다.
ensure_env() {
  local target="$1" example="$2"
  if [ ! -f "$ROOT_DIR/$target" ]; then
    [ -f "$ROOT_DIR/$example" ] || die "$target 과 $example 이 모두 없습니다."
    cp "$ROOT_DIR/$example" "$ROOT_DIR/$target"
    warn "$target 이 없어 $example 을 복사해 만들었습니다. 필요하면 값을 수정하세요."
  fi
}

# KEY=value 형식 파일에서 값 읽기 (없으면 빈 문자열)
read_env() {
  local file="$1" key="$2"
  [ -f "$file" ] || return 0
  grep -E "^${key}=" "$file" | tail -1 | cut -d= -f2- | tr -d '"'"'"' \r' || true
}

ensure_port_free() {
  local port="$1" name="$2"
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    die "$port 포트를 이미 다른 프로세스가 사용 중입니다($name). 기존 서버를 끄거나 포트를 바꾸세요:
$(lsof -nP -iTCP:"$port" -sTCP:LISTEN | tail -n +2)"
  fi
}
