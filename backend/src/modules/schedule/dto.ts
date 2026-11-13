import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WeekQuery {
  @IsOptional() @Matches(DATE, { message: '주 시작일은 YYYY-MM-DD 형식이에요' }) weekStart?: string;
}

export class CreateSessionDto {
  @IsIn(['ONEDAY', 'REGULAR'], { message: '구분을 골라 주세요' }) program!: 'ONEDAY' | 'REGULAR';
  @IsIn(['HAND', 'WHEEL'], { message: '종류를 골라 주세요' }) kind!: 'HAND' | 'WHEEL';
  @Matches(DATE, { message: '날짜를 골라 주세요' }) date!: string;
  @Matches(TIME, { message: '시작 시간을 입력해 주세요' }) start!: string;
  @Matches(TIME, { message: '종료 시간을 입력해 주세요' }) end!: string;

  @ValidateIf((o: CreateSessionDto) => o.program === 'ONEDAY')
  @IsString()
  @Length(1, 40, { message: '제목은 1~40자로 입력해 주세요' })
  title?: string;

  @ValidateIf((o: CreateSessionDto) => o.program === 'REGULAR')
  @IsString()
  @Length(1, 40, { message: '반 이름은 1~40자로 입력해 주세요' })
  courseName?: string;
}

export class UpdateSessionDto {
  @IsOptional() @Matches(TIME, { message: '시작 시간 형식이 맞지 않아요' }) start?: string;
  @IsOptional() @Matches(TIME, { message: '종료 시간 형식이 맞지 않아요' }) end?: string;
  @IsOptional() @IsBoolean() cancelled?: boolean;
}

export class StaffReservationDto {
  @IsString() @Length(1, 20, { message: '이름은 1~20자로 입력해 주세요' }) name!: string;
  @Matches(/^010-\d{4}-\d{4}$/, { message: '휴대폰 번호를 010-1234-5678 형식으로 입력해 주세요' }) phone!: string;
  @IsInt() @Min(1) @Max(8) headcount!: number;
  @IsIn(['DM', 'NAVER'], { message: '경로를 골라 주세요' }) channel!: 'DM' | 'NAVER';
  @IsIn(['PENDING', 'CONFIRMED']) status!: 'PENDING' | 'CONFIRMED';
  @IsOptional() @IsBoolean() force?: boolean;
}

export class WorkItemDto {
  @IsOptional() @IsInt() reservationId?: number;
  @IsString() @Length(1, 20, { message: '이름을 입력해 주세요' }) ownerName!: string;
  @IsOptional() @Matches(/^\d{4}$/) phoneLast4?: string;
  @IsInt() @Min(1) @Max(5) count!: number;
  @IsString() @Length(1, 20, { message: '작품명을 입력해 주세요' }) itemName!: string;
  @IsOptional() @IsString() @MaxLength(40) clay?: string;
  @IsOptional() @IsString() @MaxLength(40) glaze?: string;
}

export class CreateWorksDto {
  @IsArray()
  @ArrayMinSize(1, { message: '등록할 작품이 없어요' })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => WorkItemDto)
  items!: WorkItemDto[];
}
