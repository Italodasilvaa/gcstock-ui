import { HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable, finalize, shareReplay } from 'rxjs';

/** Gravações idênticas ainda em andamento (método + URL + corpo), para não enviar duas vezes. */
const inFlight = new Map<string, Observable<HttpEvent<unknown>>>();

function keyOf(req: HttpRequest<unknown>): string | null {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return null;
  // Upload de arquivo: cada envio é independente.
  if (typeof FormData !== 'undefined' && req.body instanceof FormData) return null;
  return `${req.method} ${req.urlWithParams} ${JSON.stringify(req.body ?? null)}`;
}

/**
 * Evita registros duplicados por clique duplo (ou Enter repetido) em "Salvar"/"Finalizar venda": se uma gravação
 * idêntica já está em andamento, não dispara outra requisição — quem chamou de novo recebe a mesma resposta.
 * Só vale enquanto a primeira não termina; depois disso, uma nova gravação igual é enviada normalmente.
 */
export const dedupeInterceptor: HttpInterceptorFn = (req, next) => {
  const key = keyOf(req);
  if (key === null) return next(req);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const shared = next(req).pipe(
    finalize(() => inFlight.delete(key)),
    shareReplay({ bufferSize: 1, refCount: false }),
  );
  inFlight.set(key, shared);
  return shared;
};
