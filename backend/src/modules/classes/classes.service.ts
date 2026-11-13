import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

const ACTIVE = ['PENDING', 'CONFIRMED'] as const; // 정원 계산 대상(기획 A-01)

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  // 원데이 일정: from ~ +28일, 남은 자리는 서버에서 계산한다.
  async listOneday(from = new Date()) {
    const to = new Date(from.getTime() + 28 * 86400000);
    const sessions = await this.prisma.classSession.findMany({
      where: { program: 'ONEDAY', cancelled: false, startsAt: { gte: from, lt: to } },
      orderBy: { startsAt: 'asc' },
    });
    const used = await this.usedSeats(sessions.map((s) => s.id));
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      kind: s.kind,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      capacity: s.capacity,
      remaining: Math.max(0, s.capacity - (used.get(s.id) ?? 0)),
    }));
  }

  private async usedSeats(sessionIds: number[]) {
    const rows = await this.prisma.reservation.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: sessionIds }, status: { in: [...ACTIVE] } },
      _sum: { headcount: true },
    });
    return new Map(rows.map((r) => [r.sessionId!, r._sum.headcount ?? 0]));
  }

  // 예약 신청: 일정 행을 잠그고 인원을 다시 센 뒤 저장 → 동시에 신청해도 정원을 넘지 않는다.
  async reserve(dto: CreateReservationDto) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: number; capacity: number; startsAt: Date; cancelled: boolean; program: string }[]>(
        Prisma.sql`SELECT id, capacity, "startsAt", cancelled, program::text FROM "ClassSession" WHERE id = ${dto.sessionId} FOR UPDATE`,
      );
      const s = locked[0];
      if (!s || s.program !== 'ONEDAY') throw new NotFoundException('수업을 찾을 수 없어요');
      if (s.cancelled || s.startsAt < new Date()) throw new BadRequestException('신청할 수 없는 수업이에요');
      const used = await tx.reservation.aggregate({
        where: { sessionId: s.id, status: { in: [...ACTIVE] } },
        _sum: { headcount: true },
      });
      const remaining = s.capacity - (used._sum.headcount ?? 0);
      if (dto.headcount > remaining) throw new ConflictException(remaining > 0 ? `남은 자리가 ${remaining}자리예요` : '방금 자리가 찼어요');
      const res = await tx.reservation.create({
        data: {
          reservationNo: randomBytes(4).toString('hex').slice(0, 6).toUpperCase(),
          name: dto.name.trim(),
          phone: dto.phone,
          phoneLast4: dto.phone.slice(-4),
          headcount: dto.headcount,
          channel: 'WEB',
          sessionId: s.id,
        },
      });
      return { reservationNo: res.reservationNo, status: res.status };
    });
  }
}
