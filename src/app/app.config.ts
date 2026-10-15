import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { apiLogInterceptor } from './core/interceptors/api-log.interceptor';
import { dedupeInterceptor } from './core/interceptors/dedupe.interceptor';
import { forbiddenInterceptor } from './core/interceptors/forbidden.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AppStateService } from './core/services/app-state';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([dedupeInterceptor, authInterceptor, apiLogInterceptor, forbiddenInterceptor])),
    provideAppInitializer(() => inject(AppStateService).bootstrap()),
  ],
};
