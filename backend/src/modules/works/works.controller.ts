import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { StaffGuard, type StaffRequest } from '../auth/auth.guard';
import { BulkNextDto, ListWorksQuery, MoveStageDto, ShipDto, UpdateWorkDto } from './dto';
import { WorksService } from './works.service';

// 직원용 작품 관리 (STF-06)
@Controller('staff/works')
@UseGuards(StaffGuard)
export class WorksController {
  constructor(private readonly works: WorksService) {}

  // GET /api/staff/works?q=&stage=&broken=&overdue=&decorative=
  @Get()
  list(@Query() q: ListWorksQuery) {
    return this.works.list(q);
  }

  // GET /api/staff/works/summary
  @Get('summary')
  summary() {
    return this.works.summary();
  }

  // POST /api/staff/works/bulk-next
  @Post('bulk-next')
  bulkNext(@Req() req: StaffRequest, @Body() dto: BulkNextDto) {
    return this.works.bulkNext(dto.ids, req.staff.id);
  }

  // PATCH /api/staff/works/:id/stage
  @Patch(':id/stage')
  move(@Req() req: StaffRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: MoveStageDto) {
    return this.works.move(id, dto.direction, req.staff.id);
  }

  // PATCH /api/staff/works/:id/ship  (송장 입력 → 배송중. 배송중일 때 다시 보내면 송장 수정)
  @Patch(':id/ship')
  ship(@Param('id', ParseIntPipe) id: number, @Body() dto: ShipDto) {
    return this.works.ship(id, dto);
  }

  // PATCH /api/staff/works/:id/deliver  (배송완료 → 수령 단계로)
  @Patch(':id/deliver')
  deliver(@Req() req: StaffRequest, @Param('id', ParseIntPipe) id: number) {
    return this.works.deliver(id, req.staff.id);
  }

  // PATCH /api/staff/works/:id  (수령 방식·선반·파손·메모)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWorkDto) {
    return this.works.update(id, dto);
  }
}
