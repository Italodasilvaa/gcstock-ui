import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { AppStateService } from '../services/app-state';

/**
 * Erro não tratado (falha de código na tela, promessa rejeitada): registra no console e avisa o usuário uma vez, em vez de a tela
 * falhar em silêncio. Erro de HTTP não entra aqui: cada tela já mostra a mensagem do servidor.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);
  private lastNoticeAt = 0;

  handleError(error: unknown): void {
    console.error(error);
    if (error instanceof HttpErrorResponse) return;

    const now = Date.now();
    if (now - this.lastNoticeAt < 5000) return;
    this.lastNoticeAt = now;

    // Fora do ciclo atual: o aviso não pode depender da tela que acabou de falhar.
    setTimeout(() =>
      this.injector.get(AppStateService).triggerToast('Ocorreu um erro inesperado na tela. Se continuar, recarregue a página.'),
    );
  }
}
