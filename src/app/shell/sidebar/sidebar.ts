import { Component, EventEmitter, Output, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AppStateService } from '../../core/services/app-state';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
  /** Rotas adicionais que também devem manter este item marcado como ativo. */
  matchPaths?: string[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink],
  templateUrl: './sidebar.html',
})
export class Sidebar {
  private readonly router = inject(Router);
  protected readonly appState = inject(AppStateService);

  @Output() openApiConsole = new EventEmitter<void>();
  @Output() openCompanySwitch = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  protected readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly menuItems: MenuItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/produtos', label: 'Produtos', icon: 'restaurant' },
    { path: '/kits', label: 'Kits de Churrasco', icon: 'outdoor_grill' },
    { path: '/estoque', label: 'Estoque & Validades', icon: 'inventory_2' },
    { path: '/compras', label: 'Compras / Entradas', icon: 'local_shipping' },
    { path: '/vendas', label: 'Nova Venda / PDV', icon: 'point_of_sale' },
    {
      path: '/financeiro',
      label: 'Financeiro & DRE',
      icon: 'payments',
      matchPaths: ['/contas-pagar', '/clientes-receber'],
    },
    { path: '/clientes', label: 'Clientes & Fidelidade', icon: 'group' },
    { path: '/relatorios', label: 'Relatórios & Desossa', icon: 'analytics' },
    { path: '/configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  protected isActive(item: MenuItem): boolean {
    const url = this.currentUrl();
    return url === item.path || (item.matchPaths ?? []).some((p) => url === p);
  }

  protected get companyDisplayName(): string {
    return this.appState.session()?.company.tradeName || 'M&C Frig Carnes Nobres';
  }

  protected get companyLocation(): string {
    const company = this.appState.session()?.company;
    return company ? `${company.city} / ${company.state}` : 'São Paulo / SP';
  }
}
