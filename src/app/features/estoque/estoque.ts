import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiDataService } from '../../core/services/api-data';
import { AppStateService } from '../../core/services/app-state';
import { PERMISSION } from '../../core/models/permissions';
import { ProductItem, StockBatch, StockLoss, StockMovement } from '../../core/models/models';
import { DateRange, emptyDateRange, isDateRangeActive, isWithinDateRange } from '../../core/utils/date-range';
import { formatRelativeTimestamp } from '../../core/utils/format-timestamp';
import { DateRangeFilter } from '../../shared/date-range-filter/date-range-filter';
import { formatQuantity, formatTotalsByUnit } from '../../core/utils/format-quantity';

@Component({
  selector: 'app-estoque',
  imports: [DatePipe, FormsModule, DateRangeFilter],
  templateUrl: './estoque.html',
})
export class Estoque {
  private readonly api = inject(ApiDataService);
  private readonly appState = inject(AppStateService);
  protected readonly PERMISSION = PERMISSION;

  protected can(permission: string): boolean {
    return this.appState.can(permission);
  }

  protected readonly activeTab = signal<'lotes' | 'movimentacoes' | 'perdas'>('lotes');

  private readonly batches = signal<StockBatch[]>([]);
  private readonly movements = signal<StockMovement[]>([]);
  protected readonly losses = signal<StockLoss[]>([]);
  private readonly products = signal<ProductItem[]>([]);
  protected readonly dateRange = signal<DateRange>(emptyDateRange());
  protected readonly isDateFilterActive = computed(() => isDateRangeActive(this.dateRange()));
  protected readonly totalBatches = computed(() => this.batches().length);
  protected readonly totalMovements = computed(() => this.movements().length);

  constructor() {
    this.api.getBatches().subscribe((list) => this.batches.set(list));
    this.api.getMovements().subscribe((list) => this.movements.set(list));
    this.api.getLosses().subscribe((list) => this.losses.set(list));
  }

  // ---------------------------------------------------------------- perdas de estoque
  protected readonly lossReasons = [
    { value: 'vencimento', label: 'Vencimento' },
    { value: 'quebra', label: 'Quebra / avaria' },
    { value: 'furto', label: 'Furto / extravio' },
    { value: 'outros', label: 'Outros' },
  ];

  protected readonly isLossModalOpen = signal(false);
  protected readonly isSavingLoss = signal(false);
  protected lossForm = {
    productId: '',
    stockBatchId: '',
    qty: 0,
    unitCost: 0,
    reason: 'vencimento',
    notes: '',
    date: '',
  };
  /** Só para recalcular o resumo do modal quando o formulário (objeto mutável) muda. */
  private readonly lossFormTick = signal(0);

