import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiDataService } from '../../core/services/api-data';
import { AppStateService } from '../../core/services/app-state';
import { PERMISSION } from '../../core/models/permissions';
import {
  AccountsPayableTitle,
  AccountsReceivableTitle,
  CardSettlementTitle,
  Employee,
  FinancialSummary,
  PurchaseEntry,
  SaleRecord,
} from '../../core/models/models';
import { DateRange, emptyDateRange, isDateRangeActive, isWithinDateRange } from '../../core/utils/date-range';
import { DateRangeFilter } from '../../shared/date-range-filter/date-range-filter';
import { formatQuantity } from '../../core/utils/format-quantity';

type FinanceiroTab = 'resultado' | 'dre' | 'pagar' | 'receber' | 'cartoes' | 'mensal';

/** Primeiro e último dia do mês atual (data local), no formato yyyy-MM-dd. */
function currentMonthRange(): DateRange {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return { from: `${now.getFullYear()}-${month}-01`, to: `${now.getFullYear()}-${month}-${String(lastDay).padStart(2, '0')}` };
}

interface MonthlyBreakdownRow {
  monthKey: string;
  monthLabel: string;
  sold: number;
  purchased: number;
  paid: number;
  received: number;
  /** Folha de pagamento do mês (soma do salário dos funcionários ativos) — não é um lançamento, é fixo por mês. */
  payroll: number;
  balance: number;
}

interface PayableFormModel {
  supplier: string;
  description: string;
  nfeReference: string;
  dueDate: string;
  amount: number;
  paymentMethod: string;
  origin: string;
  category: Exclude<AccountsPayableTitle['category'], 'compras'>;
}

interface ReceivableFormModel {
  clientOrOrigin: string;
  subCategory: string;
  reference: string;
  dueDate: string;
  grossAmount: number;
  feeRetention: number;
  type: AccountsReceivableTitle['type'];
  paymentModeDesc: string;
}

function emptyPayableForm(): PayableFormModel {
  return {
    supplier: '',
    description: '',
    nfeReference: '',
    dueDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'Boleto Bancário',
    origin: 'Despesa Manual',
    category: 'outros',
  };
}

function emptyReceivableForm(): ReceivableFormModel {
  return {
    clientOrOrigin: '',
    subCategory: '',
    reference: '',
    dueDate: new Date().toISOString().split('T')[0],
    grossAmount: 0,
    feeRetention: 0,
    type: 'b2b',
    paymentModeDesc: 'Boleto / Pix',
  };
}

/** Extrai a chave "aaaa-mm" de uma data ISO ("aaaa-mm-ddTHH:mm:ss..." ou "aaaa-mm-dd"). */
function monthKeyFromIsoDate(isoDate: string): string | null {
  if (!isoDate || isoDate.length < 7) {
    return null;
  }
  return isoDate.slice(0, 7);
}

/** Converte uma chave "aaaa-mm" em um rótulo tipo "Setembro/2026". */
function monthLabelFromKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

