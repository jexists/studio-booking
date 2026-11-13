import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// 첫 쿼리 때 자동 연결된다. DB가 꺼져 있어도 서버는 뜨고 /api/health 가 database: down 을 알려준다.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
