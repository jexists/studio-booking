import { BadRequestException, ConflictException, GoneException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { Staff } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from './mail.service';
import { hashPassword, randomToken, verifyPassword } from './password';

const SESSION_DAYS = 7;
const INVITE_HOURS = 72; // 03 명세 B-02

const publicStaff = (s: Staff) => ({ id: s.id, name: s.name, email: s.email, role: s.role, active: s.active });

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async login(email: string, password: string) {
    const staff = await this.prisma.staff.findUnique({ where: { email: email.toLowerCase() } });
    if (!staff || !staff.active || !verifyPassword(password, staff.passwordHash)) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 맞지 않아요');
    }
    const token = randomToken();
    await this.prisma.staffSession.create({
      data: { token, staffId: staff.id, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000) },
    });
    return { token, staff: publicStaff(staff) };
  }

  async logout(token: string) {
    await this.prisma.staffSession.deleteMany({ where: { token } });
  }

  me(staff: Staff) {
    return publicStaff(staff);
  }

  // 대표가 직원 초대: 토큰 생성 → 메일 발송(가능하면) → 링크는 항상 돌려준다.
  async invite(owner: Staff, rawEmail: string) {
    const email = rawEmail.toLowerCase();
    const exists = await this.prisma.staff.findUnique({ where: { email } });
    if (exists) throw new ConflictException('이미 등록된 직원이에요');
    const token = randomToken();
    await this.prisma.staffInvite.create({
      data: { email, token, invitedById: owner.id, expiresAt: new Date(Date.now() + INVITE_HOURS * 3600_000) },
    });
    const base = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3000').trim();
    const link = `${base}/staff/invite/${token}`;
    const mailSent = await this.mail.sendInvite(email, link, owner.name);
    return { email, link, mailSent, expiresInHours: INVITE_HOURS };
  }

  private async validInvite(token: string) {
    const invite = await this.prisma.staffInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('초대를 찾을 수 없어요');
    if (invite.usedAt || invite.expiresAt < new Date()) {
      throw new GoneException('초대가 만료됐어요. 대표님께 다시 요청해 주세요.');
    }
    return invite;
  }

  async getInvite(token: string) {
    const invite = await this.validInvite(token);
    return { email: invite.email, expiresAt: invite.expiresAt };
  }

  async acceptInvite(token: string, name: string, password: string) {
    const invite = await this.validInvite(token);
    if (await this.prisma.staff.findUnique({ where: { email: invite.email } })) {
      throw new BadRequestException('이미 등록된 직원이에요. 로그인해 주세요.');
    }
    await this.prisma.$transaction([
      this.prisma.staff.create({
        data: { email: invite.email, name: name.trim(), role: 'STAFF', passwordHash: hashPassword(password) },
      }),
      this.prisma.staffInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
    ]);
    return { email: invite.email };
  }

  async members() {
    const [staff, invites] = await Promise.all([
      this.prisma.staff.findMany({ orderBy: [{ role: 'asc' }, { id: 'asc' }] }),
      this.prisma.staffInvite.findMany({ where: { usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { id: 'desc' } }),
    ]);
    return {
      staff: staff.map(publicStaff),
      pendingInvites: invites.map((i) => ({ id: i.id, email: i.email, expiresAt: i.expiresAt })),
    };
  }

  async setActive(owner: Staff, id: number, active: boolean) {
    if (owner.id === id) throw new BadRequestException('본인 계정은 바꿀 수 없어요');
    const staff = await this.prisma.staff.update({ where: { id }, data: { active } }).catch(() => {
      throw new NotFoundException('직원을 찾을 수 없어요');
    });
    if (!active) await this.prisma.staffSession.deleteMany({ where: { staffId: id } });
    return publicStaff(staff);
  }
}
