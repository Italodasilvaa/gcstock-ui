import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiDataService } from '../../core/services/api-data';
import { ConfirmService } from '../../core/services/confirm.service';
import { AppStateService } from '../../core/services/app-state';
import { PERMISSION } from '../../core/models/permissions';
import { HttpErrorResponse } from '@angular/common/http';
import { AccountsPayableTitle, CapitalContribution, CashMovement, CashSummary, Employee } from '../../core/models/models';
import { DateRange, emptyDateRange, isWithinDateRange, monthToDateRange } from '../../core/utils/date-range';
import { DateRangeFilter } from '../../shared/date-range-filter/date-range-filter';

type ExpenseCategory = 'outros' | 'equipamento';
/** Aporte = dinheiro que você colocou na empresa (entra no caixa, +); Despesa = gasto (sai do caixa, −), inclusive equipamento. */
type EntryKind = 'aporte' | 'despesa';

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'outros', label: 'Despesa geral (aluguel, energia, serviços...)' },
  { value: 'equipamento', label: 'Equipamento / reforma (freezer, balança, serra...)' },
];

interface ExpenseFormModel {
  kind: EntryKind;
  description: string;
  /** Aporte: quem colocou o dinheiro. Despesa: fornecedor. */
  supplier: string;
  category: ExpenseCategory;
  amount: number;
  /** Aporte: dia em que o dinheiro entrou. Despesa: vencimento. */
  dueDate: string;
  /** Só ao editar uma despesa já paga: data do pagamento. */
  paidDate: string;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function emptyExpenseForm(): ExpenseFormModel {
  return { kind: 'aporte', description: '', supplier: '', category: 'outros', amount: 0, dueDate: todayIso(), paidDate: '' };
}

@Component({
  selector: 'app-gestao-empresa',
  imports: [FormsModule, DatePipe, DateRangeFilter],
  templateUrl: './gestao-empresa.html',
})
export class GestaoEmpresa {
  private readonly api = inject(ApiDataService);
  private readonly confirmDialog = inject(ConfirmService);
  private readonly appState = inject(AppStateService);
  protected readonly PERMISSION = PERMISSION;

  protected can(permission: string): boolean {
    return this.appState.can(permission);
  }
  private readonly router = inject(Router);

  protected readonly payables = signal<AccountsPayableTitle[]>([]);
  protected readonly contributions = signal<CapitalContribution[]>([]);

  // ---- Caixa da empresa (regime de caixa): o que realmente entrou e saiu
  protected readonly cashRange = signal<DateRange>(monthToDateRange(todayIso().slice(0, 7)));
  protected readonly cash = signal<CashSummary | null>(null);
  protected readonly isLoadingCash = signal(false);
  /**
   * Caixa hoje + a receber + estoque (a custo) − o que ainda falta pagar. As compras já saíram do caixa na entrada,
   * então só as despesas em aberto são descontadas aqui.
   */
  protected readonly netWorth = computed(() => {
    const c = this.cash();
    return c ? c.currentBalance + c.toReceive + c.stockValue - (c.toPay - c.purchasesUnpaid) : 0;
  });
  protected readonly employees = signal<Employee[]>([]);
  protected readonly isModalOpen = signal(false);
  protected form: ExpenseFormModel = emptyExpenseForm();
  /** Preenchido ao editar um lançamento existente (aporte ou despesa); vazio = novo lançamento. */
  protected readonly editingId = signal<string | null>(null);
  protected editingPaid = false;

  /** Só os lançamentos que não são do Módulo Compras — equipamento e outras despesas gerais. */
  protected readonly expenses = computed(() =>
    this.payables()
      .filter((p) => p.category !== 'compras' && p.category !== 'investimento')
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
  );

  protected readonly dateRange = signal<DateRange>(emptyDateRange());

  /** Lista exibida na tabela, filtrada pelo vencimento dentro do período selecionado. */
  protected readonly filteredExpenses = computed(() =>
    this.expenses().filter((e) => isWithinDateRange(e.dueDate, this.dateRange())),
  );

  protected readonly filteredExpensesTotal = computed(() =>
    this.filteredExpenses().reduce((sum, e) => sum + e.amount, 0),
  );

