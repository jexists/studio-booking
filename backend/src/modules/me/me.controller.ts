import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { MeService } from './me.service';

class LookupDto {
  @IsString()
  @Length(4, 20)
  reservationNo!: string;

  @Matches(/^\d{4}$/, { message: '휴대폰 뒤 4자리를 숫자로 입력해 주세요' })
  phoneLast4!: string;
}

class PhoneDto {
  @Matches(/^[0-9-]{10,13}$/, { message: '휴대폰 번호를 정확히 입력해 주세요' })
  phone!: string;
}

class FindDto extends PhoneDto {
  @IsString()
  @Length(4, 4, { message: '인증번호 4자리를 입력해 주세요' })
  code!: string;
}

class CancelRequestDto extends LookupDto {
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '사유는 200자까지 쓸 수 있어요' })
  reason?: string;
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

  // POST /api/me/phone-code  인증번호 발송(임시: 실제 발송 없이 접수만 한다)
  @Post('phone-code')
  @HttpCode(200)
  phoneCode(@Body() dto: PhoneDto) {
    return this.me.sendCode(dto.phone);
  }

  // POST /api/me/find-reservations  인증번호 확인 후 그 번호의 예약 번호 목록 (임시 인증번호 1111)
  @Post('find-reservations')
  @HttpCode(200)
  find(@Body() dto: FindDto) {
    return this.me.findByPhone(dto.phone, dto.code);
  }

  // POST /api/me/cancel-request  원데이 취소·환불 요청 (요청 시점에 환불 비율 확정, 직원 승인 후 취소)
  @Post('cancel-request')
  @HttpCode(200)
  cancelRequest(@Body() dto: CancelRequestDto) {
    return this.me.requestCancel(dto.reservationNo, dto.phoneLast4, dto.reason);
  }
}
