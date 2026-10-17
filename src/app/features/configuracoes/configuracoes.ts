import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiDataService } from '../../core/services/api-data';
import { ConfirmService } from '../../core/services/confirm.service';
import { AppStateService } from '../../core/services/app-state';
import { PERMISSION } from '../../core/models/permissions';
import { IconPicker } from '../../shared/icon-picker/icon-picker';
import { PaymentFeeSetting, GlobalAlertSetting, Employee, CompanyTenant, PermissionInfo } from '../../core/models/models';

interface EmployeeFormModel {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: Employee['role'];
  active: boolean;
  salary: number;
  permissions: string[];
}

function emptyEmployeeForm(): EmployeeFormModel {
  return { name: '', email: '', password: '', role: 'operador', active: true, salary: 0, permissions: [] };
}

@Component({
  selector: 'app-configuracoes',
  imports: [FormsModule, IconPicker],
  templateUrl: './configuracoes.html',
})
export class Configuracoes {
  private readonly api = inject(ApiDataService);
  private readonly confirmDialog = inject(ConfirmService);
  private readonly appState = inject(AppStateService);
  protected readonly PERMISSION = PERMISSION;

  protected can(permission: string): boolean {
    return this.appState.can(permission);
  }

  protected readonly fees = signal<PaymentFeeSetting[]>([]);
  /** Catálogo de permissões configuráveis por funcionário (GET /permissoes). */
  protected readonly permissionCatalog = signal<PermissionInfo[]>([]);
  /** Catálogo agrupado por tela, na ordem em que a API devolve. */
  protected readonly permissionGroups = computed(() => {
    const groups = new Map<string, PermissionInfo[]>();
    for (const permission of this.permissionCatalog()) {
      const list = groups.get(permission.group) ?? [];
      list.push(permission);
      groups.set(permission.group, list);
    }
    return [...groups].map(([name, items]) => ({ name, items }));
  });
  protected readonly editingFee = signal<PaymentFeeSetting | null>(null);
  protected readonly isNewFee = signal(false);
  protected readonly isReorderingFees = signal(false);

  protected alertForm: GlobalAlertSetting = {
    alertLeadDays: 3,
    morningSummaryTime: '07:30',
    notifyTopbar: true,
    notifyEmail: true,
    notifyWhatsapp: true,
    recipients: [],
  };
  protected readonly newRecipient = signal('');

  protected readonly employees = signal<Employee[]>([]);
  protected readonly isEmployeeModalOpen = signal(false);
  protected employeeForm: EmployeeFormModel = emptyEmployeeForm();

  /** Outras empresas do mesmo Administrator (dono) — só existe transferência se houver mais de uma. */
  protected readonly siblingCompanies = signal<CompanyTenant[]>([]);
  protected readonly isOwnerSession = !this.appState.session()?.user.employeeId;
  protected readonly transferringEmployee = signal<Employee | null>(null);
  protected transferTargetCompanyId = '';

  constructor() {
    this.api.getFees().subscribe((list) => this.fees.set(list));
    this.api.getAlertConfig().subscribe((config) => (this.alertForm = config));
    this.refreshEmployees();
    this.api.getPermissions().subscribe((list) => this.permissionCatalog.set(list));

    const currentCompanyId = this.appState.session()?.company.id;
    this.api
      .getMyCompanies()
      .subscribe((companies) => this.siblingCompanies.set(companies.filter((c) => c.id !== currentCompanyId)));
  }

  private refreshEmployees(): void {
    this.api.getEmployees().subscribe((list) => this.employees.set(list));
  }

  protected onFeeUpdated(fee: PaymentFeeSetting): void {
    this.api.updateFee(fee.id, fee.feePercent, fee.active).subscribe({
      next: () => this.appState.triggerToast(`Taxa de "${fee.method}" atualizada com sucesso.`),
      error: () => this.appState.triggerToast('Não foi possível atualizar a taxa. Tente novamente.'),
    });
  }

  /** Troca a taxa de posição com a vizinha e salva a nova ordem (é a mesma ordem dos cards no PDV). */
  protected moveFee(index: number, delta: -1 | 1): void {
    if (!this.appState.requirePermission(PERMISSION.FeesEdit)) return;
    const previous = this.fees();
    const target = index + delta;
    if (target < 0 || target >= previous.length) return;

    const reordered = [...previous];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    this.fees.set(reordered);
    this.isReorderingFees.set(true);

    this.api.reorderFees(reordered.map((f) => f.id)).subscribe({
      next: (saved) => {
        this.fees.set(saved);
        this.isReorderingFees.set(false);
      },
      error: () => {
        this.fees.set(previous);
        this.isReorderingFees.set(false);
        this.appState.triggerToast('Não foi possível salvar a nova ordem. Tente novamente.');
      },
    });
  }

