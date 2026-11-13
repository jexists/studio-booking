# API

- Base URL: `http://localhost:3001/api` (프론트에서는 `NEXT_PUBLIC_API_URL`)
- 형식: JSON. 요청 검증 실패 시 NestJS 기본 400 응답:
  `{ "statusCode": 400, "message": ["title should not be empty"], "error": "Bad Request" }`

## 목록

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/health` | 서버·DB 상태 확인 |
| POST | `/auth/login` | 직원 로그인 → 토큰 |
| POST | `/auth/logout` | 로그아웃 (직원) |
| GET | `/auth/me` | 내 직원 정보 (직원) |
| GET | `/auth/invite/:token` | 초대 확인 (공개) |
| POST | `/auth/invite/:token` | 초대 받은 직원 비밀번호 설정 (공개) |
| GET | `/staff/members` | 직원·초대 중 목록 (대표) |
| POST | `/staff/members/invite` | 직원 초대 (대표) |
| PATCH | `/staff/members/:id` | 직원 활성/비활성 (대표) |
| POST | `/ask` | 자료 근거 질문 답변 |
| GET | `/staff/documents` | 등록한 자료 목록 (직원) |
| POST | `/staff/documents` | TXT/PDF 업로드·임베딩 (직원) |
| DELETE | `/staff/documents/:id` | 자료·임베딩 삭제 (직원) |
| GET | `/classes?from=` | 원데이 일정 + 남은 자리 (공개) |
| POST | `/reservations` | 예약 신청, 정원 초과 409 (공개) |
| POST | `/me/lookup` | 예약 번호 + 휴대폰 뒤 4자리로 내 예약·작품 (공개) |
| POST | `/me/makeups/options` | 보강 가능한 회차·후보·내 신청 (공개, 예약번호+뒤4자리) |
| POST | `/me/makeups` | 보강 신청 (공개, 예약번호+뒤4자리) |
| POST | `/me/cancel-request` | 원데이 취소·환불 요청, 비율은 요청 날짜로 고정 (공개, 예약번호+뒤4자리) |
| POST | `/inquiries` | 단체 문의 접수 (공개) |
| GET | `/staff/dashboard` | 오늘 수업·확정 안 된 신청·보강 대기·새 문의·가마 대기·보관 기한 지남·환불 요청·오늘 노쇼 (직원) |
| GET | `/staff/classes?weekStart=` | 주간 일정 + 인원 (직원) |
| POST | `/staff/classes` | 원데이 1회 / 정규반 4회 생성 (직원) |
| GET·PATCH | `/staff/classes/:id` | 일정 상세·명단·작품 / 시간·휴강 변경 (직원) |
| POST | `/staff/classes/:id/reservations` | DM·네이버 예약 대리 등록 (직원) |
| POST | `/staff/classes/:id/works` | 수업 후 작품 등록 (직원) |
| PATCH | `/staff/reservations/:id/confirm` | 예약 확정 (직원) |
| GET | `/staff/reservations/:id/refund` | 환불 비율 미리보기 (직원) |
| PATCH | `/staff/reservations/:id/cancel` | 예약 취소 + 환불 비율 기록 (직원) |
| PATCH | `/staff/reservations/:id/cancel-request/approve` | 수강생 환불 요청 승인 → 요청 때 비율로 취소 (직원) |
| PATCH | `/staff/reservations/:id/cancel-request/reject` | 수강생 환불 요청 반려 → 요청 기록 삭제 (직원) |
| PATCH | `/staff/reservations/:id/no-show` | [가정] 노쇼 표시, 원데이·수업 시작 후만 (직원) |
| DELETE | `/staff/reservations/:id/no-show` | 노쇼 되돌리기 → 확정 (직원) |
| GET | `/staff/makeups?status=` | 보강 신청 목록 (직원) |
| PATCH | `/staff/makeups/:id/approve` · `/reject` | 보강 승인(정원 재확인)·반려 (직원) |
| GET | `/staff/inquiries?status=` | 단체 문의 목록 + 상태별 개수 (직원) |
| PATCH | `/staff/inquiries/:id` | 메모(직원) / 상태·견적 금액(대표만) |
| GET | `/staff/works` | 작품 목록·검색 (직원) |
| GET | `/staff/works/summary` | 단계별 개수·가마 대기 (직원) |
| PATCH | `/staff/works/:id/stage` | 단계 한 칸 이동 (직원) |
| POST | `/staff/works/bulk-next` | 여러 점 다음 단계로 (직원) |
| PATCH | `/staff/works/:id` | 수령 방식·선반·파손·메모 (직원) |

권한 표기: (직원) = `Authorization: Bearer <token>` 필요, 없거나 만료면 401 / (대표) = 대표만, 강사는 403.

## GET /health

요청 파라미터 없음.

```json
{ "status": "ok", "database": "up", "timestamp": "2026-11-13T01:56:10.895Z" }
```

- `database`: DB `SELECT 1` 성공 시 `"up"`, 실패 시 `"down"` (서버는 200 응답)
- 구현: `backend/src/modules/health/`, 프론트 타입: `frontend/src/types/api.ts`

## 직원 인증 (`backend/src/modules/auth/`)

### POST /auth/login
```json
// 요청
{ "email": "admin@naver.com", "password": "12341234" }
// 200
{ "token": "64자 hex", "staff": { "id": 1, "name": "문정호", "email": "admin@naver.com", "role": "OWNER", "active": true } }
// 401
{ "statusCode": 401, "message": "이메일 또는 비밀번호가 맞지 않아요", "error": "Unauthorized" }
```
- 토큰은 `StaffSession` 에 저장, 7일 유효. 비활성 직원은 로그인 불가.

### POST /auth/logout → 204 / GET /auth/me → 직원 정보

### POST /staff/members/invite (대표)
```json
// 요청
{ "email": "teacher@naver.com" }
// 200
{ "email": "teacher@naver.com", "link": "http://localhost:3000/staff/invite/<token>", "mailSent": false, "expiresInHours": 72 }
```
- 이미 직원이면 409. `RESEND_API_KEY` 가 있으면 메일 발송(`mailSent: true`), 없거나 실패해도 링크는 돌려준다.
- 링크 주소는 `FRONTEND_URL`(없으면 `CORS_ORIGIN` 첫 값).

### GET /auth/invite/:token → `{ "email", "expiresAt" }`
### POST /auth/invite/:token
```json
{ "name": "류세아", "password": "8자 이상" }
```
- 없는 토큰 404, 만료·사용된 토큰 410("초대가 만료됐어요. 대표님께 다시 요청해 주세요."). 성공하면 강사(STAFF) 계정 생성.

### GET /staff/members (대표) → `{ "staff": [...], "pendingInvites": [{ "id", "email", "expiresAt" }] }`
### PATCH /staff/members/:id (대표) → `{ "active": false }` — 비활성화하면 그 직원의 로그인 토큰도 모두 지움. 본인 계정은 400.

## 작품 (`backend/src/modules/works/`, 직원)

### GET /staff/works?q=&stage=&broken=true&overdue=true&decorative=true
- `q`: 작품 번호·수강생 이름·휴대폰 뒤 4자리. `stage`: FORMING·BISQUE·GLAZED·GLAZE_FIRED·DONE·PICKED_UP
- 각 작품에 계산값을 붙인다: `expectedFrom`·`expectedTo`(완성 전, 수업일+21~28일), `keepUntil`(완성일+60일), `overdue`(보관 기한 지남), `foodWarning`(흙·유약 코드가 GlazeWarning 에 있으면 `{code, name, reason, sourceRef}`)

### GET /staff/works/summary
```json
{ "byStage": { "FORMING": 76, "BISQUE": 2, "GLAZED": 20, "GLAZE_FIRED": 34, "DONE": 26, "PICKED_UP": 42 }, "broken": 5, "overdue": 0,
  "kiln": { "min": 30, "bisqueWaiting": 76, "glazeWaiting": 20 } }
