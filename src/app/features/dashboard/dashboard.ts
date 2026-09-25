import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiDataService } from '../../core/services/api-data';
import { AppStateService } from '../../core/services/app-state';
import { formatRelativeTimestamp } from '../../core/utils/format-timestamp';
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

const DEFAULT_ALERT_CONFIG: GlobalAlertSetting = {
  alertLeadDays: 3,
  morningSummaryTime: '07:30',
  notifyTopbar: true,
  notifyEmail: true,
  notifyWhatsapp: true,
  recipients: [],
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly api = inject(ApiDataService);
  protected readonly appState = inject(AppStateService);

  // Dados brutos vindos da Girus API
  private readonly products = signal<ProductItem[]>([]);
  private readonly batches = signal<StockBatch[]>([]);
  private readonly alertConfig = signal<GlobalAlertSetting>(DEFAULT_ALERT_CONFIG);
  private readonly movements = signal<StockMovement[]>([]);

  protected readonly payables = signal<AccountsPayableTitle[]>([]);
  protected readonly receivables = signal<AccountsReceivableTitle[]>([]);

  constructor() {
    this.api.getProducts().subscribe((list) => this.products.set(list));
    this.api.getBatches().subscribe((list) => this.batches.set(list));
    this.api.getAlertConfig().subscribe((config) => this.alertConfig.set(config));
    this.api.getMovements().subscribe((list) => this.movements.set(list));
    this.api.getPayables().subscribe((list) => this.payables.set(list));
    this.api.getReceivables().subscribe((list) => this.receivables.set(list));
  }

  // KPIs executivos
  protected readonly lowStockProducts = computed(() => this.products().filter((p) => p.stock < p.minStock));

  protected readonly expiringBatches = computed(() =>
    this.batches().filter((b) => b.daysRemaining <= this.alertConfig().alertLeadDays),
  );

  protected readonly openPayables = computed(() => this.payables().filter((p) => p.status !== 'pago'));
  protected readonly openReceivables = computed(() => this.receivables().filter((r) => r.status !== 'recebido'));

  protected readonly totalPayableOpen = computed(() =>
    this.openPayables().reduce((sum, p) => sum + p.amount, 0),
  );
  protected readonly totalReceivableOpen = computed(() =>
    this.openReceivables().reduce((sum, r) => sum + r.netAmount, 0),
  );

  // Produtos com validade crítica ou vencida, ordenados pelo mais urgente primeiro
  protected readonly criticalProducts = computed(() =>
    this.products()
      .filter((p) => p.expiryStatus === 'critico' || p.expiryStatus === 'vencido')
      .sort((a, b) => a.expiryDaysRemaining - b.expiryDaysRemaining),
  );

  // Últimas movimentações de estoque, mais recentes primeiro
  protected readonly recentMovements = computed(() => this.sortMovements(this.movements()).slice(0, 6));

  // Lembretes de recebimento: títulos em aberto ordenados pelo vencimento mais próximo primeiro
  protected readonly upcomingReceivables = computed(() =>
    [...this.openReceivables()].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6),
  );

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

  protected movementTimestampLabel(iso: string): string {
    return formatRelativeTimestamp(iso);
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

  /** Mais recente primeiro, a partir do timestamp ISO real retornado pela API. */
  private sortMovements(list: StockMovement[]): StockMovement[] {
    return [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
