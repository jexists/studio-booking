import { Module } from '@nestjs/common';
import { MakeupsController } from './makeups.controller';
import { MakeupsService } from './makeups.service';

@Module({
  controllers: [MakeupsController],
  providers: [MakeupsService],
})
export class MakeupsModule {}
