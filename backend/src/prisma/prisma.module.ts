import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// 전역 모듈: 어느 서비스에서든 constructor(private prisma: PrismaService) 로 주입받아 쓴다.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