  protected readonly activeEmployees = computed(() => this.employees().filter((e) => e.active));

  protected readonly totalMonthlyPayroll = computed(() =>
    this.activeEmployees().reduce((sum, e) => sum + e.salary, 0),
  );

  protected readonly openExpensesTotal = computed(() =>
    this.expenses()
      .filter((e) => e.status !== 'pago')
      .reduce((sum, e) => sum + e.amount, 0),
  );

  constructor() {
    this.refresh();
    effect(() => this.loadCash(this.cashRange()));
  }

  private refresh(): void {
    this.api.getPayables().subscribe((list) => this.payables.set(list));
    this.api.getEmployees().subscribe((list) => this.employees.set(list));
    this.api.getContributions().subscribe((list) => this.contributions.set(list));
    this.loadCash(this.cashRange());
  }

  private loadCash(range: DateRange): void {
    if (!range.from || !range.to) return;
    this.isLoadingCash.set(true);
    this.api.getCash(range.from, range.to).subscribe({
      next: (summary) => {
        this.cash.set(summary);
        this.isLoadingCash.set(false);
      },
      error: () => this.isLoadingCash.set(false),
    });
  }

  protected movementLabel(kind: CashMovement['kind']): string {
    switch (kind) {
      case 'aporte':
        return 'Aporte';
      case 'venda':
        return 'Venda';
      case 'recebimento':
        return 'Recebimento';
      case 'compra':
        return 'Compra';
      case 'equipamento':
        return 'Equipamento';
      case 'despesa':
        return 'Despesa';
    }
  }

