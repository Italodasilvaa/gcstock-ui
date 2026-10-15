import { Component, computed, inject, signal } from '@angular/core';
import { ApiDataService } from '../../core/services/api-data';
import {
  BarbecueKit,
  Client,
  ProductItem,
  PurchaseEntry,
  StockMovement,
} from '../../core/models/models';
import { DateRange, emptyDateRange, isWithinDateRange } from '../../core/utils/date-range';
import { DateRangeFilter } from '../../shared/date-range-filter/date-range-filter';
import { formatTotalsByUnit } from '../../core/utils/format-quantity';

interface CategorySummary {
  category: string;
  count: number;
  totalValue: number;
  percent: number;
}

interface SupplierSummary {
  supplier: string;
  ordersCount: number;
  totalAmount: number;
  totalWeightKg: number;
  percent: number;
}

interface MovementSummary {
  type: StockMovement['type'];
  label: string;
  icon: string;
  count: number;
  /** Quantidade movimentada por unidade (ex.: "12,5 kg • 8 pct"). */
  quantityLabel: string;
  percent: number;
}

@Component({
  selector: 'app-relatorios',
  imports: [DateRangeFilter],
  templateUrl: './relatorios.html',
})
export class Relatorios {
  private readonly api = inject(ApiDataService);

  // Dados brutos vindos da GC Stock API
  private readonly products = signal<ProductItem[]>([]);
  private readonly kits = signal<BarbecueKit[]>([]);
  private readonly movements = signal<StockMovement[]>([]);
  private readonly purchases = signal<PurchaseEntry[]>([]);
  private readonly clients = signal<Client[]>([]);

  /** Período aplicado às compras (data de entrada) e às movimentações de estoque. */
  protected readonly dateRange = signal<DateRange>(emptyDateRange());

  private readonly periodPurchases = computed(() =>
    this.purchases().filter((p) => isWithinDateRange(p.entryDate, this.dateRange())),
  );

  private readonly periodMovements = computed(() =>
    this.movements().filter((m) => isWithinDateRange(m.timestamp, this.dateRange())),
  );

  constructor() {
    this.api.getProducts().subscribe((list) => this.products.set(list));
    this.api.getKits().subscribe((list) => this.kits.set(list));
    this.api.getMovements().subscribe((list) => this.movements.set(list));
    this.api.getPurchases().subscribe((list) => this.purchases.set(list));
    this.api.getClients().subscribe((list) => this.clients.set(list));
  }

  // Valor total em estoque (custo)
  protected readonly totalStockValue = computed(() =>
    this.products().reduce((sum, p) => sum + p.stock * p.costPrice, 0),
  );

  protected readonly totalStockKg = computed(() =>
    this.products()
      .filter((p) => p.unit === 'kg')
      .reduce((sum, p) => sum + p.stock, 0),
  );

