// main.ts
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { APP_CONFIG } from '@env/environment';
import { initializeConditionalConsole } from '@shared/helpers/console.helper';

// Environment setup
if (APP_CONFIG.production) {
  enableProdMode();
}

// Initialize console helper
initializeConditionalConsole();

// Bootstrap the application
bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));