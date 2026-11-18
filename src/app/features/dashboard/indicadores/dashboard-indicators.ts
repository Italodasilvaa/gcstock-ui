import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiDataService } from '../../../core/services/api-data';
import { AppStateService } from '../../../core/services/app-state';
import { Dashboard, DashPeriodRevenue } from '../../../core/models/models';

type Tab = 'comercial' | 'financeiro' | 'estoque' | 'kits';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Indicadores do painel: tudo vem pronto do servidor (dados reais); aqui só se apresenta. */
@Component({
  selector: 'app-dashboard-indicators',
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard-indicators.html',
})
export class DashboardIndicators {
  private readonly api = inject(ApiDataService);
  private readonly appState = inject(AppStateService);

  protected readonly data = signal<Dashboard | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly tab = signal<Tab>('comercial');

  protected readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'comercial', label: 'Comercial', icon: 'storefront' },
    { id: 'financeiro', label: 'Financeiro', icon: 'payments' },
    { id: 'estoque', label: 'Estoque', icon: 'inventory_2' },
    { id: 'kits', label: 'Kits', icon: 'outdoor_grill' },
  ];

  /** Barra da meta, limitada a 100% de largura (o percentual exibido pode passar disso). */
  protected readonly goalBarWidth = computed(() => Math.min(100, this.data()?.commercial.goal.percentAchieved ?? 0));

  /** Altura relativa das barras da evolução mensal (maior valor absoluto = 100%). */
  protected readonly evolution = computed(() => {
    const points = this.data()?.financial.evolution ?? [];
    const max = Math.max(1, ...points.map((p) => Math.abs(p.netResult)), ...points.map((p) => p.netRevenue));
    return points.map((p) => ({
      label: MONTHS[p.month - 1],
      netRevenue: p.netRevenue,
      netResult: p.netResult,
      revenueHeight: (p.netRevenue / max) * 100,
      resultHeight: (Math.abs(p.netResult) / max) * 100,
    }));
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.api.getDashboard().subscribe({
      next: (result) => {
        this.data.set(result);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.appState.notifyLoadError(err, 'os indicadores');
      },
    });
  }

  protected formatCurrency(value: number): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected formatNumber(value: number): string {
    return (value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  }

  /** "+12,5% vs. período anterior" ou "sem base de comparação". */
  protected changeLabel(period: DashPeriodRevenue): string {
    if (period.changePercent === null) return period.revenue > 0 ? 'sem período anterior para comparar' : '—';
    const sign = period.changePercent > 0 ? '+' : '';
    return `${sign}${period.changePercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs. período anterior`;
  }

  protected changeClass(period: DashPeriodRevenue): string {
    if (period.changePercent === null || period.changePercent === 0) return 'text-[#827565]';
    return period.changePercent > 0 ? 'text-[#2e7d32]' : 'text-[#ba1a1a]';
  }

  protected ticketChange(): number | null {
    const c = this.data()?.commercial;
    if (!c || c.previousAverageTicket <= 0) return null;
    return Math.round(((c.averageTicket - c.previousAverageTicket) / c.previousAverageTicket) * 1000) / 10;
  }

  protected marginClass(below: boolean): string {
    return below ? 'text-[#ba1a1a] font-bold' : 'text-[#2e7d32] font-semibold';
  }
}
