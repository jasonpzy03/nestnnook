import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
export function sessionToken(request: Request) {
  return (
    request.headers.cookie
      ?.split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith('nn_admin='))
      ?.slice(9) || ''
  );
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    if (!(await this.auth.valid(sessionToken(context.switchToHttp().getRequest()))))
      throw new UnauthorizedException('Please sign in to continue.');
    return true;
  }
}
