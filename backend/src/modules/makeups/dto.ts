import { IsIn, IsInt, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

// 수강생 확인: 예약 번호 + 휴대폰 뒤 4자리 (me/lookup 과 같은 규칙)
export class MakeupOwnerDto {
  @IsString()
  @Length(4, 20)
  reservationNo!: string;

  @Matches(/^\d{4}$/, { message: '휴대폰 뒤 4자리를 숫자로 입력해 주세요' })
  phoneLast4!: string;
}

export class CreateMakeupDto extends MakeupOwnerDto {
  @IsInt({ message: '빠지는 회차를 골라 주세요' })
  missedSessionId!: number;

  @IsInt({ message: '보강 받을 반을 골라 주세요' })
  targetSessionId!: number;
}

// DECIDED = 처리됨(승인 + 반려)
export const MAKEUP_FILTERS = ['REQUESTED', 'APPROVED', 'REJECTED', 'DECIDED'] as const;

export class ListMakeupsQuery {
  @IsOptional() @IsIn(MAKEUP_FILTERS) status?: (typeof MAKEUP_FILTERS)[number];
}

export class RejectMakeupDto {
  @IsOptional() @IsString() @MaxLength(200) reason?: string;
}
