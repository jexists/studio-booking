# 아키텍처

```
브라우저 ──> Next.js (3000) ──fetch──> NestJS (3001, /api/*) ──Prisma──> PostgreSQL (외부 링크, 스키마 hackathon)
```

- 프론트는 `NEXT_PUBLIC_API_URL` 로 백엔드를 호출합니다 (`src/lib/api.ts`).
- 백엔드는 모든 경로에 `/api` 접두사, `CORS_ORIGIN` 에 적힌 Origin만 허용합니다.
- DB 접근은 백엔드만 합니다. 프론트에서 DB에 직접 붙지 않습니다.

## 폴더 구조

```
├── frontend/src
│   ├── app/                 # 라우트(페이지). layout.tsx 에 공용 Header
│   ├── components/
│   │   ├── ui/              # 여러 화면에서 쓰는 공용 UI (필요해질 때 추가)
│   │   └── layout/          # Header 등 공용 레이아웃
│   ├── features/{feature}/  # 기능 전용 컴포넌트·로직 (예: features/health)
│   ├── lib/api.ts           # 백엔드 호출 공용 함수 api<T>()
│   └── types/               # 백엔드 응답 타입
├── backend
│   ├── src/
│   │   ├── modules/{feature}/  # feature.module / controller / service (+ dto/)
│   │   ├── prisma/             # PrismaModule(전역), PrismaService
│   │   ├── app.module.ts       # 모듈 등록
│   │   └── main.ts             # /api 접두사, CORS, ValidationPipe, 포트
│   ├── prisma/schema.prisma
│   └── scripts/create-schema.mjs  # pnpm db:schema
├── docs/
├── scripts/                 # init-env.mjs(.env 생성), common.sh(실행 스크립트 공용)
└── frontend.sh / backend.sh # 개별 실행 스크립트
```

## 기능 추가 순서 (예: `posts`)

1. DB가 필요하면 `schema.prisma` 에 모델 추가 → `pnpm db:migrate` → `docs/database.md`
2. 백엔드 `src/modules/posts/` 에 module·controller·service(+ `dto/`) 작성 → `app.module.ts` 의 imports에 등록 → `docs/api.md`
3. 프론트 `src/types` 에 응답 타입, `src/features/posts/` 에 컴포넌트, `src/app/posts/page.tsx` 에 화면
4. `pnpm build` 로 확인
