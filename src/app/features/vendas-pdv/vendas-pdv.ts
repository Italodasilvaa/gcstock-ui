import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiDataService } from '../../core/services/api-data';
import { CartBridgeService } from '../../core/services/cart-bridge';
import { AppStateService } from '../../core/services/app-state';
import { PERMISSION } from '../../core/models/permissions';
import { todayLocalIso } from '../../core/utils/date-range';
import { IconPicker } from '../../shared/icon-picker/icon-picker';
import {
  BarbecueKit,
  CartItem,
  Client,
  PaymentFeeSetting,
  ProductCategory,
  ProductItem,
  StockBatch,
} from '../../core/models/models';

/** 'todos', 'kits' ou o id de uma categoria de produto cadastrada. */
type CategoryFilter = string;
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
  /** Saldo disponível (produto: estoque; kit: kits disponíveis). A venda não pode passar disso. */
  stock: number;
}

interface PaymentOption {
  /** Id da taxa cadastrada em Configurações. */
  id: string;
  mode: PaymentMode;
  label: string;
  subtitle: string;
  icon: string;
  feePercent: number;
  fixedFee: number;
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

/** Deduz a modalidade que o backend espera a partir do nome do método cadastrado em Configurações. */
function inferPaymentMode(method: string): PaymentMode {
  const name = method
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (name.includes('pix')) return 'pix';
  if (name.includes('dinheiro') || name.includes('especie')) return 'dinheiro';
  if (name.includes('debito')) return 'debito';
  if (name.includes('parcel')) return 'parcelado';
  if (name.includes('credito')) return 'credito_vista';
  if (name.includes('prazo') || name.includes('fiado') || name.includes('boleto')) return 'a_prazo';
  return 'dinheiro';
}

/** Linha editável do modal de categorias; id vazio = categoria nova ainda não salva. */
interface CategoryDraft {
  id: string;
  name: string;
  icon: string;
  originalName: string;
  originalIcon: string;
}

function toPaymentOption(fee: PaymentFeeSetting): PaymentOption {
  return {
    id: fee.id,
    mode: inferPaymentMode(fee.method),
    label: fee.method,
    subtitle: fee.subtitle,
    icon: fee.icon || 'payments',
    feePercent: fee.feePercent,
    fixedFee: fee.fixedFee ?? 0,
  };
}

@Component({
  selector: 'app-vendas-pdv',
  imports: [FormsModule, IconPicker],
  templateUrl: './vendas-pdv.html',
})
export class VendasPdv implements OnInit {
  private readonly api = inject(ApiDataService);
  private readonly cartBridge = inject(CartBridgeService);
  private readonly appState = inject(AppStateService);
  protected readonly PERMISSION = PERMISSION;

  protected can(permission: string): boolean {
    return this.appState.can(permission);
  }

  protected readonly paymentOptions = signal<PaymentOption[]>([]);

  private readonly products = signal<ProductItem[]>([]);
  private readonly kits = signal<BarbecueKit[]>([]);
  private readonly batches = signal<StockBatch[]>([]);

  /** Lotes com saldo de um produto (só lotes de verdade, não a linha "Sem lote"), para escolher de qual sai a venda. */
  protected lotsFor(productId: string): StockBatch[] {
    return this.batches()
      .filter((b) => b.productId === productId && b.id !== b.productId && b.availableKg > 0)
      .sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.orderCode.localeCompare(b.orderCode));
  }

  protected setItemLot(item: CartItem, lotId: string): void {
    this.cart.set(this.cart().map((i) => (i.id === item.id ? { ...i, lotId: lotId || null } : i)));
  }

  /** Lote escolhido não pode ter menos que a quantidade vendida (a API recusa, mas avisamos antes). */
  protected lotShortage(item: CartItem): boolean {
    if (!item.lotId) return false;
    const lot = this.batches().find((b) => b.id === item.lotId);
    return !!lot && item.quantity - lot.availableKg > 0.0001;
  }

