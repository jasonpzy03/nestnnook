import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AuthGuard } from '../auth/auth.guard';

@Controller('media')
@UseGuards(AuthGuard)
export class MediaController {
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (process.env.ALLOW_LOCAL_UPLOADS !== 'true' || process.env.NODE_ENV === 'production')
      throw new ForbiddenException(
        'Use a hosted HTTPS image URL. Production image storage is not configured yet.',
      );
    if (!file?.buffer) throw new BadRequestException('Choose an image.');
    const bytes = file.buffer;
    const extension = bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      ? 'jpg'
      : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? 'png'
        : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
          ? 'webp'
          : null;
    if (!extension) throw new BadRequestException('Only JPEG, PNG and WebP photos are supported.');
    await mkdir(resolve('.data/uploads'), { recursive: true });
    const name = `${randomUUID()}.${extension}`;
    await writeFile(resolve('.data/uploads', name), bytes);
    return { url: `/uploads/${name}` };
  }
}
