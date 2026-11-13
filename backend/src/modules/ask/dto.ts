import { IsString, MaxLength, MinLength } from 'class-validator';

export class AskDto {
  @IsString()
  @MinLength(2, { message: '질문을 2자 이상 입력해 주세요' })
  @MaxLength(600, { message: '질문은 600자 이하로 입력해 주세요' })
  question!: string;
}
