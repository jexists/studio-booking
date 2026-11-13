# Pottery Studio Design System

> Version 1.0 · 2026-11-13 · 도자기 공방 웹사이트를 위한 제안형 디자인 시스템
>
> **적용 범위:** 공방 소개, 원데이 클래스 탐색 및 예약, 작품/갤러리, 공지, 문의, 모바일 웹
>
> **주의:** 실제 공방 상호·사진·가격·주소·예약 정책이 제공되지 않았으므로 이 문서는 특정 브랜드의 확정 가이드가 아닌 구현 가능한 **초안**이다. 예시 콘텐츠를 실제 정보로 교체해야 한다.

---

## 1. 디자인 방향

### 1.1 브랜드 키워드

- **Handcrafted** — 손으로 빚는 질감과 정성
- **Warm** — 자연광, 흙, 나무, 린넨이 주는 온기
- **Calm** — 과장 없는 여백과 느린 호흡
- **Honest** — 수업 정보·가격·예약 정책을 명료하게 제공

### 1.2 비주얼 원칙

1. 작품과 작업 과정 사진을 가장 중요한 시각 요소로 사용한다.
2. UI는 작품을 돋보이게 하는 배경 역할을 한다. 큰 그림자, 강한 그라데이션, 과도한 장식을 피한다.
3. 따뜻한 무채색을 기본으로, 진한 브라운 CTA 한 가지를 주요 액션에 사용한다.
4. 감성적인 문장과 실용적인 예약 정보를 분리한다. 분위기보다 **일정·소요 시간·가격·위치·취소 조건**을 찾기 쉬워야 한다.
5. 사진이 없는 경우에도 중립적인 배경, 텍스트, 라인 아이콘으로 인터페이스를 유지한다.

### 1.3 금지할 스타일

- SaaS풍 형광 블루, 과도한 네온/글로우
- 전면 유리 효과(glassmorphism), 과한 그림자
- 화면 전체를 베이지로 칠해 대비가 무너지는 구성
- 읽기 어려운 작은 세리프 본문
- 사진보다 장식이 강조되는 카드

---

## 2. 색상 토큰

**Primary CTA는 Clay Brown**, 기본 배경은 Warm Ivory, 제품 영역은 Linen 톤으로 구성한다.

| 역할 | 토큰 | HEX | 사용처 |
|---|---|---|---|
| 기본 배경 | `--color-bg` | `#FAF8F3` | 페이지 바탕 |
| 카드/패널 | `--color-surface` | `#FFFFFF` | 카드, 모달, 폼 |
| 보조 배경 | `--color-surface-muted` | `#F1ECE4` | 섹션 분리, 태그 |
| 대표 컬러 | `--color-primary` | `#654A3C` | CTA, 핵심 링크 |
| 대표 컬러 Hover | `--color-primary-hover` | `#50382D` | CTA Hover |
| 대표 컬러 Subtle | `--color-primary-subtle` | `#EEE5DE` | 선택 상태, 강조 배경 |
| 보조 포인트 | `--color-accent` | `#7B856C` | 자연스러운 보조 표시 |
| 본문 | `--color-text` | `#292724` | 기본 텍스트 |
| 보조 텍스트 | `--color-text-muted` | `#625D57` | 설명, 메타데이터 |
| 테두리 | `--color-border` | `#D9D0C5` | 입력창, 구분선 |
| 성공 | `--color-success` | `#327049` | 예약 완료 |
| 경고 | `--color-warning` | `#915B21` | 마감 임박, 유의사항 |
| 오류 | `--color-error` | `#A33B35` | 유효성 검사, 오류 |
| 포커스 링 | `--color-focus` | `#385F91` | 키보드 포커스 (가시성 우선) |

**접근성:** 색상 조합은 실제 배포 전에 WCAG 2.2 AA 대비 검사(일반 텍스트 4.5:1, 큰 텍스트 3:1)를 수행한다. 색만으로 상태를 구분하지 않는다.

### 2.1 색상 사용 비율(가이드)

- 배경·표면 **70%**: Ivory/White
- 중간 톤 **20%**: Linen/Border
- 강조 **10% 이하**: Brown/Sage

### 2.2 CSS 변수

