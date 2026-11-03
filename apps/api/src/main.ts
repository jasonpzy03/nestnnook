import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet());
  const origin = process.env.ADMIN_ORIGIN || 'http://127.0.0.1:4201';
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (request.path.startsWith('/api')) response.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.origin !== origin) {
      response.status(403).json({ message: 'Request origin is not allowed.' });
      return;
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  if (process.env.NODE_ENV !== 'production')
    app.useStaticAssets(resolve('.data/uploads'), { prefix: '/uploads/' });
  await app.listen(
    Number(process.env.PORT || 3000),
    process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1',
  );
}
bootstrap().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
