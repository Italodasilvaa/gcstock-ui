import { Component, OnDestroy, inject, signal } from '@angular/core';
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
  imports: [RouterOutlet, Sidebar, Navbar, ApiConsole],
  templateUrl: './shell.html',
})
export class Shell implements OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(ApiDataService);
  protected readonly appState = inject(AppStateService);
  protected readonly idleSession = inject(IdleSessionService);

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
    this.appState.switchCompany(companyId).subscribe((updated) => {
      if (updated) {
        this.isCompanyModalOpen.set(false);
        this.refreshCompanies();
        this.appState.triggerToast(`Ambiente alterado para ${updated.company.tradeName}!`);
      } else {
        this.appState.triggerToast('Não foi possível trocar de empresa. Tente novamente.');
      }
    });
  }

  protected registerNewCompany(): void {
    this.isCompanyModalOpen.set(false);
    this.logout();
  }

  protected logout(): void {
    this.appState.logout();
    this.router.navigateByUrl('/login');
  }
}
