import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data';
import { AppStateService } from '../../core/services/app-state';
import {
  AccountsPayableTitle,
  AccountsReceivableTitle,
  GlobalAlertSetting,
  ProductItem,
  StockBatch,
  StockMovement,
} from '../../core/models/models';

interface QuickLink {
  label: string;
  description: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly mockData = inject(MockDataService);
  protected readonly appState = inject(AppStateService);

  // Dados brutos vindos do MockDataService (100% client-side / localStorage)
  private readonly products: ProductItem[] = this.mockData.getProducts();
  private readonly batches: StockBatch[] = this.mockData.getBatches();
  private readonly alertConfig: GlobalAlertSetting = this.mockData.getAlertConfig();
  private readonly movements: StockMovement[] = this.mockData.getMovements();

  protected readonly payables: AccountsPayableTitle[] = this.mockData.getPayables();
  protected readonly receivables: AccountsReceivableTitle[] = this.mockData.getReceivables();

  // KPIs executivos
  protected readonly lowStockProducts: ProductItem[] = this.products.filter((p) => p.stock < p.minStock);

  protected readonly expiringBatches: StockBatch[] = this.batches.filter(
    (b) => b.daysRemaining <= this.alertConfig.alertLeadDays,
  );

  protected readonly openPayables: AccountsPayableTitle[] = this.payables.filter((p) => p.status !== 'pago');
  protected readonly openReceivables: AccountsReceivableTitle[] = this.receivables.filter(
    (r) => r.status !== 'recebido',
  );

  protected readonly totalPayableOpen: number = this.openPayables.reduce((sum, p) => sum + p.amount, 0);
  protected readonly totalReceivableOpen: number = this.openReceivables.reduce((sum, r) => sum + r.netAmount, 0);

  // Produtos com validade crítica ou vencida, ordenados pelo mais urgente primeiro
  protected readonly criticalProducts: ProductItem[] = this.products
    .filter((p) => p.expiryStatus === 'critico' || p.expiryStatus === 'vencido')
    .sort((a, b) => a.expiryDaysRemaining - b.expiryDaysRemaining);

  // Últimas movimentações de estoque, mais recentes primeiro
  protected readonly recentMovements: StockMovement[] = this.sortMovements(this.movements).slice(0, 6);

  // Lembretes de recebimento: títulos em aberto ordenados pelo vencimento mais próximo primeiro
  protected readonly upcomingReceivables: AccountsReceivableTitle[] = [...this.openReceivables]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);

  protected readonly quickLinks: QuickLink[] = [
    {
      label: 'Produtos',
      description: 'Cadastro, estoque e preços dos itens',
      icon: 'restaurant',
      path: '/produtos',
    },
    {
      label: 'Kits de Churrasco',
      description: 'Monte combos e confira disponibilidade',
      icon: 'outdoor_grill',
      path: '/kits',
    },
    {
      label: 'Nova Venda (PDV)',
      description: 'Abrir o caixa e registrar uma venda',
      icon: 'point_of_sale',
      path: '/vendas',
    },
    {
      label: 'Financeiro',
      description: 'Contas a pagar, a receber e DRE',
      icon: 'payments',
      path: '/financeiro',
    },
  ];

  protected get companyGreetingName(): string {
    return this.appState.session()?.company.tradeName ?? 'sua empresa';
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected movementIcon(type: StockMovement['type']): string {
    switch (type) {
      case 'entrada':
        return 'call_received';
      case 'baixa_pdv':
        return 'point_of_sale';
      case 'perda_quebra':
        return 'delete_sweep';
    }
  }

  protected movementIconClass(type: StockMovement['type']): string {
    switch (type) {
      case 'entrada':
        return 'bg-[#4caf50]/10 text-[#2e7d32]';
      case 'baixa_pdv':
        return 'bg-[#d8a34a]/15 text-[#7f5700]';
      case 'perda_quebra':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a]';
    }
  }

  protected movementAmountClass(amountKg: number): string {
    return amountKg >= 0 ? 'text-[#2e7d32]' : 'text-[#ba1a1a]';
  }

  protected expiryBadgeClass(status: ProductItem['expiryStatus']): string {
    switch (status) {
      case 'vencido':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/20';
      case 'critico':
        return 'bg-[#f59e0b]/15 text-[#b45309] border border-[#f59e0b]/30';
      case 'normal':
        return 'bg-[#4caf50]/10 text-[#2e7d32] border border-[#4caf50]/20';
      default:
        return 'bg-[#efeeeb] text-[#4f4537] border border-[#e4e2df]';
    }
  }

  protected expiryStatusLabel(status: ProductItem['expiryStatus']): string {
    switch (status) {
      case 'vencido':
        return 'Vencido';
      case 'critico':
        return 'Crítico';
      case 'normal':
        return 'Normal';
      default:
        return 'Longo Prazo';
    }
  }

  protected receivableStatusClass(status: AccountsReceivableTitle['status']): string {
    switch (status) {
      case 'vencido':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/20';
      case 'a_vencer':
        return 'bg-[#f59e0b]/15 text-[#b45309] border border-[#f59e0b]/30';
      case 'recebido':
        return 'bg-[#4caf50]/10 text-[#2e7d32] border border-[#4caf50]/20';
    }
  }

  protected receivableStatusLabel(status: AccountsReceivableTitle['status']): string {
    switch (status) {
      case 'vencido':
        return 'Vencido';
      case 'a_vencer':
        return 'A Vencer';
      case 'recebido':
        return 'Recebido';
    }
  }

  /**
   * Ordenação simples "mais recente primeiro" baseada no rótulo textual do
   * mock (ex: "Hoje 11:34", "Ontem 18:20"), já que não há timestamp real
   * de backend.
   */
  private sortMovements(list: StockMovement[]): StockMovement[] {
    const rank = (ts: string): number => (ts.startsWith('Hoje') ? 2 : ts.startsWith('Ontem') ? 1 : 0);
    return [...list].sort((a, b) => {
      const diff = rank(b.timestamp) - rank(a.timestamp);
      return diff !== 0 ? diff : b.timestamp.localeCompare(a.timestamp);
    });
  }
}
