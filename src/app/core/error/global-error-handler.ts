import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { AppStateService } from '../services/app-state';

/**
 * Último recurso para erros que nenhuma tela tratou:
 *
 * - Erro de HTTP sem tratamento na tela (ex.: carregar uma lista com `.subscribe(lista => ...)` sem `error`):
 *   antes falhava em silêncio e a tela ficava vazia; agora mostra o motivo no toast vermelho
 *   (a mensagem já vem legível do errorInterceptor). Telas que tratam o próprio erro não passam por aqui.
 * - Falha de código na tela (exceção, promessa rejeitada): aviso genérico.
 *
 * Mensagens iguais em sequência (várias listas falhando ao abrir a mesma tela) aparecem uma vez só.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);
  private lastMessage = '';
  private lastNoticeAt = 0;

  handleError(error: unknown): void {
    console.error(error);
    const message = this.messageFor(error);
    if (!message) return;

    const now = Date.now();
    if (message === this.lastMessage && now - this.lastNoticeAt < 5000) return;
    this.lastMessage = message;
    this.lastNoticeAt = now;

    // Fora do ciclo atual: o aviso não pode depender da tela que acabou de falhar.
    setTimeout(() => this.injector.get(AppStateService).toastError(message));
  }

  private messageFor(error: unknown): string | null {
    if (error instanceof HttpErrorResponse) {
      // 403 já é avisado pelo forbiddenInterceptor.
      if (error.status === 403) return null;
      const apiMessage = (error.error as { message?: unknown } | null)?.message;
      return typeof apiMessage === 'string' && apiMessage
        ? apiMessage
        : 'Não foi possível carregar os dados. Tente novamente em instantes.';
    }
    return 'Ocorreu um erro inesperado na tela. Se continuar, recarregue a página.';
  }
}
