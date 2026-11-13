import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type GlazeWarning, type Work, type WorkStage } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ListWorksQuery, ShipDto, UpdateWorkDto } from './dto';
import { shipView } from './shipping';

const DAY = 86400000;
const KILN_MIN = 30; // 가마는 30점 이상 모이면 가동
const KEEP_DAYS = 60; // 완성 후 보관 기간
export const STAGES: WorkStage[] = ['FORMING', 'BISQUE', 'GLAZED', 'GLAZE_FIRED', 'DONE', 'PICKED_UP'];

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

@Injectable()
export class WorksService {
  constructor(private readonly prisma: PrismaService) {}

  private async warnings() {
    return this.prisma.glazeWarning.findMany();
  }

  // 화면에 필요한 계산값(완성 예상 범위, 보관 기한, 식기 경고)을 붙인다.
  private view(w: Work, warnings: GlazeWarning[]) {
    const warn = warnings.find((x) => (w.glaze ?? '').includes(x.code) || (w.clay ?? '').includes(x.code));
    const done = w.completedAt;
    const keepUntil = done ? new Date(done.getTime() + KEEP_DAYS * DAY) : null;
    return {
      ...w,
      ...shipView(w),
      expectedFrom: done ? null : new Date(w.classDate.getTime() + 21 * DAY),
      expectedTo: done ? null : new Date(w.classDate.getTime() + 28 * DAY),
      keepUntil,
      overdue: w.stage === 'DONE' && !!keepUntil && keepUntil < startOfToday(),
      foodWarning: warn ? { code: warn.code, name: warn.name, reason: warn.reason, sourceRef: warn.sourceRef } : null,
    };
  }

  async list(q: ListWorksQuery) {
    const where: Prisma.WorkWhereInput = {};
    if (q.q?.trim()) {
      const s = q.q.trim();
      where.OR = [{ workNo: { contains: s, mode: 'insensitive' } }, { ownerName: { contains: s } }, { phoneLast4: s }];
    }
    if (q.stage) where.stage = q.stage;
    if (q.broken === 'true') where.broken = true;
    if (q.overdue === 'true') {
      where.stage = 'DONE';
      where.completedAt = { lt: new Date(startOfToday().getTime() - KEEP_DAYS * DAY) };
    }
    const [works, warnings] = await Promise.all([
      this.prisma.work.findMany({ where, orderBy: [{ classDate: 'desc' }, { workNo: 'asc' }] }),
      this.warnings(),
    ]);
    let rows = works.map((w) => this.view(w, warnings));
    if (q.decorative === 'true') rows = rows.filter((w) => w.foodWarning);
    return rows;
  }

  // 단계별 개수 + 가마 대기(P-01): 성형(초벌 대기)·유약(재벌 대기) 중 파손 아닌 것
  async summary() {
    const grouped = await this.prisma.work.groupBy({ by: ['stage'], _count: true, where: { broken: false } });
    const byStage = Object.fromEntries(STAGES.map((s) => [s, grouped.find((g) => g.stage === s)?._count ?? 0]));
    const [broken, overdue] = await Promise.all([
      this.prisma.work.count({ where: { broken: true } }),
      this.prisma.work.count({
        where: { stage: 'DONE', completedAt: { lt: new Date(startOfToday().getTime() - KEEP_DAYS * DAY) } },
      }),
    ]);
    return {
      byStage,
      broken,
      overdue,
      kiln: { min: KILN_MIN, bisqueWaiting: byStage.FORMING, glazeWaiting: byStage.GLAZED },
    };
  }

  private async get(id: number) {
    const w = await this.prisma.work.findUnique({ where: { id } });
    if (!w) throw new NotFoundException('작품을 찾을 수 없어요');
    return w;
  }

  // 단계는 한 칸씩만 앞으로, 되돌리기도 한 칸 (기획 A-04)
  async move(id: number, direction: 'next' | 'prev', staffId: number) {
    const w = await this.get(id);
    const updated = await this.prisma.$transaction((tx) => this.moveOne(tx, w, direction, staffId));
    return this.view(updated, await this.warnings());
  }

