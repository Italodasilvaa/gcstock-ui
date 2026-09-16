import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../core/services/app-state';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly router = inject(Router);
  protected readonly appState = inject(AppStateService);

  @Output() openCompanySwitch = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  protected readonly notificationsCount = 4;

  protected get companyName(): string {
    return this.appState.session()?.company.tradeName || 'M&C Frig Carnes Nobres';
  }

  protected get userName(): string {
    return this.appState.session()?.user.name || 'Carlos Eduardo';
  }

  protected get userRole(): string {
    const role = this.appState.session()?.user.role;
    return role === 'admin' ? 'Administrador' : 'Operador';
  }

  protected goToNewSale(): void {
    this.router.navigateByUrl('/vendas');
  }

  protected goToStockAlerts(): void {
    this.router.navigateByUrl('/estoque');
  }
}
