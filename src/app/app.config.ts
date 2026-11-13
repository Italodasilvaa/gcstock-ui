import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/error/global-error-handler';
import { apiLogInterceptor } from './core/interceptors/api-log.interceptor';
import { dedupeInterceptor } from './core/interceptors/dedupe.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { forbiddenInterceptor } from './core/interceptors/forbidden.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AppStateService } from './core/services/app-state';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(routes),
    // errorInterceptor por último: é o mais próximo da rede, então os demais já enxergam a mensagem legível.
    provideHttpClient(
      withInterceptors([dedupeInterceptor, authInterceptor, apiLogInterceptor, forbiddenInterceptor, errorInterceptor]),
    ),
    provideAppInitializer(() => inject(AppStateService).bootstrap()),
  ],
};