```
- 가마 대기: 성형(초벌 대기)·유약(재벌 대기) 중 파손 아닌 작품 수. 30점 이상이면 가동 가능.

### PATCH /staff/works/:id/stage → `{ "direction": "next" | "prev" }`
- 한 칸씩만 이동. 파손 작품은 앞으로 못 감, 수령은 수령 방식이 있어야 함(400 "수령 방식을 먼저 정해 주세요"). 완성으로 가면 `completedAt`=지금. 이동마다 `WorkStageLog` 기록.

### POST /staff/works/bulk-next → `{ "ids": [1,2,3] }` → `{ "moved": 2, "skipped": [{ "workNo", "reason" }] }`
### PATCH /staff/works/:id → `{ "pickupMethod": "VISIT"|"DELIVERY"|null, "shelf": "A-1", "broken": true, "memo": "..." }`

## 일정·예약 (`modules/classes`, `modules/schedule`)
- 정원: 일반(HAND) 8, 물레(WHEEL) 6, 서버에서 종류로 정함. 신청·대리 등록은 일정 행을 `SELECT … FOR UPDATE` 로 잠그고 신청+확정 인원을 다시 센 뒤 저장 → 초과 시 409("남은 자리가 N자리예요" / "자리가 모두 찼어요").
- 정규반 회차 인원 = 반 등록(신청+확정) − 승인된 보강으로 나간 인원 + 들어온 인원.
- 대리 등록: 같은 번호가 이미 있으면 409 "같은 번호로 이미 예약이 있어요" → `force: true` 로 다시 보내면 등록.
- 취소 환불: 원데이만, 한국 날짜 기준 (수업일 − 오늘) ≥ 3일이면 100, 아니면 50. 정규반은 null. 노쇼 예약은 취소 400("노쇼를 먼저 되돌려 주세요").
- 명단(`GET /staff/classes/:id`) 항목에 `cancelRequestedAt`(처리 대기 중인 요청만, 아니면 null)·`cancelRequestRate`·`cancelReason`·`noShowAt` 포함.

## 취소·환불 요청 (`modules/me`, `modules/schedule`)
- `POST /me/cancel-request` `{ reservationNo, phoneLast4, reason?(≤200자) }` → 200 `{ reservationNo, cancelRequestedAt, cancelRequestRate: 100|50 }`
  - 예약번호·뒤4자리 불일치 404(조회와 같은 문구). 정규반 400 "정규반은 취소·환불 요청을 받지 않아요", 이미 요청 400, 취소·노쇼 400, 수업 시작 후 400.
  - 비율은 요청한 날(한국 날짜) 기준 `refundRateFor` 로 정해 저장. 예약 상태는 그대로(직원 승인 때 취소).
- `POST /me/lookup` 응답에 `canRequestCancel`, `expectedRefundRate`(지금 요청하면 받을 비율, 요청 불가면 null), `cancelRequestedAt`, `cancelRequestRate`, `refundRate` 추가.
- 승인 `PATCH /staff/reservations/:id/cancel-request/approve` → `{ id, status:"CANCELLED", refundRate }`. 처리할 요청 없으면 400.
- 반려 `PATCH /staff/reservations/:id/cancel-request/reject` → `{ id, status }`, 요청 칼럼 3개를 비움(다른 기록 없음). 수강생은 다시 요청할 수 있음.

## 노쇼 [가정] (`modules/schedule`)
- `PATCH /staff/reservations/:id/no-show` → `{ id, status:"NO_SHOW", noShowAt }`. 신청·확정 예약만, 원데이만(정규반 400), 수업 시작 전 400 "수업이 시작된 뒤에 표시할 수 있어요", 대기 중 환불 요청이 있으면 400.
- `DELETE /staff/reservations/:id/no-show` → `{ id, status:"CONFIRMED" }`. 노쇼가 아니면 400.
- 노쇼는 환불 계산 안 함("환불 대상 아님"), 환불 요청 불가. 정원 계산(신청+확정)에서 빠진다.
- 정규반 생성: `{program:"REGULAR", kind, courseName, date, start:"HH:mm", end}` → 매주 같은 시간 4회(weekNo 1~4). 같은 이름 409.
- 작품 등록: `{items:[{reservationId?, ownerName, phoneLast4?, count 1~5, itemName, clay?, glaze?}]}` → `W{YYMMDD}-{순번}`, 그날 마지막 순번 다음부터.

## 보강 (`modules/makeups`)
- 후보 조건: 빠진 회차와 같은 주(월~일, 한국 시간) · 다른 정규반 · 같은 종류 · 휴강 아님 · 시작 전 · 남은 자리 ≥ 1.
- 신청은 `REQUESTED`, 강사 승인 때 정원을 잠금 상태로 다시 확인(넘으면 409). 같은 회차 중복 신청 409. 이미 처리된 신청 409.
- `GET /staff/makeups?status=DECIDED` 는 승인+반려를 함께 돌려준다(처리됨 탭).

## 단체 문의 (`modules/inquiries`)
- 접수: `{orgName, contactName, contact(휴대폰 또는 이메일), preferredDate?, headcount 1~50, place?('공방 방문'|'출장 희망'), message}` → `NEW`.
- 수정: 메모는 직원 누구나, `status`·`quoteAmount` 는 대표만(강사 403 "대표만 할 수 있어요"). 상태: NEW→QUOTED→CONFIRMED→DONE / CANCELLED. 견적 발송 자체는 시스템 밖.

## 대시보드 (`modules/dashboard`)
`GET /staff/dashboard` → `{ today:[{id,title,program,kind,courseName,weekNo,startsAt,endsAt,capacity,used,cancelled}], pendingReservations, makeupsRequested, newInquiries, kiln:{min:30,bisqueWaiting,glazeWaiting}, overdueWorks, noShowsToday, cancelRequests:[{id,reservationNo,name,headcount,sessionId,title,startsAt,cancelRequestedAt,cancelRequestRate,cancelReason}] }` — cancelRequests 는 처리 대기 중인 환불 요청(오래된 순, 최대 20건)

<!-- 새 API는 위 목록 표에 추가하고, 아래에 같은 형식(요청·응답 예시)으로 적는다. -->

## POST /ask

공방 자료의 임베딩을 검색해, 근거가 있는 내용으로만 답합니다. 안전 관련 질문(식기·전자레인지·오븐 등)은 근거가 없으면 확인 안내를 돌려줍니다.

```json
// 요청
{ "question": "산청토로 만든 컵은 식기로 써도 되나요?" }
// 응답
{
  "answer": "안쪽에 유약을 빠짐없이 바른 경우에만 식기로 사용할 수 있어요. [1]",
  "isSafety": true,
  "hasEvidence": true,
  "sources": [{ "title": "흙 준비와 꼬박밀기", "page": 3 }]
}
```

## 직원 자료 관리 (`/staff/documents`)

- `GET` → 자료 목록과 검색 조각 수
- `POST` → multipart form-data: `file`(TXT/PDF, 최대 10MB), `kind`(`NOTE`/`SUPPLIER`), 선택 `title`. 업로드가 끝나면 `READY` 상태가 되고 곧바로 `/ask` 검색에 반영됩니다.
- `DELETE /:id` → 원본 메타데이터와 검색 조각을 함께 삭제합니다.
