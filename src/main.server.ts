import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, RenderMode, withRoutes } from '@angular/ssr';
import { AppComponent } from './app';
import { appConfig } from './app.config';

const serverConfig = mergeApplicationConfig(appConfig, {
  providers: [provideServerRendering(withRoutes([
    { path: '', renderMode: RenderMode.Prerender }
  ]))]
});

export default (context: BootstrapContext) => bootstrapApplication(AppComponent, serverConfig, context);