  protected readonly cart = signal<CartItem[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal<CategoryFilter>('todos');
  protected readonly discount = signal<number>(0);
  protected readonly selectedPaymentId = signal<string | null>(null);
  protected readonly saleSummary = signal<SaleSummary | null>(null);

  protected readonly clients = signal<Client[]>([]);
  protected readonly selectedClientId = signal<string | null>(null);
  protected readonly dueDate = signal<string>(this.defaultDueDate());
  protected readonly passFeeToCustomer = signal(true);
  protected readonly minDueDate = this.todayIso();

  private readonly productCategories = signal<ProductCategory[]>([]);

  /** "Todos" e "Kits" são fixos; o resto vem das categorias cadastradas, na ordem definida. */
  protected readonly categories = computed<{ value: CategoryFilter; label: string; icon: string }[]>(() => [
    { value: 'todos', label: 'Todos', icon: 'apps' },
    { value: 'kits', label: 'Kits', icon: 'outdoor_grill' },
    ...this.productCategories().map((c) => ({ value: c.id, label: c.name, icon: c.icon || 'category' })),
  ]);

  protected readonly isCategoryEditorOpen = signal(false);
  protected readonly isSavingCategories = signal(false);
  protected readonly categoryDrafts = signal<CategoryDraft[]>([]);  private deletedCategoryIds: string[] = [];

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
      stock: kit.stockAvailable,
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
      stock: product.stock,
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
    this.cart().reduce((acc, item) => acc + Math.round(item.price * item.quantity * 100) / 100, 0),
  );

  protected readonly totalItems = computed(() =>
    Math.round(this.cart().reduce((acc, item) => acc + item.quantity, 0) * 1000) / 1000,
  );

  protected readonly totalAfterDiscount = computed(() => Math.max(this.subtotal() - this.discount(), 0));

  protected readonly activePaymentOption = computed<PaymentOption | null>(
    () =>
      this.paymentOptions().find((option) => option.id === this.selectedPaymentId()) ??
      this.paymentOptions()[0] ??
      null,
  );

  protected readonly paymentMode = computed<PaymentMode | null>(() => this.activePaymentOption()?.mode ?? null);

  protected readonly feeAmount = computed(() => {
    const option = this.activePaymentOption();
    const base = this.totalAfterDiscount();
    if (!option || base <= 0) return 0;
    return (base * option.feePercent) / 100 + option.fixedFee;
  });

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
    this.api.getProducts().subscribe((list) => this.products.set(list));
    this.api.getKits().subscribe((list) => this.kits.set(list));
    this.api.getBatches().subscribe((list) => this.batches.set(list));
    this.api.getClients().subscribe((list) => this.clients.set(list));
    this.loadCategories();
    this.api.getFees().subscribe({
      next: (fees) => this.paymentOptions.set(fees.filter((fee) => fee.active).map(toPaymentOption)),
      error: () => this.appState.triggerToast('Não foi possível carregar as formas de pagamento.'),
    });

    const pendingKit = this.cartBridge.consumeKitForSale();
    if (pendingKit) {
      this.cart.set([
        {
          id: pendingKit.id,
          kind: 'kit',
          name: pendingKit.name,
          price: pendingKit.suggestedPrice,
          catalogPrice: pendingKit.suggestedPrice,
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

    const selected = this.productCategories().find((c) => c.id === category);
    return !!selected && entry.category.trim().toLowerCase() === selected.name.trim().toLowerCase();
  }

  private loadCategories(): void {
    this.api.getCategories().subscribe({
      next: (list) => {
        this.productCategories.set(list);
        const current = this.categoryFilter();
        if (current !== 'todos' && current !== 'kits' && !list.some((c) => c.id === current)) {
          this.categoryFilter.set('todos');
        }
      },
      error: () => this.appState.triggerToast('Não foi possível carregar as categorias.'),
    });
  }

  // ---------------------------------------------------------------------
  // Editor de categorias (ordem, nome e ícone)
  // ---------------------------------------------------------------------

  protected canManageCategories(): boolean {
    return this.appState.canAny(PERMISSION.CategoriesCreate, PERMISSION.CategoriesEdit, PERMISSION.CategoriesDelete);
  }

  protected openCategoryEditor(): void {
    if (!this.canManageCategories()) {
      this.appState.triggerToast('Você não tem permissão para gerenciar categorias.');
      return;
    }
    this.deletedCategoryIds = [];
    this.categoryDrafts.set(
      this.productCategories().map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        originalName: c.name,
        originalIcon: c.icon,
      })),
    );
    this.isCategoryEditorOpen.set(true);
  }

  protected closeCategoryEditor(): void {
    if (this.isSavingCategories()) return;
    this.isCategoryEditorOpen.set(false);
  }

  protected moveCategory(index: number, delta: -1 | 1): void {
    const list = [...this.categoryDrafts()];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.categoryDrafts.set(list);  }