  /** Produtos com saldo, para escolher o que foi perdido. */
  protected readonly lossProducts = computed(() =>
    this.products()
      .filter((p) => p.stock > 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  protected readonly lossProduct = computed(() => {
    this.lossFormTick();
    return this.products().find((p) => p.id === this.lossForm.productId) ?? null;
  });

  /** Lotes (com saldo) do produto escolhido; a linha "Sem lote" não é um lote de verdade. */
  protected readonly lossLots = computed(() => {
    this.lossFormTick();
    return this.batches().filter((b) => b.productId === this.lossForm.productId && b.id !== b.productId && b.availableKg > 0);
  });

  /** Prejuízo = quantidade × custo unitário informado. */
  protected readonly lossTotal = computed(() => {
    this.lossFormTick();
    return Math.round(Number(this.lossForm.qty || 0) * Number(this.lossForm.unitCost || 0) * 100) / 100;
  });

  protected readonly filteredLosses = computed(() =>
    this.losses().filter((l) => isWithinDateRange(l.date, this.dateRange())),
  );
  protected readonly totalLossAmount = computed(() =>
    this.filteredLosses()
      .filter((l) => l.status === 'ativa')
      .reduce((sum, l) => sum + l.totalCost, 0),
  );

  protected touchLossForm(): void {
    this.lossFormTick.update((n) => n + 1);
  }

  protected openLossModal(): void {
    if (!this.appState.requirePermission(PERMISSION.LossesCreate)) return;
    this.api.getProducts().subscribe((list) => this.products.set(list));
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.lossForm = { productId: '', stockBatchId: '', qty: 0, unitCost: 0, reason: 'vencimento', notes: '', date: today };
    this.touchLossForm();
    this.isLossModalOpen.set(true);
  }

  protected closeLossModal(): void {
    if (this.isSavingLoss()) return;
    this.isLossModalOpen.set(false);
  }

  /** Ao escolher o produto, o custo da perda começa no custo médio dele (o usuário pode trocar pelo custo do lote perdido). */
  protected onLossProductChange(productId: string): void {
    const product = this.products().find((p) => p.id === productId);
    this.lossForm.productId = productId;
    this.lossForm.stockBatchId = '';
    this.lossForm.unitCost = product?.costPrice ?? 0;
    this.touchLossForm();
  }

  /** Escolher o lote perdido traz o custo daquele lote (o que foi pago por ele) para o prejuízo. */
  protected onLossLotChange(lotId: string): void {
    this.lossForm.stockBatchId = lotId;
    const lot = this.batches().find((b) => b.id === lotId);
    if (lot && lot.unitCost > 0) this.lossForm.unitCost = lot.unitCost;
    this.touchLossForm();
  }

  protected saveLoss(): void {
    if (this.isSavingLoss()) return;
    const product = this.lossProduct();
    const qty = Number(this.lossForm.qty);

    if (!product) {
      this.appState.triggerToast('Escolha o produto perdido.');
      return;
    }
    if (!(qty > 0)) {
      this.appState.triggerToast('Informe a quantidade perdida.');
      return;
    }
    if (qty > product.stock) {
      this.appState.triggerToast(`Estoque insuficiente: ${product.name} tem apenas ${formatQuantity(product.stock, product.unit)}.`);
      return;
    }
    if (Number(this.lossForm.unitCost) < 0) {
      this.appState.triggerToast('O custo unitário não pode ser negativo.');
      return;
    }

    this.isSavingLoss.set(true);
    this.api
      .createLoss({
        productId: product.id,
        qty,
        unitCost: Number(this.lossForm.unitCost),
        reason: this.lossForm.reason,
        notes: this.lossForm.notes.trim() || undefined,
        date: this.lossForm.date || undefined,
        stockBatchId: this.lossForm.stockBatchId || null,
      })
      .subscribe({
        next: (loss) => {
          this.isSavingLoss.set(false);
          this.isLossModalOpen.set(false);
          this.reloadAfterLoss();
          this.appState.triggerToast(
            `Perda registrada: ${formatQuantity(loss.qty, loss.unit)} de ${loss.productName}. Prejuízo de ${this.formatCurrency(loss.totalCost)}.`,
          );
        },
        error: (err: HttpErrorResponse) => {
          this.isSavingLoss.set(false);
          if (err.status === 403) return; // o interceptor já avisa que falta permissão
          this.appState.triggerToast(err.error?.message ?? 'Não foi possível registrar a perda. Tente novamente.');
        },
      });
  }

  protected undoLoss(loss: StockLoss): void {
    if (!this.appState.requirePermission(PERMISSION.LossesUndo)) return;
    if (!confirm(`Desfazer a perda de ${loss.productName} (${this.formatCurrency(loss.totalCost)})? A quantidade volta ao estoque.`)) return;

    this.api.undoLoss(loss.id).subscribe({
      next: () => {
        this.reloadAfterLoss();
        this.appState.triggerToast('Perda desfeita: a quantidade voltou ao estoque.');
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 403) return;
        this.appState.triggerToast(err.error?.message ?? 'Não foi possível desfazer a perda.');
      },
    });
  }

  private reloadAfterLoss(): void {
    this.api.getBatches().subscribe((list) => this.batches.set(list));
    this.api.getMovements().subscribe((list) => this.movements.set(list));
    this.api.getLosses().subscribe((list) => this.losses.set(list));
  }

  protected reasonLabel(reason: string): string {
    return this.lossReasons.find((r) => r.value === reason)?.label ?? reason;
  }

  protected formatCurrency(value: number): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected readonly sortedBatches = computed(() =>
    this.batches()
      // Linha "Sem lote" (id = id do produto) não tem data de entrada real: sempre aparece.
      .filter((b) => b.id === b.productId || isWithinDateRange(b.entryDate, this.dateRange()))
      .sort((a, b) => a.daysRemaining - b.daysRemaining),
  );

  protected readonly sortedMovements = computed(() =>
    this.movements().filter((m) => isWithinDateRange(m.timestamp, this.dateRange())),
  );

  protected readonly urgentCount = computed(
    () => this.batches().filter((b) => b.status === 'urgente' || b.status === 'vencido').length,
  );

  /** Total disponível por unidade (ex.: "42,0 kg • 8 pct"); nunca soma unidades diferentes. */
  protected readonly totalLabel = computed(() =>
    formatTotalsByUnit(this.batches().map((b) => ({ value: b.availableKg, unit: b.unit }))),
  );

  protected quantityLabel(value: number, unit: string): string {
    return formatQuantity(value, unit);
  }

  protected setTab(tab: 'lotes' | 'movimentacoes' | 'perdas'): void {
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

  protected amountLabel(amount: number, unit: string): string {
    return formatQuantity(amount, unit, true);
  }

  protected amountClasses(amountKg: number): string {
    return amountKg >= 0 ? 'text-[#4caf50]' : 'text-[#ba1a1a]';
  }

  protected timestampLabel(iso: string): string {
    return formatRelativeTimestamp(iso);
  }
}
