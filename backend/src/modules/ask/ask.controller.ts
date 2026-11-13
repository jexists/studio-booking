import { Body, Controller, Post } from '@nestjs/common';
import { AskService } from './ask.service';
import { AskDto } from './dto';

@Controller('ask')
export class AskController {
  constructor(private readonly ask: AskService) {}

  // POST /api/ask — 공방 자료를 근거로 답한다.
  @Post()
  answer(@Body() dto: AskDto) {
    return this.ask.answer(dto.question);
  }
}