  private async moveOne(tx: Prisma.TransactionClient, w: Work, direction: 'next' | 'prev', staffId: number) {
    const i = STAGES.indexOf(w.stage);
    const to = STAGES[direction === 'next' ? i + 1 : i - 1];
    if (!to) throw new BadRequestException(direction === 'next' ? '이미 마지막 단계예요' : '첫 단계예요');
    if (direction === 'next' && w.broken) throw new BadRequestException('파손된 작품은 단계를 넘길 수 없어요');
    if (to === 'PICKED_UP' && !w.pickupMethod) throw new BadRequestException('수령 방식을 먼저 정해 주세요');
    // 택배 작품은 배송완료가 돼야 수령으로 넘긴다
    if (to === 'PICKED_UP' && w.pickupMethod === 'DELIVERY' && w.shipStatus !== 'DELIVERED')
      throw new BadRequestException('택배 작품은 배송완료 뒤에 수령으로 넘길 수 있어요');
    // 이미 발송한 작품은 완성 이전 단계로 되돌리지 않는다
    if (direction === 'prev' && w.stage === 'DONE' && (w.shipStatus === 'SHIPPING' || w.shipStatus === 'DELIVERED'))
      throw new BadRequestException('이미 발송한 작품은 완성 이전으로 되돌릴 수 없어요');
    const now = new Date();
    const data: Prisma.WorkUpdateInput = { stage: to, stageChangedAt: now };
    if (to === 'DONE' && direction === 'next') data.completedAt = now;
    if (w.stage === 'DONE' && direction === 'prev') data.completedAt = null;
    if (to === 'PICKED_UP') data.pickedUpAt = now;
    if (w.stage === 'PICKED_UP') {
      data.pickedUpAt = null;
      // 배송완료된 작품을 수령 단계에서 되돌리면 다시 배송중으로
      if (w.shipStatus === 'DELIVERED') Object.assign(data, { shipStatus: 'SHIPPING', deliveredAt: null });
    }
    await tx.workStageLog.create({ data: { workId: w.id, fromStage: w.stage, toStage: to, staffId } });
    return tx.work.update({ where: { id: w.id }, data });
  }

  // 가마에서 꺼낸 여러 점을 한 번에 다음 단계로. 넘길 수 없는 작품은 건너뛰고 이유를 돌려준다.
  async bulkNext(ids: number[], staffId: number) {
    const works = await this.prisma.work.findMany({ where: { id: { in: ids } } });
    const moved: number[] = [];
    const skipped: { workNo: string; reason: string }[] = [];
    for (const w of works) {
      try {
        await this.prisma.$transaction((tx) => this.moveOne(tx, w, 'next', staffId));
        moved.push(w.id);
      } catch (e) {
        skipped.push({ workNo: w.workNo, reason: (e as Error).message });
      }
    }
    return { moved: moved.length, skipped };
  }

  async update(id: number, dto: UpdateWorkDto) {
    const cur = await this.get(id);
    const data: Prisma.WorkUpdateInput = { ...dto };
    if (dto.pickupMethod !== undefined && dto.pickupMethod !== cur.pickupMethod) {
      if (cur.shipStatus === 'SHIPPING' || cur.shipStatus === 'DELIVERED') throw new BadRequestException('이미 발송한 작품은 수령 방식을 바꿀 수 없어요');
      // 택배로 정하면 준비중으로 시작, 그 밖에는 배송 정보를 비운다
      Object.assign(data, { shipStatus: dto.pickupMethod === 'DELIVERY' ? 'PREPARING' : null, carrier: null, trackingNo: null });
    }
    const w = await this.prisma.work.update({ where: { id }, data });
    return this.view(w, await this.warnings());
  }

  // 송장 입력 → 배송중. 완성된 택배 작품만. 배송중일 때 다시 입력하면 송장을 고친다.
  async ship(id: number, dto: ShipDto) {
    const w = await this.get(id);
    if (w.pickupMethod !== 'DELIVERY') throw new BadRequestException('수령 방식이 택배인 작품만 발송할 수 있어요');
    if (w.broken) throw new BadRequestException('파손된 작품은 발송할 수 없어요');
    if (w.stage !== 'DONE' && w.shipStatus !== 'SHIPPING') throw new BadRequestException('완성된 작품만 발송할 수 있어요');
    if (w.shipStatus === 'DELIVERED') throw new BadRequestException('이미 배송이 끝난 작품이에요');
    const trackingNo = dto.trackingNo.replace(/[\s-]/g, '');
    if (!/^\d{8,20}$/.test(trackingNo)) throw new BadRequestException('송장번호는 숫자 8~20자리로 입력해 주세요');
    const updated = await this.prisma.work.update({
      where: { id },
      data: { shipStatus: 'SHIPPING', carrier: dto.carrier, trackingNo, shippedAt: w.shippedAt ?? new Date() },
    });
    return this.view(updated, await this.warnings());
  }

  // 배송완료 → 수령 단계로 넘긴다(수령일 기록).
  async deliver(id: number, staffId: number) {
    const w = await this.get(id);
    if (w.shipStatus !== 'SHIPPING') throw new BadRequestException('배송중인 작품만 배송완료로 바꿀 수 있어요');
    const updated = await this.prisma.$transaction(async (tx) => {
      // 배송완료로 바꾸면서 수령 단계로 넘긴다(배송완료 상태로 단계 검사)
      const moved = w.stage === 'DONE' ? await this.moveOne(tx, { ...w, shipStatus: 'DELIVERED' }, 'next', staffId) : w;
      return tx.work.update({ where: { id }, data: { shipStatus: 'DELIVERED', deliveredAt: new Date() } }).then((r) => ({ ...moved, ...r }));
    });
    return this.view(updated, await this.warnings());
  }
}
