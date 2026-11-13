import { IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreateReservationDto {
  @IsInt()
  sessionId!: number;

  @IsString()
  @Length(1, 20, { message: '이름은 1~20자로 입력해 주세요' })
  name!: string;

  @Matches(/^010-\d{4}-\d{4}$/, { message: '휴대폰 번호를 010-1234-5678 형식으로 입력해 주세요' })
  phone!: string;

  @IsInt()
  @Min(1)
  @Max(8)
  headcount!: number;
}
