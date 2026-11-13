import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OwnerGuard, StaffGuard, type StaffRequest } from './auth.guard';
import { AuthService } from './auth.service';
import { AcceptInviteDto, InviteDto, LoginDto, SetActiveDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /api/auth/login
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  // POST /api/auth/logout
  @Post('logout')
  @HttpCode(204)
  @UseGuards(StaffGuard)
  async logout(@Req() req: StaffRequest) {
    await this.auth.logout(req.sessionToken);
  }

  // GET /api/auth/me
  @Get('me')
  @UseGuards(StaffGuard)
  me(@Req() req: StaffRequest) {
    return this.auth.me(req.staff);
  }

  // GET /api/auth/invite/:token  (초대 확인, 공개)
  @Get('invite/:token')
  getInvite(@Param('token') token: string) {
    return this.auth.getInvite(token);
  }

  // POST /api/auth/invite/:token  (비밀번호 설정, 공개)
  @Post('invite/:token')
  acceptInvite(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    return this.auth.acceptInvite(token, dto.name, dto.password);
  }
}

// 직원 관리 (대표만)
@Controller('staff/members')
@UseGuards(StaffGuard, OwnerGuard)
export class MembersController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  list() {
    return this.auth.members();
  }

  @Post('invite')
  invite(@Req() req: StaffRequest, @Body() dto: InviteDto) {
    return this.auth.invite(req.staff, dto.email);
  }

  @Patch(':id')
  setActive(@Req() req: StaffRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto) {
    return this.auth.setActive(req.staff, id, dto.active);
  }
}
