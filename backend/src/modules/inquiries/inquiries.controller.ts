import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { StaffGuard, type StaffRequest } from '../auth/auth.guard';
import { CreateInquiryDto, ListInquiriesQuery, UpdateInquiryDto } from './dto';
import { InquiriesService } from './inquiries.service';

@Controller()
export class InquiriesController {
  constructor(private readonly service: InquiriesService) {}

  // POST /api/inquiries  단체 문의 접수 (PUB-07, 누구나)
  @Post('inquiries')
  create(@Body() dto: CreateInquiryDto) {
    return this.service.create(dto);
  }

  // GET /api/staff/inquiries?status=  (STF-09)
  @Get('staff/inquiries')
  @UseGuards(StaffGuard)
  list(@Query() q: ListInquiriesQuery) {
    return this.service.list(q.status);
  }

  // PATCH /api/staff/inquiries/:id  메모(직원) · 상태·견적 금액(대표만)
  @Patch('staff/inquiries/:id')
  @UseGuards(StaffGuard)
  update(@Req() req: StaffRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInquiryDto) {
    return this.service.update(id, dto, req.staff);
  }
}