```css
:root {
  color-scheme: light;
  --color-bg: #FAF8F3;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F1ECE4;
  --color-primary: #654A3C;
  --color-primary-hover: #50382D;
  --color-primary-subtle: #EEE5DE;
  --color-accent: #7B856C;
  --color-text: #292724;
  --color-text-muted: #625D57;
  --color-border: #D9D0C5;
  --color-success: #327049;
  --color-warning: #915B21;
  --color-error: #A33B35;
  --color-focus: #385F91;
}
```

---

## 3. 타이포그래피

### 3.1 글꼴

- **기본:** `Pretendard` (또는 시스템 sans-serif). 본문, 폼, 예약 관련 숫자에 사용.
- **선택적 제목:** `Noto Serif KR` 또는 브랜드 전용 세리프. 히어로·섹션 제목 등 짧은 문장에만 제한적으로 사용.
- 웹 폰트가 로드되지 않아도 읽을 수 있는 폴백을 제공한다.

```css
:root {
  --font-body: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  --font-display: 'Noto Serif KR', Georgia, serif;
}
```

### 3.2 타입 스케일

| 스타일 | 데스크톱 | 모바일 | 무게/행간 | 용도 |
|---|---|---|---|---|
| Display | 48px | 34px | 500 / 1.3 | 히어로 제목 |
| H1 | 36px | 28px | 600 / 1.35 | 페이지 제목 |
| H2 | 28px | 24px | 600 / 1.4 | 섹션 제목 |
| H3 | 22px | 20px | 600 / 1.4 | 카드·소제목 |
| Body L | 18px | 17px | 400 / 1.65 | 브랜드 소개 |
| Body | 16px | 16px | 400 / 1.6 | 일반 본문 |
| Body S | 14px | 14px | 400 / 1.55 | 메타데이터 |
| Caption | 12px | 12px | 500 / 1.5 | 보조 문구 |

- 본문 기준 최소 16px을 권장한다. 중요 안내 정보를 12px로 내리지 않는다.
- 가격, 날짜, 시간을 나타내는 숫자는 `font-variant-numeric: tabular-nums`를 적용한다.
- 긴 본문은 60~72자(한글 화면에서는 적절한 `max-width`)로 읽기 폭을 제한한다.

---

## 4. 레이아웃과 간격