@Component({
  selector: 'app-financeiro',
  imports: [FormsModule, DatePipe, DateRangeFilter],
  templateUrl: './financeiro.html',
})
export class Financeiro implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiDataService);
  private readonly appState = inject(AppStateService);
  protected readonly PERMISSION = PERMISSION;

  protected can(permission: string): boolean {
    return this.appState.can(permission);
  }

  protected readonly activeTab = signal<FinanceiroTab>('resultado');

  // ---- Resultado (DRE): o que foi gasto em entradas, vendido, o custo e o lucro do período
  protected readonly resultRange = signal<DateRange>(currentMonthRange());
  protected readonly summary = signal<FinancialSummary | null>(null);
  protected readonly isLoadingSummary = signal(false);
  protected readonly isCurrentMonthRange = computed(() => {
    const current = currentMonthRange();
    const range = this.resultRange();
    return range.from === current.from && range.to === current.to;
  });

  protected readonly payables = signal<AccountsPayableTitle[]>([]);
  protected readonly receivables = signal<AccountsReceivableTitle[]>([]);
  protected readonly cardSettlements = signal<CardSettlementTitle[]>([]);
  protected readonly sales = signal<SaleRecord[]>([]);
  protected readonly purchases = signal<PurchaseEntry[]>([]);
  protected readonly employees = signal<Employee[]>([]);

  protected readonly dateRange = signal<DateRange>(emptyDateRange());
  protected readonly isDateFilterActive = computed(() => isDateRangeActive(this.dateRange()));

  /** Contas a pagar/receber filtradas pelo vencimento; cartões pela data da venda. Alimentam listas e KPIs. */
  protected readonly filteredPayables = computed(() =>
    this.payables().filter((p) => isWithinDateRange(p.dueDate, this.dateRange())),
  );

  protected readonly filteredReceivables = computed(() =>
    this.receivables().filter((r) => isWithinDateRange(r.dueDate, this.dateRange())),
  );

  protected readonly filteredCardSettlements = computed(() =>
    this.cardSettlements().filter((c) => isWithinDateRange(c.saleDate, this.dateRange())),
  );

  protected readonly dateFilterLabel = computed(() => {
    switch (this.activeTab()) {
      case 'cartoes':
        return 'Data da venda';
      case 'mensal':
        return 'Meses';
      default:
        return 'Vencimento';
    }
  });

  protected readonly dateFilterHint = computed(() => {
    switch (this.activeTab()) {
      case 'pagar':
        return `Exibindo ${this.filteredPayables().length} de ${this.payables().length} contas a pagar pelo vencimento.`;
      case 'receber':
        return `Exibindo ${this.filteredReceivables().length} de ${this.receivables().length} contas a receber pelo vencimento.`;
      case 'cartoes':
        return `Exibindo ${this.filteredCardSettlements().length} de ${this.cardSettlements().length} vendas em cartão.`;
      case 'mensal':
        return 'Exibindo apenas os meses dentro do período selecionado.';
      default:
        return 'Indicadores calculados apenas com os títulos que vencem no período selecionado.';
    }
  });

  constructor() {
    // Recarrega o resumo sempre que o período muda.
    effect(() => this.loadSummary(this.resultRange()));
    this.refreshPayables();
    this.refreshReceivables();
    this.refreshCardSettlements();
    this.api.getSales().subscribe((list) => this.sales.set(list));
    this.api.getPurchases().subscribe((list) => this.purchases.set(list));
    this.api.getEmployees().subscribe((list) => this.employees.set(list));
  }

  /** Custo fixo mensal com a equipe — somado automaticamente ao fechamento, sem precisar lançar nada. */
  protected readonly totalMonthlyPayroll = computed(() =>
    this.employees()
      .filter((e) => e.active)
      .reduce((sum, e) => sum + e.salary, 0),
  );

  protected readonly isPayableModalOpen = signal(false);
  protected readonly isReceivableModalOpen = signal(false);
  protected payableForm: PayableFormModel = emptyPayableForm();
  protected receivableForm: ReceivableFormModel = emptyReceivableForm();

  // KPIs - DRE
  protected readonly totalPayableOpen = computed(() =>
    this.filteredPayables()
      .filter((p) => p.status !== 'pago')
      .reduce((sum, p) => sum + p.amount, 0),
  );

  protected readonly totalPayableOverdue = computed(() =>
    this.filteredPayables()
      .filter((p) => p.status === 'vencido')
      .reduce((sum, p) => sum + p.amount, 0),
  );

  protected readonly totalReceivableOpen = computed(() =>
    this.filteredReceivables()
      .filter((r) => r.status !== 'recebido')
      .reduce((sum, r) => sum + r.netAmount, 0),
  );

  protected readonly totalReceivableOverdue = computed(() =>
    this.filteredReceivables()
      .filter((r) => r.status === 'vencido')
      .reduce((sum, r) => sum + r.netAmount, 0),
  );

  protected readonly projectedBalance = computed(
    () => this.totalReceivableOpen() - this.totalPayableOpen(),
  );

  protected readonly pendingCardSettlements = computed(() =>
    this.filteredCardSettlements().filter((c) => c.status === 'a_liquidar'),
  );

  protected readonly pendingCardSettlementsTotal = computed(() =>
    this.pendingCardSettlements().reduce((sum, c) => sum + c.netAmount, 0),
  );

  // Visão Mensal
  protected readonly monthlyBreakdown = computed<MonthlyBreakdownRow[]>(() => {
    const rows = new Map<string, MonthlyBreakdownRow>();

    const getRow = (monthKey: string | null): MonthlyBreakdownRow | null => {
      if (!monthKey) {
        return null;
      }
      let row = rows.get(monthKey);
      if (!row) {
        row = {
          monthKey,
          monthLabel: monthLabelFromKey(monthKey),
          sold: 0,
          purchased: 0,
          paid: 0,
          received: 0,
          payroll: 0,
          balance: 0,
        };
        rows.set(monthKey, row);
      }
      return row;
    };

    // Garante que o mês atual sempre apareça, mesmo sem nenhum lançamento ainda — a folha de
    // pagamento é um custo fixo que existe todo mês, independente de ter movimento ou não.
    getRow(new Date().toISOString().slice(0, 7));

    for (const sale of this.sales()) {
      const row = getRow(monthKeyFromIsoDate(sale.timestamp));
      if (row) {
        row.sold += sale.total;
      }
    }

    for (const purchase of this.purchases()) {
      const row = getRow(monthKeyFromIsoDate(purchase.entryDate));
      if (row) {
        row.purchased += purchase.totalAmount;
      }
    }

    for (const payable of this.payables()) {
      if (payable.status === 'pago' && payable.paidDate) {
        const row = getRow(monthKeyFromIsoDate(payable.paidDate));
        if (row) {
          row.paid += payable.amount;
        }
      }
    }

    for (const receivable of this.receivables()) {
      if (receivable.status === 'recebido' && receivable.receivedDate) {
        const row = getRow(monthKeyFromIsoDate(receivable.receivedDate));
        if (row) {
          row.received += receivable.netAmount;
        }
      }
    }

    const payroll = this.totalMonthlyPayroll();
    const { from, to } = this.dateRange();
    const fromMonth = from.slice(0, 7);
    const toMonth = to.slice(0, 7);
    return Array.from(rows.values())
      .filter((row) => (!fromMonth || row.monthKey >= fromMonth) && (!toMonth || row.monthKey <= toMonth))
      .map((row) => ({ ...row, payroll, balance: row.sold + row.received - row.paid - payroll }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  });

  ngOnInit(): void {
    const initialTab = this.route.snapshot.data['initialTab'] as FinanceiroTab | undefined;
    this.activeTab.set(initialTab ?? 'dre');
  }

  private refreshPayables(): void {
    this.api.getPayables().subscribe((list) => this.payables.set(list));
  }

  private refreshReceivables(): void {
    this.api.getReceivables().subscribe((list) => this.receivables.set(list));
  }

  private refreshCardSettlements(): void {
    this.api.getCardSettlements().subscribe((list) => this.cardSettlements.set(list));
  }

  private loadSummary(range: DateRange): void {
    this.isLoadingSummary.set(true);
    this.api.getFinancialSummary(range.from || undefined, range.to || undefined).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.isLoadingSummary.set(false);
      },
      error: () => {
        this.isLoadingSummary.set(false);
        this.appState.triggerToast('Não foi possível carregar o resultado financeiro.');
      },
    });
  }

  protected resetResultRange(): void {
    this.resultRange.set(currentMonthRange());
  }

  protected formatPercent(value: number): string {
    return `${(value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }

  protected formatDay(iso: string): string {
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  }

  protected quantityLabel(value: number, unit: string): string {
    return formatQuantity(value, unit);
  }

  protected expenseLabel(category: string): string {
    switch (category) {
      case 'outros':
        return 'Despesas operacionais';
      case 'equipamento':
        return 'Equipamentos';
      case 'investimento':
        return 'Investimentos';
      default:
        return category;
    }
  }

  protected setTab(tab: FinanceiroTab): void {
    this.activeTab.set(tab);
  }

  // Visão Mensal
  protected monthlyEntriesBarWidth(row: MonthlyBreakdownRow): number {
    const max = Math.max(row.purchased, row.paid, 1);
    return (row.purchased / max) * 100;
  }

  protected monthlyExitsBarWidth(row: MonthlyBreakdownRow): number {
    const max = Math.max(row.purchased, row.paid, 1);
    return (row.paid / max) * 100;
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Contas a Pagar
  protected payableStatusLabel(status: AccountsPayableTitle['status']): string {
    switch (status) {
      case 'vencido':
        return 'Vencido';
      case 'a_vencer':
        return 'A Vencer';
      case 'pago':
        return 'Pago';
    }
  }

  protected payableStatusClasses(status: AccountsPayableTitle['status']): string {
    switch (status) {
      case 'vencido':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/30';
      case 'a_vencer':
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30';
      case 'pago':
        return 'bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30';
    }
  }

  protected payableCategoryLabel(category: AccountsPayableTitle['category']): string {
    switch (category) {
      case 'compras':
        return 'Compras';
      case 'equipamento':
        return 'Equipamento';
      case 'investimento':
        return 'Investimento';
      case 'outros':
        return 'Outros';
    }
  }

  protected settlePayable(item: AccountsPayableTitle): void {
    if (!this.appState.requirePermission(PERMISSION.PayablesSettle)) return;
    this.api.settlePayable(item.id, 'Conta Padrão', 'Manual').subscribe({
      next: (updated) => {
        if (!updated) {
          this.appState.triggerToast('Não foi possível baixar o título. Tente novamente.');
          return;
        }
        this.refreshPayables();
        this.appState.triggerToast(`Título "${item.description}" baixado com sucesso.`);
      },
      error: () => this.appState.triggerToast('Não foi possível baixar o título. Tente novamente.'),
    });
  }

  protected openNewPayableModal(): void {
    if (!this.appState.requirePermission(PERMISSION.PayablesCreate)) return;
    this.payableForm = emptyPayableForm();
    this.isPayableModalOpen.set(true);
  }

  protected closePayableModal(): void {
    this.isPayableModalOpen.set(false);
  }

  protected savePayable(): void {
    if (!this.payableForm.supplier.trim() || !this.payableForm.description.trim()) {
      this.appState.triggerToast('Informe o fornecedor e a descrição antes de salvar.');
      return;
    }

    this.api
      .addPayable({
        supplier: this.payableForm.supplier,
        description: this.payableForm.description,
        nfeReference: this.payableForm.nfeReference || 'Doc Manual',
        dueDate: this.payableForm.dueDate,
        dueLabel: new Date(this.payableForm.dueDate + 'T00:00:00').toLocaleDateString('pt-BR'),
        amount: Number(this.payableForm.amount) || 0,
        paymentMethod: this.payableForm.paymentMethod,
        origin: this.payableForm.origin,
        category: this.payableForm.category,
      })
      .subscribe({
        next: () => {
          this.refreshPayables();
          this.isPayableModalOpen.set(false);
          this.appState.triggerToast('Novo lançamento de contas a pagar criado com sucesso.');
        },
        error: () => this.appState.triggerToast('Não foi possível salvar o lançamento. Tente novamente.'),
      });
  }

  // Contas a Receber
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

  protected receivableStatusClasses(status: AccountsReceivableTitle['status']): string {
    switch (status) {
      case 'vencido':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/30';
      case 'a_vencer':
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30';
      case 'recebido':
        return 'bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30';
    }
  }

  protected receivableTypeLabel(type: AccountsReceivableTitle['type']): string {
    switch (type) {
      case 'b2b':
        return 'B2B';
      case 'adquirente':
        return 'Adquirente';
      case 'evento':
        return 'Evento';
    }
  }

  protected settleReceivable(item: AccountsReceivableTitle): void {
    if (!this.appState.requirePermission(PERMISSION.ReceivablesSettle)) return;
    this.api.settleReceivable(item.id).subscribe({
      next: (updated) => {
        if (!updated) {
          this.appState.triggerToast('Não foi possível liquidar o título. Tente novamente.');
          return;
        }
        this.refreshReceivables();
        this.appState.triggerToast(`Título de "${item.clientOrOrigin}" marcado como recebido.`);
      },
      error: () => this.appState.triggerToast('Não foi possível liquidar o título. Tente novamente.'),
    });
  }

  protected openNewReceivableModal(): void {
    if (!this.appState.requirePermission(PERMISSION.ReceivablesCreate)) return;
    this.receivableForm = emptyReceivableForm();
    this.isReceivableModalOpen.set(true);
  }

  protected closeReceivableModal(): void {
    this.isReceivableModalOpen.set(false);
  }

  protected saveReceivable(): void {
    if (!this.receivableForm.clientOrOrigin.trim()) {
      this.appState.triggerToast('Informe o cliente ou origem antes de salvar.');
      return;
    }

    const gross = Number(this.receivableForm.grossAmount) || 0;
    const fee = Number(this.receivableForm.feeRetention) || 0;

    this.api
      .addReceivable({
        clientOrOrigin: this.receivableForm.clientOrOrigin,
        subCategory: this.receivableForm.subCategory || 'Venda a Prazo',
        reference: this.receivableForm.reference || undefined,
        dueDate: this.receivableForm.dueDate,
        dueLabel: new Date(this.receivableForm.dueDate + 'T00:00:00').toLocaleDateString('pt-BR'),
        grossAmount: gross,
        feeRetention: fee,
        netAmount: gross - fee,
        type: this.receivableForm.type,
        paymentModeDesc: this.receivableForm.paymentModeDesc,
      })
      .subscribe({
        next: () => {
          this.refreshReceivables();
          this.isReceivableModalOpen.set(false);
          this.appState.triggerToast('Novo lançamento de contas a receber criado com sucesso.');
        },
        error: () => this.appState.triggerToast('Não foi possível salvar o lançamento. Tente novamente.'),
      });
  }

  // Liquidação de Cartões
  protected cardStatusLabel(status: CardSettlementTitle['status']): string {
    switch (status) {
      case 'a_liquidar':
        return 'A Liquidar';
      case 'liquidado':
        return 'Liquidado';
      case 'antecipado':
        return 'Antecipado';
    }
  }

  protected cardStatusClasses(status: CardSettlementTitle['status']): string {
    switch (status) {
      case 'a_liquidar':
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30';
      case 'liquidado':
        return 'bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30';
      case 'antecipado':
        return 'bg-[#0F1F3D]/10 text-[#0F1F3D] border border-[#0F1F3D]/30';
    }
  }

  protected anticipateCard(item: CardSettlementTitle): void {
    if (!this.appState.requirePermission(PERMISSION.CardsAnticipate)) return;
    this.api.anticipateCardTitle(item.id).subscribe({
      next: () => {
        this.refreshCardSettlements();
        this.appState.triggerToast(`Recebível da ${item.acquirer} antecipado com sucesso.`);
      },
      error: () => this.appState.triggerToast('Não foi possível antecipar o recebível. Tente novamente.'),
    });
  }
}
