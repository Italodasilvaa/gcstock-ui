import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'produtos',
        loadComponent: () => import('./features/produtos/produtos').then((m) => m.Produtos),
      },
      {
        path: 'kits',
        loadComponent: () => import('./features/kits/kits').then((m) => m.Kits),
      },
      {
        path: 'estoque',
        loadComponent: () => import('./features/estoque/estoque').then((m) => m.Estoque),
      },
      {
        path: 'compras',
        loadComponent: () => import('./features/compras/compras').then((m) => m.Compras),
      },
      {
        path: 'vendas',
        loadComponent: () => import('./features/vendas-pdv/vendas-pdv').then((m) => m.VendasPdv),
      },
      {
        path: 'financeiro',
        loadComponent: () => import('./features/financeiro/financeiro').then((m) => m.Financeiro),
        data: { initialTab: 'dre' },
      },
      {
        path: 'contas-pagar',
        loadComponent: () => import('./features/financeiro/financeiro').then((m) => m.Financeiro),
        data: { initialTab: 'pagar' },
      },
      {
        path: 'clientes-receber',
        loadComponent: () => import('./features/financeiro/financeiro').then((m) => m.Financeiro),
        data: { initialTab: 'receber' },
      },
      {
        path: 'fechamento-mensal',
        loadComponent: () => import('./features/financeiro/financeiro').then((m) => m.Financeiro),
        data: { initialTab: 'mensal' },
      },
      {
        path: 'gestao-empresa',
        loadComponent: () =>
          import('./features/gestao-empresa/gestao-empresa').then((m) => m.GestaoEmpresa),
      },
      {
        path: 'clientes',
        loadComponent: () => import('./features/clientes/clientes').then((m) => m.Clientes),
      },
      {
        path: 'relatorios',
        loadComponent: () => import('./features/relatorios/relatorios').then((m) => m.Relatorios),
      },
      {
        path: 'configuracoes',
        loadComponent: () =>
          import('./features/configuracoes/configuracoes').then((m) => m.Configuracoes),
      },
      {
        path: 'atividades',
        loadComponent: () =>
          import('./features/atividades/atividades').then((m) => m.Atividades),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
