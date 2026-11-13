# 데이터베이스

- 외부 PostgreSQL(Render 등)에 `backend/.env` 의 `DATABASE_URL` 링크로 접속합니다. Docker는 쓰지 않습니다.
- 스키마: **`hackathon`** — 링크 끝의 `?schema=hackathon` 으로 지정. 모든 테이블이 이 스키마에 만들어집니다.
- ORM: Prisma 6 — 스키마 파일 `backend/prisma/schema.prisma`

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?schema=hackathon&sslmode=require
```

- Render 외부 접속은 SSL이 필요해서 `sslmode=require` 를 붙입니다.
- 스키마 생성: `pnpm db:schema` (`CREATE SCHEMA IF NOT EXISTS`, `./backend.sh` 가 자동 실행). 접속 확인도 겸합니다.

## 현재 테이블

설계 근거: [deliverables/03-spec.md](deliverables/03-spec.md) 3절. 첫 마이그레이션 `20261113000000_init` 에서 `CREATE EXTENSION vector`(pgvector)도 함께 실행한다.

| 모델 | 설명 | 주요 필드 |
| --- | --- | --- |
| Staff | 직원(대표 OWNER / 강사 STAFF) | email, name, role, passwordHash(`scrypt:salt:hash`), active |
| StaffInvite | 직원 초대(72시간, 1회용) | email, token, invitedById, expiresAt, usedAt |
| StaffSession | 로그인 토큰 | token, staffId, expiresAt |
| RegularCourse | 정규반 한 기수 | name("화 물레반 11월기"), kind, capacity, startDate |
| ClassSession | 수업 한 회 | code(S001), program(ONEDAY/REGULAR), kind(HAND 8/WHEEL 6), startsAt, endsAt, capacity, cancelled(휴강), courseId, weekNo |
| Reservation | 예약(원데이는 sessionId, 정규반은 courseId) | reservationNo, name, phone, phoneLast4, headcount, channel, status(PENDING/CONFIRMED/CANCELLED), refundRate |
| Work | 작품 | workNo(W260902-01), reservationId, sessionId, classDate, ownerName, clay, glaze, stage(6단계), broken, shelf, pickupMethod, completedAt |
| WorkStageLog | 단계 변경 기록 | workId, fromStage, toStage, staffId |
| MakeupRequest | 보강 신청 | reservationId, missedSessionId, targetSessionId, status |
| Document / DocumentChunk | 올린 자료와 쪽 조각 | title, kind, status / page, content, embedding `vector(1536)` |
| QuestionLog | 질문 기록 | question, answer, language, isSafety, hasEvidence, sources |
| GroupInquiry | 단체 문의 | orgName, headcount, status, quoteAmount, memo |
| GlazeWarning | 식기로 쓰면 안 되는 흙·유약 코드 | code, name, reason, sourceRef |

### 시드 (시험 자료)

```bash
pnpm --filter backend db:seed-data   # sample-data 엑셀 → backend/prisma/seed-data/*.json (python3 + openpyxl)
pnpm --filter backend db:seed        # 위 JSON + 직원 계정 + 식기 경고 유약을 DB에 넣음 (다시 실행하면 비우고 새로 넣음, 올린 자료는 유지)
```

로컬·시연용 직원 계정(비밀번호 모두 `12341234`): `admin@naver.com`(대표), `test1@naver.com`·`test2@naver.com`(강사).

## 모델 추가·변경

```prisma
// backend/prisma/schema.prisma 예시
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  createdAt DateTime @default(now())
}
```

```bash
pnpm db:migrate          # 이름 입력 → prisma/migrations 생성·적용 + Prisma Client 재생성
```

생성된 `prisma/migrations/` 는 커밋합니다. 팀원은 `./backend.sh` 실행 시 `migrate deploy` 로 자동 적용됩니다.
`migrate dev` 는 비교용 임시 DB(shadow DB)를 만들기 때문에, DB 계정에 DB 생성 권한이 없으면 실패할 수 있습니다. 그때는 `pnpm --filter backend exec prisma db push` 로 스키마를 바로 반영합니다(마이그레이션 파일 없음).

## 서비스에서 사용

```ts
@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() {
    return this.prisma.post.findMany();
  }
}
```

## 유용한 명령

| 명령 | 설명 |
| --- | --- |
| `pnpm db:schema` | 접속 확인 + 스키마 생성 |
| `pnpm db:studio` | Prisma Studio |
| `pnpm --filter backend exec prisma migrate reset` | `hackathon` 스키마 초기화 후 마이그레이션 재적용 (**데이터 삭제**, 팀 공용 DB면 주의) |
