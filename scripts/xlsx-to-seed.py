"""시험 자료 엑셀 2종을 시드용 JSON으로 바꾼다.

사용: python3 scripts/xlsx-to-seed.py   (openpyxl 필요)
입력: sample-data/클래스일정_예약목록_2026.xlsx, sample-data/작품목록_2026.xlsx
출력: backend/prisma/seed-data/*.json

엑셀은 사람이 손으로 쓴 형식이라 여기서 정리한다.
- 단계 표기 흔들림("시유", "유약 바름") → GLAZED
- 예약 상태 "대기"·빈칸 → PENDING, "노쇼" → CONFIRMED(메모에 남김)
- 단체 클래스 일정, 수강료·금액 칸은 가져오지 않는다(기획 U-02)
"""
import json
import re
from datetime import datetime, time
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "sample-data"
OUT = ROOT / "backend" / "prisma" / "seed-data"
KST = "+09:00"


def iso(d, hhmm=None):
    if d is None:
        return None
    if isinstance(d, datetime) and hhmm is None:
        hhmm = d.strftime("%H:%M") if d.time() != time(0, 0) else "00:00"
    return f"{d.strftime('%Y-%m-%d')}T{hhmm or '00:00'}:00{KST}"


def sheet(path, name, first):
    rows = list(openpyxl.load_workbook(path, data_only=True)[name].iter_rows(values_only=True))
    k = next(i for i, r in enumerate(rows) if r[0] == first)
    hdr = [str(h).strip() if h else None for h in rows[k]]
    return hdr, rows, k


def as_dicts(hdr, rows):
    return [dict(zip(hdr, r)) for r in rows]


def kind_of(text):
    return "WHEEL" if "물레" in str(text) else "HAND"


def course_name(raw):
    # "화 물레반 (다음 기수 모집중)" → "화 물레반 다음 기수"
    return re.sub(r"\s*\((.*?)모집중\)", r" \1", str(raw)).strip()


CAL = SRC / "클래스일정_예약목록_2026.xlsx"
WORKS = SRC / "작품목록_2026.xlsx"

# 1) 일정·정규반
hdr, rows, k = sheet(CAL, "클래스일정", "일정ID")
sessions, courses = [], {}
for r in as_dicts(hdr, [r for r in rows[k + 1 :] if r[0]]):
    title = str(r["클래스"])
    if "단체" in title:
        continue
    program = "REGULAR" if title.startswith("정규반") else "ONEDAY"
    kind = kind_of(title)
    course = course_name(r["정규반 기수"]) if r["정규반 기수"] else None
    week = None
    if course:
        c = courses.setdefault(course, {"name": course, "kind": kind, "capacity": int(r["정원"]), "startDate": iso(r["날짜"], r["시작"]), "count": 0})
        c["count"] += 1
        m = re.search(r"(\d)주차", title)
        week = int(m.group(1)) if m else c["count"]
    sessions.append(
        {
            "code": r["일정ID"],
            "program": program,
            "kind": kind,
            "title": re.sub(r"\s*\(\d주차\)", "", title).replace("(일반)", "").strip(),
            "startsAt": iso(r["날짜"], r["시작"]),
            "endsAt": iso(r["날짜"], r["종료"]),
            "capacity": int(r["정원"]),
            "cancelled": r["상태"] == "휴강",
            "course": course,
            "weekNo": week,
            "memo": r["메모"],
        }
    )
for c in courses.values():
    c.pop("count")

# 2) 원데이 예약
CHANNEL = {"인스타DM": "DM", "네이버예약": "NAVER"}
STATUS = {"확정": "CONFIRMED", "취소": "CANCELLED", "노쇼": "CONFIRMED", "대기": "PENDING", None: "PENDING"}
hdr, rows, k = sheet(CAL, "예약목록", "예약번호")
reservations = []
for r in as_dicts(hdr, [r for r in rows[k + 1 :] if r[0]]):
    memo = [m for m in [r["메모"], "노쇼" if r["상태"] == "노쇼" else None, "대기 요청" if r["상태"] == "대기" else None] if m]
    paid, refund = r["결제금액"] or 0, r["환불액"] or 0
    reservations.append(
        {
            "reservationNo": str(r["예약번호"]),
            "name": r["예약자"],
            "phone": r["연락처"],
            "headcount": int(r["인원"] or 1),
            "channel": CHANNEL.get(r["채널"], "DM"),
            "status": STATUS.get(r["상태"], "PENDING"),
            "sessionAt": iso(r["수업일"], r["시간"]),
            "kind": kind_of(r["클래스"]),
            "course": None,
            "createdAt": iso(r["접수일시"]),
            "refundRate": (100 if refund >= paid else 50) if r["상태"] == "취소" and paid else None,
            "memo": " / ".join(memo) or None,
        }
    )