  protected async deleteContribution(item: CapitalContribution): Promise<void> {
    if (!this.appState.requirePermission(PERMISSION.CapitalManage)) return;
    const confirmed = await this.confirmDialog.ask({
      title: 'Excluir aporte?',
      message: 'O valor sai do caixa. Essa ação não pode ser desfeita.',
      detail: `${item.description} • ${this.formatCurrency(item.amount)}`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.deleteContribution(item.id).subscribe({
      next: () => {
        this.refresh();
        this.appState.triggerToast('Aporte excluído.');
      },
      error: (err: HttpErrorResponse) => {
        if (err.status !== 403) this.appState.triggerToast('Não foi possível excluir o aporte.');
      },
    });
  }

  protected formatCurrency(value: number): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected categoryLabel(category: AccountsPayableTitle['category']): string {
    switch (category) {
      case 'equipamento':
        return 'Equipamento';
      case 'investimento':
        return 'Aporte';
      case 'compras':
        return 'Compras';
      case 'outros':
        return 'Despesa';
    }
  }

  protected categoryBadgeClass(category: AccountsPayableTitle['category']): string {
    switch (category) {
      case 'investimento':
        return 'bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30';
      case 'equipamento':
        return 'bg-[#0F1F3D]/10 text-[#0F1F3D] border border-[#0F1F3D]/30';
      default:
        return 'bg-[#827565]/10 text-[#827565] border border-[#827565]/30';
    }
  }

  protected statusLabel(status: AccountsPayableTitle['status']): string {
    switch (status) {
      case 'vencido':
        return 'Vencido';
      case 'a_vencer':
        return 'A Vencer';
      case 'pago':
        return 'Pago';
    }
  }

  protected statusClasses(status: AccountsPayableTitle['status']): string {
    switch (status) {
      case 'vencido':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/30';
      case 'a_vencer':
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30';
      case 'pago':
        return 'bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30';
    }
  }

  protected readonly expenseCategories = EXPENSE_CATEGORIES;
  protected readonly today = todayIso();

  protected openEditExpense(item: AccountsPayableTitle): void {
    if (!this.appState.requirePermission(PERMISSION.PayablesEdit)) return;
    this.form = {
      kind: 'despesa',
      description: item.description,
      supplier: item.supplier,
      category: item.category === 'equipamento' ? 'equipamento' : 'outros',
      amount: item.amount,
      dueDate: item.dueDate.slice(0, 10),
      paidDate: item.paidDate ? item.paidDate.slice(0, 10) : '',
    };
    this.editingPaid = item.status === 'pago';
    this.editingId.set(item.id);
    this.isModalOpen.set(true);
  }

  protected openEditContribution(item: CapitalContribution): void {
    if (!this.appState.requirePermission(PERMISSION.CapitalManage)) return;
    this.form = {
      kind: 'aporte',
      description: item.description,
      supplier: item.source,
      category: 'outros',
      amount: item.amount,
      dueDate: item.date.slice(0, 10),
      paidDate: '',
    };
    this.editingPaid = false;
    this.editingId.set(item.id);
    this.isModalOpen.set(true);
  }

  protected openNewExpenseModal(): void {
    this.editingId.set(null);
    this.editingPaid = false;
    const kind: EntryKind = this.can(PERMISSION.CapitalManage) ? 'aporte' : 'despesa';
    if (!this.can(PERMISSION.CapitalManage) && !this.appState.requirePermission(PERMISSION.PayablesCreate)) return;
    this.form = { ...emptyExpenseForm(), kind };
    this.isModalOpen.set(true);
  }

  /** Troca entre Aporte (entra no caixa) e Despesa (sai do caixa). */
  protected setKind(kind: EntryKind): void {
    this.form.kind = kind;
    this.form.category = 'outros';
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  protected saveExpense(): void {
    if (!this.form.description.trim()) {
      this.appState.triggerToast(
        this.form.kind === 'aporte' ? 'Informe uma descrição para o aporte.' : 'Informe uma descrição para a despesa.',
      );
      return;
    }
    if (!this.form.amount || this.form.amount <= 0) {
      this.appState.triggerToast('Informe um valor maior que zero.');
      return;
    }

    const editId = this.editingId();

    if (this.form.kind === 'aporte' && editId) {
      if (!this.appState.requirePermission(PERMISSION.CapitalManage)) return;
      this.api
        .updateContribution(editId, {
          description: this.form.description.trim(),
          source: this.form.supplier.trim() || undefined,
          amount: Number(this.form.amount),
          date: this.form.dueDate || undefined,
        })
        .subscribe({
          next: () => {
            this.refresh();
            this.isModalOpen.set(false);
            this.appState.triggerToast('Aporte atualizado.');
          },
          error: (err: HttpErrorResponse) => {
            if (err.status !== 403) this.appState.triggerToast(err.error?.message ?? 'Não foi possível atualizar o aporte.');
          },
        });
      return;
    }

    if (this.form.kind === 'despesa' && editId) {
      if (!this.appState.requirePermission(PERMISSION.PayablesEdit)) return;
      this.api
        .updatePayable(editId, {
          supplier: this.form.supplier.trim() || undefined,
          description: this.form.description.trim(),
          amount: Number(this.form.amount),
          category: this.form.category,
          dueDate: this.editingPaid ? undefined : this.form.dueDate,
          issueDate: this.editingPaid ? undefined : this.form.dueDate,
          paidDate: this.editingPaid && this.form.paidDate ? this.form.paidDate : undefined,
        })
        .subscribe({
          next: () => {
            this.refresh();
            this.isModalOpen.set(false);
            this.appState.triggerToast('Lançamento atualizado.');
          },
          error: (err: HttpErrorResponse) => {
            if (err.status !== 403) this.appState.triggerToast(err.error?.message ?? 'Não foi possível atualizar o lançamento.');
          },
        });
      return;
    }

    if (this.form.kind === 'aporte') {
      if (!this.appState.requirePermission(PERMISSION.CapitalManage)) return;
      this.api
        .addContribution({
          description: this.form.description.trim(),
          source: this.form.supplier.trim() || undefined,
          amount: Number(this.form.amount),
          date: this.form.dueDate || undefined,
        })
        .subscribe({
          next: () => {
            this.refresh();
            this.isModalOpen.set(false);
            this.appState.triggerToast('Aporte registrado: entrou no caixa.');
          },
          error: (err: HttpErrorResponse) => {
            if (err.status === 403) return;
            this.appState.triggerToast(err.error?.message ?? 'Não foi possível registrar o aporte.');
          },
        });
      return;
    }

    if (!this.appState.requirePermission(PERMISSION.PayablesCreate)) return;

    this.api
      .addPayable({
        supplier: this.form.supplier || 'Gestão da Empresa',
        description: this.form.description,
        nfeReference: 'Doc Manual',
        dueDate: this.form.dueDate,
        dueLabel: new Date(this.form.dueDate + 'T00:00:00').toLocaleDateString('pt-BR'),
        amount: Number(this.form.amount) || 0,
        paymentMethod: 'Boleto Bancário',
        origin: 'Gestão da Empresa',
        category: this.form.category,
      })
      .subscribe({
        next: () => {
          this.refresh();
          this.isModalOpen.set(false);
          this.appState.triggerToast('Despesa registrada. Ela sai do caixa quando você der baixa.');
        },
        error: () => this.appState.triggerToast('Não foi possível salvar o lançamento. Tente novamente.'),
      });
  }

  /** Equipamento/maquinário comprado com o capital não pesa no resultado (lucro); despesa geral pesa. */
  protected async changeCategory(item: AccountsPayableTitle, category: 'equipamento' | 'outros'): Promise<void> {
    if (item.category === category) {
      this.refresh();
      return;
    }
    if (!this.appState.requirePermission(PERMISSION.PayablesCreate)) {
      this.refresh();
      return;
    }
    const confirmed = await this.confirmDialog.ask({
      title: category === 'equipamento' ? 'Mudar para equipamento?' : 'Mudar para despesa geral?',
      message:
        category === 'equipamento'
          ? 'Deixa de pesar no resultado (lucro); continua saindo do caixa.'
          : 'Passa a pesar no resultado (lucro) como despesa.',
      detail: item.description,
      confirmLabel: 'Mudar categoria',
      tone: 'warning',
      icon: 'swap_horiz',
    });
    if (!confirmed) {
      this.refresh();
      return;
    }
    this.api.changePayableCategory(item.id, category).subscribe({
      next: () => {
        this.refresh();
        this.appState.triggerToast(
          category === 'equipamento'
            ? `"${item.description}" agora é equipamento: não entra como despesa no resultado.`
            : `"${item.description}" agora é despesa geral: entra no resultado.`,
        );
      },
      error: (err: HttpErrorResponse) => {
        if (err.status !== 403) this.appState.triggerToast(err.error?.message ?? 'Não foi possível mudar a categoria.');
      },
    });
  }

  protected async deleteExpense(item: AccountsPayableTitle): Promise<void> {
    if (!this.appState.requirePermission(PERMISSION.PayablesDelete)) return;
    const confirmed = await this.confirmDialog.ask({
      title: 'Excluir lançamento?',
      message:
        item.status === 'pago'
          ? 'Ele já foi pago: o valor volta para o caixa. Essa ação não pode ser desfeita.'
          : 'Essa ação não pode ser desfeita.',
      detail: `${item.description} • ${this.formatCurrency(item.amount)}`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!confirmed) return;

    this.api.deletePayable(item.id).subscribe({
      next: () => {
        this.refresh();
        this.appState.triggerToast('Lançamento excluído.');
      },
      error: (err: HttpErrorResponse) => {
        if (err.status !== 403) this.appState.triggerToast(err.error?.message ?? 'Não foi possível excluir o lançamento.');
      },
    });
  }

  protected async settleExpense(item: AccountsPayableTitle): Promise<void> {
    if (!this.appState.requirePermission(PERMISSION.PayablesSettle)) return;
    const confirmed = await this.confirmDialog.ask({
      title: 'Dar baixa neste lançamento?',
      message: 'Ele será marcado como pago hoje e sai do caixa.',
      detail: `${item.description} • ${this.formatCurrency(item.amount)}`,
      confirmLabel: 'Dar baixa',
      tone: 'warning',
      icon: 'check_circle',
    });
    if (!confirmed) return;
    this.api.settlePayable(item.id, 'Conta Padrão', 'Manual').subscribe({
      next: (updated) => {
        if (!updated) {
          this.appState.triggerToast('Não foi possível dar baixa. Tente novamente.');
          return;
        }
        this.refresh();
        this.appState.triggerToast(`"${item.description}" baixado com sucesso.`);
      },
      error: () => this.appState.triggerToast('Não foi possível dar baixa. Tente novamente.'),
    });
  }

  protected goToMonthlyClosing(): void {
    this.router.navigateByUrl('/fechamento-mensal');
  }

  protected goToEmployees(): void {
    this.router.navigateByUrl('/configuracoes');
  }
}
