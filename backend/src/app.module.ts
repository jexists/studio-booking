import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';
import { HealthModule } from './modules/health/health.module';
import { MeModule } from './modules/me/me.module';
import { WorksModule } from './modules/works/works.module';
import { MakeupsModule } from './modules/makeups/makeups.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // backend/.env 로드
    PrismaModule,
    HealthModule,
    ClassesModule,
    MeModule,
    AuthModule,
    WorksModule,
    MakeupsModule,
    InquiriesModule,
    ScheduleModule,
    DashboardModule,
    // 새 기능 모듈은 modules/{feature} 에 만들고 여기에 추가한다.
  ],
})
export class AppModule {}
