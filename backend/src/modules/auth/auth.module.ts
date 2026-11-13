import { Global, Module } from '@nestjs/common';
import { AuthController, MembersController } from './auth.controller';
import { OwnerGuard, StaffGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';

// 전역: 다른 기능 모듈에서 @UseGuards(StaffGuard) 를 바로 쓸 수 있게 가드를 내보낸다.
@Global()
@Module({
  controllers: [AuthController, MembersController],
  providers: [AuthService, MailService, StaffGuard, OwnerGuard],
  exports: [StaffGuard, OwnerGuard],
})
export class AuthModule {}
