import { Component, HostListener, computed, input, model, signal } from '@angular/core';

/** Formato de public/material-symbols.json: [nome, índices de categoria, tags em inglês]. */
interface IconCatalogFile {
  categories: string[];
  icons: [string, number[], string][];
}

interface IconEntry {
  name: string;
  categories: number[];
  /** Nome + tags, já normalizados, para a busca. */
  haystack: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  Actions: 'Ações',
  Activities: 'Atividades',
  Android: 'Android',
  'Audio&Video': 'Áudio e Vídeo',
  Business: 'Negócios',
  Communicate: 'Comunicação',
  Hardware: 'Hardware',
  Home: 'Casa',
  Household: 'Doméstico',
  Images: 'Imagens',
  Maps: 'Mapas',
  Privacy: 'Privacidade',
  Social: 'Social',
  Text: 'Texto',
  Transit: 'Transporte',
  Travel: 'Viagem',
  'UI actions': 'Interface',
};

/** Ícones mais úteis para o negócio, mostrados primeiro quando não há busca. */
const FEATURED_ICONS = [
  'restaurant',
  'kebab_dining',
  'set_meal',
  'lunch_dining',
  'outdoor_grill',
  'egg_alt',
  'local_fire_department',
  'grocery',
  'local_bar',
  'liquor',
  'sports_bar',
  'icecream',
  'bakery_dining',
  'shopping_cart',
  'storefront',
  'payments',
  'credit_card',
  'qr_code_2',
  'account_balance',
  'receipt_long',
  'event_available',
  'local_shipping',
  'inventory_2',
  'category',
];

/** Termos em português -> termos em inglês usados nos nomes/tags dos ícones. */
const PT_SEARCH_TERMS: Record<string, string[]> = {
  carne: ['restaurant', 'kebab', 'set_meal', 'lunch', 'grill', 'food'],
  churrasco: ['grill', 'fire', 'kebab', 'barbecue'],
  boi: ['restaurant', 'set_meal'],
  bovino: ['restaurant', 'set_meal'],
  porco: ['kebab', 'savings'],
  suino: ['kebab', 'savings'],
  frango: ['egg', 'kebab', 'food'],
  ave: ['egg', 'flutter'],
  peixe: ['set_meal', 'phishing', 'water'],
  comida: ['food', 'restaurant', 'lunch', 'dinner'],
  bebida: ['bar', 'liquor', 'wine', 'cafe', 'drink', 'water'],
  cerveja: ['sports_bar', 'liquor'],
  vinho: ['wine', 'liquor'],
  fogo: ['fire', 'flame'],
  carvao: ['fire', 'flame'],
  gelo: ['ac_unit', 'icecream', 'kitchen'],
  sorvete: ['icecream'],
  pao: ['bakery', 'breakfast'],
  dinheiro: ['payments', 'money', 'cash', 'attach_money', 'currency'],
  cartao: ['credit_card', 'card', 'payment'],
  pix: ['qr_code', 'pix'],
  boleto: ['receipt', 'barcode', 'request_quote'],
  banco: ['account_balance', 'bank'],
  pagamento: ['payment', 'paid', 'credit_card', 'money'],
  prazo: ['event', 'calendar', 'schedule'],
  calendario: ['calendar', 'event'],
  carrinho: ['shopping_cart', 'cart'],
  loja: ['store', 'storefront', 'shop'],
  caixa: ['inventory', 'box', 'point_of_sale'],
  estoque: ['inventory', 'warehouse', 'box'],
  entrega: ['local_shipping', 'delivery'],
  caminhao: ['local_shipping', 'truck'],
  cliente: ['person', 'group', 'account'],
  pessoa: ['person', 'account', 'face'],
  casa: ['home', 'house'],
  configuracao: ['settings', 'tune'],
  alerta: ['warning', 'notification', 'error'],
  categoria: ['category', 'label', 'sell'],
  etiqueta: ['label', 'sell', 'tag'],
  promocao: ['sell', 'percent', 'discount', 'local_offer'],
  desconto: ['percent', 'discount', 'local_offer'],
  balanca: ['scale', 'monitor_weight'],
  peso: ['scale', 'monitor_weight'],
  faca: ['cut', 'content_cut', 'restaurant'],
  relatorio: ['analytics', 'bar_chart', 'summarize'],
  grafico: ['chart', 'analytics', 'trending'],
};

