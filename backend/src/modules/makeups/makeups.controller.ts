import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { StaffGuard, type StaffRequest } from '../auth/auth.guard';
import { CreateMakeupDto, ListMakeupsQuery, MakeupOwnerDto, RejectMakeupDto } from './dto';
import { MakeupsService } from './makeups.service';

// 정규반 보강: 수강생 신청(PUB-05) + 강사 승인·반려(STF-07)
@Controller()
export class MakeupsController {
  constructor(private readonly service: MakeupsService) {}

  // POST /api/me/makeups/options  내 반 회차별 보강 후보 + 내 보강 신청 목록
  @Post('me/makeups/options')
  @HttpCode(200)
  options(@Body() dto: MakeupOwnerDto) {
    return this.service.options(dto.reservationNo, dto.phoneLast4);
  }

  // POST /api/me/makeups  보강 신청(대기 상태로 저장)
  @Post('me/makeups')
  create(@Body() dto: CreateMakeupDto) {
    return this.service.create(dto);
  }

  // GET /api/staff/makeups?status=REQUESTED|APPROVED|REJECTED|DECIDED
  @Get('staff/makeups')
  @UseGuards(StaffGuard)
  list(@Query() q: ListMakeupsQuery) {
    return this.service.list(q.status ?? 'REQUESTED');
  }

  // PATCH /api/staff/makeups/:id/approve  정원 다시 확인 후 승인
  @Patch('staff/makeups/:id/approve')
  @UseGuards(StaffGuard)
  approve(@Req() req: StaffRequest, @Param('id', ParseIntPipe) id: number) {
    return this.service.approve(id, req.staff.id);
  }

  // PATCH /api/staff/makeups/:id/reject  반려(사유 선택)
  @Patch('staff/makeups/:id/reject')
  @UseGuards(StaffGuard)
  reject(@Req() req: StaffRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: RejectMakeupDto) {
    return this.service.reject(id, req.staff.id, dto.reason);
  }
}
