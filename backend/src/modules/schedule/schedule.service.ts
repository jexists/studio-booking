import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSessionDto, CreateWorksDto, StaffReservationDto, UpdateSessionDto } from './dto';

const ACTIVE = ['PENDING', 'CONFIRMED'] as const; // 정원 계산 대상(기획 A-01)
const CAPACITY = { HAND: 8, WHEEL: 6 } as const; // R-01: 종류로 정원 고정
const DAY = 86400000;
const KST = 9 * 3600000;

// 한국 시간 날짜·시각 → Date
function kst(date: string, hm: string) {
  return new Date(`${date}T${hm}:00+09:00`);
}
// Date → 한국 시간 YYYY-MM-DD
function ymd(d: Date) {
  return new Date(d.getTime() + KST).toISOString().slice(0, 10);
}
function hm(d: Date) {
  return new Date(d.getTime() + KST).toISOString().slice(11, 16);
}
// 해당 날짜가 속한 주의 월요일 (YYYY-MM-DD)
function mondayOf(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 월=0
  return new Date(d.getTime() - dow * DAY).toISOString().slice(0, 10);
}
function addDays(date: string, n: number) {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + n * DAY).toISOString().slice(0, 10);
}

// B-04: 날짜 기준(시간 무시)으로 수업일 − 오늘 ≥ 3일이면 전액, 아니면 50%
export function refundRateFor(classStartsAt: Date, now = new Date()) {
  const diff = (Date.parse(ymd(classStartsAt)) - Date.parse(ymd(now))) / DAY;
  return diff >= 3 ? 100 : 50;
}

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  // 일정별 사용 인원. 원데이: 신청+확정 인원 합. 정규반: 반 등록 인원 − 빠지고 보강 간 인원 + 들어온 보강 인원.
  private async usedMap(sessions: { id: number; program: string; courseId: number | null }[]) {
    const used = new Map<number, number>();
    const oneday = sessions.filter((s) => s.program === 'ONEDAY').map((s) => s.id);
    const regular = sessions.filter((s) => s.program === 'REGULAR');
    if (oneday.length) {
      const rows = await this.prisma.reservation.groupBy({
        by: ['sessionId'],
        where: { sessionId: { in: oneday }, status: { in: [...ACTIVE] } },
        _sum: { headcount: true },
      });
      for (const r of rows) used.set(r.sessionId!, r._sum.headcount ?? 0);
    }
    if (regular.length) {
      const courseIds = [...new Set(regular.map((s) => s.courseId).filter((c): c is number => c != null))];
      const courseRows = await this.prisma.reservation.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds }, status: { in: [...ACTIVE] } },
        _sum: { headcount: true },
      });
      const byCourse = new Map(courseRows.map((r) => [r.courseId!, r._sum.headcount ?? 0]));
      const ids = regular.map((s) => s.id);
      const makeups = await this.prisma.makeupRequest.findMany({
        where: { status: 'APPROVED', OR: [{ missedSessionId: { in: ids } }, { targetSessionId: { in: ids } }] },
        select: { missedSessionId: true, targetSessionId: true, reservation: { select: { headcount: true } } },
      });
      for (const s of regular) {
        let n = s.courseId ? (byCourse.get(s.courseId) ?? 0) : 0;
        for (const m of makeups) {
          if (m.missedSessionId === s.id) n -= m.reservation.headcount;
          if (m.targetSessionId === s.id) n += m.reservation.headcount;
        }
        used.set(s.id, Math.max(0, n));
      }
    }
    return used;
  }

  async week(weekStart?: string) {
    const monday = mondayOf(weekStart ?? ymd(new Date()));
    const from = kst(monday, '00:00');
    const to = kst(addDays(monday, 7), '00:00');
    const sessions = await this.prisma.classSession.findMany({
      where: { startsAt: { gte: from, lt: to } },
      orderBy: { startsAt: 'asc' },
      include: { course: { select: { name: true } } },
    });
    const used = await this.usedMap(sessions);
    return {
      weekStart: monday,
      sessions: sessions.map((s) => ({
        id: s.id,
        program: s.program,
        kind: s.kind,
        title: s.title,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        capacity: s.capacity,
        used: used.get(s.id) ?? 0,
        cancelled: s.cancelled,
        courseName: s.course?.name ?? null,
        weekNo: s.weekNo,
      })),
    };
  }

  async create(dto: CreateSessionDto) {
    if (dto.end <= dto.start) throw new BadRequestException('종료 시간이 시작보다 늦어야 해요');
    const capacity = CAPACITY[dto.kind];
    if (dto.program === 'ONEDAY') {
      const s = await this.prisma.classSession.create({
        data: {
          program: 'ONEDAY',
          kind: dto.kind,
          title: dto.title!.trim(),
          startsAt: kst(dto.date, dto.start),
          endsAt: kst(dto.date, dto.end),
          capacity,
        },
      });
      return { sessionIds: [s.id], courseId: null };
    }
    const name = dto.courseName!.trim();
    if (await this.prisma.regularCourse.findUnique({ where: { name } })) throw new ConflictException('같은 이름의 반이 이미 있어요');
    // A-05: 첫 날짜부터 매주 같은 시간 4회
    return this.prisma.$transaction(async (tx) => {
      const course = await tx.regularCourse.create({
        data: { name, kind: dto.kind, capacity, startDate: kst(dto.date, '00:00') },
      });
      const ids: number[] = [];
      for (let w = 0; w < 4; w++) {
        const date = addDays(dto.date, w * 7);
        const s = await tx.classSession.create({
          data: {
            program: 'REGULAR',
            kind: dto.kind,
            title: `정규반 ${dto.kind === 'WHEEL' ? '물레' : '핸드빌딩'}`,
            startsAt: kst(date, dto.start),
            endsAt: kst(date, dto.end),
            capacity,
            courseId: course.id,
            weekNo: w + 1,
          },
        });
        ids.push(s.id);
      }
      return { sessionIds: ids, courseId: course.id };
    });
  }

  async update(id: number, dto: UpdateSessionDto) {
    const s = await this.prisma.classSession.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('일정을 찾을 수 없어요');
    const date = ymd(s.startsAt);
    const start = dto.start ?? hm(s.startsAt);
    const end = dto.end ?? hm(s.endsAt);
    if (end <= start) throw new BadRequestException('종료 시간이 시작보다 늦어야 해요');
    await this.prisma.classSession.update({
      where: { id },
      data: { startsAt: kst(date, start), endsAt: kst(date, end), ...(dto.cancelled !== undefined ? { cancelled: dto.cancelled } : {}) },
    });
    return this.detail(id);
  }

  // 예약번호(일부 가능)·전화번호(숫자만 쳐도 됨, 일부 가능)·이름으로 신청 내역을 찾는다.
  async search(raw: string) {
    const q = raw.trim().slice(0, 40);
    if (q.length < 2) return { results: [] };
    const digits = q.replace(/\D/g, '');
    const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const idRows = await this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT id FROM "Reservation"
      WHERE "reservationNo" ILIKE ${like}
         OR name ILIKE ${like}
         ${digits.length >= 3 ? Prisma.sql`OR regexp_replace(phone, '[^0-9]', '', 'g') LIKE ${'%' + digits + '%'}` : Prisma.empty}
      ORDER BY "createdAt" DESC
      LIMIT 20`);
    if (idRows.length === 0) return { results: [] };
    const rows = await this.prisma.reservation.findMany({
      where: { id: { in: idRows.map((r) => r.id) } },
      orderBy: { createdAt: 'desc' },
      include: { session: true, course: { include: { sessions: { orderBy: { startsAt: 'asc' } } } } },
    });
    const now = Date.now();
    return {
      results: rows.map((r) => {
        // 정규반은 신청 단위가 반이라, 다가오는 첫 회차(없으면 마지막 회차)로 연결한다.
        const cs = r.course?.sessions ?? [];
        const linked = r.session ?? cs.find((x) => x.startsAt.getTime() >= now) ?? cs[cs.length - 1] ?? null;
        return {
          id: r.id,
          reservationNo: r.reservationNo,
          name: r.name,
          phone: r.phone,
          headcount: r.headcount,
          channel: r.channel,
          status: r.status,
          program: r.course ? 'REGULAR' : 'ONEDAY',
          title: r.course?.name ?? r.session?.title ?? '',
          sessionId: linked?.id ?? null,
          startsAt: linked?.startsAt ?? null,
        };
      }),
    };
  }

  async detail(id: number) {
    const s = await this.prisma.classSession.findUnique({
      where: { id },
      include: {
        course: { select: { name: true } },
        works: { orderBy: { workNo: 'asc' }, select: { id: true, workNo: true, ownerName: true, itemName: true, stage: true, reservationId: true } },
      },
    });
    if (!s) throw new NotFoundException('일정을 찾을 수 없어요');
    const used = (await this.usedMap([s])).get(s.id) ?? 0;
    const worksBy = new Map<number, number>();
    for (const w of s.works) if (w.reservationId) worksBy.set(w.reservationId, (worksBy.get(w.reservationId) ?? 0) + 1);

    type Row = Prisma.ReservationGetPayload<object>;
    const item = (r: Row, flag: 'MAKEUP_IN' | 'MOVED_OUT' | null) => ({
      id: r.id,
      reservationNo: r.reservationNo,
      name: r.name,
      phone: r.phone,
      phoneLast4: r.phoneLast4,
      headcount: r.headcount,
      channel: r.channel,
      status: r.status,
      refundRate: r.refundRate,
      cancelRequestedAt: r.status === 'PENDING' || r.status === 'CONFIRMED' ? r.cancelRequestedAt : null, // 처리 대기 중인 환불 요청
      cancelRequestRate: r.cancelRequestRate,
      cancelReason: r.cancelReason,
      noShowAt: r.noShowAt,
      memo: r.memo,
      flag, // MAKEUP_IN: 보강으로 들어옴, MOVED_OUT: 이 회차를 빠지고 보강 감
      worksCount: worksBy.get(r.id) ?? 0,
    });

    let roster: ReturnType<typeof item>[];
    if (s.program === 'ONEDAY') {
      const rows = await this.prisma.reservation.findMany({ where: { sessionId: s.id }, orderBy: { createdAt: 'asc' } });
      roster = rows.map((r) => item(r, null));
    } else {
      const [rows, makeups] = await Promise.all([
        s.courseId ? this.prisma.reservation.findMany({ where: { courseId: s.courseId }, orderBy: { createdAt: 'asc' } }) : [],
        this.prisma.makeupRequest.findMany({
          where: { status: 'APPROVED', OR: [{ missedSessionId: s.id }, { targetSessionId: s.id }] },
          include: { reservation: true },
        }),
      ]);
      const movedOut = new Set(makeups.filter((m) => m.missedSessionId === s.id).map((m) => m.reservationId));
      roster = [
        ...rows.map((r) => item(r, movedOut.has(r.id) ? 'MOVED_OUT' : null)),
        ...makeups.filter((m) => m.targetSessionId === s.id).map((m) => item(m.reservation, 'MAKEUP_IN')),
      ];
    }

    return {
      id: s.id,
      program: s.program,
      kind: s.kind,
      title: s.title,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: s.capacity,
      used,
      cancelled: s.cancelled,
      courseName: s.course?.name ?? null,
      weekNo: s.weekNo,
      roster,
      works: s.works.map(({ reservationId: _r, ...w }) => w),
    };
  }

  // 직원 대리 등록(DM·네이버). 공개 신청과 같이 일정 행을 잠그고 정원을 다시 센다.
  async addReservation(sessionId: number, dto: StaffReservationDto, staffId: number) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: number; capacity: number; cancelled: boolean; program: string; startsAt: Date }[]>(
        Prisma.sql`SELECT id, capacity, cancelled, program::text, "startsAt" FROM "ClassSession" WHERE id = ${sessionId} FOR UPDATE`,
      );
      const s = locked[0];
      if (!s) throw new NotFoundException('일정을 찾을 수 없어요');
      if (s.program !== 'ONEDAY') throw new BadRequestException('정규반은 여기서 등록할 수 없어요');
      if (s.startsAt < new Date()) throw new BadRequestException('지난 수업에는 예약을 등록할 수 없어요');
      if (s.cancelled) throw new BadRequestException('휴강한 수업이에요');
      if (!dto.force) {
        const dup = await tx.reservation.findFirst({ where: { sessionId: s.id, phone: dto.phone, status: { in: [...ACTIVE] } } });
        if (dup) throw new ConflictException('같은 번호로 이미 예약이 있어요');
      }
      const used = await tx.reservation.aggregate({
        where: { sessionId: s.id, status: { in: [...ACTIVE] } },
        _sum: { headcount: true },
      });
      const remaining = s.capacity - (used._sum.headcount ?? 0);
      if (dto.headcount > remaining) throw new ConflictException(remaining > 0 ? `남은 자리가 ${remaining}자리예요` : '자리가 모두 찼어요');
      const confirmed = dto.status === 'CONFIRMED';
      const r = await tx.reservation.create({
        data: {
          reservationNo: randomBytes(4).toString('hex').slice(0, 6).toUpperCase(),
          name: dto.name.trim(),
          phone: dto.phone,
          phoneLast4: dto.phone.slice(-4),
          headcount: dto.headcount,
          channel: dto.channel,
          status: dto.status,
          sessionId: s.id,
          ...(confirmed ? { confirmedAt: new Date(), confirmedById: staffId } : {}),
        },
      });
      return { id: r.id, reservationNo: r.reservationNo, status: r.status };
    });
  }

  async confirm(id: number, staffId: number) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('예약을 찾을 수 없어요');
    if (r.status !== 'PENDING') throw new BadRequestException('신청 상태인 예약만 확정할 수 있어요');
    const u = await this.prisma.reservation.update({
      where: { id },
      data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedById: staffId },
    });
    return { id: u.id, status: u.status, confirmedAt: u.confirmedAt };
  }

  private async refundOf(id: number) {
    const r = await this.prisma.reservation.findUnique({ where: { id }, include: { session: { select: { startsAt: true } } } });
    if (!r) throw new NotFoundException('예약을 찾을 수 없어요');
    // 정규반은 환불 비율 없이 취소만 (STF-05)
    return { r, refundRate: r.session ? refundRateFor(r.session.startsAt) : null };
  }

  async refundPreview(id: number) {
    const { refundRate } = await this.refundOf(id);
    return { refundRate };
  }

  async cancel(id: number) {
    const { r, refundRate } = await this.refundOf(id);
    if (r.status === 'CANCELLED') throw new BadRequestException('이미 취소된 예약이에요');
    if (r.status === 'NO_SHOW') throw new BadRequestException('노쇼를 먼저 되돌려 주세요');
    const u = await this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), refundRate },
    });
    return { id: u.id, status: u.status, refundRate: u.refundRate };
  }

  // 수강생 환불 요청 승인: 요청 때 정한 비율로 취소한다.
  async approveCancelRequest(id: number) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('예약을 찾을 수 없어요');
    if (!r.cancelRequestedAt || (r.status !== 'PENDING' && r.status !== 'CONFIRMED')) throw new BadRequestException('처리할 환불 요청이 없어요');
    const { count } = await this.prisma.reservation.updateMany({
      where: { id, status: { in: [...ACTIVE] }, cancelRequestedAt: { not: null } },
      data: { status: 'CANCELLED', cancelledAt: new Date(), refundRate: r.cancelRequestRate },
    });
    if (count === 0) throw new BadRequestException('처리할 환불 요청이 없어요');
    return { id, status: 'CANCELLED' as const, refundRate: r.cancelRequestRate };
  }

  // 환불 요청 반려: 요청 기록만 지운다(예약은 그대로).
  async rejectCancelRequest(id: number) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('예약을 찾을 수 없어요');
    if (!r.cancelRequestedAt || (r.status !== 'PENDING' && r.status !== 'CONFIRMED')) throw new BadRequestException('처리할 환불 요청이 없어요');
    await this.prisma.reservation.update({ where: { id }, data: { cancelRequestedAt: null, cancelRequestRate: null, cancelReason: null } });
    return { id, status: r.status };
  }

  // [가정] 노쇼: 원데이 수업이 시작된 뒤에만 표시. 환불 계산 안 함.
  async markNoShow(id: number) {
    const r = await this.prisma.reservation.findUnique({ where: { id }, include: { session: { select: { startsAt: true } } } });
    if (!r) throw new NotFoundException('예약을 찾을 수 없어요');
    if (!r.session) throw new BadRequestException('정규반은 노쇼로 표시하지 않아요');
    if (r.status !== 'PENDING' && r.status !== 'CONFIRMED') throw new BadRequestException('신청·확정 예약만 노쇼로 표시할 수 있어요');
    if (r.session.startsAt.getTime() > Date.now()) throw new BadRequestException('수업이 시작된 뒤에 표시할 수 있어요');
    if (r.cancelRequestedAt) throw new BadRequestException('환불 요청을 먼저 처리해 주세요');
    const u = await this.prisma.reservation.update({ where: { id }, data: { status: 'NO_SHOW', noShowAt: new Date() } });
    return { id: u.id, status: u.status, noShowAt: u.noShowAt };
  }

  async undoNoShow(id: number) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('예약을 찾을 수 없어요');
    if (r.status !== 'NO_SHOW') throw new BadRequestException('노쇼 예약이 아니에요');
    const u = await this.prisma.reservation.update({ where: { id }, data: { status: 'CONFIRMED', noShowAt: null } });
    return { id: u.id, status: u.status };
  }

  // 작품 등록: 번호 W{수업일 YYMMDD}-{순번 2자리}, 같은 날짜의 마지막 순번 다음부터
  async addWorks(sessionId: number, dto: CreateWorksDto) {
    const s = await this.prisma.classSession.findUnique({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('일정을 찾을 수 없어요');
    const resIds = dto.items.map((i) => i.reservationId).filter((v): v is number => v != null);
    const resList = resIds.length ? await this.prisma.reservation.findMany({ where: { id: { in: resIds } } }) : [];
    const resMap = new Map(resList.map((r) => [r.id, r]));
    if (resIds.some((rid) => !resMap.has(rid))) throw new BadRequestException('예약을 찾을 수 없어요');

    const prefix = `W${ymd(s.startsAt).slice(2).replaceAll('-', '')}-`;
    return this.prisma.$transaction(async (tx) => {
      // 같은 날짜 번호를 동시에 만들지 않도록 일정 행을 잠근다
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "ClassSession" WHERE id = ${s.id} FOR UPDATE`);
      const existing = await tx.work.findMany({ where: { workNo: { startsWith: prefix } }, select: { workNo: true } });
      let seq = existing.reduce((m, w) => Math.max(m, Number(w.workNo.slice(prefix.length)) || 0), 0);
      const workNos: string[] = [];
      for (const i of dto.items) {
        const res = i.reservationId ? resMap.get(i.reservationId) : undefined;
        for (let n = 0; n < i.count; n++) {
          const workNo = `${prefix}${String(++seq).padStart(2, '0')}`;
          await tx.work.create({
            data: {
              workNo,
              reservationId: i.reservationId ?? null,
              sessionId: s.id,
              classDate: s.startsAt,
              ownerName: i.ownerName.trim(),
              phoneLast4: i.phoneLast4 ?? res?.phoneLast4 ?? null,
              itemName: i.itemName.trim(),
              clay: i.clay?.trim() || null,
              glaze: i.glaze?.trim() || null,
              stage: 'FORMING',
            },
          });
          workNos.push(workNo);
        }
      }
      return { created: workNos.length, workNos };
    });
  }
}
