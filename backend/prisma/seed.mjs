// 시험 자료 시드. 실행: pnpm db:seed (backend 폴더)
// - 직원 계정 3개(로컬·시연용), 일정·정규반·예약·보강·작품·단체 문의·식기 경고 유약을 넣는다.
// - 다시 실행하면 위 테이블을 비우고 새로 넣는다. 올린 자료(Document)는 건드리지 않는다.
// - 원본: sample-data/*.xlsx → scripts/xlsx-to-seed.py → prisma/seed-data/*.json
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();
const dir = join(dirname(fileURLToPath(import.meta.url)), "seed-data");
const load = (name) => JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8"));
const d = (s) => (s ? new Date(s) : null);
// 한국 시간 기준 날짜(YYYY-MM-DD). UTC로 자르면 자정 근처 날짜가 하루 밀린다.
const kstDay = (v) => new Date(new Date(v).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

// 백엔드 auth 모듈과 같은 형식: scrypt:<salt hex>:<hash hex>
export function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

const STAFF = [
  { email: "admin@naver.com", name: "문정호", role: "OWNER" },
  { email: "test1@naver.com", name: "류세아", role: "STAFF" },
  { email: "test2@naver.com", name: "권태민", role: "STAFF" },
];
const SEED_PASSWORD = "12341234";

// 식기로 쓰면 안 되는 흙·유약 (근거: sample-data 공급처 PDF)
const GLAZE_WARNINGS = [
  { code: "BG-V41", name: "라바유", reason: "장식용 유약 — 식기 사용 불가", sourceRef: "빛가람세라믹 기술자료 p.15" },
  { code: "BG-K31", name: "크랙유", reason: "빙렬 사이 오염 — 식기 비권장", sourceRef: "빛가람세라믹 기술자료 p.13" },
  { code: "BG-G61", name: "금채", reason: "금속 장식 — 전자레인지·식기세척기 불가", sourceRef: "빛가람세라믹 기술자료 p.19" },
  { code: "BG-G62", name: "백금채", reason: "금속 장식 — 전자레인지·식기세척기 불가", sourceRef: "빛가람세라믹 기술자료 p.21" },
  { code: "BG-P71", name: "라스터", reason: "금속 광택 — 전자레인지 불가", sourceRef: "빛가람세라믹 기술자료 p.23" },
  { code: "LF-190", name: "Midnight Crawl", reason: "Decorative Use Only — 식기 사용 불가", sourceRef: "Larkfield 데이터시트 p.28" },
  { code: "LF-205", name: "Lava Rose", reason: "Decorative Use Only — 식기 사용 불가", sourceRef: "Larkfield 데이터시트 p.30" },
  { code: "LF-219", name: "Crater White", reason: "Decorative Use Only — 식기 사용 불가", sourceRef: "Larkfield 데이터시트 p.32" },
  { code: "ST-RK910", name: "라쿠토", reason: "흡수율이 높아 식기 사용 불가(장식용)", sourceRef: "새터도재 자료집 p.30" },
];

async function main() {
  // 지우는 순서: 자식 → 부모
  await prisma.workStageLog.deleteMany();
  await prisma.work.deleteMany();
  await prisma.makeupRequest.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.regularCourse.deleteMany();
  await prisma.groupInquiry.deleteMany();
  await prisma.glazeWarning.deleteMany();
  await prisma.staffSession.deleteMany();
  await prisma.staffInvite.deleteMany();
  await prisma.staff.deleteMany();

  await prisma.staff.createMany({ data: STAFF.map((s) => ({ ...s, passwordHash: hashPassword(SEED_PASSWORD) })) });

  const courses = load("courses");
  await prisma.regularCourse.createMany({ data: courses.map((c) => ({ ...c, startDate: d(c.startDate) })) });
  const courseId = new Map((await prisma.regularCourse.findMany()).map((c) => [c.name, c.id]));

  const sessions = load("sessions");
  await prisma.classSession.createMany({
    data: sessions.map(({ course, ...s }) => ({
      ...s,
      startsAt: d(s.startsAt),
      endsAt: d(s.endsAt),
      courseId: course ? courseId.get(course) : null,
    })),
  });
  const allSessions = await prisma.classSession.findMany();
  const onedayAt = new Map(allSessions.filter((s) => s.program === "ONEDAY").map((s) => [`${s.startsAt.toISOString()}|${s.kind}`, s]));
  const courseSessionOn = (cid, date) =>
    allSessions.find((s) => s.courseId === cid && kstDay(s.startsAt) === kstDay(date));

  const reservations = load("reservations");
  let unmatched = 0;
  await prisma.reservation.createMany({
    data: reservations.map(({ sessionAt, kind, course, createdAt, ...r }) => {
      const session = sessionAt ? onedayAt.get(`${new Date(sessionAt).toISOString()}|${kind}`) : null;
      if (sessionAt && !session) unmatched++;
      return {
        ...r,
        phoneLast4: r.phone.slice(-4),
        sessionId: session?.id ?? null,
        courseId: course ? courseId.get(course) ?? null : null,
        confirmedAt: r.status === "CONFIRMED" ? d(createdAt) : null,
        cancelledAt: r.status === "CANCELLED" ? d(createdAt) : null,
        createdAt: d(createdAt) ?? undefined,
      };
    }),
  });
  const allRes = await prisma.reservation.findMany({ include: { session: true } });

  const makeups = load("makeups");
  let makeupCount = 0;
  for (const m of makeups) {
    const fromCourse = courseId.get(m.course);
    const toCourse = courseId.get(m.targetCourse);
    const res = allRes.find((r) => r.courseId === fromCourse && r.name === m.name);
    const missed = fromCourse && courseSessionOn(fromCourse, m.missedDate);
    const target = toCourse && courseSessionOn(toCourse, m.targetDate);
    if (!res || !missed || !target) continue;
    await prisma.makeupRequest.create({
      data: {
        reservationId: res.id,
        missedSessionId: missed.id,
        targetSessionId: target.id,
        status: m.status,
        rejectReason: m.reason,
        decidedAt: m.status === "REQUESTED" ? null : d(m.createdAt),
        createdAt: d(m.createdAt),
      },
    });
    makeupCount++;
  }

  const works = load("works");
  await prisma.work.createMany({
    data: works.map(({ classTitle, kind, ...w }) => {
      const cid = courseId.get(classTitle);
      const res = allRes.find((r) =>
        cid
          ? r.courseId === cid && r.name === w.ownerName
          : r.session && kstDay(r.session.startsAt) === kstDay(w.classDate) && r.name === w.ownerName,
      );
      const session =
        res?.session ?? (cid ? courseSessionOn(cid, w.classDate) : allSessions.find((s) => s.program === "ONEDAY" && s.kind === kind && kstDay(s.startsAt) === kstDay(w.classDate)));
      return {
        ...w,
        reservationId: res?.id ?? null,
        sessionId: session?.id ?? null,
        classDate: d(w.classDate),
        completedAt: d(w.completedAt),
        pickedUpAt: d(w.pickedUpAt),
        stageChangedAt: d(w.stageChangedAt) ?? undefined,
      };
    }),
  });

  const inquiries = load("inquiries");
  await prisma.groupInquiry.createMany({
    data: inquiries.map((q) => ({ ...q, preferredDate: d(q.preferredDate), createdAt: d(q.createdAt) ?? undefined })),
  });
  await prisma.glazeWarning.createMany({ data: GLAZE_WARNINGS });

  const counts = {
    staff: await prisma.staff.count(),
    courses: await prisma.regularCourse.count(),
    sessions: await prisma.classSession.count(),
    reservations: await prisma.reservation.count(),
    reservationsWithoutSession: unmatched,
    makeups: makeupCount,
    works: await prisma.work.count(),
    worksLinkedToReservation: await prisma.work.count({ where: { reservationId: { not: null } } }),
    inquiries: await prisma.groupInquiry.count(),
    glazeWarnings: await prisma.glazeWarning.count(),
  };
  console.log(counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
