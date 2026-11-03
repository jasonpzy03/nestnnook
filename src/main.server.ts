import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, RenderMode, withRoutes } from '@angular/ssr';
import { CATALOG_URL } from './public-catalog.service';
import { AppComponent } from './app';
import { appConfig } from './app.config';

const serverConfig = mergeApplicationConfig(appConfig, {
  providers: [
    provideServerRendering(withRoutes([{ path: '**', renderMode: RenderMode.Server }])),
    {
      provide: CATALOG_URL,
      useFactory: () =>
        process.env['CATALOG_API_URL'] ||
        (process.env['NODE_ENV'] !== 'production'
          ? 'http://127.0.0.1:3000/api/public/catalog'
          : ''),
    },
  ],
});

export default (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, serverConfig, context);
