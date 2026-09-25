import { Service, computed, inject, signal } from '@angular/core';
import { forkJoin, of, catchError } from 'rxjs';
import {
  AccountsPayableTitle,
  AccountsReceivableTitle,
  GlobalAlertSetting,
  ProductItem,
  StockBatch,
} from '../models/models';
import { ApiDataService } from './api-data';

export type NotificationSeverity = 'critico' | 'atencao';

export interface AppNotification {
  id: string;
  severity: NotificationSeverity;
  icon: string;
  title: string;
  description: string;
  /** Rota aberta ao clicar na notificação. */
  path: string;
}

const DEFAULT_LEAD_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Dias entre hoje e a data (yyyy-MM-dd ou ISO). Negativo = já passou. Calculado aqui porque o status salvo pode estar desatualizado. */
function daysUntil(value: string): number | null {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - todayUtc) / MS_PER_DAY);
}

function dueText(days: number): string {
  if (days < 0) return `venceu há ${-days} dia${days === -1 ? '' : 's'}`;
  if (days === 0) return 'vence hoje';
  if (days === 1) return 'vence amanhã';
  return `vence em ${days} dias`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Alertas do sino da barra superior, calculados a partir dos dados reais da empresa:
 * lotes vencidos/vencendo, estoque abaixo do mínimo e contas a pagar/receber vencidas ou próximas do vencimento.
 * A antecedência vem de Configurações > Alertas (alertLeadDays).
 */
@Service()
export class NotificationService {
  private readonly api = inject(ApiDataService);

  private readonly batches = signal<StockBatch[]>([]);
  private readonly products = signal<ProductItem[]>([]);
  private readonly payables = signal<AccountsPayableTitle[]>([]);
  private readonly receivables = signal<AccountsReceivableTitle[]>([]);
  private readonly alertConfig = signal<GlobalAlertSetting | null>(null);

  readonly isLoading = signal(false);

  /** Respeita "Notificar na barra superior" das configurações de alerta. */
  readonly isEnabled = computed(() => this.alertConfig()?.notifyTopbar ?? true);

  private readonly leadDays = computed(() => this.alertConfig()?.alertLeadDays ?? DEFAULT_LEAD_DAYS);

  readonly notifications = computed<AppNotification[]>(() => {
    const lead = this.leadDays();
    const list: AppNotification[] = [];

    for (const batch of this.batches()) {
      if (batch.availableKg <= 0) continue;
      const days = daysUntil(batch.expiryDate) ?? batch.daysRemaining;
      if (days > lead) continue;
      list.push({
        id: `batch-${batch.id}`,
        severity: days < 0 ? 'critico' : 'atencao',
        icon: days < 0 ? 'dangerous' : 'schedule',
        title: days < 0 ? `Lote vencido: ${batch.productName}` : `Lote vencendo: ${batch.productName}`,
        description: `Lote ${batch.lotNumber} • ${batch.availableKg} kg • ${dueText(days)}`,
        path: '/estoque',
      });
    }

    for (const product of this.products()) {
      if (product.minStock <= 0 || product.stock >= product.minStock) continue;
      list.push({
        id: `stock-${product.id}`,
        severity: product.stock <= 0 ? 'critico' : 'atencao',
        icon: 'inventory_2',
        title: product.stock <= 0 ? `Sem estoque: ${product.name}` : `Estoque baixo: ${product.name}`,
        description: `${product.stock} ${product.unit} em estoque • mínimo ${product.minStock} ${product.unit}`,
        path: '/produtos',
      });
    }

    for (const payable of this.payables()) {
      if (payable.status === 'pago') continue;
      const days = daysUntil(payable.dueDate);
      if (days === null || days > lead) continue;
      list.push({
        id: `payable-${payable.id}`,
        severity: days < 0 ? 'critico' : 'atencao',
        icon: 'payments',
        title: `Conta a pagar: ${payable.supplier || payable.description}`,
        description: `${formatCurrency(payable.amount)} • ${dueText(days)}`,
        path: '/financeiro',
      });
    }

    for (const receivable of this.receivables()) {
      if (receivable.status === 'recebido') continue;
      const days = daysUntil(receivable.dueDate);
      if (days === null || days > lead) continue;
      list.push({
        id: `receivable-${receivable.id}`,
        severity: days < 0 ? 'critico' : 'atencao',
        icon: 'request_quote',
        title: `A receber: ${receivable.clientOrOrigin}`,
        description: `${formatCurrency(receivable.netAmount)} • ${dueText(days)}`,
        path: '/financeiro',
      });
    }

    // Críticos primeiro, mantendo a ordem por tipo dentro de cada grupo.
    return list.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critico' ? -1 : 1));
  });

  readonly count = computed(() => (this.isEnabled() ? this.notifications().length : 0));

  /** Recarrega tudo; uma fonte que falhar conta como vazia para não travar o sino. */
  refresh(): void {
    this.isLoading.set(true);
    forkJoin({
      batches: this.api.getBatches().pipe(catchError(() => of(null))),
      products: this.api.getProducts().pipe(catchError(() => of(null))),
      payables: this.api.getPayables().pipe(catchError(() => of(null))),
      receivables: this.api.getReceivables().pipe(catchError(() => of(null))),
      alertConfig: this.api.getAlertConfig().pipe(catchError(() => of(null))),
    }).subscribe((result) => {
      this.batches.set(result.batches ?? []);
      this.products.set(result.products ?? []);
      this.payables.set(result.payables ?? []);
      this.receivables.set(result.receivables ?? []);
      if (result.alertConfig) this.alertConfig.set(result.alertConfig);
      this.isLoading.set(false);
    });
  }

  clear(): void {
    this.batches.set([]);
    this.products.set([]);
    this.payables.set([]);
    this.receivables.set([]);
    this.alertConfig.set(null);
  }
}
