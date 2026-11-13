import { Component, input } from '@angular/core';
import { PAGE_SIZE_OPTIONS, Pager } from './pager';

/** Rodapé de paginação padrão das listas: quantos por página (15, 30, 50, 100), faixa exibida e navegação. */
@Component({
  selector: 'app-paginator',
  template: `
    @let p = pager();
    @if (p.total() > 0) {
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#e4e2df] text-[12px] text-[#4f4537]">
        <label class="flex items-center gap-2">
          <span>Mostrar</span>
          <select
            [value]="p.pageSize()"
            (change)="onSizeChange($event)"
            class="px-2 py-1 rounded-lg border border-[#e4e2df] bg-white text-[12px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#d8a34a]/40 cursor-pointer"
            aria-label="Registros por página"
          >
            @for (size of sizes; track size) {
              <option [value]="size" [selected]="size === p.pageSize()">{{ size }}</option>
            }
          </select>
          <span>por página</span>
        </label>

        <span>{{ p.firstIndex() }}–{{ p.lastIndex() }} de {{ p.total() }}</span>

        <div class="flex items-center gap-1">
          <button
            type="button"
            (click)="p.goTo(1)"
            [disabled]="p.page() === 1"
            class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[#e4e2df] hover:bg-[#f5f3f0] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Primeira página"
            title="Primeira página"
          >
            <span class="material-symbols-outlined text-[18px]">first_page</span>
          </button>
          <button
            type="button"
            (click)="p.previous()"
            [disabled]="p.page() === 1"
            class="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-[#e4e2df] hover:bg-[#f5f3f0] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold"
          >
            <span class="material-symbols-outlined text-[18px]">chevron_left</span>
            Anterior
          </button>
          <span class="px-2 font-semibold">Página {{ p.page() }} de {{ p.totalPages() }}</span>
          <button
            type="button"
            (click)="p.next()"
            [disabled]="p.page() === p.totalPages()"
            class="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-[#e4e2df] hover:bg-[#f5f3f0] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold"
          >
            Próxima
            <span class="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
          <button
            type="button"
            (click)="p.goTo(p.totalPages())"
            [disabled]="p.page() === p.totalPages()"
            class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[#e4e2df] hover:bg-[#f5f3f0] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Última página"
            title="Última página"
          >
            <span class="material-symbols-outlined text-[18px]">last_page</span>
          </button>
        </div>
      </div>
    }
  `,
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Paginator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly pager = input.required<Pager<any>>();
  protected readonly sizes = PAGE_SIZE_OPTIONS;

  protected onSizeChange(event: Event): void {
    this.pager().setPageSize(Number((event.target as HTMLSelectElement).value));
  }
}
