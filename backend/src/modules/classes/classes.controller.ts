import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Controller()
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  // GET /api/classes?from=2026-11-13  원데이 일정 + 남은 자리
  @Get('classes')
  list(@Query('from') from?: string) {
    const d = from ? new Date(from) : new Date();
    return this.classes.listOneday(isNaN(d.getTime()) ? new Date() : d);
  }

  // POST /api/reservations  예약 신청(정원 초과 시 409)
  @Post('reservations')
  reserve(@Body() dto: CreateReservationDto) {
    return this.classes.reserve(dto);
  }
}
