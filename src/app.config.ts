import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { PublicCatalogService } from './public-catalog.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideAppInitializer(() => inject(PublicCatalogService).load()),
  ],
};
