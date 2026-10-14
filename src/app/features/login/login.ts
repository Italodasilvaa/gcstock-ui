import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppStateService } from '../../core/services/app-state';
import { Employee } from '../../core/models/models';

interface NewEmployeeRow {
  name: string;
  email: string;
  password: string;
  role: Employee['role'];
}

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class Login {
  private readonly appState = inject(AppStateService);
  private readonly router = inject(Router);

  protected readonly activeTab = signal<'login' | 'register'>('login');

  // Login state
  protected loginEmail = '';
  protected loginPassword = '';
  protected rememberMe = true;
  protected readonly loginError = signal<string | null>(null);
  protected readonly showLoginPassword = signal(false);

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

  // Funcionários adicionados já durante o cadastro da empresa (opcional)
  protected readonly newEmployees = signal<NewEmployeeRow[]>([]);

  protected addEmployeeRow(): void {
    this.newEmployees.set([...this.newEmployees(), { name: '', email: '', password: '', role: 'operador' }]);
  }

  protected removeEmployeeRow(index: number): void {
    this.newEmployees.set(this.newEmployees().filter((_, i) => i !== index));
  }

  protected toggleLoginPasswordVisibility(): void {
    this.showLoginPassword.set(!this.showLoginPassword());
  }

  protected handleLogin(): void {
    this.loginError.set(null);

    if (!this.loginEmail) {
      this.loginError.set('Informe o e-mail de acesso da sua empresa.');
      return;
    }

    this.appState.login(this.loginEmail, this.loginPassword).subscribe({
      next: (session) => {
        if (session) {
          this.appState.triggerToast(`Bem-vindo ao GC Stock, ${session.company.tradeName}!`);
          this.router.navigateByUrl('/dashboard');
        } else {
          this.loginError.set('E-mail ou senha inválidos. Crie o cadastro da sua empresa na aba ao lado.');
        }
      },
      error: () => {
        this.loginError.set('Não foi possível conectar ao servidor da GC Stock API. Tente novamente em instantes.');
      },
    });
  }

  protected handleRegisterCompany(): void {
    if (!this.corporateName || !this.document || !this.ownerName || !this.email) {
      alert('Preencha os campos obrigatórios para cadastrar sua empresa.');
      return;
    }

    this.isRegistering.set(true);

    this.appState
      .registerCompany({
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
        employees: this.newEmployees()
          .filter((e) => e.name.trim() && e.email.trim())
          .map((e) => ({ name: e.name, email: e.email, password: e.password || undefined, role: e.role })),
      })
      .subscribe({
        next: (session) => {
          this.isRegistering.set(false);
          this.appState.triggerToast(`Bem-vindo ao GC Stock, ${session.company.tradeName}!`);
          this.router.navigateByUrl('/dashboard');
        },
        error: () => {
          this.isRegistering.set(false);
          alert('Não foi possível cadastrar sua empresa. Tente novamente.');
        },
      });
  }
}
