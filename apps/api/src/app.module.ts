import { Module } from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/auth.guard';
import { AuthController } from './auth/auth.controller';
import { CatalogController, PublicCatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { CatalogStore } from './storage/catalog.store';
import { MediaController } from './media/media.controller';
@Module({
  controllers: [AuthController, CatalogController, PublicCatalogController, MediaController],
  providers: [AuthService, AuthGuard, CatalogService, CatalogStore],
})
export class AppModule {}