# 3) 정규반 등록 + 보강 기록
hdr, rows, k = sheet(CAL, "정규반 출석·보강", "기수")
end = next(i for i, r in enumerate(rows) if r[0] == "보강 요청 기록")
for n, r in enumerate(as_dicts(hdr, [r for r in rows[k + 1 : end] if r[0] and r[3]]), start=1):
    reservations.append(
        {
            "reservationNo": f"REG-{n:03d}",
            "name": r["수강생"],
            "phone": r["연락처"],
            "headcount": 1,
            "channel": CHANNEL.get(r["신청 채널"], "DM"),
            "status": "CONFIRMED" if r["입금"] == "입금확인" else "PENDING",
            "sessionAt": None,
            "kind": None,
            "course": course_name(r["기수"]),
            "createdAt": iso(r["시작일"]),
            "refundRate": None,
            "memo": r["메모"],
        }
    )
mhdr = [str(h).strip() if h else None for h in rows[end + 1]]
makeups = []
for r in as_dicts(mhdr, [r for r in rows[end + 2 :] if r[0]]):
    # 열: 결석일, 수강생, 원래 반, 보강 희망일, 보강 희망 반, 그 반 남은 자리, 처리, 확인 강사, 메모
    target, result = r["보강 희망 반"], str(r["처리"] or "")
    if not target or "반" not in str(target) or "원데이" in str(target) or "안 함" in result:
        continue  # 보강 대상 반이 없는 기록(원데이 희망·보강 안 함)은 가져오지 않는다
    status = "APPROVED" if "확정" in result else "REJECTED" if "불가" in result else "REQUESTED"
    makeups.append(
        {
            "name": r["수강생"],
            "course": course_name(r["원래 반"]),
            "missedDate": iso(r["결석일"]),
            "targetCourse": course_name(target),
            "targetDate": iso(r["보강 희망일"]),
            "status": status,
            "reason": r["메모"] if status == "REJECTED" else None,
            "createdAt": iso(r["결석일"]),
        }
    )

# 4) 단체 문의
INQ = {"문의": "NEW", "견적발송": "QUOTED", "확정": "CONFIRMED", "진행완료": "DONE"}
hdr, rows, k = sheet(CAL, "단체문의", "접수일")
inquiries = []
for r in as_dicts(hdr, [r for r in rows[k + 1 :] if r[0]]):
    quote = None
    if r["견적"]:
        nums = [int(x.replace(",", "")) for x in re.findall(r"[\d,]{4,}", str(r["견적"]))]
        total = re.search(r"총\s*([\d,]+)", str(r["견적"]))
        quote = int(total.group(1).replace(",", "")) if total else (nums[0] * int(r["인원"] or 1) if nums else None)
    inquiries.append(
        {
            "orgName": r["단체명"],
            "contactName": r["담당자"],
            "contact": r["채널"],
            "preferredDate": iso(r["희망일"]),
            "headcount": int(r["인원"] or 1),
            "place": r["장소"],
            "message": r["내용"],
            "status": INQ.get(r["진행상태"], "CANCELLED"),
            "quoteAmount": quote,
            "memo": r["메모"],
            "createdAt": iso(r["접수일"]),
        }
    )

# 5) 작품
STAGE = {"성형": "FORMING", "초벌": "BISQUE", "유약": "GLAZED", "시유": "GLAZED", "유약 바름": "GLAZED", "재벌": "GLAZE_FIRED", "완성": "DONE", "수령": "PICKED_UP"}
hdr, rows, k = sheet(WORKS, "작품목록", "작품번호")
works = []
for r in as_dicts(hdr, [r for r in rows[k + 1 :] if r[0]]):
    note = r["비고"] or ""
    dates = [d for d in [r["수령일"], r["완성일"], r["재벌일"], r["시유일"], r["초벌일"], r["수업일"]] if d]
    works.append(
        {
            "workNo": r["작품번호"],
            "classDate": iso(r["수업일"]),
            "classTitle": r["클래스"],
            "kind": kind_of(r["클래스"]),
            "ownerName": r["수강생"] or "?",
            "phoneLast4": str(r["연락처 뒷자리"]) if r["연락처 뒷자리"] else None,
            "itemName": r["작품"],
            "clay": r["흙"],
            "glaze": None if r["유약"] in (None, "미정") else r["유약"],
            "stage": STAGE[str(r["현재 단계"]).strip()],
            "broken": bool(re.search(r"깨짐|터짐|금 감", note)),
            "shelf": r["선반"],
            "pickupMethod": {"방문": "VISIT", "택배": "DELIVERY"}.get(r["수령 방법"]),
            "completedAt": iso(r["완성일"]),
            "pickedUpAt": iso(r["수령일"]),
            "stageChangedAt": iso(dates[0]),
            "memo": note or None,
        }
    )

OUT.mkdir(parents=True, exist_ok=True)
for name, data in {
    "courses": list(courses.values()),
    "sessions": sessions,
    "reservations": reservations,
    "makeups": makeups,
    "inquiries": inquiries,
    "works": works,
}.items():
    (OUT / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{name}: {len(data)}")