  protected toggleFeeActive(fee: PaymentFeeSetting): void {
    if (!this.appState.requirePermission(PERMISSION.FeesEdit)) return;
    fee.active = !fee.active;
    this.onFeeUpdated(fee);
  }

  protected openNewFeeModal(): void {
    if (!this.appState.requirePermission(PERMISSION.FeesCreate)) return;
    this.isNewFee.set(true);
    this.editingFee.set({
      id: '',
      method: '',
      subtitle: '',
      channel: '',
      feePercent: 0,
      fixedFee: 0,
      settlementTerm: '',
      active: true,
      icon: 'credit_card',
    });
  }

  protected async removeFee(fee: PaymentFeeSetting): Promise<void> {
    if (!this.appState.requirePermission(PERMISSION.FeesDelete)) return;
    const confirmed = await this.confirmDialog.ask({
      title: 'Excluir forma de pagamento?',
      message: 'Ela deixa de aparecer no PDV. Vendas já feitas não mudam.',
      detail: fee.method,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.deleteFee(fee.id).subscribe({
      next: () => {
        this.api.getFees().subscribe((list) => this.fees.set(list));
        this.appState.triggerToast(`Forma de pagamento "${fee.method}" excluída.`);
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        if (err.status !== 403) this.appState.triggerToast(err.error?.message ?? 'Não foi possível excluir a forma de pagamento.');
      },
    });
  }

  protected openEditFeeModal(fee: PaymentFeeSetting): void {
    if (!this.appState.requirePermission(PERMISSION.FeesEdit)) return;
    this.isNewFee.set(false);
    this.editingFee.set({ ...fee });
  }

  protected closeEditFeeModal(): void {
    this.editingFee.set(null);
  }

  protected saveEditingFee(): void {
    const fee = this.editingFee();
    if (!fee) return;

    if (!fee.method.trim() || !fee.channel.trim()) {
      this.appState.triggerToast('Preencha ao menos o método e o canal/adquirente.');
      return;
    }

    if (this.isNewFee()) {
      const { id: _id, ...newFee } = fee;
      this.api.addFee(newFee).subscribe({
        next: (saved) => {
          this.fees.set([...this.fees(), saved]);
          this.appState.triggerToast(`Taxa de "${saved.method}" cadastrada com sucesso.`);
          this.closeEditFeeModal();
        },
        error: () => this.appState.triggerToast('Não foi possível cadastrar a taxa. Tente novamente.'),
      });
      return;
    }

    this.api.saveFee(fee).subscribe({
      next: (saved) => {
        this.fees.set(this.fees().map((f) => (f.id === saved.id ? saved : f)));
        this.appState.triggerToast(`Taxa de "${saved.method}" atualizada com sucesso.`);
        this.closeEditFeeModal();
      },
      error: () => this.appState.triggerToast('Não foi possível salvar a taxa. Tente novamente.'),
    });
  }

  protected addRecipient(): void {
    const value = this.newRecipient().trim();
    if (!value) {
      return;
    }
    this.alertForm.recipients = [...this.alertForm.recipients, value];
    this.newRecipient.set('');
  }

  protected removeRecipient(index: number): void {
    this.alertForm.recipients = this.alertForm.recipients.filter((_, i) => i !== index);
  }

  protected saveAlertConfig(): void {
    if (!this.appState.requirePermission(PERMISSION.AlertsEdit)) return;
    this.api.updateAlertConfig(this.alertForm).subscribe({
      next: () => this.appState.triggerToast('Configurações de alertas sanitários salvas com sucesso.'),
      error: () => this.appState.triggerToast('Não foi possível salvar as configurações. Tente novamente.'),
    });
  }

  // Funcionários
  protected roleLabel(role: Employee['role']): string {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'gerente':
        return 'Gerente';
      case 'operador':
        return 'Operador';
    }
  }

  protected openNewEmployeeModal(): void {
    if (!this.appState.requirePermission(PERMISSION.EmployeesCreate)) return;
    this.employeeForm = emptyEmployeeForm();
    this.isEmployeeModalOpen.set(true);
  }

  protected openEditEmployeeModal(employee: Employee): void {
    if (!this.appState.requirePermission(PERMISSION.EmployeesEdit)) return;
    this.employeeForm = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      password: '',
      role: employee.role,
      active: employee.active,
      salary: employee.salary,
      permissions: [...(employee.permissions ?? [])],
    };
    this.isEmployeeModalOpen.set(true);
  }

