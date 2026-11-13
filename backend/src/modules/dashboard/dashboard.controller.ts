import { Controller, Get, UseGuards } from '@nestjs/common';
import { StaffGuard } from '../auth/auth.guard';
import { DashboardService } from './dashboard.service';

// 직원 대시보드 "오늘" (STF-03)
@Controller('staff/dashboard')
@UseGuards(StaffGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  // GET /api/staff/dashboard
  @Get()
  today() {
    return this.service.today();
  }
}
