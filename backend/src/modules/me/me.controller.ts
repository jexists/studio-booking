import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsString, Length, Matches } from 'class-validator';
import { MeService } from './me.service';

class LookupDto {
  @IsString()
  @Length(4, 20)
  reservationNo!: string;

  @Matches(/^\d{4}$/, { message: '휴대폰 뒤 4자리를 숫자로 입력해 주세요' })
  phoneLast4!: string;
}

@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  // POST /api/me/lookup  내 예약·작품 조회
  @Post('lookup')
  @HttpCode(200)
  lookup(@Body() dto: LookupDto) {
    return this.me.lookup(dto.reservationNo, dto.phoneLast4);
  }
}
