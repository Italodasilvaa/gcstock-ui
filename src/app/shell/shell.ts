import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { Navbar } from './navbar/navbar';
import { ApiConsole } from '../features/api-console/api-console';
import { AppStateService } from '../core/services/app-state';
import { MockDataService } from '../core/services/mock-data';
import { CompanyTenant } from '../core/models/models';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, Navbar, ApiConsole],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly router = inject(Router);
  private readonly mockData = inject(MockDataService);
  protected readonly appState = inject(AppStateService);

  protected readonly isCompanyModalOpen = signal(false);
  protected readonly showApiConsole = signal(false);
  protected readonly companies = signal<CompanyTenant[]>(this.mockData.getCompanies());

  constructor() {
    this.mockData.change$.subscribe(() => {
      this.companies.set(this.mockData.getCompanies());
    });
  }

  protected isCurrentCompany(company: CompanyTenant): boolean {
    return company.id === this.appState.session()?.company.id;
  }

  protected switchCompany(companyId: string): void {
    const updated = this.mockData.switchCompany(companyId);
    if (updated) {
      this.isCompanyModalOpen.set(false);
      this.appState.triggerToast(`Ambiente alterado para ${updated.company.tradeName}!`);
    }
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
