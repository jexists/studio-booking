import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export const INQUIRY_STATUSES = ['NEW', 'QUOTED', 'CONFIRMED', 'DONE', 'CANCELLED'] as const;
export type InquiryStatusValue = (typeof INQUIRY_STATUSES)[number];
export const PLACES = ['공방 방문', '출장 희망'] as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// 휴대폰(010-1234-5678, 01012345678) 또는 이메일
const CONTACT = /^(0\d{1,2}-?\d{3,4}-?\d{4}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

// PUB-07 단체 문의 접수 (누구나)
export class CreateInquiryDto {
  @Transform(trim) @IsString() @MinLength(1, { message: '단체명을 입력해 주세요' }) @MaxLength(60)
  orgName!: string;

  @Transform(trim) @IsString() @MinLength(1, { message: '담당자 이름을 입력해 주세요' }) @MaxLength(30)
  contactName!: string;

  @Transform(trim) @IsString() @Matches(CONTACT, { message: '휴대폰 번호나 이메일을 정확히 입력해 주세요' }) @MaxLength(80)
  contact!: string;

  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '희망 날짜 형식이 맞지 않아요' })
  preferredDate?: string;

  @IsInt({ message: '인원을 숫자로 입력해 주세요' })
  @Min(1, { message: '인원은 1명 이상이에요' })
  @Max(50, { message: '인원은 50명까지 받을 수 있어요' })
  headcount!: number;

  @IsOptional() @IsIn(PLACES, { message: '장소는 공방 방문 또는 출장 희망이에요' })
  place?: (typeof PLACES)[number];

  @Transform(trim) @IsString() @MinLength(1, { message: '문의 내용을 입력해 주세요' }) @MaxLength(1000, { message: '문의 내용은 1000자까지 쓸 수 있어요' })
  message!: string;
}

export class ListInquiriesQuery {
  @IsOptional() @IsIn(INQUIRY_STATUSES) status?: InquiryStatusValue;
}

// STF-09 메모는 직원 모두, 상태·견적 금액은 대표만 (A-02)
export class UpdateInquiryDto {
  @IsOptional() @IsString() @MaxLength(1000, { message: '메모는 1000자까지 쓸 수 있어요' })
  memo?: string;

  @IsOptional() @IsIn(INQUIRY_STATUSES, { message: '상태 값이 맞지 않아요' })
  status?: InquiryStatusValue;

  @IsOptional()
  @IsInt({ message: '견적 금액은 숫자로 입력해 주세요' })
  @Min(0, { message: '견적 금액은 0원 이상이에요' })
  @Max(100000000, { message: '견적 금액이 너무 커요' })
  quoteAmount?: number | null;
}