### 4.1 Spacing Scale

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96px`

| 요소 | 권장 간격 |
|---|---|
| 아이콘 ↔ 텍스트 | 8px |
| 필드 레이블 ↔ 입력 | 8px |
| 카드 내부 | 20~24px |
| 카드 간 | 16~24px |
| 섹션 내부 | 40~64px |
| 섹션 간 | 모바일 64px, 데스크톱 96px |
| 버튼 높이 | 기본 48px, 작게 40px |
| 터치 타깃 | 최소 44×44px 권장 |

### 4.2 Radius / Shadow

| 토큰 | 값 | 사용처 |
|---|---|---|
| `--radius-sm` | `6px` | 배지, 소형 요소 |
| `--radius-md` | `10px` | 입력창, 버튼 |
| `--radius-lg` | `16px` | 카드, 이미지 |
| `--radius-xl` | `24px` | 넓은 프로모션 영역 |
| `--radius-full` | `999px` | 원형 버튼·칩 |

- 그림자는 필요한 플로팅 요소에만 사용: `0 8px 24px rgba(41,39,36,.08)`.
- 일반 카드에는 테두리 또는 배경색 차이를 먼저 사용한다.

### 4.3 Grid / Container

- 최대 콘텐츠 너비: **1200px**
- 데스크톱 좌우 패딩: **40px** / 태블릿: **24px** / 모바일: **20px**
- 데스크톱 카드: **3열**, 태블릿: **2열**, 모바일: **1열**
- 갤러리: 데스크톱 3열, 모바일 2열(화면이 좁으면 1열)
- 권장 브레이크포인트: `640px`, `768px`, `1024px`, `1280px` (콘텐츠에 따라 조정)

---

## 5. 핵심 컴포넌트

모든 컴포넌트는 **default / hover / focus-visible / disabled / loading / error (필요 시)** 상태를 설계한다.

### 5.1 Button

| Variant | 스타일 | 용도 |
|---|---|---|
| Primary | Brown 배경 + White 텍스트 | `클래스 예약하기`, `예약 확정` |
| Secondary | Ivory 배경 + Brown 테두리/텍스트 | `수업 자세히 보기` |
| Tertiary | 텍스트 버튼 + 밑줄 또는 아이콘 | `전체 작품 보기` |
| Destructive | Error 계열 | 취소 등 파괴적 동작, 확인 단계 필수 |

규칙:
- 하나의 주요 화면 영역에 Primary CTA는 원칙적으로 하나만 둔다.
- 사용자 행동을 명확히 쓰고 `확인`, `클릭` 같은 모호한 문구를 피한다.
- 예약 불가능한 날짜는 누를 수 없게 처리하고 이유를 보여준다.
- 로딩 중 중복 제출을 막고 상태를 텍스트로 알린다.

### 5.2 Form / Input

필수 항목: label, placeholder(예시일 뿐 label 대체 불가), helper text, validation, error message.

- 입력 높이: 48px 이상
- 테두리: 1px solid `--color-border`
- 포커스: 2~3px 가시적인 포커스 링
- 오류: 빨간 테두리 **+ 오류 문구**
- 예약 입력 정보는 개인정보를 최소한으로 받는다.

### 5.3 Class Card

권장 콘텐츠 순서:

1. 실제 작품/수업 사진 (3:4 또는 4:3, 카드 목록에서 비율 통일)
2. 분류 칩 (`원데이 클래스`, `정규 클래스`)
3. 제목 (예: `나만의 머그컵 만들기`)
4. 메타 (`약 90분` · `초보 가능` · `최대 4명`)
5. 가격 (`₩XX,XXX / 1인` — 실제 금액으로 교체)
6. 버튼 (`일정 확인하기`)

**주의:** 가격·인원·시간은 실재 정보가 없는 예시 필드다. 판매 조건을 확인한 후 노출한다.

### 5.4 Schedule / Date Picker

- 예약 가능/마감/선택/오늘 상태를 시각+텍스트로 구분한다.
- 선택 가능한 날짜만 활성화한다.
- 날짜 선택 후 가능한 회차·남은 자리·예약 가격을 표시한다.
- `YYYY년 M월 D일 (요일) HH:mm` 형태로 최종 확인 단계에서 명시한다.
- 서버 기준 재고 검증이 필요하며 화면에서만 잔여석을 계산하지 않는다.

### 5.5 Gallery Card

- 카드 본문은 작품 사진, 작품명, (선택) 제작 기법/작가 표기.
- 사진은 실제 작품을 촬영한 이미지 우선, 과한 필터 금지.
- 대체 텍스트는 `푸른 유약의 수제 찻잔 두 개`처럼 구체적으로 작성한다.
- 이미지 확대 시 키보드 닫기/Escape 및 포커스 복귀를 지원한다.

### 5.6 Badge / Status

| 상태 | 문구 예시 | 표현 방식 |
|---|---|---|
| 예약 가능 | `예약 가능` | Neutral 또는 Sage + 텍스트 |
| 마감 임박 | `잔여 2자리` | Warning + 텍스트 |
| 마감 | `예약 마감` | Muted + 텍스트 |
| 확정 | `예약 확정` | Success + 텍스트 |
| 변경 필요 | `일정 확인 필요` | Warning + 텍스트 |

- 이 숫자와 상태들은 실제 예약 시스템 데이터로만 노출한다.

### 5.7 Navigation / Footer

헤더: 브랜드 로고 / 클래스 / 작품 갤러리 / 공방 소개 / 위치·문의 / `예약하기`.

모바일: 로고 + 메뉴 버튼, 접근 가능한 펼침 메뉴. 예약 상세 페이지에서는 화면을 가리지 않는 하단 고정 CTA를 고려한다.

푸터: 공방 상호, 주소, 영업시간, 연락처, 사업자/통신판매 정보(해당 시), 개인정보처리방침 및 이용약관(해당 시). 실제 정보로만 채운다.

---

## 6. 페이지 패턴

### 6.1 홈

**추천 섹션 순서**

1. Hero — 실제 작업 장면 사진 + 짧은 소개 + `클래스 둘러보기`
2. 클래스 미리보기 — 추천/인기 클래스 3개 (데이터가 없으면 `추천`만 사용)
3. 공방 이야기 — 만드는 과정, 흙과 유약, 공간의 분위기
4. 작품 갤러리 — 사진 6~9장
5. 방문 정보 — 위치, 교통, 운영시간, 지도 연동
6. FAQ — 초보자 참여, 완성품 수령, 취소/환불 등 **확인된 정책만 표시**
7. 마지막 CTA — `나에게 맞는 클래스 찾기`

**Hero 카피 예시 (확정 문구 아님):**

> 흙을 만지는 시간, 나만의 그릇이 되는 순간.
>
> 천천히 빚고, 오래 간직할 도자기를 만들어보세요.

### 6.2 클래스 목록

- 필터: 원데이/정규, 난이도, 날짜 (실제로 지원하는 항목만)
- 카드: 사진/클래스명/소요시간/가격/예약 가능 여부
- 빈 상태: `선택한 조건에 맞는 클래스가 없습니다.` + 필터 초기화
- 로딩/오류/데이터 없음 상태 구분

### 6.3 클래스 상세

1. 이미지 갤러리
2. 클래스명, 한 줄 설명
3. 가격, 소요 시간, 대상/난이도, 인원
4. 무엇을 만들고 배우는지
5. 준비물·포함/미포함 사항
6. 작품 제작 이후 과정 및 수령 방법 (실제 정책)
7. 날짜와 회차 선택, 예약 CTA
8. 위치, 유의사항, 취소·환불 규정
9. FAQ

예약 CTA는 사용자가 가격·일정·취소 조건을 확인한 뒤 진행하도록 배치한다.

### 6.4 예약 플로우

`클래스 선택 → 날짜/시간/인원 → 예약 정보 → 결제 또는 신청 → 완료 안내`

- 단계별 현재 위치 표시.
- 가격 변경 시 즉시 총액 업데이트.
- 취소/환불 규정을 최종 신청 전에 분명히 표시.
- 제출 성공은 서버 확인 이후에만 표시.
- 결제 서비스가 없다면 `예약 신청`과 `예약 확정`을 구분한다.

### 6.5 공방 소개/방문

- 브랜드 스토리, 공간 사진, 강사/작가 소개(실제 정보), 주소·교통·주차·영업시간·연락 수단.
- 위치 정보는 실제 장소로 확인하여 표시한다.

---

## 7. 사진과 아이콘 가이드

### 사진

- 우선순위: 실제 공방 촬영 사진 > 작가가 제공한 검증된 사진 > 적절한 라이선스의 대체 사진.
- 자연광, 유약의 질감, 손의 움직임, 작업 도구, 선반 위 완성품을 보여준다.
- 색보정은 통일하되 제품 색상을 왜곡하지 않는다.
- 히어로 비율: 데스크톱 약 16:9 / 모바일 4:5 또는 목적에 따른 별도 크롭.
- 이미지 최적화: WebP/AVIF, 적절한 `srcset`, 지연 로딩(첫 화면 중요 이미지 제외).

### 아이콘

- 선형 아이콘 사용 (Lucide 등), 기본 20~24px.
- 아이콘은 명확한 레이블 보조 수단이며 단독으로 중요한 의미 전달 금지.
- 많이 쓰는 아이콘: calendar-days, clock-3, map-pin, users, arrow-right, check, alert-circle.

---

## 8. 인터랙션 / 모션

- Hover 전환: 150~200ms, 부드러운 ease-out.
- 카드 Hover: 미세한 테두리/배경 변화. 과한 확대 금지.
- 모달/드로어: 180~240ms.
- `prefers-reduced-motion: reduce`를 존중한다.
- 로딩 중 Skeleton 사용 시 실측 콘텐츠 크기와 최대한 맞춘다.

---

## 9. 반응형 동작

| 영역 | 데스크톱 | 모바일 |
|---|---|---|
| 헤더 | 가로 내비게이션 | 로고 + 메뉴 버튼 |
| 히어로 | 사진/카피 분할 또는 대형 배경 | 세로 배치, 가독성 우선 |
| 클래스 목록 | 3열 | 1열 |
| 갤러리 | 3열 | 2열 또는 1열 |
| 상세/예약 | 정보 + 예약 패널 | 세로 콘텐츠 + 하단 CTA |
| 폼 | 필요 시 2열 | 1열 |

- 모바일 320px 폭에서도 가로 스크롤이 발생하지 않게 한다.
- 고정 예약 버튼이 콘텐츠와 푸터를 가리지 않도록 `padding-bottom` 확보.
- iOS Safe Area 지원.

---

## 10. 접근성 및 신뢰

- WCAG 2.2 AA 목표: 대비, 포커스 표시, 키보드 조작, 폼 레이블, 오류 안내.
- 의미 있는 사진의 `alt` 제공, 장식 사진의 대체 텍스트 생략.
- 모든 예약 일정/옵션을 키보드로 선택 가능하게 한다.
- 상태를 색상만으로 전달하지 않는다.
- `예약 완료`와 `예약 요청 접수` 등 사용자 상태 문구를 실제 처리 과정과 일치시킨다.
- 환불/배송/소성 기간/완성품 보관 등의 정책을 임의로 생성하지 않는다.

---

## 11. 구현용 CSS Starter

```css
:root {
  --color-bg: #FAF8F3;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F1ECE4;
  --color-primary: #654A3C;
  --color-primary-hover: #50382D;
  --color-primary-subtle: #EEE5DE;
  --color-text: #292724;
  --color-text-muted: #625D57;
  --color-border: #D9D0C5;
  --color-focus: #385F91;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --container-max: 1200px;
  --font-body: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif;
  --font-display: 'Noto Serif KR', Georgia, serif;
}

