import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiLog } from '../models/models';
import { ApiLogService } from '../services/api-log';

/** Registra cada chamada HTTP real à GC Stock API no ApiLogService, para exibição no Console API. */
export const apiLogInterceptor: HttpInterceptorFn = (req, next) => {
  const apiLog = inject(ApiLogService);
  const startedAt = Date.now();
  const endpoint = req.url.startsWith(environment.apiUrl) ? req.url.slice(environment.apiUrl.length) : req.url;

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          apiLog.record({
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
            method: req.method as ApiLog['method'],
            endpoint,
            statusCode: event.status,
            durationMs: Date.now() - startedAt,
            requestPayload: req.body ?? undefined,
            responsePayload: event.body ?? undefined,
          });
        }
      },
      error: (error: unknown) => {
        const statusCode = error instanceof HttpErrorResponse ? error.status : 0;
        apiLog.record({
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
          method: req.method as ApiLog['method'],
          endpoint,
          statusCode,
          durationMs: Date.now() - startedAt,
          requestPayload: req.body ?? undefined,
          responsePayload: error instanceof HttpErrorResponse ? error.error : undefined,
        });
      },
    }),
  );
};
