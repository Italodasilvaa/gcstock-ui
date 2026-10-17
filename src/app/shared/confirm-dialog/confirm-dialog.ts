import { Component, HostListener, computed, inject } from '@angular/core';
import { ConfirmService, ConfirmTone } from '../../core/services/confirm.service';

const TONES: Record<ConfirmTone, { icon: string; badge: string; button: string }> = {
  danger: {
    icon: 'delete',
    badge: 'bg-[#ba1a1a]/10 text-[#ba1a1a]',
    button: 'bg-[#ba1a1a] hover:bg-[#9a1414] text-white',
  },
  warning: {
    icon: 'warning',
    badge: 'bg-[#d8a34a]/20 text-[#7f5700]',
    button: 'bg-[#d8a34a] hover:bg-[#c79238] text-[#583b00]',
  },
  default: {
    icon: 'help',
    badge: 'bg-[#0F1F3D]/10 text-[#0F1F3D]',
    button: 'bg-[#0F1F3D] hover:bg-[#0a1630] text-white',
  },
};

@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (confirm.pending(); as dialog) {
      <div
        class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="dialog.title"
        (click)="confirm.answer(false)"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-[#e4e2df] flex flex-col items-center text-center gap-3"
          (click)="$event.stopPropagation()"
        >
          <span class="w-14 h-14 rounded-full flex items-center justify-center" [class]="tone().badge">
            <span class="material-symbols-outlined text-[28px]">{{ dialog.icon || tone().icon }}</span>
          </span>
          <h3 class="text-[17px] font-bold text-[#1b1c1a] leading-tight">{{ dialog.title }}</h3>
          <p class="text-sm text-[#4f4537]">{{ dialog.message }}</p>
          @if (dialog.detail) {
            <p class="w-full text-[13px] font-semibold text-[#1b1c1a] bg-[#f5f3f0] rounded-lg px-3 py-2 break-words">
              {{ dialog.detail }}
            </p>
          }
          <div class="flex items-center justify-center gap-3 w-full mt-2">
            <button
              type="button"
              (click)="confirm.answer(false)"
              class="flex-1 px-4 py-2.5 bg-[#f5f3f0] hover:bg-[#efeeeb] text-[#1b1c1a] text-sm font-semibold rounded-xl cursor-pointer transition-colors"
            >
              {{ dialog.cancelLabel || 'Cancelar' }}
            </button>
            <button
              type="button"
              (click)="confirm.answer(true)"
              class="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
              [class]="tone().button"
            >
              {{ dialog.confirmLabel || 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
  protected readonly tone = computed(() => TONES[this.confirm.pending()?.tone ?? 'default']);

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.confirm.answer(false);
  }
}
