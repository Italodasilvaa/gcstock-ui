import { HttpErrorResponse } from '@angular/common/http';

/**
 * Motivo legível de uma falha de chamada à API. A API manda `{ message }`; quando não manda (rede, 5xx),
 * o errorInterceptor já preencheu uma mensagem amigável. `fallback` só é usado se nada disso existir.
 */
export function httpErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const message = (error.error as { message?: unknown } | null)?.message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}
