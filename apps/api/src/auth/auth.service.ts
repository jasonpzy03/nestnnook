import { Injectable, HttpException, UnauthorizedException } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

@Injectable()
export class AuthService {
  private readonly redis = process.env.STORAGE_DRIVER === 'upstash' ? Redis.fromEnv() : undefined;
  private readonly sessions = new Map<string, number>();
  private readonly attempts = new Map<string, { count: number; expires: number }>();
  private readonly prefix = `${process.env.REDIS_KEY_PREFIX || 'nestnnook'}:auth:`;
  constructor() {
    if (
      !process.env.ADMIN_EMAIL ||
      !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.ADMIN_PASSWORD_HASH || '')
    ) {
      throw new Error(
        'Configure ADMIN_EMAIL and ADMIN_PASSWORD_HASH. For local use run npm run setup.',
      );
    }
  }
  private key(token: string) {
    return this.prefix + 'session:' + createHash('sha256').update(token).digest('hex');
  }
  async login(email: string, password: string, ip: string): Promise<string> {
    const bucket = this.prefix + 'attempt:' + createHash('sha256').update(ip).digest('hex');
    let count: number;
    if (this.redis) {
      count = await this.redis.eval<[], number>(
        `local n = redis.call('INCR',KEYS[1]); if n == 1 then redis.call('EXPIRE',KEYS[1],900) end; return n`,
        [bucket],
        [],
      );
    } else {
      for (const [key, value] of this.attempts)
        if (value.expires < Date.now()) this.attempts.delete(key);
      const attempt = this.attempts.get(bucket) || { count: 0, expires: Date.now() + 900000 };
      count = ++attempt.count;
      this.attempts.set(bucket, attempt);
    }
    if (count > 10)
      throw new HttpException('Too many sign-in attempts. Please try again in 15 minutes.', 429);
    const [salt, expected] = process.env.ADMIN_PASSWORD_HASH!.split(':');
    const matches = timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(expected, 'hex'));
    if (!matches || email.toLowerCase() !== process.env.ADMIN_EMAIL!.toLowerCase())
      throw new UnauthorizedException('Email or password is incorrect.');
    const token = randomBytes(32).toString('hex');
    if (this.redis) await this.redis.set(this.key(token), 'valid', { ex: 28800 });
    else {
      for (const [key, expires] of this.sessions)
        if (expires < Date.now()) this.sessions.delete(key);
      this.sessions.set(this.key(token), Date.now() + 28800000);
    }
    return token;
  }
  async valid(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) return false;
    if (this.redis) return (await this.redis.get(this.key(token))) === 'valid';
    return (this.sessions.get(this.key(token)) || 0) > Date.now();
  }
  async logout(token: string) {
    if (this.redis) await this.redis.del(this.key(token));
    else this.sessions.delete(this.key(token));
  }
}
