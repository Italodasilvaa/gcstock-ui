import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiDataService } from '../../core/services/api-data';
import { AppStateService } from '../../core/services/app-state';
import { PERMISSION } from '../../core/models/permissions';
import { AccountsPayableTitle, Employee } from '../../core/models/models';
import { DateRange, emptyDateRange, isWithinDateRange } from '../../core/utils/date-range';
import { DateRangeFilter } from '../../shared/date-range-filter/date-range-filter';

type ExpenseCategory = Exclude<AccountsPayableTitle['category'], 'compras'>;
/** Investimento = bem/melhoria duradoura (investimento, equipamento); Despesa = gasto do dia a dia ("outros"). */
type EntryKind = 'investimento' | 'despesa';

const CATEGORIES_BY_KIND: Record<EntryKind, { value: ExpenseCategory; label: string }[]> = {
  investimento: [
    { value: 'investimento', label: 'Investimento (reforma, melhoria, marketing...)' },
    { value: 'equipamento', label: 'Equipamento (freezer, balança, serra...)' },
  ],
  despesa: [{ value: 'outros', label: 'Despesa geral' }],
};

interface ExpenseFormModel {
  kind: EntryKind;
  description: string;
  supplier: string;
  category: ExpenseCategory;
  amount: number;
  dueDate: string;
}

function emptyExpenseForm(): ExpenseFormModel {
  return {
    kind: 'investimento',
    description: '',
    supplier: '',
    category: 'investimento',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
  };
}

/** Extrai a chave "aaaa-mm" de uma data ISO. */
function monthKeyFromIsoDate(isoDate: string): string | null {
  return !isoDate || isoDate.length < 7 ? null : isoDate.slice(0, 7);
}

@Component({
  selector: 'app-gestao-empresa',
  imports: [FormsModule, DatePipe, DateRangeFilter],
  templateUrl: './gestao-empresa.html',
})
export class GestaoEmpresa {
  private readonly api = inject(ApiDataService);
  private readonly appState = inject(AppStateService);
  protected readonly PERMISSION = PERMISSION;

  protected can(permission: string): boolean {
    return this.appState.can(permission);
  }
  private readonly router = inject(Router);

  protected readonly payables = signal<AccountsPayableTitle[]>([]);
  protected readonly employees = signal<Employee[]>([]);
  protected readonly isModalOpen = signal(false);
  protected form: ExpenseFormModel = emptyExpenseForm();

  /** Só os lançamentos que não são do Módulo Compras — investimento, equipamento e outras despesas gerais. */
  protected readonly expenses = computed(() =>
    this.payables()
      .filter((p) => p.category !== 'compras')
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

  private readonly currentMonthKey = new Date().toISOString().slice(0, 7);

  protected readonly investedThisMonth = computed(() =>
    this.expenses()
      .filter((e) => e.category === 'investimento' && monthKeyFromIsoDate(e.dueDate) === this.currentMonthKey)
      .reduce((sum, e) => sum + e.amount, 0),
  );

  protected readonly equipmentThisMonth = computed(() =>
    this.expenses()
      .filter((e) => e.category === 'equipamento' && monthKeyFromIsoDate(e.dueDate) === this.currentMonthKey)
      .reduce((sum, e) => sum + e.amount, 0),
  );

  protected readonly openExpensesTotal = computed(() =>
    this.expenses()
      .filter((e) => e.status !== 'pago')
      .reduce((sum, e) => sum + e.amount, 0),
  );

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.api.getPayables().subscribe((list) => this.payables.set(list));
    this.api.getEmployees().subscribe((list) => this.employees.set(list));
  }

  protected formatCurrency(value: number): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected categoryLabel(category: AccountsPayableTitle['category']): string {
    switch (category) {
      case 'equipamento':
        return 'Equipamento';
      case 'investimento':
        return 'Investimento';
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

  protected readonly categoriesByKind = CATEGORIES_BY_KIND;

  protected openNewExpenseModal(): void {
    if (!this.appState.requirePermission(PERMISSION.PayablesCreate)) return;
    this.form = emptyExpenseForm();
    this.isModalOpen.set(true);
  }

  /** Troca entre Investimento e Despesa e ajusta a categoria para uma válida do novo tipo. */
  protected setKind(kind: EntryKind): void {
    this.form.kind = kind;
    if (!CATEGORIES_BY_KIND[kind].some((c) => c.value === this.form.category)) {
      this.form.category = CATEGORIES_BY_KIND[kind][0].value;
    }
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  protected saveExpense(): void {
    if (!this.form.description.trim()) {
      this.appState.triggerToast(
        this.form.kind === 'investimento' ? 'Informe uma descrição para o investimento.' : 'Informe uma descrição para a despesa.',
      );
      return;
    }
    if (!this.form.amount || this.form.amount <= 0) {
      this.appState.triggerToast('Informe um valor maior que zero.');
      return;
    }

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
          this.appState.triggerToast(
            this.form.kind === 'investimento' ? 'Investimento registrado com sucesso.' : 'Despesa registrada com sucesso.',
          );
        },
        error: () => this.appState.triggerToast('Não foi possível salvar o lançamento. Tente novamente.'),
      });
  }

  protected settleExpense(item: AccountsPayableTitle): void {
    if (!this.appState.requirePermission(PERMISSION.PayablesSettle)) return;
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
