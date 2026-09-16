import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppStateService } from '../../core/services/app-state';
import { MockDataService } from '../../core/services/mock-data';
import { CompanyTenant } from '../../core/models/models';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class Login {
  private readonly mockData = inject(MockDataService);
  private readonly appState = inject(AppStateService);
  private readonly router = inject(Router);

  protected readonly activeTab = signal<'login' | 'register'>('login');
  protected readonly companies = signal<CompanyTenant[]>(this.mockData.getCompanies());

  // Login state
  protected loginEmail = '';
  protected loginPassword = '';
  protected rememberMe = true;
  protected readonly loginError = signal<string | null>(null);

  // Register state
  protected corporateName = '';
  protected tradeName = '';
  protected document = '';
  protected ownerName = '';
  protected email = '';
  protected phone = '';
  protected password = '';
  protected segment = 'Açougue Boutique & Carnes Nobres';
  protected city = '';
  protected stateUf = 'SP';
  protected readonly isRegistering = signal(false);

  protected handleLogin(): void {
    this.loginError.set(null);

    if (!this.loginEmail) {
      this.loginError.set('Informe o e-mail de acesso da sua empresa.');
      return;
    }

    const session = this.mockData.login(this.loginEmail, this.loginPassword);
    if (session) {
      this.appState.triggerToast(`Bem-vindo ao Girus, ${session.company.tradeName}!`);
      this.router.navigateByUrl('/dashboard');
    } else {
      this.loginError.set('E-mail não localizado. Crie o cadastro da sua empresa na aba ao lado.');
    }
  }

  protected handleQuickLoginCompany(comp: CompanyTenant): void {
    const session = this.mockData.login(comp.email, comp.password);
    if (session) {
      this.appState.triggerToast(`Bem-vindo ao Girus, ${session.company.tradeName}!`);
      this.router.navigateByUrl('/dashboard');
    }
  }

  protected handleRegisterCompany(): void {
    if (!this.corporateName || !this.document || !this.ownerName || !this.email) {
      alert('Preencha os campos obrigatórios para cadastrar sua empresa.');
      return;
    }

    this.isRegistering.set(true);

    setTimeout(() => {
      const session = this.mockData.registerCompany({
        corporateName: this.corporateName,
        tradeName: this.tradeName || this.corporateName,
        document: this.document,
        ownerName: this.ownerName,
        email: this.email,
        password: this.password || '123456',
        phone: this.phone || '(11) 99999-0000',
        segment: this.segment,
        city: this.city || 'São Paulo',
        state: this.stateUf,
      });

      this.isRegistering.set(false);
      this.appState.triggerToast(`Bem-vindo ao Girus, ${session.company.tradeName}!`);
      this.router.navigateByUrl('/dashboard');
    }, 400);
  }
}
