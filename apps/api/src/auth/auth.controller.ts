import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard, sessionToken } from './auth.guard';
class LoginDto {
  @IsString() @MinLength(1) @MaxLength(200) password!: string;
}
const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api',
};
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login') async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = await this.auth.login(body.password, request.ip || 'unknown');
    response.cookie('nn_admin', token, { ...options, maxAge: 28800000 });
    return { authenticated: true };
  }
  @Get('me') @UseGuards(AuthGuard) me() {
    return { authenticated: true };
  }
  @Post('logout') async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(sessionToken(request));
    response.clearCookie('nn_admin', options);
    return { ok: true };
  }
}
