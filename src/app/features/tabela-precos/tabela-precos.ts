import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductItem } from '../../core/models/models';
import { ApiDataService } from '../../core/services/api-data';
import { AppStateService } from '../../core/services/app-state';

interface PriceGroup {
  category: string;
  products: ProductItem[];
}

/**
 * Tabela de preços para uso interno dos funcionários: produtos do estoque com preço de venda,
 * situação (disponível ou não), vencimento. Kits não entram.
 * O PDF é gerado pela impressão do navegador ("Salvar como PDF"); o CSS de impressão esconde o menu.
 */
@Component({
  selector: 'app-tabela-precos',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './tabela-precos.html',
})
export class TabelaPrecos {
  private readonly api = inject(ApiDataService);
  private readonly appState = inject(AppStateService);

  private readonly products = signal<ProductItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly generatedAt = signal(new Date());

  protected readonly search = signal('');
  protected readonly category = signal('');
  protected readonly onlyAvailable = signal(true);

  protected readonly companyName = computed(() => this.appState.session()?.company.tradeName || 'GC Stock');

  protected readonly categories = computed(() =>
    [...new Set(this.products().map((p) => p.category || 'Sem categoria'))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  );

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const category = this.category();
    return this.products().filter((p) => {
      if (this.onlyAvailable() && !this.isAvailable(p)) return false;
      if (category && (p.category || 'Sem categoria') !== category) return false;
      if (!term) return true;
      return [p.name, p.code, p.sku, p.ean].some((v) => (v ?? '').toLowerCase().includes(term));
    });
  });

  protected readonly groups = computed<PriceGroup[]>(() => {
    const map = new Map<string, ProductItem[]>();
    for (const p of this.filtered()) {
      const key = p.category || 'Sem categoria';
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map]
      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
      .map(([category, products]) => ({
        category,
        products: products.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      }));
  });

  protected readonly availableCount = computed(() => this.filtered().filter((p) => this.isAvailable(p)).length);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.isLoading.set(true);
    this.loadError.set(false);
    this.api.getProducts().subscribe({
      next: (list) => {
        this.products.set(list);
        this.generatedAt.set(new Date());
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  /** Disponível = tem saldo em estoque e o lote mais próximo não está vencido. */
  protected isAvailable(p: ProductItem): boolean {
    return p.stock > 0 && p.expiryStatus !== 'vencido';
  }

  protected formatCurrency(value: number): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected hasExpiry(p: ProductItem): boolean {
    return !!p.nearestExpiry && !Number.isNaN(new Date(p.nearestExpiry).getTime());
  }

  protected expiryLabel(p: ProductItem): string {
    const days = p.expiryDaysRemaining;
    if (days < 0) return `Vencido há ${-days} dia(s)`;
    if (days === 0) return 'Vence hoje';
    return `Faltam ${days} dia(s)`;
  }

  protected expiryClass(p: ProductItem): string {
    switch (p.expiryStatus) {
      case 'vencido':
        return 'text-[#ba1a1a] font-semibold';
      case 'critico':
        return 'text-[#b26a00] font-semibold';
      default:
        return 'text-[#827565]';
    }
  }

  /** Abre a impressão do navegador; o nome sugerido do PDF vem do título da página. */
  protected downloadPdf(): void {
    const previousTitle = document.title;
    const date = this.generatedAt().toISOString().slice(0, 10);
    document.title = `Tabela-de-precos-${date}`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }
}
