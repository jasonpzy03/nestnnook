import {
  BadRequestException,
  Controller,
  ForbiddenException,
  ServiceUnavailableException,
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
import { blobUploadsEnabled, localUploadsEnabled } from './upload-config';
import { put } from '@vercel/blob';

@Controller('media')
@UseGuards(AuthGuard)
export class MediaController {
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 4 * 1024 * 1024, files: 1 } }))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!blobUploadsEnabled() && !localUploadsEnabled())
      throw new ForbiddenException(
        'Image storage is not configured. Connect a public Vercel Blob store to the API project and set BLOB_READ_WRITE_TOKEN, or use a hosted HTTPS image URL.',
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
    const name = `${randomUUID()}.${extension}`;
    if (blobUploadsEnabled()) {
      try {
        const blob = await put(`rooms/${name}`, bytes, {
          access: 'public',
          contentType: extension === 'jpg' ? 'image/jpeg' : `image/${extension}`,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        return { url: blob.url };
      } catch {
        throw new ServiceUnavailableException(
          'Image storage is unavailable. Check the API project’s BLOB_READ_WRITE_TOKEN and that its Blob store allows public access, then retry.',
        );
      }
    }
    await mkdir(resolve('.data/uploads'), { recursive: true });
    await writeFile(resolve('.data/uploads', name), bytes);
    return { url: `/uploads/${name}` };
  }
}
