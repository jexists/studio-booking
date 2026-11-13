import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DAY = 86400000;
const KST = 9 * 3600000; // 한국은 서머타임이 없어 +9시간 고정
const KILN_MIN = 30; // 가마는 30점 이상 모이면 가동
const KEEP_DAYS = 60; // 완성 후 보관 기간

// 한국 시간 기준 오늘 0시(UTC 시각으로 표현)
function startOfTodayKst() {
  const kstNow = Date.now() + KST;
  return new Date(Math.floor(kstNow / DAY) * DAY - KST);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async today() {
    const from = startOfTodayKst();
    const to = new Date(from.getTime() + DAY);

    const [sessions, pendingReservations, makeupsRequested, newInquiries, bisqueWaiting, glazeWaiting, overdueWorks] =
      await Promise.all([
        this.prisma.classSession.findMany({
          where: { startsAt: { gte: from, lt: to } },
          orderBy: { startsAt: 'asc' },
          include: {
            course: {
              select: {
                name: true,
                reservations: { where: { status: { in: ['PENDING', 'CONFIRMED'] } }, select: { headcount: true } },
              },
            },
            reservations: { where: { status: { in: ['PENDING', 'CONFIRMED'] } }, select: { headcount: true } },
            missedMakeups: { where: { status: 'APPROVED' }, select: { reservation: { select: { headcount: true } } } },
            targetMakeups: { where: { status: 'APPROVED' }, select: { reservation: { select: { headcount: true } } } },
          },
        }),
        this.prisma.reservation.count({
          where: { status: 'PENDING', session: { program: 'ONEDAY', startsAt: { gte: new Date() } } },
        }),
        this.prisma.makeupRequest.count({ where: { status: 'REQUESTED' } }),
        this.prisma.groupInquiry.count({ where: { status: 'NEW' } }),
        this.prisma.work.count({ where: { stage: 'FORMING', broken: false } }),
        this.prisma.work.count({ where: { stage: 'GLAZED', broken: false } }),
        this.prisma.work.count({
          where: { stage: 'DONE', completedAt: { lt: new Date(from.getTime() - KEEP_DAYS * DAY) } },
        }),
      ]);

    const sum = (rows: { headcount: number }[]) => rows.reduce((n, r) => n + r.headcount, 0);

    const today = sessions.map((s) => {
      // 원데이: 이 회차 신청·확정 인원. 정규반: 반 등록 인원 − 이 회차에서 보강 나간 인원 + 보강 들어온 인원
      const used =
        s.program === 'ONEDAY'
          ? sum(s.reservations)
          : sum(s.course?.reservations ?? []) -
            sum(s.missedMakeups.map((m) => m.reservation)) +
            sum(s.targetMakeups.map((m) => m.reservation));
      return {
        id: s.id,
        title: s.title,
        program: s.program,
        kind: s.kind,
        courseName: s.course?.name ?? null,
        weekNo: s.weekNo,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        capacity: s.capacity,
        used,
        cancelled: s.cancelled,
      };
    });

    return {
      today,
      pendingReservations,
      makeupsRequested,
      newInquiries,
      kiln: { min: KILN_MIN, bisqueWaiting, glazeWaiting },
      overdueWorks,
    };
  }
}
