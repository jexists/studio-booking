import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { shipView } from '../works/shipping';

const DAY = 86400000;

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  // 예약 번호 + 휴대폰 뒤 4자리가 모두 맞을 때만 그 예약의 정보만 돌려준다(어느 쪽이 틀렸는지는 알려 주지 않음).
  async lookup(reservationNo: string, phoneLast4: string) {
    const r = await this.prisma.reservation.findUnique({
      where: { reservationNo: reservationNo.trim() },
      include: { session: true, course: true, works: { orderBy: { workNo: 'asc' } } },
    });
    if (!r || r.phoneLast4 !== phoneLast4) throw new NotFoundException('예약 번호나 휴대폰 뒤 4자리가 맞지 않아요');

    const warnings = await this.prisma.glazeWarning.findMany();
    const warnFor = (text?: string | null) => (text ? warnings.find((w) => text.includes(w.code)) : undefined);

    return {
      reservationNo: r.reservationNo,
      name: r.name,
      status: r.status,
      program: r.courseId ? 'REGULAR' : 'ONEDAY',
      className: r.course?.name ?? r.session?.title ?? '',
      startsAt: r.session?.startsAt ?? r.course?.startDate ?? null,
      works: r.works.map((w) => {
        const warn = warnFor(w.glaze) ?? warnFor(w.clay);
        const done = w.completedAt;
        return {
          workNo: w.workNo,
          itemName: w.itemName,
          clay: w.clay,
          glaze: w.glaze,
          stage: w.stage,
          broken: w.broken,
          pickupMethod: w.pickupMethod,
          ...shipView(w),
          trackingNo: w.trackingNo,
          deliveredAt: w.deliveredAt,
          // 완성 전: 수업일 + 21~28일 범위 / 완성 후: 완성일 + 60일 보관
          expectedFrom: done ? null : new Date(w.classDate.getTime() + 21 * DAY),
          expectedTo: done ? null : new Date(w.classDate.getTime() + 28 * DAY),
          completedAt: done,
          keepUntil: done ? new Date(done.getTime() + 60 * DAY) : null,
          foodWarning: warn ? { code: warn.code, name: warn.name, reason: warn.reason, sourceRef: warn.sourceRef } : null,
        };
      }),
    };
  }
}