  /** Só o dono da empresa pode conceder ou retirar permissões; para os demais a seção fica oculta. */
  protected canManagePermissions(): boolean {
    return this.appState.isOwner();
  }

  protected hasEmployeePermission(key: string): boolean {
    return this.employeeForm.permissions.includes(key);
  }

  /** Quantas permissões do grupo estão marcadas. */
  protected groupSelectedCount(items: PermissionInfo[]): number {
    return items.filter((p) => this.hasEmployeePermission(p.key)).length;
  }

  /** Marca ou desmarca todas as permissões de uma tela de uma vez. */
  protected toggleGroup(items: PermissionInfo[], checked: boolean): void {
    const keys = new Set(items.map((p) => p.key));
    const others = this.employeeForm.permissions.filter((p) => !keys.has(p));
    this.employeeForm.permissions = checked ? [...others, ...keys] : others;
  }

  protected toggleEmployeePermission(key: string, checked: boolean): void {
    const current = this.employeeForm.permissions.filter((p) => p !== key);
    this.employeeForm.permissions = checked ? [...current, key] : current;
  }

  protected closeEmployeeModal(): void {
    this.isEmployeeModalOpen.set(false);
  }

  protected saveEmployee(): void {
    if (!this.employeeForm.name.trim() || !this.employeeForm.email.trim()) {
      this.appState.triggerToast('Informe nome e e-mail do funcionário.');
      return;
    }

    this.api
      .saveEmployee({
        id: this.employeeForm.id,
        name: this.employeeForm.name,
        email: this.employeeForm.email,
        password: this.employeeForm.password || undefined,
        role: this.employeeForm.role,
        active: this.employeeForm.active,
        salary: this.employeeForm.salary,
        // Só o dono envia permissões (a API recusa de outros usuários); sem o campo, as atuais são mantidas.
        permissions: this.canManagePermissions() ? this.employeeForm.permissions : undefined,
      })
      .subscribe({
        next: (saved) => {
          this.refreshEmployees();
          this.appState.triggerToast(`Funcionário "${saved.name}" salvo com sucesso. Ele já pode entrar com o e-mail e a senha cadastrados.`);
          this.closeEmployeeModal();
        },
        error: () => this.appState.triggerToast('Não foi possível salvar o funcionário. Tente novamente.'),
      });
  }

  protected toggleEmployeeActive(employee: Employee): void {
    if (!this.appState.requirePermission(PERMISSION.EmployeesEdit)) return;
    const nextActive = !employee.active;
    this.api
      .saveEmployee({ id: employee.id, name: employee.name, email: employee.email, active: nextActive })
      .subscribe({
        next: () => {
          this.refreshEmployees();
          this.appState.triggerToast(
            nextActive ? `Acesso de "${employee.name}" reativado.` : `Acesso de "${employee.name}" desativado.`,
          );
        },
        error: () => this.appState.triggerToast('Não foi possível atualizar o acesso. Tente novamente.'),
      });
  }

  protected async removeEmployee(employee: Employee): Promise<void> {
    if (!this.appState.requirePermission(PERMISSION.EmployeesDelete)) return;
    const confirmed = await this.confirmDialog.ask({
      title: 'Remover funcionário?',
      message: 'O acesso dele ao sistema será removido. Essa ação não pode ser desfeita.',
      detail: employee.name,
      confirmLabel: 'Remover',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.deleteEmployee(employee.id).subscribe({
      next: () => {
        this.refreshEmployees();
        this.appState.triggerToast(`Funcionário "${employee.name}" removido.`);
      },
      error: () => this.appState.triggerToast('Não foi possível remover o funcionário. Tente novamente.'),
    });
  }

  // Transferência de funcionário entre empresas do mesmo Administrator (mesmo grupo)
  protected openTransferModal(employee: Employee): void {
    this.transferTargetCompanyId = this.siblingCompanies()[0]?.id ?? '';
    this.transferringEmployee.set(employee);
  }

  protected closeTransferModal(): void {
    this.transferringEmployee.set(null);
  }

  protected confirmTransfer(): void {
    const employee = this.transferringEmployee();
    if (!employee || !this.transferTargetCompanyId) return;

    const targetCompany = this.siblingCompanies().find((c) => c.id === this.transferTargetCompanyId);
    this.api.transferEmployee(employee.id, this.transferTargetCompanyId).subscribe((updated) => {
      if (!updated) {
        this.appState.triggerToast('Não foi possível transferir: a empresa de destino precisa ser do mesmo administrador.');
        return;
      }

      this.refreshEmployees();
      this.appState.triggerToast(
        `"${employee.name}" foi transferido para ${targetCompany?.tradeName ?? 'a empresa selecionada'}.`,
      );
      this.closeTransferModal();
    });
  }
}
