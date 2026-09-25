import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ApiDataService } from '../../core/services/api-data';
import { StockBatch, StockMovement } from '../../core/models/models';
import { DateRange, emptyDateRange, isDateRangeActive, isWithinDateRange } from '../../core/utils/date-range';
import { formatRelativeTimestamp } from '../../core/utils/format-timestamp';
import { DateRangeFilter } from '../../shared/date-range-filter/date-range-filter';

@Component({
  selector: 'app-estoque',
  imports: [DatePipe, DateRangeFilter],
  templateUrl: './estoque.html',
})
export class Estoque {
  private readonly api = inject(ApiDataService);

  protected readonly activeTab = signal<'lotes' | 'movimentacoes'>('lotes');

  private readonly batches = signal<StockBatch[]>([]);
  private readonly movements = signal<StockMovement[]>([]);
  protected readonly dateRange = signal<DateRange>(emptyDateRange());
  protected readonly isDateFilterActive = computed(() => isDateRangeActive(this.dateRange()));
  protected readonly totalBatches = computed(() => this.batches().length);
  protected readonly totalMovements = computed(() => this.movements().length);

  constructor() {
    this.api.getBatches().subscribe((list) => this.batches.set(list));
    this.api.getMovements().subscribe((list) => this.movements.set(list));
  }

  protected readonly sortedBatches = computed(() =>
    this.batches()
      .filter((b) => isWithinDateRange(b.entryDate, this.dateRange()))
      .sort((a, b) => a.daysRemaining - b.daysRemaining),
  );

  protected readonly sortedMovements = computed(() =>
    this.movements().filter((m) => isWithinDateRange(m.timestamp, this.dateRange())),
  );

  protected readonly urgentCount = computed(
    () => this.batches().filter((b) => b.status === 'urgente' || b.status === 'vencido').length,
  );

  protected readonly totalKg = computed(() =>
    this.batches().reduce((sum, b) => sum + b.availableKg, 0),
  );

  protected setTab(tab: 'lotes' | 'movimentacoes'): void {
    this.activeTab.set(tab);
  }

  protected statusLabel(status: StockBatch['status']): string {
    switch (status) {
      case 'urgente':
        return 'Urgente';
      case 'regular':
        return 'Regular';
      case 'novo':
        return 'Novo';
      case 'vencido':
        return 'Vencido';
    }
  }

  protected statusClasses(status: StockBatch['status']): string {
    switch (status) {
      case 'urgente':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a] border-[#ba1a1a]/20';
      case 'regular':
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20';
      case 'novo':
        return 'bg-[#4caf50]/10 text-[#4caf50] border-[#4caf50]/20';
      case 'vencido':
        return 'bg-[#1b1c1a]/85 text-white border-[#1b1c1a]';
    }
  }

  protected daysRemainingLabel(days: number): string {
    if (days < 0) {
      return `Vencido há ${Math.abs(days)}d`;
    }
    if (days === 0) {
      return 'Vence hoje';
    }
    return `${days}d restantes`;
  }

  protected movementIcon(type: StockMovement['type']): string {
    switch (type) {
      case 'entrada':
        return 'arrow_upward';
      case 'baixa_pdv':
        return 'shopping_cart';
      case 'perda_quebra':
        return 'warning';
    }
  }

  protected movementIconClasses(type: StockMovement['type']): string {
    switch (type) {
      case 'entrada':
        return 'bg-[#4caf50]/10 text-[#4caf50]';
      case 'baixa_pdv':
        return 'bg-[#0F1F3D]/10 text-[#0F1F3D]';
      case 'perda_quebra':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a]';
    }
  }

  protected amountLabel(amountKg: number): string {
    const sign = amountKg > 0 ? '+' : '';
    return `${sign}${amountKg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg`;
  }

  protected amountClasses(amountKg: number): string {
    return amountKg >= 0 ? 'text-[#4caf50]' : 'text-[#ba1a1a]';
  }

  protected timestampLabel(iso: string): string {
    return formatRelativeTimestamp(iso);
  }
}
