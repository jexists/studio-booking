# Hackathon

1일 해커톤용 풀스택 스켈레톤: **Next.js(App Router) + NestJS + PostgreSQL(Prisma)**, pnpm workspace.
DB는 외부 PostgreSQL(Render 등)에 링크로 접속하고, `hackathon` 스키마를 사용합니다.

## 준비물

- Node.js 20.12 이상, pnpm 10 (`corepack enable`)
- 외부 PostgreSQL 접속 링크

## 빠른 시작

```bash
pnpm install     # 의존성 설치 + .env 파일 자동 생성(.env.example 복사)
```

`backend/.env` 의 `DATABASE_URL` 에 DB 링크를 넣고 끝에 `?schema=hackathon&sslmode=require` 를 붙입니다.

```bash
pnpm db:schema   # DB 접속 확인 + hackathon 스키마 생성(이미 있으면 그대로)
pnpm dev         # frontend(3000) + backend(3001) 동시 실행
```

- Frontend: http://localhost:3000
- Health API: http://localhost:3001/api/health

## 스크립트로 따로 실행

터미널 두 개에서 각각 실행합니다. 프로젝트 루트가 아닌 곳에서 실행해도 됩니다.

```bash
./backend.sh    # DB 접속·스키마 확인 → 마이그레이션 적용 → NestJS(3001)
./frontend.sh   # Next.js(3000)
```

| 스크립트 | 하는 일 |
| --- | --- |
| `backend.sh` | node·pnpm 확인 → `node_modules` 없을 때만 설치 → `backend/.env`·`DATABASE_URL` 확인 → 포트 사용 여부 확인 → `pnpm db:schema`(접속 확인 + 스키마 생성) → 기존 마이그레이션 `migrate deploy` → 스키마 미반영 시 경고 → `prisma generate` 후 `nest start --watch` |
| `frontend.sh` | node·pnpm 확인 → `node_modules` 없을 때만 설치 → `frontend/.env.local` 없으면 안내 후 예시 복사 → 백엔드 응답 없으면 경고 → `next dev` |

실행 권한이 없으면 `chmod +x frontend.sh backend.sh`.

## 자주 쓰는 명령

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | 프론트·백엔드 동시 개발 서버 |
| `pnpm build` | 백엔드·프론트 빌드 (타입 검사 포함) |
| `pnpm db:schema` | DB 접속 확인 + `DATABASE_URL` 의 스키마 생성 |
| `pnpm db:migrate` | `schema.prisma` 변경 → 마이그레이션 생성·적용 |
| `pnpm db:studio` | Prisma Studio (DB 브라우저) |

## 환경변수

| 파일 | 주요 값 |
| --- | --- |
| `backend/.env` | `DATABASE_URL`(DB 링크 + `?schema=hackathon&sslmode=require`), `PORT`(3001), `CORS_ORIGIN` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL`(http://localhost:3001/api) |

- 프론트 포트: `FRONTEND_PORT=3005 pnpm dev` 또는 `FRONTEND_PORT=3005 ./frontend.sh`
- 포트를 바꾸면 연결된 값(`CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`)도 함께 맞춥니다.
- `.env*` 파일은 Git에 올리지 않습니다(`.env.example`만 커밋). DB 링크에는 비밀번호가 들어 있습니다.

## 문서

[docs/README.md](docs/README.md) — 구조, DB, API 문서. AI 코딩 에이전트 규칙은 [AGENTS.md](AGENTS.md).
