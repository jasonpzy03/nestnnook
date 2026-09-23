import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app';
import { appConfig } from './app.config';
bootstrapApplication(AppComponent, appConfig).catch(console.error);
