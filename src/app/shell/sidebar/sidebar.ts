import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
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

  /** Controla a visibilidade do menu off-canvas no mobile (sempre visível em telas `lg:` para cima). */
  @Input() isOpen = false;

  @Output() openApiConsole = new EventEmitter<void>();
  @Output() openCompanySwitch = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

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
    { path: '/estoque', label: 'Estoque', icon: 'inventory_2' },
    { path: '/compras', label: 'Compras / Entradas', icon: 'local_shipping' },
    { path: '/vendas', label: 'Nova Venda / PDV', icon: 'point_of_sale' },
    {
      path: '/financeiro',
      label: 'Financeiro & DRE',
      icon: 'payments',
      matchPaths: ['/contas-pagar', '/clientes-receber', '/fechamento-mensal'],
    },
    { path: '/clientes', label: 'Clientes', icon: 'group' },
    { path: '/relatorios', label: 'Relatórios', icon: 'analytics' },
    { path: '/atividades', label: 'Atividades da Equipe', icon: 'fact_check' },   
    { path: '/gestao-empresa', label: 'Gestão da Empresa', icon: 'domain' },
     { path: '/configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  protected isActive(item: MenuItem): boolean {
    const url = this.currentUrl();
    return url === item.path || (item.matchPaths ?? []).some((p) => url === p);
  }

  protected get companyDisplayName(): string {
    return this.appState.session()?.company.tradeName || 'Girus Carnes Nobres';
  }

  protected get companyLocation(): string {
    const company = this.appState.session()?.company;
    return company ? `${company.city} / ${company.state}` : 'São Paulo / SP';
  }

  /** Só o dono/administrador troca de empresa — funcionário fica vinculado à empresa dele. */
  protected get isOwnerSession(): boolean {
    return !this.appState.session()?.user.employeeId;
  }
}