  // Produtos por categoria
  protected readonly categorySummaries = computed<CategorySummary[]>(() => {
    const map = new Map<string, { count: number; totalValue: number }>();
    for (const product of this.products()) {
      const entry = map.get(product.category) ?? { count: 0, totalValue: 0 };
      entry.count += 1;
      entry.totalValue += product.stock * product.costPrice;
      map.set(product.category, entry);
    }
    const maxValue = Math.max(1, ...Array.from(map.values()).map((v) => v.totalValue));
    return Array.from(map.entries())
      .map(([category, v]) => ({
        category,
        count: v.count,
        totalValue: v.totalValue,
        percent: (v.totalValue / maxValue) * 100,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  });

  // Resumo de compras por fornecedor
  protected readonly supplierSummaries = computed<SupplierSummary[]>(() => {
    const map = new Map<string, { ordersCount: number; totalAmount: number; totalWeightKg: number }>();
    for (const purchase of this.periodPurchases()) {
      const entry = map.get(purchase.supplierName) ?? {
        ordersCount: 0,
        totalAmount: 0,
        totalWeightKg: 0,
      };
      entry.ordersCount += 1;
      entry.totalAmount += purchase.totalAmount;
      entry.totalWeightKg += purchase.totalWeightKg;
      map.set(purchase.supplierName, entry);
    }
    const maxAmount = Math.max(1, ...Array.from(map.values()).map((v) => v.totalAmount));
    return Array.from(map.entries())
      .map(([supplier, v]) => ({
        supplier,
        ordersCount: v.ordersCount,
        totalAmount: v.totalAmount,
        totalWeightKg: v.totalWeightKg,
        percent: (v.totalAmount / maxAmount) * 100,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  });

  protected readonly totalPurchasesAmount = computed(() =>
    this.periodPurchases().reduce((sum, p) => sum + p.totalAmount, 0),
  );

  // Movimentações do período, agrupadas por tipo
  protected readonly movementSummaries = computed<MovementSummary[]>(() => {
    const types: StockMovement['type'][] = ['entrada', 'baixa_pdv', 'perda_quebra'];
    const raw = types.map((type) => {
      const items = this.periodMovements().filter((m) => m.type === type);
      const quantityLabel = formatTotalsByUnit(items.map((m) => ({ value: Math.abs(m.amountKg), unit: m.unit })));
      return {
        type,
        label: this.movementTypeLabel(type),
        icon: this.movementTypeIcon(type),
        count: items.length,
        quantityLabel,
      };
    });
    // A barra compara o número de movimentações (quantidades de unidades diferentes não se comparam).
    const maxCount = Math.max(1, ...raw.map((r) => r.count));
    return raw.map((r) => ({ ...r, percent: (r.count / maxCount) * 100 }));
  });

  // Kits mais rentáveis (maior margem primeiro)
  protected readonly kitsByMargin = computed<BarbecueKit[]>(() =>
    [...this.kits()].sort((a, b) => b.marginPercent - a.marginPercent),
  );

  // Top clientes por gasto total
  protected readonly clientsBySpend = computed<Client[]>(() =>
    [...this.clients()].sort((a, b) => b.totalSpent - a.totalSpent),
  );

  protected readonly maxClientSpend = computed(() =>
    Math.max(1, ...this.clients().map((c) => c.totalSpent)),
  );

  protected clientSpendPercent(client: Client): number {
    return (client.totalSpent / this.maxClientSpend()) * 100;
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected formatKg(value: number): string {
    return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
  }

  protected movementTypeLabel(type: StockMovement['type']): string {
    switch (type) {
      case 'entrada':
        return 'Entradas';
      case 'baixa_pdv':
        return 'Baixas de PDV';
      case 'perda_quebra':
        return 'Perdas / Quebras';
    }
  }

  protected movementTypeIcon(type: StockMovement['type']): string {
    switch (type) {
      case 'entrada':
        return 'call_received';
      case 'baixa_pdv':
        return 'point_of_sale';
      case 'perda_quebra':
        return 'delete_sweep';
    }
  }

  protected movementTypeClasses(type: StockMovement['type']): string {
    switch (type) {
      case 'entrada':
        return 'bg-[#4caf50]/10 text-[#4caf50]';
      case 'baixa_pdv':
        return 'bg-[#0F1F3D]/10 text-[#0F1F3D]';
      case 'perda_quebra':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a]';
    }
  }

  protected movementBarClasses(type: StockMovement['type']): string {
    switch (type) {
      case 'entrada':
        return 'bg-[#4caf50]';
      case 'baixa_pdv':
        return 'bg-[#0F1F3D]';
      case 'perda_quebra':
        return 'bg-[#ba1a1a]';
    }
  }

  protected kitStockBadgeClasses(status: BarbecueKit['stockStatus']): string {
    switch (status) {
      case 'amplo':
        return 'bg-[#4caf50]/10 text-[#2e7d32] border border-[#4caf50]/20';
      case 'disponivel':
        return 'bg-[#d8a34a]/15 text-[#7f5700] border border-[#d8a34a]/30';
      case 'alerta':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/20';
    }
  }

  protected kitStockLabel(status: BarbecueKit['stockStatus']): string {
    switch (status) {
      case 'amplo':
        return 'Estoque amplo';
      case 'disponivel':
        return 'Disponível';
      case 'alerta':
        return 'Alerta de estoque';
    }
  }
}