*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  color: var(--color-text);
  background: var(--color-bg);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
}
button, input, textarea, select { font: inherit; }
:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
.container { width: min(100% - 40px, var(--container-max)); margin-inline: auto; }
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 22px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}
.btn--primary { background: var(--color-primary); color: #fff; }
.btn--primary:hover { background: var(--color-primary-hover); }
.btn--secondary {
  background: transparent;
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.btn:disabled { opacity: .5; cursor: not-allowed; }
.class-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
.class-card { overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.class-card img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.class-card__body { padding: 24px; }
@media (max-width: 1023px) { .class-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 639px) {
  .class-grid { grid-template-columns: 1fr; gap: 16px; }
  .class-card__body { padding: 20px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

---

## 12. 화면별 우선순위 (MVP)

| 우선순위 | 작업 | 이유 |
|---|---|---|
| P0 | 브랜드 토큰, 글로벌 헤더/푸터, 버튼/입력폼 | 전체 일관성 |
| P0 | 홈 + 클래스 목록 + 클래스 상세 | 탐색 전환의 핵심 |
| P0 | 예약 가능 여부, 날짜/인원, 예약 상태 | 오예약 방지 |
| P0 | 운영정보, 위치, 문의, 정책 안내 | 신뢰와 방문 준비 |
| P1 | 작품 갤러리, 공방 스토리 | 브랜딩 강화 |
| P1 | FAQ, 공지, 후기(실제 후기만) | 문의 감소 |
| P2 | 즐겨찾기, 고급 필터, 애니메이션 | 서비스 성장 이후 |

---

## 13. 적용 체크리스트

- [ ] 실제 공방 이름/로고/브랜드 톤을 확정했다.
- [ ] 모든 색상 토큰을 한 곳에서 관리한다.
- [ ] Primary CTA 스타일이 화면별로 일관된다.
- [ ] 실제 사진과 대체 텍스트를 준비했다.
- [ ] 클래스 가격·소요 시간·정원·난이도를 검증했다.
- [ ] 예약 가능 날짜 및 인원은 실제 데이터에 연동한다.
- [ ] 결제/예약 처리 성공을 서버 응답으로 검증한다.
- [ ] 취소·환불·완성품 수령 정책이 실제 운영과 일치한다.
- [ ] 320px/375px/768px/1024px/1440px에서 점검했다.
- [ ] 키보드/스크린리더/대비/로딩/오류 상태를 테스트했다.

---

## 14. AI 코딩 도구에 전달할 구현 원칙

> 이 디자인 시스템은 **목표 상태를 정의하는 가이드**입니다. 기존 프로젝트에 적용하기 전에 실제 프레임워크, 프로젝트 구조, 스타일링 방식, 공통 컴포넌트, 디자인 토큰, 예약·결제 관련 코드부터 확인하세요. 기존 기능을 임의로 삭제하거나 전체 구조를 갈아엎지 말고, 범위가 작은 변경부터 적용하세요. 예시 문구, 가짜 가격/후기/예약 가능 여부를 실제 데이터처럼 노출하지 마세요. 변경 후 타입 검사, 린트, 테스트, 모바일 레이아웃, 접근성을 검증하고 수정 파일과 테스트 결과를 요약하세요.

