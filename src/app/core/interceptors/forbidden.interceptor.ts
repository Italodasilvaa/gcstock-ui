import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { tap } from 'rxjs';
import { AppStateService } from '../services/app-state';

/**
 * Quando a API responde 403 (usuário sem a permissão da ação), avisa de forma clara. O aviso é disparado em seguida
 * (setTimeout 0) para prevalecer sobre a mensagem genérica "Não foi possível..." que cada tela mostra no seu erro.
 */
export const forbiddenInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);

  return next(req).pipe(
    tap({
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          setTimeout(() =>
            injector.get(AppStateService).triggerToast('Você não tem permissão para realizar esta ação.'),
          );
        }
      },
    }),
  );
};
