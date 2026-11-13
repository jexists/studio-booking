import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { StaffGuard, type StaffRequest } from '../auth/auth.guard';
import { CreateSessionDto, CreateWorksDto, StaffReservationDto, UpdateSessionDto, WeekQuery } from './dto';
import { ScheduleService } from './schedule.service';

// 직원용 클래스 일정(STF-04)·일정 상세와 명단(STF-05)
@Controller('staff')
@UseGuards(StaffGuard)
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  // GET /api/staff/classes?weekStart=YYYY-MM-DD
  @Get('classes')
  week(@Query() q: WeekQuery) {
    return this.service.week(q.weekStart);
  }

  // POST /api/staff/classes
  @Post('classes')
  create(@Body() dto: CreateSessionDto) {
    return this.service.create(dto);
  }

  // GET /api/staff/classes/:id
  @Get('classes/:id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  // PATCH /api/staff/classes/:id  (시간 변경·휴강)
  @Patch('classes/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSessionDto) {
    return this.service.update(id, dto);
  }

  // POST /api/staff/classes/:id/reservations  (DM·네이버 대리 등록, 원데이만)
  @Post('classes/:id/reservations')
  addReservation(@Req() req: StaffRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: StaffReservationDto) {
    return this.service.addReservation(id, dto, req.staff.id);
  }

  // POST /api/staff/classes/:id/works
  @Post('classes/:id/works')
  addWorks(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateWorksDto) {
    return this.service.addWorks(id, dto);
  }

  // GET /api/staff/reservations/search?q=  (예약번호·전화번호·이름으로 찾기)
  @Get('reservations/search')
  search(@Query('q') q?: string) {
    return this.service.search(q ?? '');
  }

  // PATCH /api/staff/reservations/:id/confirm
  @Patch('reservations/:id/confirm')
  confirm(@Req() req: StaffRequest, @Param('id', ParseIntPipe) id: number) {
    return this.service.confirm(id, req.staff.id);
  }

  // GET /api/staff/reservations/:id/refund
  @Get('reservations/:id/refund')
  refund(@Param('id', ParseIntPipe) id: number) {
    return this.service.refundPreview(id);
  }

  // PATCH /api/staff/reservations/:id/cancel
  @Patch('reservations/:id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.service.cancel(id);
  }

  // PATCH /api/staff/reservations/:id/cancel-request/approve  수강생 환불 요청 승인(요청 때 비율로 취소)
  @Patch('reservations/:id/cancel-request/approve')
  approveCancelRequest(@Param('id', ParseIntPipe) id: number) {
    return this.service.approveCancelRequest(id);
  }

  // PATCH /api/staff/reservations/:id/cancel-request/reject  환불 요청 반려(요청 기록 삭제)
  @Patch('reservations/:id/cancel-request/reject')
  rejectCancelRequest(@Param('id', ParseIntPipe) id: number) {
    return this.service.rejectCancelRequest(id);
  }

  // PATCH /api/staff/reservations/:id/no-show  [가정] 노쇼 표시(수업 시작 후, 원데이만)
  @Patch('reservations/:id/no-show')
  noShow(@Param('id', ParseIntPipe) id: number) {
    return this.service.markNoShow(id);
  }

  // DELETE /api/staff/reservations/:id/no-show  노쇼 되돌리기(확정으로)
  @Delete('reservations/:id/no-show')
  undoNoShow(@Param('id', ParseIntPipe) id: number) {
    return this.service.undoNoShow(id);
  }
}
