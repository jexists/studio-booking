import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AskModule } from '../ask/ask.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [PrismaModule, AskModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