  protected updateCategoryDraft(index: number, patch: Partial<Pick<CategoryDraft, 'name' | 'icon'>>): void {
    this.categoryDrafts.set(this.categoryDrafts().map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  protected addCategoryDraft(): void {
    this.categoryDrafts.set([
      ...this.categoryDrafts(),
      { id: '', name: '', icon: 'category', originalName: '', originalIcon: '' },
    ]);  }

  protected removeCategoryDraft(index: number): void {
    const draft = this.categoryDrafts()[index];
    if (draft.id) {
      const inUse = this.products().filter((p) => p.category === draft.originalName).length;
      if (inUse > 0) {
        this.appState.triggerToast(
          `"${draft.originalName}" está em ${inUse} produto(s). Troque a categoria deles antes de excluir.`,
        );
        return;
      }
      this.deletedCategoryIds.push(draft.id);
    }
    this.categoryDrafts.set(this.categoryDrafts().filter((_, i) => i !== index));  }

  protected async saveCategories(): Promise<void> {
    const drafts = this.categoryDrafts().map((d) => ({ ...d, name: d.name.trim(), icon: d.icon.trim() || 'category' }));

    if (drafts.some((d) => !d.name)) {
      this.appState.triggerToast('Toda categoria precisa de um nome.');
      return;
    }
    const lowerNames = drafts.map((d) => d.name.toLowerCase());
    if (new Set(lowerNames).size !== lowerNames.length) {
      this.appState.triggerToast('Existem categorias com o mesmo nome.');
      return;
    }

    this.isSavingCategories.set(true);
    try {
      for (const id of this.deletedCategoryIds) {
        await firstValueFrom(this.api.deleteCategory(id));
      }

      const orderedIds: string[] = [];
      for (const draft of drafts) {
        if (!draft.id) {
          const created = await firstValueFrom(this.api.createCategory({ name: draft.name, icon: draft.icon }));
          orderedIds.push(created.id);
          continue;
        }
        if (draft.name !== draft.originalName || draft.icon !== draft.originalIcon) {
          await firstValueFrom(this.api.updateCategory(draft.id, { name: draft.name, icon: draft.icon }));
        }
        orderedIds.push(draft.id);
      }

      const saved = await firstValueFrom(this.api.reorderCategories(orderedIds));
      this.productCategories.set(saved);
      // Renomear altera a categoria dos produtos no backend; recarrega para o filtro continuar batendo.
      this.api.getProducts().subscribe((list) => this.products.set(list));
      this.isCategoryEditorOpen.set(false);
      this.appState.triggerToast('Categorias atualizadas com sucesso.');
    } catch (err) {
      const message = err instanceof HttpErrorResponse ? err.error?.message : undefined;
      this.appState.triggerToast(message ?? 'Não foi possível salvar as categorias. Tente novamente.');
      this.loadCategories();
    } finally {
      this.isSavingCategories.set(false);
    }
  }

  protected quantityStep(unit: string): number {
    return unit === 'kg' ? 0.5 : 1;
  }

  /** O saldo cobre essa quantidade? Se não, avisa e bloqueia (a API também recusa vendas acima do estoque). */
  private hasStockFor(id: string, name: string, unit: string, quantity: number): boolean {
    const entry = this.catalog().find((e) => e.id === id);
    if (!entry) return true;
    if (quantity - entry.stock > 0.0001) {
      const available = Math.max(0, entry.stock);
      this.appState.triggerToast(
        available === 0
          ? `"${name}" está sem estoque.`
          : `Estoque insuficiente: "${name}" tem apenas ${available} ${entry.kind === 'kit' ? 'kit(s)' : unit} disponível(is).`,
      );
      return false;
    }
    return true;
  }

  /** Alterar o preço de um item na venda exige a permissão "vendas.alterar-preco" (o dono sempre tem). */
  protected canEditPrice(): boolean {
    return this.appState.can(PERMISSION.SalesEditPrice);
  }

  protected isPriceEdited(item: CartItem): boolean {
    return Math.abs(item.price - item.catalogPrice) > 0.004;
  }

  /** Muda o preço unitário de um item no carrinho (só nesta venda; o cadastro do produto não é alterado). */
  protected setItemPrice(item: CartItem, value: number | string | null): void {
    if (!this.appState.requirePermission(PERMISSION.SalesEditPrice)) return;
    const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'));
    const price = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
    this.cart.set(this.cart().map((i) => (i.id === item.id ? { ...i, price } : i)));
  }

  protected resetItemPrice(item: CartItem): void {
    this.setItemPrice(item, item.catalogPrice);
  }

  protected addToCart(entry: CatalogEntry): void {
    const step = this.quantityStep(entry.unit);
    const existing = this.cart().find((item) => item.id === entry.id);

    if (!this.hasStockFor(entry.id, entry.name, entry.unit, (existing?.quantity ?? 0) + step)) return;

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
        kind: entry.kind,
        name: entry.name,
        price: entry.price,
        catalogPrice: entry.price,
        unit: entry.unit,
        description: entry.description,
        quantity: step,
      },
    ]);
  }

  protected incrementQuantity(item: CartItem): void {
    const step = this.quantityStep(item.unit);
    const next = Math.round((item.quantity + step) * 1000) / 1000;
    if (!this.hasStockFor(item.id, item.name, item.unit, next)) return;
    this.cart.set(this.cart().map((i) => (i.id === item.id ? { ...i, quantity: next } : i)));
  }

  /**
   * Digitar a quantidade direto no carrinho: kg aceita até 3 casas decimais (ex.: 1,298); unidade, pacote e kit são inteiros.
   * Se a quantidade passar do estoque, avisa e o campo volta ao valor anterior.
   */
  protected onQuantityInput(item: CartItem, input: HTMLInputElement): void {
    const parsed = parseFloat(String(input.value).replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      input.value = String(item.quantity);
      return;
    }

    const factor = item.unit === 'kg' ? 1000 : 1;
    const quantity = Math.round(parsed * factor) / factor;
    if (quantity <= 0) {
      this.removeFromCart(item);
      return;
    }
    if (!this.hasStockFor(item.id, item.name, item.unit, quantity)) {
      input.value = String(item.quantity);
      return;
    }

    input.value = String(quantity);
    this.cart.set(this.cart().map((i) => (i.id === item.id ? { ...i, quantity } : i)));
  }

  protected decrementQuantity(item: CartItem): void {
    const step = this.quantityStep(item.unit);
    const nextQty = Math.round((item.quantity - step) * 1000) / 1000;

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
    this.passFeeToCustomer.set(true);
  }

  protected selectPaymentOption(option: PaymentOption): void {
    this.selectedPaymentId.set(option.id);
    this.passFeeToCustomer.set(true);
    if (option.mode !== 'a_prazo') {
      this.selectedClientId.set(null);
      this.dueDate.set(this.defaultDueDate());
    }
  }

  private todayIso(): string {
    return todayLocalIso();
  }

  private defaultDueDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  protected togglePassFeeToCustomer(): void {
    this.passFeeToCustomer.set(!this.passFeeToCustomer());
  }

  protected setDiscount(value: number | string): void {
    const numeric = typeof value === 'number' ? value : parseFloat(value);
    this.discount.set(Number.isFinite(numeric) && numeric > 0 ? numeric : 0);
  }

  protected finalizeSale(): void {
    if (!this.appState.requirePermission(PERMISSION.SalesCreate)) return;
    if (this.cart().length === 0) {
      this.appState.triggerToast('Adicione ao menos um item ao carrinho antes de finalizar.');
      return;
    }

    const option = this.activePaymentOption();

    if (!option) {
      this.appState.triggerToast('Cadastre uma forma de pagamento ativa em Configurações antes de vender.');
      return;
    }

    if (option.mode === 'a_prazo' && !this.selectedClientId()) {
      this.appState.triggerToast('Selecione o cliente para registrar a venda a prazo.');
      return;
    }

    const short = this.cart().find((item) => this.lotShortage(item));
    if (short) {
      this.appState.triggerToast(`O lote escolhido para "${short.name}" não tem a quantidade pedida. Escolha outro lote ou reduza a quantidade.`);
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
      productId: item.kind === 'produto' ? item.id : undefined,
      kitId: item.kind === 'kit' ? item.id : undefined,
      stockBatchId: item.kind === 'produto' && item.lotId ? item.lotId : undefined,
    }));

    const client = this.selectedClient();
    const chargedTotal = this.chargedTotal();
    const netAmount = this.netAmount();
    const feeAmount = this.feeAmount();
    const itemsCount = this.totalItems();
    const dueDate = this.dueDate();

    this.api
      .processPosSale({
        total: chargedTotal,
        paymentMode: option.mode,
        cardFlag: option.mode === 'debito' || option.mode === 'credito_vista' || option.mode === 'parcelado'
          ? 'Visa/Mastercard'
          : undefined,
        clientId: client?.id,
        clientName: client?.name,
        dueDate: option.mode === 'a_prazo' ? dueDate : undefined,
        feeAmount,
        netAmount,
        items,
      })
      .subscribe({
        next: (result) => {
          this.saleSummary.set({
            saleId: result.saleId,
            receiptNumber: result.receiptNumber,
            total: chargedTotal,
            netAmount,
            feeAmount,
            paymentLabel: option.label,
            itemsCount,
            clientName: client?.name,
            dueDateLabel:
              option.mode === 'a_prazo' ? new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : undefined,
          });

          this.clearCart();
          this.appState.triggerToast(`Venda ${result.saleId} finalizada com sucesso!`);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 403) return; // o interceptor já avisa que falta permissão
          this.appState.triggerToast(err.error?.message ?? 'Não foi possível finalizar a venda. Tente novamente.');
        },
      });
  }

  protected closeSuccessModal(): void {
    this.saleSummary.set(null);
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
