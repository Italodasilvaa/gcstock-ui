import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Garante que todo erro de HTTP chegue às telas com uma mensagem legível em `error.message` (é de lá que cada tela lê o aviso).
 * A API já responde `{ message, traceId }`; este interceptor só completa o que não vem dela: servidor fora do ar (status 0),
 * erro 5xx sem corpo, proxy ou limite de requisições.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);

      const body = error.error as { message?: unknown; traceId?: unknown } | null;
      if (typeof body?.message === 'string' && body.message.length > 0) return throwError(() => error);

      const message = friendlyMessage(error.status);
      if (!message) return throwError(() => error);

      return throwError(
        () =>
          new HttpErrorResponse({
            error: { message, traceId: typeof body?.traceId === 'string' ? body.traceId : undefined },
            headers: error.headers,
            status: error.status,
            statusText: error.statusText,
            url: error.url ?? undefined,
          }),
      );
    }),
  );

function friendlyMessage(status: number): string | null {
  if (status === 0) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  if (status === 413) return 'Os dados enviados são grandes demais.';
  if (status === 429) return 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.';
  if (status >= 500) return 'Erro inesperado no servidor. Tente novamente em instantes.';
  return null;
}
