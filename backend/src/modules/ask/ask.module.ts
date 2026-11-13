import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';

@Module({
  imports: [PrismaModule],
  controllers: [AskController],
  providers: [AskService],
  exports: [AskService],
})
export class AskModule {}
