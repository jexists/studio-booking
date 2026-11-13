# AGENTS.md

AI 코딩 에이전트용 작업 규칙. 1일 해커톤 MVP이므로 **빠르고 단순하게** 만든다.

## 프로젝트 지도

- `frontend/` Next.js App Router + Tailwind. 화면 `src/app`, 기능별 코드 `src/features/{feature}`, 공용 UI `src/components/ui`, 레이아웃 `src/components/layout`, API 호출 `src/lib/api.ts`, 타입 `src/types`
- `backend/` NestJS. 기능은 `src/modules/{feature}` (module·controller·service), DB는 `src/prisma/PrismaService` 주입, 스키마 `prisma/schema.prisma`
- `docs/` 구조·DB·API 문서 (한국어)
- Next.js 관련 작업 전에는 `frontend/AGENTS.md` 안내도 확인한다.

## 원칙

1. **변경 전 확인**: 관련 코드와 docs를 먼저 읽는다. 비슷한 코드가 있으면 그 패턴을 따른다.
2. **기존 기능 보존**: 요청과 무관한 코드·설정은 바꾸지 않는다. `/api/health` 를 깨뜨리지 않는다.
3. **최소 변경**: 필요한 파일만 만들고 고친다. 미리 쓸 것 같은 파일·라이브러리는 추가하지 않는다.
4. **공용 컴포넌트 우선 재사용**: `components/ui` 에 있으면 그대로 쓴다. 같은 UI가 두 화면 이상에서 반복될 때만 `components/ui` 로 분리한다.
5. **기능별 디렉터리 유지**: 프론트 `features/{feature}`, 백엔드 `modules/{feature}`. 기능 전용 코드를 공용 폴더에 두지 않는다.
6. **추상화 금지**: Repository 패턴, Clean Architecture, CQRS, 범용 베이스 클래스, 전역 상태 라이브러리, UI 라이브러리를 요청 없이 도입하지 않는다.
7. **API 호출**: 프론트는 `lib/api.ts` 의 `api()` 를 사용한다. 백엔드 주소를 하드코딩하지 않는다.
8. **요청값 검증**: 바디·쿼리를 받는 API는 class-validator DTO를 둔다 (전역 ValidationPipe 설정됨).
9. **문서 동기화**: API를 추가·변경하면 `docs/api.md`, DB 스키마를 바꾸면 `docs/database.md` 를 같이 고친다.
10. **비밀값 금지**: 비밀번호·키는 `.env` 에만 두고, 새 변수는 `.env.example` 에 예시값으로 추가한다.

## 변경 후 검증

가능한 범위에서 실행해 보고 결과를 그대로 보고한다. 실행하지 못한 것은 검증했다고 말하지 않는다.

```bash
pnpm build                                  # 타입 검사 + 빌드
curl http://localhost:3001/api/health        # 백엔드·DB 확인
pnpm db:migrate                              # schema.prisma 변경 시
```
