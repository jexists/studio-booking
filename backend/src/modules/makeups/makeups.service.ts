import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type MakeupStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateMakeupDto, MAKEUP_FILTERS } from './dto';

const ACTIVE = ['PENDING', 'CONFIRMED'] as const; // 정원 계산 대상(기획 A-01)
const KST = 9 * 3600000;
const DAY = 86400000;
const NOT_FOUND = '예약 번호나 휴대폰 뒤 4자리가 맞지 않아요';

type Db = Prisma.TransactionClient;
type SessionRef = { id: number; courseId: number | null };

// 한국 시간 기준 그 주 월요일 0시(일 번호). 1970-01-01은 목요일이라 +3 하면 월요일=0.
function weekOf(d: Date) {
  const day = Math.floor((d.getTime() + KST) / DAY);
  return day - ((day + 3) % 7);
}
function weekStart(d: Date) {
  return new Date(weekOf(d) * DAY - KST);
}

const sessionWithCourse = { include: { course: { select: { name: true } } } } as const;

@Injectable()
export class MakeupsService {
  constructor(private readonly prisma: PrismaService) {}

  // 정규반 회차 인원 [가정 B-03] = 반 등록 인원(신청+확정) − 그 회차를 빠지고 보강 간 인원 + 그 회차로 승인된 보강 인원
  private async usedSeats(db: Db, sessions: SessionRef[]) {
    const ids = sessions.map((s) => s.id);
    const courseIds = [...new Set(sessions.map((s) => s.courseId).filter((c): c is number => c !== null))];
    const [enrolled, makeups] = await Promise.all([
      db.reservation.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds }, status: { in: [...ACTIVE] } },
        _sum: { headcount: true },
      }),
      db.makeupRequest.findMany({
        where: {
          status: 'APPROVED',
          reservation: { status: { in: [...ACTIVE] } },
          OR: [{ missedSessionId: { in: ids } }, { targetSessionId: { in: ids } }],
        },
        select: { missedSessionId: true, targetSessionId: true, reservation: { select: { headcount: true } } },
      }),
    ]);
    const byCourse = new Map(enrolled.map((e) => [e.courseId!, e._sum.headcount ?? 0]));
    const used = new Map(sessions.map((s) => [s.id, s.courseId ? (byCourse.get(s.courseId) ?? 0) : 0]));
    for (const m of makeups) {
      const n = m.reservation.headcount;
      if (used.has(m.missedSessionId)) used.set(m.missedSessionId, used.get(m.missedSessionId)! - n);
      if (used.has(m.targetSessionId)) used.set(m.targetSessionId, used.get(m.targetSessionId)! + n);
    }
    return used;
  }

  // 예약 번호 + 뒤 4자리 확인. 틀리면 어느 쪽이 틀렸는지 알려 주지 않는다(me.service 와 같은 문구).
  private async owner(db: Db, reservationNo: string, phoneLast4: string) {
    const r = await db.reservation.findUnique({ where: { reservationNo: reservationNo.trim() }, include: { course: true } });
    if (!r || r.phoneLast4 !== phoneLast4) throw new NotFoundException(NOT_FOUND);
    if (!r.course) throw new BadRequestException('정규반 예약만 보강을 신청할 수 있어요');
    if (r.status === 'CANCELLED') throw new BadRequestException('취소된 예약이에요');
    return { ...r, course: r.course };
  }

  // 수강생: 내 반 회차(이번 주 이후, 휴강 아님)마다 같은 주·다른 반·같은 종류·시작 전·빈자리 있는 후보
  async options(reservationNo: string, phoneLast4: string) {
    const r = await this.owner(this.prisma, reservationNo, phoneLast4);
    const now = new Date();
    const mine = await this.prisma.classSession.findMany({
      where: { courseId: r.courseId, cancelled: false, startsAt: { gte: weekStart(now) } },
      orderBy: { startsAt: 'asc' },
    });
    const requests = await this.prisma.makeupRequest.findMany({
      where: { reservationId: r.id },
      include: { missedSession: sessionWithCourse, targetSession: sessionWithCourse },
      orderBy: { createdAt: 'desc' },
    });

    let pool: Prisma.ClassSessionGetPayload<typeof sessionWithCourse>[] = [];
    let used = new Map<number, number>();
    if (mine.length) {
      const from = weekStart(mine[0].startsAt);
      const to = new Date(weekStart(mine[mine.length - 1].startsAt).getTime() + 7 * DAY);
      pool = await this.prisma.classSession.findMany({
        where: {
          program: 'REGULAR',
          kind: r.course.kind,
          cancelled: false,
          courseId: { not: null, notIn: [r.courseId!] },
          startsAt: { gt: now, gte: from, lt: to },
        },
        orderBy: { startsAt: 'asc' },
        ...sessionWithCourse,
      });
      used = await this.usedSeats(this.prisma, pool);
    }

    return {
      reservationNo: r.reservationNo,
      name: r.name,
      courseName: r.course.name,
      kind: r.course.kind,
      sessions: mine.map((s) => {
        const open = requests.find((q) => q.missedSessionId === s.id && q.status !== 'REJECTED');
        return {
          id: s.id,
          weekNo: s.weekNo,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          requestStatus: open?.status ?? null, // 대기·승인된 신청이 있으면 다시 신청할 수 없다
          candidates: open
            ? []
            : pool
                .filter((c) => weekOf(c.startsAt) === weekOf(s.startsAt))
                .map((c) => ({
                  id: c.id,
                  courseName: c.course?.name ?? c.title,
                  startsAt: c.startsAt,
                  endsAt: c.endsAt,
                  capacity: c.capacity,
                  used: used.get(c.id) ?? 0,
                  remaining: Math.max(0, c.capacity - (used.get(c.id) ?? 0)),
                }))
                .filter((c) => c.remaining >= r.headcount),
        };
      }),
      requests: requests.map((q) => ({
        id: q.id,
        status: q.status,
        rejectReason: q.rejectReason,
        createdAt: q.createdAt,
        decidedAt: q.decidedAt,
        missed: { id: q.missedSession.id, courseName: q.missedSession.course?.name ?? q.missedSession.title, startsAt: q.missedSession.startsAt },
        target: { id: q.targetSession.id, courseName: q.targetSession.course?.name ?? q.targetSession.title, startsAt: q.targetSession.startsAt },
      })),
    };
  }

  // 보강 반 회차 행을 잠그고 규칙·빈자리를 다시 확인한다(신청·승인 공통).
  private async checkTarget(tx: Db, targetSessionId: number, missed: { startsAt: Date; courseId: number | null; kind: string }, headcount: number) {
    const locked = await tx.$queryRaw<{ id: number; capacity: number; startsAt: Date; cancelled: boolean; program: string; kind: string; courseId: number | null }[]>(
      Prisma.sql`SELECT id, capacity, "startsAt", cancelled, program::text, kind::text, "courseId" FROM "ClassSession" WHERE id = ${targetSessionId} FOR UPDATE`,
    );
    const t = locked[0];
    if (!t || t.program !== 'REGULAR' || t.courseId === null) throw new NotFoundException('보강 받을 수업을 찾을 수 없어요');
    if (t.courseId === missed.courseId) throw new BadRequestException('다른 정규반으로만 보강할 수 있어요');
    if (t.kind !== missed.kind) throw new BadRequestException('같은 종류의 반으로만 보강할 수 있어요');
    if (weekOf(t.startsAt) !== weekOf(missed.startsAt)) throw new BadRequestException('빠지는 회차와 같은 주에만 보강할 수 있어요');
    if (t.cancelled || t.startsAt <= new Date()) throw new BadRequestException('보강 받을 수 없는 수업이에요');
    const used = (await this.usedSeats(tx, [{ id: t.id, courseId: t.courseId }])).get(t.id) ?? 0;
    if (t.capacity - used < headcount) throw new ConflictException('보강 반 자리가 다 찼어요');
    return { capacity: t.capacity, used };
  }

  // 수강생 보강 신청: 즉시 확정하지 않고 '대기'로 저장, 강사가 확인 후 안내
  async create(dto: CreateMakeupDto) {
    return this.prisma.$transaction(async (tx) => {
      const r = await this.owner(tx, dto.reservationNo, dto.phoneLast4);
      const missed = await tx.classSession.findUnique({ where: { id: dto.missedSessionId } });
      if (!missed || missed.courseId !== r.courseId) throw new BadRequestException('내 반의 회차만 고를 수 있어요');
      if (missed.cancelled || missed.startsAt < weekStart(new Date())) throw new BadRequestException('보강을 신청할 수 없는 회차예요');
      const dup = await tx.makeupRequest.findFirst({
        where: { reservationId: r.id, missedSessionId: missed.id, status: { in: ['REQUESTED', 'APPROVED'] } },
      });
      if (dup) throw new ConflictException('이 회차는 이미 보강을 신청했어요');
      await this.checkTarget(tx, dto.targetSessionId, missed, r.headcount);
      const m = await tx.makeupRequest.create({
        data: { reservationId: r.id, missedSessionId: missed.id, targetSessionId: dto.targetSessionId },
      });
      return { id: m.id, status: m.status };
    });
  }

  // 직원: 보강 신청 목록 (DECIDED = 승인 + 반려)
  async list(status: (typeof MAKEUP_FILTERS)[number]) {
    const statuses: MakeupStatus[] = status === 'DECIDED' ? ['APPROVED', 'REJECTED'] : [status];
    const rows = await this.prisma.makeupRequest.findMany({
      where: { status: { in: statuses } },
      include: {
        reservation: { select: { reservationNo: true, name: true, phoneLast4: true, headcount: true } },
        missedSession: sessionWithCourse,
        targetSession: sessionWithCourse,
      },
      orderBy: status === 'REQUESTED' ? { createdAt: 'asc' } : { decidedAt: 'desc' },
      take: 100,
    });
    const used = await this.usedSeats(this.prisma, rows.map((m) => m.targetSession));
    const staffIds = [...new Set(rows.map((m) => m.decidedById).filter((v): v is number => v !== null))];
    const staff = staffIds.length ? await this.prisma.staff.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } }) : [];
    return rows.map((m) => ({
      id: m.id,
      status: m.status,
      rejectReason: m.rejectReason,
      createdAt: m.createdAt,
      decidedAt: m.decidedAt,
      decidedBy: staff.find((s) => s.id === m.decidedById)?.name ?? null,
      student: { name: m.reservation.name, reservationNo: m.reservation.reservationNo, phoneLast4: m.reservation.phoneLast4, headcount: m.reservation.headcount },
      missed: { id: m.missedSession.id, courseName: m.missedSession.course?.name ?? m.missedSession.title, startsAt: m.missedSession.startsAt },
      target: {
        id: m.targetSession.id,
        courseName: m.targetSession.course?.name ?? m.targetSession.title,
        startsAt: m.targetSession.startsAt,
        capacity: m.targetSession.capacity,
        used: used.get(m.targetSession.id) ?? 0,
      },
    }));
  }

  private async pending(tx: Db, id: number) {
    const m = await tx.makeupRequest.findUnique({ where: { id }, include: { reservation: true, missedSession: true } });
    if (!m) throw new NotFoundException('보강 신청을 찾을 수 없어요');
    if (m.status !== 'REQUESTED') throw new ConflictException('이미 처리된 신청이에요');
    return m;
  }

  // 승인: 트랜잭션 안에서 보강 반 회차를 잠그고 정원을 다시 센 뒤 확정
  async approve(id: number, staffId: number) {
    return this.prisma.$transaction(async (tx) => {
      const m = await this.pending(tx, id);
      if (m.reservation.status === 'CANCELLED') throw new BadRequestException('취소된 예약이에요');
      const seat = await this.checkTarget(tx, m.targetSessionId, m.missedSession, m.reservation.headcount);
      const done = await tx.makeupRequest.updateMany({
        where: { id, status: 'REQUESTED' },
        data: { status: 'APPROVED', decidedById: staffId, decidedAt: new Date(), rejectReason: null },
      });
      if (done.count === 0) throw new ConflictException('이미 처리된 신청이에요');
      return { id, status: 'APPROVED' as const, target: { capacity: seat.capacity, used: seat.used + m.reservation.headcount } };
    });
  }

  async reject(id: number, staffId: number, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.pending(tx, id);
      const done = await tx.makeupRequest.updateMany({
        where: { id, status: 'REQUESTED' },
        data: { status: 'REJECTED', decidedById: staffId, decidedAt: new Date(), rejectReason: reason?.trim() || null },
      });
      if (done.count === 0) throw new ConflictException('이미 처리된 신청이에요');
      return { id, status: 'REJECTED' as const };
    });
  }
}
