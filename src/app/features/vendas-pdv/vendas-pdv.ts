import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data';
import { CartBridgeService } from '../../core/services/cart-bridge';
import { AppStateService } from '../../core/services/app-state';
import { BarbecueKit, CartItem, Client, ProductItem } from '../../core/models/models';

type CategoryFilter = 'todos' | 'kits' | 'bovinos' | 'suinos' | 'outros';
type PaymentMode = 'pix' | 'dinheiro' | 'debito' | 'credito_vista' | 'parcelado' | 'a_prazo';

interface CatalogEntry {
  id: string;
  kind: 'produto' | 'kit';
  name: string;
  price: number;
  unit: string;
  description: string;
  imageUrl: string;
  category: string;
  stockLabel: string;
}

interface PaymentOption {
  mode: PaymentMode;
  label: string;
  subtitle: string;
  icon: string;
  feePercent: number;
}

interface SaleSummary {
  saleId: string;
  receiptNumber: string;
  total: number;
  netAmount: number;
  feeAmount: number;
  paymentLabel: string;
  itemsCount: number;
  clientName?: string;
  dueDateLabel?: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { mode: 'pix', label: 'Pix', subtitle: 'QR Code / Chave dinâmica', icon: 'qr_code_2', feePercent: 0 },
  { mode: 'dinheiro', label: 'Dinheiro', subtitle: 'Espécie no caixa', icon: 'payments', feePercent: 0 },
  { mode: 'debito', label: 'Débito', subtitle: 'Cartão à vista', icon: 'credit_card', feePercent: 1.2 },
  {
    mode: 'credito_vista',
    label: 'Crédito à Vista',
    subtitle: 'Cartão sem parcelamento',
    icon: 'credit_card',
    feePercent: 2.85,
  },
  {
    mode: 'parcelado',
    label: 'Parcelado',
    subtitle: 'Cartão em até 6x',
    icon: 'receipt_long',
    feePercent: 3.9,
  },
  { mode: 'a_prazo', label: 'A Prazo', subtitle: 'Faturado / Boleto', icon: 'event_available', feePercent: 0 },
];

@Component({
  selector: 'app-vendas-pdv',
  imports: [FormsModule],
  templateUrl: './vendas-pdv.html',
})
export class VendasPdv implements OnInit {
  private readonly mockData = inject(MockDataService);
  private readonly cartBridge = inject(CartBridgeService);
  private readonly appState = inject(AppStateService);

  protected readonly paymentOptions = PAYMENT_OPTIONS;

  private readonly products = signal<ProductItem[]>(this.mockData.getProducts());
  private readonly kits = signal<BarbecueKit[]>(this.mockData.getKits());

  protected readonly cart = signal<CartItem[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal<CategoryFilter>('todos');
  protected readonly discount = signal<number>(0);
  protected readonly paymentMode = signal<PaymentMode>('pix');
  protected readonly saleSummary = signal<SaleSummary | null>(null);

  protected readonly clients = signal<Client[]>(this.mockData.getClients());
  protected readonly selectedClientId = signal<string | null>(null);
  protected readonly dueDate = signal<string>(this.defaultDueDate());
  protected readonly passFeeToCustomer = signal(false);
  protected readonly minDueDate = this.todayIso();

  protected readonly categories: { value: CategoryFilter; label: string; icon: string }[] = [
    { value: 'todos', label: 'Todos', icon: 'apps' },
    { value: 'kits', label: 'Kits', icon: 'outdoor_grill' },
    { value: 'bovinos', label: 'Bovinos', icon: 'restaurant' },
    { value: 'suinos', label: 'Suínos', icon: 'kebab_dining' },
    { value: 'outros', label: 'Outros', icon: 'category' },
  ];

  private readonly catalog = computed<CatalogEntry[]>(() => {
    const kitEntries: CatalogEntry[] = this.kits().map((kit) => ({
      id: kit.id,
      kind: 'kit',
      name: kit.name,
      price: kit.suggestedPrice,
      unit: 'combo',
      description: kit.serveLabel,
      imageUrl: kit.imageUrl,
      category: 'Kit de Churrasco',
      stockLabel: `${kit.stockAvailable} kits disponíveis`,
    }));

    const productEntries: CatalogEntry[] = this.products().map((product) => ({
      id: product.id,
      kind: 'produto',
      name: product.name,
      price: product.sellingPrice,
      unit: product.unit,
      description: product.category,
      imageUrl: product.imageUrl,
      category: product.category,
      stockLabel: `${product.stock} ${product.unit} em estoque`,
    }));

    return [...kitEntries, ...productEntries];
  });

  protected readonly filteredCatalog = computed<CatalogEntry[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.categoryFilter();

    return this.catalog().filter((entry) => {
      const matchesSearch = !term || entry.name.toLowerCase().includes(term);
      const matchesCategory = this.matchesCategory(entry, category);
      return matchesSearch && matchesCategory;
    });
  });

  protected readonly subtotal = computed(() =>
    this.cart().reduce((acc, item) => acc + item.price * item.quantity, 0),
  );

  protected readonly totalItems = computed(() => this.cart().reduce((acc, item) => acc + item.quantity, 0));

  protected readonly totalAfterDiscount = computed(() => Math.max(this.subtotal() - this.discount(), 0));

  protected readonly activePaymentOption = computed(
    () => this.paymentOptions.find((option) => option.mode === this.paymentMode()) ?? this.paymentOptions[0],
  );

  protected readonly feeAmount = computed(
    () => (this.totalAfterDiscount() * this.activePaymentOption().feePercent) / 100,
  );

