import { IsBoolean, IsEmail, IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '이메일 형식이 아니에요' })
  email!: string;

  @IsString()
  @MinLength(1, { message: '비밀번호를 입력해 주세요' })
  password!: string;
}

export class InviteDto {
  @IsEmail({}, { message: '이메일 형식이 아니에요' })
  email!: string;
}

export class AcceptInviteDto {
  @IsString()
  @Length(1, 20, { message: '이름은 1~20자로 입력해 주세요' })
  name!: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이에요' })
  password!: string;
}

export class SetActiveDto {
  @IsBoolean()
  active!: boolean;
}
