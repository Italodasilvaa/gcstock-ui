import { Component, computed, inject } from '@angular/core';
import { AppStateService } from '../../core/services/app-state';

const STYLES = {
  success: { icon: 'check_circle', iconClass: 'text-[#4caf50]', border: 'border-[#4caf50]/50', label: 'Sucesso' },
  warning: { icon: 'warning', iconClass: 'text-[#f2b84b]', border: 'border-[#f2b84b]/60', label: 'Atenção' },
  error: { icon: 'error', iconClass: 'text-[#ff8a80]', border: 'border-[#ff8a80]/70', label: 'Erro' },
} as const;

/**
 * Aviso flutuante do app inteiro (fica na raiz, então aparece também na tela de login).
 * Verde = sucesso, amarelo = orientação, vermelho = erro com o motivo. Clique no X para fechar.
 */
@Component({
  selector: 'app-toast',
  template: `
    @if (appState.toast(); as t) {
      <!-- z-index acima de qualquer modal/overlay (modais usam até z-[200]). -->
      <div
        [attr.role]="t.kind === 'error' ? 'alert' : 'status'"
        [attr.aria-live]="t.kind === 'error' ? 'assertive' : 'polite'"
        class="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 sm:max-w-md z-[9999] bg-[#0F1F3D] text-white pl-4 pr-2 py-3 rounded-xl shadow-2xl flex items-start gap-3 border animate-in fade-in slide-in-from-bottom duration-200"
        [class]="style().border"
      >
        <span class="material-symbols-outlined text-[22px] shrink-0 mt-px" [class]="style().iconClass">{{ style().icon }}</span>
        <div class="flex-1 min-w-0">
          @if (t.kind !== 'success') {
            <p class="text-[11px] font-bold uppercase tracking-wide" [class]="style().iconClass">{{ style().label }}</p>
          }
          <p class="text-[13px] font-medium break-words">{{ t.message }}</p>
        </div>
        <button
          type="button"
          (click)="appState.dismissToast()"
          aria-label="Fechar aviso"
          class="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
        >
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    }
  `,
})
export class ToastComponent {
  protected readonly appState = inject(AppStateService);
  protected readonly style = computed(() => STYLES[this.appState.toast()?.kind ?? 'success']);
}