  /** Quando a taxa é repassada, o cliente paga o valor base + a taxa, e o lojista recebe o valor base integral. */
  protected readonly chargedTotal = computed(() =>
    this.passFeeToCustomer() ? this.totalAfterDiscount() + this.feeAmount() : this.totalAfterDiscount(),
  );

  protected readonly netAmount = computed(() =>
    this.passFeeToCustomer() ? this.totalAfterDiscount() : this.totalAfterDiscount() - this.feeAmount(),
  );

  protected readonly selectedClient = computed(
    () => this.clients().find((c) => c.id === this.selectedClientId()) ?? null,
  );

  ngOnInit(): void {
    const pendingKit = this.cartBridge.consumeKitForSale();
    if (pendingKit) {
      this.cart.set([
        {
          id: pendingKit.id,
          name: pendingKit.name,
          price: pendingKit.suggestedPrice,
          unit: 'combo',
          description: pendingKit.serveLabel,
          quantity: 1,
        },
      ]);
      this.appState.triggerToast(`Kit "${pendingKit.name}" adicionado à venda.`);
    }
  }

  private matchesCategory(entry: CatalogEntry, category: CategoryFilter): boolean {
    if (category === 'todos') return true;
    if (category === 'kits') return entry.kind === 'kit';
    if (entry.kind === 'kit') return false;

    const normalized = entry.category.toLowerCase();
    if (category === 'bovinos') return normalized.includes('bovin');
    if (category === 'suinos') return normalized.includes('suín') || normalized.includes('suin');
    return !normalized.includes('bovin') && !normalized.includes('suín') && !normalized.includes('suin');
  }

  protected quantityStep(unit: string): number {
    return unit === 'kg' ? 0.5 : 1;
  }

  protected addToCart(entry: CatalogEntry): void {
    const step = this.quantityStep(entry.unit);
    const existing = this.cart().find((item) => item.id === entry.id);

    if (existing) {
      this.cart.set(
        this.cart().map((item) => (item.id === entry.id ? { ...item, quantity: item.quantity + step } : item)),
      );
      return;
    }

    this.cart.set([
      ...this.cart(),
      {
        id: entry.id,
        name: entry.name,
        price: entry.price,
        unit: entry.unit,
        description: entry.description,
        quantity: step,
      },
    ]);
  }

  protected incrementQuantity(item: CartItem): void {
    const step = this.quantityStep(item.unit);
    this.cart.set(this.cart().map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + step } : i)));
  }

  protected decrementQuantity(item: CartItem): void {
    const step = this.quantityStep(item.unit);
    const nextQty = Math.round((item.quantity - step) * 100) / 100;

    if (nextQty <= 0) {
      this.removeFromCart(item);
      return;
    }

    this.cart.set(this.cart().map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i)));
  }

  protected removeFromCart(item: CartItem): void {
    this.cart.set(this.cart().filter((i) => i.id !== item.id));
  }

  protected clearCart(): void {
    this.cart.set([]);
    this.discount.set(0);
    this.selectedClientId.set(null);
    this.dueDate.set(this.defaultDueDate());
    this.passFeeToCustomer.set(false);
  }

  protected selectPaymentMode(mode: PaymentMode): void {
    this.paymentMode.set(mode);
    this.passFeeToCustomer.set(false);
    if (mode !== 'a_prazo') {
      this.selectedClientId.set(null);
      this.dueDate.set(this.defaultDueDate());
    }
  }

  private todayIso(): string {
    return new Date().toISOString().split('T')[0];
  }

  private defaultDueDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }

  protected togglePassFeeToCustomer(): void {
    this.passFeeToCustomer.set(!this.passFeeToCustomer());
  }

  protected setDiscount(value: number | string): void {
    const numeric = typeof value === 'number' ? value : parseFloat(value);
    this.discount.set(Number.isFinite(numeric) && numeric > 0 ? numeric : 0);
  }

  protected finalizeSale(): void {
    if (this.cart().length === 0) {
      this.appState.triggerToast('Adicione ao menos um item ao carrinho antes de finalizar.');
      return;
    }

    const option = this.activePaymentOption();

    if (option.mode === 'a_prazo' && !this.selectedClientId()) {
      this.appState.triggerToast('Selecione o cliente para registrar a venda a prazo.');
      return;
    }

    if (option.mode === 'a_prazo' && !this.dueDate()) {
      this.appState.triggerToast('Informe a data de vencimento da cobrança.');
      return;
    }

    const items = this.cart().map((item) => ({
      name: item.name,
      qty: item.quantity,
      unit: item.unit,
      price: item.price,
    }));

    const client = this.selectedClient();

    const result = this.mockData.processPosSale({
      total: this.chargedTotal(),
      paymentMode: option.mode,
      cardFlag: option.mode === 'debito' || option.mode === 'credito_vista' || option.mode === 'parcelado'
        ? 'Visa/Mastercard'
        : undefined,
      clientId: client?.id,
      clientName: client?.name,
      dueDate: option.mode === 'a_prazo' ? this.dueDate() : undefined,
      feeAmount: this.feeAmount(),
      netAmount: this.netAmount(),
      items,
    });

    this.saleSummary.set({
      saleId: result.saleId,
      receiptNumber: result.receiptNumber,
      total: this.chargedTotal(),
      netAmount: this.netAmount(),
      feeAmount: this.feeAmount(),
      paymentLabel: option.label,
      itemsCount: this.totalItems(),
      clientName: client?.name,
      dueDateLabel:
        option.mode === 'a_prazo'
          ? new Date(this.dueDate() + 'T00:00:00').toLocaleDateString('pt-BR')
          : undefined,
    });

    this.clearCart();
  }

  protected closeSuccessModal(): void {
    this.saleSummary.set(null);
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
