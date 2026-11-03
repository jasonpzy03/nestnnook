import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CatalogService } from './catalog.service';
import { CatalogDto, RevisionDto } from './catalog.dto';
import { CatalogStore } from '../storage/catalog.store';
import { blobUploadsEnabled, localUploadsEnabled } from '../media/upload-config';

@Controller('catalog')
@UseGuards(AuthGuard)
export class CatalogController {
  constructor(
    private readonly service: CatalogService,
    private readonly store: CatalogStore,
  ) {}
  @Get() read() {
    return this.service.read();
  }
  @Put() save(@Body() body: CatalogDto) {
    return this.service.save(body);
  }
  @Post('rooms/:id/publish') publishRoom(@Param('id') id: string, @Body() body: RevisionDto) {
    return this.service.publishEntry('rooms', id, body.revision, true);
  }
  @Post('rooms/:id/unpublish') unpublishRoom(@Param('id') id: string, @Body() body: RevisionDto) {
    return this.service.publishEntry('rooms', id, body.revision, false);
  }
  @Post('locations/:id/publish') publishLocation(
    @Param('id') id: string,
    @Body() body: RevisionDto,
  ) {
    return this.service.publishEntry('locations', id, body.revision, true);
  }
  @Post('locations/:id/unpublish') unpublishLocation(
    @Param('id') id: string,
    @Body() body: RevisionDto,
  ) {
    return this.service.publishEntry('locations', id, body.revision, false);
  }
  @Get('status') status() {
    return {
      storage: this.store.driver,
      publishingConnected: true,
      uploadsEnabled: blobUploadsEnabled() || localUploadsEnabled(),
    };
  }
}

// Drafts remain protected by AuthGuard; only the published snapshot is public.
@Controller('public/catalog')
export class PublicCatalogController {
  constructor(private readonly service: CatalogService) {}
  @Get() read() {
    return this.service.published();
  }
}