/** Quantidade renderizada por vez; a grade completa (~4 mil ícones) pesa para desenhar de uma vez. */
const PAGE_SIZE = 240;

let catalogPromise: Promise<{ categories: string[]; icons: IconEntry[] }> | null = null;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Carrega a lista uma vez por sessão. Usa fetch (e não HttpClient) para não passar pelos interceptors da API. */
function loadCatalog(): Promise<{ categories: string[]; icons: IconEntry[] }> {
  catalogPromise ??= fetch('material-symbols.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<IconCatalogFile>;
    })
    .then((file) => ({
      categories: file.categories,
      icons: file.icons.map(([name, categories, tags]) => ({
        name,
        categories,
        haystack: `${name.replace(/_/g, ' ')} ${tags}`.toLowerCase(),
      })),
    }))
    .catch((err) => {
      catalogPromise = null;
      throw err;
    });
  return catalogPromise;
}

/**
 * Seletor de ícones Material Symbols. Uso: `<app-icon-picker [(value)]="fee.icon" />`.
 * Mostra o ícone atual; ao clicar abre um diálogo com busca e todos os ícones da fonte.
 */
@Component({
  selector: 'app-icon-picker',
  templateUrl: './icon-picker.html',
})
export class IconPicker {
  readonly value = model<string>('');
  readonly compact = input(false);
  readonly placeholder = input('Escolher ícone');

  protected readonly isOpen = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly loadError = signal(false);
  protected readonly search = signal('');
  protected readonly categoryIndex = signal<number | null>(null);
  protected readonly visibleCount = signal(PAGE_SIZE);

  private readonly allIcons = signal<IconEntry[]>([]);
  private readonly categoryNames = signal<string[]>([]);

  protected readonly featuredIcons = FEATURED_ICONS;

  protected readonly categories = computed(() =>
    this.categoryNames().map((name, index) => ({ index, label: CATEGORY_LABELS[name] ?? name })),
  );

  protected readonly results = computed(() => {
    const term = normalize(this.search());
    const category = this.categoryIndex();
    let list = this.allIcons();

    if (category !== null) list = list.filter((icon) => icon.categories.includes(category));
    if (!term) return list;

    const words = term.split(/\s+/);
    const exact = term.replace(/\s+/g, '_');
    const matches = list.filter((icon) =>
      words.every((word) => {
        const synonyms = PT_SEARCH_TERMS[word] ?? Object.entries(PT_SEARCH_TERMS).find(([pt]) => pt.startsWith(word) && word.length >= 3)?.[1];
        return icon.haystack.includes(word) || (synonyms?.some((s) => icon.haystack.includes(s.replace(/_/g, ' '))) ?? false);
      }),
    );
    // Nome exato ou começando pelo termo aparece primeiro.
    return matches.sort((a, b) => rank(a.name) - rank(b.name));

    function rank(name: string): number {
      if (name === exact) return 0;
      if (name.startsWith(exact)) return 1;
      return 2;
    }
  });

  protected readonly visibleResults = computed(() => this.results().slice(0, this.visibleCount()));

  protected open(): void {
    this.search.set('');
    this.categoryIndex.set(null);
    this.visibleCount.set(PAGE_SIZE);
    this.isOpen.set(true);
    if (this.allIcons().length === 0) this.fetchCatalog();
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected select(name: string): void {
    this.value.set(name);
    this.close();
  }

  protected setSearch(term: string): void {
    this.search.set(term);
    this.visibleCount.set(PAGE_SIZE);
  }

  protected setCategory(index: number | null): void {
    this.categoryIndex.set(index);
    this.visibleCount.set(PAGE_SIZE);
  }

  protected showMore(): void {
    this.visibleCount.set(this.visibleCount() + PAGE_SIZE);
  }

  protected fetchCatalog(): void {
    this.isLoading.set(true);
    this.loadError.set(false);
    loadCatalog()
      .then((catalog) => {
        this.categoryNames.set(catalog.categories);
        this.allIcons.set(catalog.icons);
      })
      .catch(() => this.loadError.set(true))
      .finally(() => this.isLoading.set(false));
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) this.close();
  }
}
