import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiDataService } from '../../core/services/api-data';
import { AppStateService } from '../../core/services/app-state';
import { PERMISSION } from '../../core/models/permissions';
import { SaleHistory } from '../../core/models/models';
import { DateRange, emptyDateRange, isDateRangeActive, isWithinDateRange } from '../../core/utils/date-range';
import { formatQuantity } from '../../core/utils/format-quantity';
import { DateRangeFilter } from '../../shared/date-range-filter/date-range-filter';

type StatusFilter = 'todas' | 'concluida' | 'cancelada';

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  debito: 'Cartão de débito',
  credito_vista: 'Crédito à vista',
  parcelado: 'Crédito parcelado',
  a_prazo: 'A prazo (fiado)',
};

@Component({
  selector: 'app-historico-vendas',
  imports: [FormsModule, DateRangeFilter],
  templateUrl: './historico-vendas.html',
})
export class HistoricoVendas {
  private readonly api = inject(ApiDataService);
  private readonly appState = inject(AppStateService);

  protected readonly sales = signal<SaleHistory[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('todas');
  protected readonly dateRange = signal<DateRange>(emptyDateRange());
  protected readonly isDateFilterActive = computed(() => isDateRangeActive(this.dateRange()));
  protected readonly expandedId = signal<string | null>(null);

  protected readonly cancelTarget = signal<SaleHistory | null>(null);
  protected readonly isCanceling = signal(false);
  protected cancelReason = '';

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.sales().filter((sale) => {
      if (status !== 'todas' && sale.status !== status) return false;
      if (!isWithinDateRange(sale.timestamp, this.dateRange())) return false;
      if (!term) return true;
      return (
        sale.receiptNumber.toLowerCase().includes(term) ||
        (sale.clientName ?? '').toLowerCase().includes(term) ||
        sale.soldBy.toLowerCase().includes(term) ||
        sale.items.some((item) => item.name.toLowerCase().includes(term))
      );
    });
  });

  /** Total vendido no filtro atual (vendas canceladas não contam). */
  protected readonly totalSold = computed(() =>
    this.filtered()
      .filter((s) => s.status === 'concluida')
      .reduce((sum, s) => sum + s.total, 0),
  );
  protected readonly completedCount = computed(() => this.filtered().filter((s) => s.status === 'concluida').length);
  protected readonly canceledCount = computed(() => this.filtered().filter((s) => s.status === 'cancelada').length);

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.api.getSalesHistory().subscribe({
      next: (list) => {
        this.sales.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.appState.triggerToast('Não foi possível carregar o histórico de vendas.');
      },
    });
  }

  protected toggleExpand(sale: SaleHistory): void {
    this.expandedId.set(this.expandedId() === sale.id ? null : sale.id);
  }

  protected canCancel(sale: SaleHistory): boolean {
    return sale.status === 'concluida' && this.appState.can(PERMISSION.SalesCancel);
  }

  protected canCancelAny(): boolean {
    return this.appState.can(PERMISSION.SalesCancel);
  }

  protected openCancel(sale: SaleHistory): void {
    if (!this.appState.requirePermission(PERMISSION.SalesCancel)) return;
    this.cancelReason = '';
    this.cancelTarget.set(sale);
  }

  protected closeCancel(): void {
    if (this.isCanceling()) return;
    this.cancelTarget.set(null);
  }

  protected confirmCancel(): void {
    const sale = this.cancelTarget();
    if (!sale || this.isCanceling()) return;

    this.isCanceling.set(true);
    this.api.cancelSale(sale.saleId, this.cancelReason.trim()).subscribe({
      next: (result) => {
        this.sales.set(this.sales().map((s) => (s.id === result.sale.id ? result.sale : s)));
        this.isCanceling.set(false);
        this.cancelTarget.set(null);
        this.appState.triggerToast(
          result.notice
            ? `Venda ${sale.receiptNumber} cancelada. ${result.notice}`
            : `Venda ${sale.receiptNumber} cancelada: estoque devolvido e título a receber removido.`,
        );
      },
      error: (err: HttpErrorResponse) => {
        this.isCanceling.set(false);
        if (err.status === 403) return; // o interceptor já avisa que falta permissão
        this.appState.triggerToast(err.error?.message ?? 'Não foi possível cancelar a venda. Tente novamente.');
      },
    });
  }

  protected formatCurrency(value: number): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  protected quantityLabel(value: number, unit: string): string {
    return formatQuantity(value, unit);
  }

  protected paymentLabel(mode: string): string {
    return PAYMENT_LABELS[mode] ?? mode;
  }

  protected itemsSummary(sale: SaleHistory): string {
    if (sale.items.length === 0) return 'Itens não registrados';
    const first = sale.items[0].name;
    return sale.items.length === 1 ? first : `${first} + ${sale.items.length - 1}`;
  }

  protected subtotalOf(sale: SaleHistory): number {
    return sale.items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  protected hasUnknownPrices(sale: SaleHistory): boolean {
    return sale.items.some((item) => !item.priceKnown);
  }
}
