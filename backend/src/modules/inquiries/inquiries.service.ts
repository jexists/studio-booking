import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Staff } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { INQUIRY_STATUSES, type CreateInquiryDto, type InquiryStatusValue, type UpdateInquiryDto } from './dto';

@Injectable()
export class InquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  // PUB-07 접수. 상태는 '문의'(NEW)로 시작한다.
  async create(dto: CreateInquiryDto) {
    if (dto.preferredDate) {
      const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); // KST 오늘
      if (dto.preferredDate < today) throw new BadRequestException('희망 날짜는 오늘 이후로 골라 주세요');
    }
    const row = await this.prisma.groupInquiry.create({
      data: {
        orgName: dto.orgName,
        contactName: dto.contactName,
        contact: dto.contact,
        preferredDate: dto.preferredDate ? new Date(`${dto.preferredDate}T00:00:00+09:00`) : null,
        headcount: dto.headcount,
        place: dto.place ?? null,
        message: dto.message,
      },
    });
    return { id: row.id, status: row.status, createdAt: row.createdAt };
  }

  // STF-09 목록(최신 접수순) + 상태별 개수
  async list(status?: InquiryStatusValue) {
    const where: Prisma.GroupInquiryWhereInput = status ? { status } : {};
    const [items, grouped] = await Promise.all([
      this.prisma.groupInquiry.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
      this.prisma.groupInquiry.groupBy({ by: ['status'], _count: true }),
    ]);
    const counts = Object.fromEntries(INQUIRY_STATUSES.map((s) => [s, grouped.find((g) => g.status === s)?._count ?? 0])) as Record<
      InquiryStatusValue,
      number
    >;
    return { items, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }

  // 메모는 직원 모두. 상태·견적 금액은 대표만 (A-02). 견적 발송 자체는 시스템 밖 (A-06).
  async update(id: number, dto: UpdateInquiryDto, staff: Staff) {
    const touchesOwnerFields = dto.status !== undefined || dto.quoteAmount !== undefined;
    if (touchesOwnerFields && staff.role !== 'OWNER') throw new ForbiddenException('대표만 할 수 있어요');
    const found = await this.prisma.groupInquiry.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('문의를 찾을 수 없어요');
    const data: Prisma.GroupInquiryUpdateInput = {};
    if (dto.memo !== undefined) data.memo = dto.memo.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.quoteAmount !== undefined) data.quoteAmount = dto.quoteAmount;
    return this.prisma.groupInquiry.update({ where: { id }, data });
  }
}
