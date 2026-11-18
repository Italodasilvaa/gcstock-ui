import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { Navbar } from './navbar/navbar';
import { ApiConsole } from '../features/api-console/api-console';
import { AppStateService } from '../core/services/app-state';
import { ApiDataService } from '../core/services/api-data';
import { IdleSessionService } from '../core/services/idle-session';
import { CompanyTenant } from '../core/models/models';

@Component({
  selector: 'app-shell',
  imports: [FormsModule, RouterOutlet, Sidebar, Navbar, ApiConsole],
  templateUrl: './shell.html',
})
export class Shell implements OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(ApiDataService);
  protected readonly appState = inject(AppStateService);
  protected readonly idleSession = inject(IdleSessionService);

  protected readonly activeCompanyId = computed(() => this.appState.session()?.company.id ?? '');
  protected readonly isCompanyModalOpen = signal(false);
  protected readonly showApiConsole = signal(false);
  protected readonly isMobileMenuOpen = signal(false);
  /** Só as empresas do mesmo Administrator (dono) da sessão ativa — um funcionário só tem a sua. */
  protected readonly companies = signal<CompanyTenant[]>([]);

  constructor() {
    this.refreshCompanies();
    this.idleSession.start();
  }

  ngOnDestroy(): void {
    this.idleSession.stop();
  }

  protected formatCountdown(): string {
    const total = this.idleSession.secondsRemaining();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private refreshCompanies(): void {
    this.api.getMyCompanies().subscribe((companies) => this.companies.set(companies));
  }

  /** Só o dono/administrador pode trocar ou cadastrar empresas — funcionário fica vinculado à empresa dele. */
  protected readonly isOwnerSession = () => !this.appState.session()?.user.employeeId;

  protected openCompanySwitch(): void {
    if (this.isOwnerSession()) {
      this.refreshCompanies();
      this.isCompanyModalOpen.set(true);
    }
  }

  protected isCurrentCompany(company: CompanyTenant): boolean {
    return company.id === this.appState.session()?.company.id;
  }

  protected switchCompany(companyId: string): void {
    this.appState.switchCompany(companyId).subscribe({
      next: (updated) => {
        if (updated) {
          this.isCompanyModalOpen.set(false);
          this.refreshCompanies();
          this.appState.triggerToast(`Ambiente alterado para ${updated.company.tradeName}!`);
        } else {
          this.appState.triggerToast('Não foi possível trocar de empresa: só o dono pode trocar, entre empresas do mesmo grupo.');
        }
      },
      error: (err: { error?: { message?: string } }) =>
        this.appState.triggerToast(err?.error?.message ?? 'Não foi possível trocar de empresa. Tente novamente.'),
    });
  }

  // ---------------------------------------------------------------- cadastrar nova empresa (sem sair do app)
  protected readonly segments = [
    'Açougue Boutique & Carnes Nobres',
    'Casa de Carnes & Cortes Nobres',
    'Frigorífico & Distribuidora B2B',
    'Steakhouse & Restaurante',
  ];
  protected readonly isNewCompanyFormOpen = signal(false);
  protected readonly isSavingCompany = signal(false);
  protected readonly newCompanyError = signal<string | null>(null);
  protected newCompany = this.emptyNewCompany();

  private emptyNewCompany() {
    return {
      corporateName: '',
      tradeName: '',
      document: '',
      phone: '',
      segment: 'Açougue Boutique & Carnes Nobres',
      city: '',
      state: 'SP',
      ownerPassword: '',
    };
  }

  /**
   * Abre o cadastro dentro do app. Antes isto fazia logout e mandava para a tela de login.
   * A API vincula a nova empresa ao mesmo dono quando recebe o e-mail dele com a senha atual,
   * por isso pedimos a confirmação da senha.
   */
  protected registerNewCompany(): void {
    if (!this.isOwnerSession()) return;
    this.newCompany = this.emptyNewCompany();
    this.newCompanyError.set(null);
    this.isCompanyModalOpen.set(false);
    this.isNewCompanyFormOpen.set(true);
  }

  protected closeNewCompanyForm(): void {
    if (this.isSavingCompany()) return;
    this.isNewCompanyFormOpen.set(false);
  }

  protected saveNewCompany(): void {
    const session = this.appState.session();
    const form = this.newCompany;
    if (!session) return;
    if (!form.corporateName.trim() || !form.document.trim()) {
      this.newCompanyError.set('Preencha a razão social e o CNPJ/CPF.');
      return;
    }
    if (!form.ownerPassword) {
      this.newCompanyError.set('Confirme sua senha para cadastrar a empresa.');
      return;
    }

    this.newCompanyError.set(null);
    this.isSavingCompany.set(true);
    this.appState
      .registerCompany({
        corporateName: form.corporateName.trim(),
        tradeName: form.tradeName.trim() || form.corporateName.trim(),
        document: form.document.trim(),
        ownerName: session.user.name,
        email: session.user.email,
        password: form.ownerPassword,
        phone: form.phone.trim() || session.company.phone,
        segment: form.segment,
        city: form.city.trim() || session.company.city,
        state: form.state,
        employees: [],
      })
      .subscribe({
        next: (created) => {
          this.isSavingCompany.set(false);
          this.isNewCompanyFormOpen.set(false);
          this.refreshCompanies();
          this.router.navigateByUrl('/dashboard');
          this.appState.triggerToast(`Empresa ${created.company.tradeName} cadastrada. Você já está nela.`);
        },
        error: (err: { status?: number; error?: { message?: string } }) => {
          this.isSavingCompany.set(false);
          this.newCompanyError.set(
            err?.status === 403
              ? 'Senha incorreta. Informe a senha que você usa para entrar no GC Stock.'
              : err?.status === 429
                ? (err.error?.message ?? 'Muitas tentativas. Tente novamente em alguns minutos.')
                : 'Não foi possível cadastrar a empresa. Tente novamente.',
          );
        },
      });
  }

  protected logout(): void {
    this.appState.logout();
    this.router.navigateByUrl('/login');
  }
}
