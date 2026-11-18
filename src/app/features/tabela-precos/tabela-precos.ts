import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductItem } from '../../core/models/models';
import { ApiDataService } from '../../core/services/api-data';
import { AppStateService } from '../../core/services/app-state';
import { formatQuantity } from '../../core/utils/format-quantity';

interface PriceGroup {
  category: string;
  products: ProductItem[];
}

type ColumnKey =
  | 'code'
  | 'sku'
  | 'ean'
  | 'name'
  | 'category'
  | 'unit'
  | 'sellingPrice'
  | 'costPrice'
  | 'stock'
  | 'minStock'
  | 'status'
  | 'expiry'
  | 'lot'
  | 'supplier'
  | 'storage'
  | 'subLocation'
  | 'perishable';

interface PriceColumn {
  key: ColumnKey;
  label: string;
  /** Peso relativo da largura; a % real é calculada só entre as colunas marcadas. */
  weight: number;
  align: 'left' | 'center' | 'right';
  default: boolean;
  /** Coluna que não pode ser desmarcada. */
  required?: boolean;
}

/** Todos os campos que podem aparecer na tabela, na ordem em que aparecem. */
const COLUMNS: PriceColumn[] = [
  { key: 'code', label: 'Código', weight: 10, align: 'left', default: true },
  { key: 'sku', label: 'SKU', weight: 10, align: 'left', default: false },
  { key: 'ean', label: 'EAN', weight: 13, align: 'left', default: false },
  { key: 'name', label: 'Produto', weight: 30, align: 'left', default: true, required: true },
  { key: 'category', label: 'Categoria', weight: 13, align: 'left', default: false },
  { key: 'unit', label: 'Un.', weight: 6, align: 'center', default: true },
  { key: 'sellingPrice', label: 'Preço de venda', weight: 13, align: 'right', default: true },
  { key: 'costPrice', label: 'Preço de custo', weight: 13, align: 'right', default: false },
  { key: 'stock', label: 'Quantidade', weight: 11, align: 'right', default: false },
  { key: 'minStock', label: 'Estoque mínimo', weight: 11, align: 'right', default: false },
  { key: 'status', label: 'Situação', weight: 14, align: 'center', default: true },
  { key: 'expiry', label: 'Vencimento', weight: 15, align: 'left', default: true },
  { key: 'lot', label: 'Lote', weight: 11, align: 'left', default: false },
  { key: 'supplier', label: 'Fornecedor', weight: 16, align: 'left', default: false },
  { key: 'storage', label: 'Armazenamento', weight: 14, align: 'left', default: false },
  { key: 'subLocation', label: 'Localização', weight: 12, align: 'left', default: false },
  { key: 'perishable', label: 'Perecível', weight: 9, align: 'center', default: false },
];

const COLUMNS_STORAGE_KEY = 'gcstock.tabela-precos.colunas';

function defaultColumnKeys(): ColumnKey[] {
  return COLUMNS.filter((c) => c.default).map((c) => c.key);
}

/** Lê as colunas escolhidas da última vez (só conveniência do navegador; se falhar, usa o padrão). */
function loadColumnKeys(): ColumnKey[] {
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (!raw) return defaultColumnKeys();
    const saved = JSON.parse(raw) as string[];
    const valid = COLUMNS.filter((c) => c.required || saved.includes(c.key)).map((c) => c.key);
    return valid.length ? valid : defaultColumnKeys();
  } catch {
    return defaultColumnKeys();
  }
}

/**
 * Tabela de preços para uso interno dos funcionários: produtos do estoque com preço de venda,
 * situação (disponível ou não), vencimento e os demais campos que o usuário marcar. Kits não entram.
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

  // ---------------------------------------------------------------- colunas escolhidas
  protected readonly allColumns = COLUMNS;
  private readonly selectedKeys = signal<ColumnKey[]>(loadColumnKeys());

  protected readonly visibleColumns = computed(() => {
    const selected = this.selectedKeys();
    const cols = COLUMNS.filter((c) => selected.includes(c.key));
    const totalWeight = cols.reduce((sum, c) => sum + c.weight, 0);
    return cols.map((c) => ({ ...c, widthPercent: (c.weight / totalWeight) * 100 }));
  });

  /** Largura mínima na tela (celular rola para o lado em vez de espremer); no PDF é ignorada. */
  protected readonly tableMinWidth = computed(() => Math.max(480, this.visibleColumns().length * 110));

  protected isColumnSelected(key: ColumnKey): boolean {
    return this.selectedKeys().includes(key);
  }

  protected toggleColumn(column: PriceColumn, checked: boolean): void {
    if (column.required) return;
    const next = new Set(this.selectedKeys());
    if (checked) next.add(column.key);
    else next.delete(column.key);
    this.setColumns(COLUMNS.filter((c) => next.has(c.key)).map((c) => c.key));
  }

  protected resetColumns(): void {
    this.setColumns(defaultColumnKeys());
  }

  protected selectAllColumns(): void {
    this.setColumns(COLUMNS.map((c) => c.key));
  }

  private setColumns(keys: ColumnKey[]): void {
    this.selectedKeys.set(keys);
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(keys));
    } catch {
      // Sem armazenamento no navegador: a escolha vale só nesta visita.
    }
  }

  protected alignClass(column: PriceColumn): string {
    return column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
  }

  protected formatQty(value: number, unit: string): string {
    return formatQuantity(value ?? 0, unit);
  }

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
