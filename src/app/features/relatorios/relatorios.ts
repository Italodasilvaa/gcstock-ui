import { Component, computed, inject, signal } from '@angular/core';
import { MockDataService } from '../../core/services/mock-data';
import {
  BarbecueKit,
  Client,
  ProductItem,
  PurchaseEntry,
  StockMovement,
} from '../../core/models/models';

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
  totalKg: number;
  percent: number;
}

@Component({
  selector: 'app-relatorios',
  imports: [],
  templateUrl: './relatorios.html',
})
export class Relatorios {
  private readonly mockData = inject(MockDataService);

  // Dados brutos vindos do MockDataService (100% client-side / localStorage)
  private readonly products = signal<ProductItem[]>(this.mockData.getProducts());
  private readonly kits = signal<BarbecueKit[]>(this.mockData.getKits());
  private readonly movements = signal<StockMovement[]>(this.mockData.getMovements());
  private readonly purchases = signal<PurchaseEntry[]>(this.mockData.getPurchases());
  private readonly clients = signal<Client[]>(this.mockData.getClients());

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
    for (const purchase of this.purchases()) {
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
    this.purchases().reduce((sum, p) => sum + p.totalAmount, 0),
  );

  // Movimentações do período, agrupadas por tipo
  protected readonly movementSummaries = computed<MovementSummary[]>(() => {
    const types: StockMovement['type'][] = ['entrada', 'baixa_pdv', 'perda_quebra'];
    const raw = types.map((type) => {
      const items = this.movements().filter((m) => m.type === type);
      const totalKg = items.reduce((sum, m) => sum + Math.abs(m.amountKg), 0);
      return {
        type,
        label: this.movementTypeLabel(type),
        icon: this.movementTypeIcon(type),
        count: items.length,
        totalKg,
      };
    });
    const maxKg = Math.max(1, ...raw.map((r) => r.totalKg));
    return raw.map((r) => ({ ...r, percent: (r.totalKg / maxKg) * 100 }));
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
