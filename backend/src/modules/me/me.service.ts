import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ClassSession, Reservation } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { refundRateFor } from '../schedule/schedule.service';
import { shipView } from '../works/shipping';
import { checkOwner } from '../../common/owner-check';

const DAY = 86400000;
const NOT_FOUND = '예약 번호나 휴대폰 뒤 4자리가 맞지 않아요';

// 원데이 취소·환불 요청을 지금 할 수 있는지. 안 되면 이유를 돌려준다.
function cancelBlock(r: Reservation & { session: ClassSession | null }, now = new Date()) {
  if (!r.session) return '정규반은 취소·환불 요청을 받지 않아요';
  if (r.status === 'NO_SHOW') return '노쇼 처리된 예약은 환불 대상이 아니에요';
  if (r.status !== 'PENDING' && r.status !== 'CONFIRMED') return '이미 취소된 예약이에요';
  if (r.cancelRequestedAt) return '이미 환불 요청을 접수했어요';
  if (r.session.startsAt.getTime() <= now.getTime()) return '수업이 시작된 뒤에는 요청할 수 없어요';
  return null;
}

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  // 임시 인증: 실제 문자 발송 없이 인증번호는 항상 1111 (문자 발송 연동 전까지)
  private readonly DEV_CODE = '1111';

  sendCode(phone: string) {
    return { sent: true, phoneLast4: phone.replace(/\D/g, '').slice(-4) };
  }

  async findByPhone(phone: string, code: string) {
    if (code !== this.DEV_CODE) throw new BadRequestException('인증번호가 맞지 않아요');
    const digits = phone.replace(/\D/g, '');
    const rows = await this.prisma.reservation.findMany({
      where: { status: { in: ['PENDING', 'CONFIRMED'] } },
      include: { session: true, course: true },
      orderBy: { createdAt: 'desc' },
    });
    const mine = rows.filter((r) => r.phone.replace(/\D/g, '') === digits);
    if (mine.length === 0) throw new NotFoundException('이 번호로 접수된 예약이 없어요');
    return mine.map((r) => ({
      reservationNo: r.reservationNo,
      className: r.course?.name ?? r.session?.title ?? '',
      startsAt: r.session?.startsAt ?? null,
    }));
  }

  // 예약 번호 + 휴대폰 뒤 4자리가 모두 맞을 때만 그 예약의 정보만 돌려준다(어느 쪽이 틀렸는지는 알려 주지 않음).
  async lookup(reservationNo: string, phoneLast4: string) {
    const r = await this.prisma.reservation.findUnique({
      where: { reservationNo: reservationNo.trim() },
      include: { session: true, course: true, works: { orderBy: { workNo: 'asc' } } },
    });
    checkOwner(r, reservationNo, phoneLast4);
    if (!r) throw new NotFoundException(NOT_FOUND);

    const warnings = await this.prisma.glazeWarning.findMany();
    const warnFor = (text?: string | null) => (text ? warnings.find((w) => text.includes(w.code)) : undefined);

    return {
      reservationNo: r.reservationNo,
      name: r.name,
      status: r.status,
      program: r.courseId ? 'REGULAR' : 'ONEDAY',
      className: r.course?.name ?? r.session?.title ?? '',
      startsAt: r.session?.startsAt ?? r.course?.startDate ?? null,
      // 취소·환불 요청 (원데이만)
      canRequestCancel: cancelBlock(r) === null,
      expectedRefundRate: cancelBlock(r) === null ? refundRateFor(r.session!.startsAt) : null,
      cancelRequestedAt: r.cancelRequestedAt,
      cancelRequestRate: r.cancelRequestRate,
      refundRate: r.refundRate,
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

  // 수강생 취소·환불 요청. 비율은 요청한 날 기준으로 정해 저장하고, 취소는 직원이 승인할 때 한다.
  async requestCancel(reservationNo: string, phoneLast4: string, reason?: string) {
    const r = await this.prisma.reservation.findUnique({ where: { reservationNo: reservationNo.trim() }, include: { session: true } });
    checkOwner(r, reservationNo, phoneLast4);
    if (!r) throw new NotFoundException(NOT_FOUND);
    const now = new Date();
    const block = cancelBlock(r, now);
    if (block) throw new BadRequestException(block);
    const rate = refundRateFor(r.session!.startsAt, now);
    // 동시에 두 번 눌러도 한 번만 접수되게 조건부로 갱신
    const { count } = await this.prisma.reservation.updateMany({
      where: { id: r.id, status: { in: ['PENDING', 'CONFIRMED'] }, cancelRequestedAt: null },
      data: { cancelRequestedAt: now, cancelRequestRate: rate, cancelReason: reason?.trim() || null },
    });
    if (count === 0) throw new BadRequestException('이미 환불 요청을 접수했어요');
    return { reservationNo: r.reservationNo, cancelRequestedAt: now, cancelRequestRate: rate };
  }
}
