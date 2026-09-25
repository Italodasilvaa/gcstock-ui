import { Component, ElementRef, HostListener, computed, inject, input, model, signal } from '@angular/core';
import { DateRange, emptyDateRange, isDateRangeActive, monthToDateRange } from '../../core/utils/date-range';

interface CalendarDay {
  key: string;
  day: number;
  inMonth: boolean;
}

interface CalendarMonth {
  key: string;
  monthName: string;
  year: number;
  days: CalendarDay[];
}

type CalendarView = 'days' | 'months' | 'years';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
/** Quantidade de anos exibidos por página na grade de anos. */
const YEARS_PER_PAGE = 12;

function toKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatKey(key: string): string {
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
}

function buildMonth(year: number, month: number): CalendarMonth {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({ key: toKey(date), day: date.getDate(), inMonth: date.getMonth() === month });
  }
  const monthName = first.toLocaleDateString('pt-BR', { month: 'long' });
  return {
    key: toKey(first).slice(0, 7),
    monthName: `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}`,
    year: first.getFullYear(),
    days,
  };
}

/**
 * Filtro de período em calendário: clique no dia inicial e depois no dia final.
 * Uso: `<app-date-range-filter label="Vencimento" [(range)]="dateRange" />`.
 */
@Component({
  selector: 'app-date-range-filter',
  templateUrl: './date-range-filter.html',
})
export class DateRangeFilter {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly range = model<DateRange>(emptyDateRange());
  /** Rótulo exibido acima do botão, ex.: "Vencimento" ou "Data de entrada". */
  readonly label = input('Período');

  protected readonly weekdays = WEEKDAYS;
  protected readonly monthShort = MONTH_SHORT;
  /** "days" = calendário; "months"/"years" = grades de navegação rápida (sem voltar mês a mês). */
  protected readonly view = signal<CalendarView>('days');
  /** Primeiro ano da página atual na grade de anos. */
  protected readonly yearPageStart = signal(new Date().getFullYear() - YEARS_PER_PAGE + 1);
  protected readonly todayKey = toKey(new Date());
  protected readonly currentYear = new Date().getFullYear();
  protected readonly currentMonthKey = toKey(new Date()).slice(0, 7);
  protected readonly isOpen = signal(false);
  /** Primeiro mês exibido (o segundo, no desktop, é o seguinte). */
  protected readonly viewMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  /** Dia inicial já clicado, aguardando o clique do dia final. */
  protected readonly pendingStart = signal<string | null>(null);
  protected readonly hoverKey = signal<string | null>(null);

  protected readonly isActive = computed(() => isDateRangeActive(this.range()));

  protected readonly months = computed(() => {
    const view = this.viewMonth();
    return [buildMonth(view.getFullYear(), view.getMonth()), buildMonth(view.getFullYear(), view.getMonth() + 1)];
  });

  protected readonly viewYear = computed(() => this.viewMonth().getFullYear());

  protected readonly yearPage = computed(() =>
    Array.from({ length: YEARS_PER_PAGE }, (_, i) => this.yearPageStart() + i),
  );

  protected readonly buttonText = computed(() => {
    const { from, to } = this.range();
    if (!from && !to) return 'Selecionar período';
    if (from && to && from === to) return formatKey(from);
    if (from && to) return `${formatKey(from)} — ${formatKey(to)}`;
    return from ? `A partir de ${formatKey(from)}` : `Até ${formatKey(to)}`;
  });

  /** Intervalo destacado no calendário: a seleção em andamento (com prévia no hover) ou a já aplicada. */
  private readonly highlight = computed<DateRange>(() => {
    const start = this.pendingStart();
    if (start) {
      const end = this.hoverKey() ?? start;
      return start <= end ? { from: start, to: end } : { from: end, to: start };
    }
    return this.range();
  });

  protected toggle(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }
    const { from } = this.range();
    const base = from ? new Date(`${from}T00:00:00`) : new Date();
    this.viewMonth.set(new Date(base.getFullYear(), base.getMonth(), 1));
    this.pendingStart.set(null);
    this.view.set('days');
    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
    this.pendingStart.set(null);
    this.hoverKey.set(null);
    this.view.set('days');
  }

  protected shiftMonth(delta: number): void {
    const view = this.viewMonth();
    this.viewMonth.set(new Date(view.getFullYear(), view.getMonth() + delta, 1));
  }

  protected shiftYear(delta: number): void {
    this.shiftMonth(delta * 12);
  }

  protected openMonths(): void {
    this.view.set('months');
  }

  protected openYears(): void {
    // Página que contém o ano em exibição, com ele perto do fim (anos passados são os mais buscados).
    this.yearPageStart.set(this.viewYear() - YEARS_PER_PAGE + 2);
    this.view.set('years');
  }

  protected shiftYearPage(delta: number): void {
    this.yearPageStart.set(this.yearPageStart() + delta * YEARS_PER_PAGE);
  }

  protected pickMonth(monthIndex: number): void {
    this.viewMonth.set(new Date(this.viewYear(), monthIndex, 1));
    this.view.set('days');
  }

  protected pickYear(year: number): void {
    this.viewMonth.set(new Date(year, this.viewMonth().getMonth(), 1));
    this.view.set('months');
  }

  protected selectWholeYear(year: number): void {
    this.range.set({ from: `${year}-01-01`, to: `${year}-12-31` });
    this.close();
  }

  /** Mês (na grade de meses) que cruza o período selecionado. */
  protected isMonthInRange(monthIndex: number): boolean {
    const { from, to } = this.range();
    if (!from && !to) return false;
    const month = `${this.viewYear()}-${String(monthIndex + 1).padStart(2, '0')}`;
    return (!from || month >= from.slice(0, 7)) && (!to || month <= to.slice(0, 7));
  }

  protected isYearInRange(year: number): boolean {
    const { from, to } = this.range();
    if (!from && !to) return false;
    return (!from || year >= Number(from.slice(0, 4))) && (!to || year <= Number(to.slice(0, 4)));
  }

  protected selectDay(key: string): void {
    const start = this.pendingStart();
    if (!start) {
      this.pendingStart.set(key);
      return;
    }
    this.range.set(start <= key ? { from: start, to: key } : { from: key, to: start });
    this.close();
  }

  protected selectWholeMonth(monthKey: string): void {
    this.range.set(monthToDateRange(monthKey));
    this.close();
  }

  protected clear(event?: Event): void {
    event?.stopPropagation();
    this.range.set(emptyDateRange());
    this.close();
  }

  protected isEdge(key: string): boolean {
    const { from, to } = this.highlight();
    return key === from || key === to;
  }

  protected isBetween(key: string): boolean {
    const { from, to } = this.highlight();
    return !!from && !!to && key > from && key < to;
  }

  /** Faixa de fundo contínua entre início e fim (meia faixa nas pontas). */
  protected bandClass(key: string): string {
    const { from, to } = this.highlight();
    if (!from || !to || from === to) return '';
    if (key === from) return 'bg-linear-to-r from-transparent from-50% to-[#d8a34a]/15 to-50%';
    if (key === to) return 'bg-linear-to-r from-[#d8a34a]/15 from-50% to-transparent to-50%';
    return this.isBetween(key) ? 'bg-[#d8a34a]/15' : '';
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    // composedPath() e não contains(): trocar de grade (dias/meses/anos) remove do DOM o botão clicado,
    // e contains() acharia que o clique foi fora e fecharia o calendário.
    if (this.isOpen() && !event.composedPath().includes(this.host.nativeElement)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) this.close();
  }
}
