import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Staff } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export type StaffRequest = Request & { staff: Staff; sessionToken: string };

export function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

// 직원(대표·강사) 로그인 확인. 통과하면 req.staff 에 직원 정보가 들어간다.
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<StaffRequest>();
    const token = bearer(req);
    if (!token) throw new UnauthorizedException('로그인이 필요해요');
    const session = await this.prisma.staffSession.findUnique({ where: { token }, include: { staff: true } });
    if (!session || session.expiresAt < new Date() || !session.staff.active) {
      throw new UnauthorizedException('다시 로그인해 주세요');
    }
    req.staff = session.staff;
    req.sessionToken = token;
    return true;
  }
}

// 대표만. StaffGuard 뒤에 둔다: @UseGuards(StaffGuard, OwnerGuard)
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<StaffRequest>();
    if (req.staff?.role !== 'OWNER') throw new ForbiddenException('대표만 할 수 있어요');
    return true;
  }
}
