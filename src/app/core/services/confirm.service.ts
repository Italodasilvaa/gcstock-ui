import { Injectable, signal } from '@angular/core';

export type ConfirmTone = 'danger' | 'warning' | 'default';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Linha extra, em destaque (ex.: o nome do item e o valor). */
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = exclusão (vermelho); warning = alteração com efeito (âmbar); default = neutro. */
  tone?: ConfirmTone;
  icon?: string;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/** Substitui o confirm() do navegador por um modal da própria aplicação (ver app-confirm-dialog no app.html). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    // Se já houver uma pergunta aberta, ela é recusada antes de abrir a nova.
    this.pending()?.resolve(false);
    return new Promise<boolean>((resolve) => this.pending.set({ ...options, resolve }));
  }

  answer(confirmed: boolean): void {
    const current = this.pending();
    if (!current) return;
    this.pending.set(null);
    current.resolve(confirmed);
  }
}
