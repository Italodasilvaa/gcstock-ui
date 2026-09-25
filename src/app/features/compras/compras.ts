import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiDataService } from '../../core/services/api-data';
import { AppStateService } from '../../core/services/app-state';
import { ProductItem, PurchaseEntry } from '../../core/models/models';
import { DateRange, emptyDateRange, isWithinDateRange } from '../../core/utils/date-range';
import { DateRangeFilter } from '../../shared/date-range-filter/date-range-filter';

/** Valor especial do <select> de produto que abre o mini-formulário de cadastro rápido. */
const NEW_PRODUCT_OPTION = '__new__';

/** Hoje no fuso local (toISOString usaria UTC e viraria o dia seguinte à noite). */
function todayLocalIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface PurchaseFormModel {
  /** yyyy-MM-dd — data em que a mercadoria chegou; vira a data do lote no estoque e a emissão da conta a pagar. */
  entryDate: string;
  supplierName: string;
  supplierCnpj: string;
  supplierCity: string;
  supplierSif: string;
  nfeNumber: string;
  nfeSeries: string;
  shippingCost: number;
  paymentCondition: string;
  paymentMode: PurchaseEntry['paymentMode'];
}

interface PurchaseFormItemRow {
  productId: string;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  unitCost: number;
  lotNumber: string;
  expiryDate: string;
  isPerishable: boolean;
  /** Quando true, o produto ainda não existe no catálogo e será criado automaticamente ao salvar a entrada. */
  isNewProduct: boolean;
  newCategory: string;
  newSellingPrice: number;
}

function emptyForm(): PurchaseFormModel {
  return {
    entryDate: todayLocalIso(),
    supplierName: '',
    supplierCnpj: '',
    supplierCity: '',
    supplierSif: '',
    nfeNumber: '',
    nfeSeries: 'Série 1',
    shippingCost: 0,
    paymentCondition: '',
    paymentMode: 'a_prazo',
  };
}

function emptyItemRow(): PurchaseFormItemRow {
  return {
    productId: '',
    name: '',
    code: '',
    unit: 'kg',
    quantity: 0,
    unitCost: 0,
    lotNumber: '',
    expiryDate: '',
    isPerishable: true,
    isNewProduct: false,
    newCategory: '',
    newSellingPrice: 0,
  };
}

@Component({
  selector: 'app-compras',
  imports: [FormsModule, DatePipe, DateRangeFilter],
  templateUrl: './compras.html',
})
export class Compras {
  private readonly api = inject(ApiDataService);
  private readonly appState = inject(AppStateService);

  protected readonly purchases = signal<PurchaseEntry[]>([]);
  protected readonly products = signal<ProductItem[]>([]);
  /** Sugestões para o campo Categoria ao cadastrar um produto novo pela nota. */
  protected readonly categoryNames = signal<string[]>([]);
  protected readonly today = todayLocalIso();
  protected readonly isModalOpen = signal(false);
  protected readonly isEditing = signal(false);
  protected editingPurchaseId: string | null = null;
  protected readonly expandedPurchaseId = signal<string | null>(null);
  protected form: PurchaseFormModel = emptyForm();
  protected readonly formItems = signal<PurchaseFormItemRow[]>([]);
  protected readonly dateRange = signal<DateRange>(emptyDateRange());

  protected readonly filteredPurchases = computed(() =>
    this.purchases().filter((p) => isWithinDateRange(p.entryDate, this.dateRange())),
  );

  protected readonly filteredTotalAmount = computed(() =>
    this.filteredPurchases().reduce((sum, p) => sum + p.totalAmount, 0),
  );

  protected readonly totalItemsAmount = computed(() =>
    this.formItems().reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
  );

  /** Peso total é sempre calculado a partir dos itens (soma da quantidade dos itens medidos em kg). */
  protected readonly totalWeightKg = computed(() =>
    this.formItems().reduce((sum, item) => sum + (item.unit === 'kg' ? item.quantity : 0), 0),
  );

  protected readonly paymentModeOptions: { value: PurchaseEntry['paymentMode']; label: string }[] = [
    { value: 'pix', label: 'Pix' },
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cartao', label: 'Cartão' },
    { value: 'a_prazo', label: 'A Prazo' },
  ];

  constructor() {
    this.refresh();
    this.api.getProducts().subscribe((list) => this.products.set(list));
    this.loadCategories();
  }

  private loadCategories(): void {
    this.api.getCategories().subscribe({
      next: (list) => this.categoryNames.set(list.map((c) => c.name)),
      error: () => this.categoryNames.set([]),
    });
  }

  private refresh(): void {
    this.api.getPurchases().subscribe((list) => this.purchases.set(list));
  }

  protected formatCurrency(value: number): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected paymentStatusBadgeClass(status: PurchaseEntry['paymentStatus']): string {
    return status === 'pago'
      ? 'bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30'
      : 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30';
  }

  protected paymentStatusLabel(status: PurchaseEntry['paymentStatus']): string {
    return status === 'pago' ? 'Pago' : 'Pendente';
  }

  protected paymentModeLabel(mode: PurchaseEntry['paymentMode']): string {
    return this.paymentModeOptions.find((o) => o.value === mode)?.label ?? mode;
  }

  protected toggleExpand(purchase: PurchaseEntry): void {
    this.expandedPurchaseId.set(this.expandedPurchaseId() === purchase.id ? null : purchase.id);
  }

  protected openNewEntryModal(): void {
    this.isEditing.set(false);
    this.editingPurchaseId = null;
    this.form = emptyForm();
    this.formItems.set([emptyItemRow()]);
    this.isModalOpen.set(true);
  }

  /** Compra paga é definitiva: não pode mais ser editada (o backend também recusa). */
  protected isLocked(purchase: PurchaseEntry): boolean {
    return purchase.paymentStatus === 'pago';
  }

  protected openEditEntryModal(purchase: PurchaseEntry): void {
    if (this.isLocked(purchase)) {
      this.appState.triggerToast('Esta compra já está paga e não pode mais ser alterada.');
      return;
    }
    this.isEditing.set(true);
    this.editingPurchaseId = purchase.id;
    this.form = {
      entryDate: purchase.entryDate?.slice(0, 10) || todayLocalIso(),
      supplierName: purchase.supplierName,
      supplierCnpj: purchase.supplierCnpj,
      supplierCity: purchase.supplierCity,
      supplierSif: purchase.supplierSif,
      nfeNumber: purchase.nfeNumber,
      nfeSeries: purchase.nfeSeries,
      shippingCost: purchase.shippingCost,
      paymentCondition: purchase.paymentCondition,
      paymentMode: purchase.paymentMode,
    };
    this.formItems.set(
      purchase.items.length > 0
        ? purchase.items.map((item) => ({
            productId: item.productId ?? '',
            name: item.name,
            code: item.code,
            unit: item.unit,
            quantity: item.quantity,
            unitCost: item.unitCost,
            lotNumber: item.lotNumber,
            expiryDate: item.expiryDate ?? '',
            isPerishable: item.isPerishable,
            isNewProduct: false,
            newCategory: '',
            newSellingPrice: 0,
          }))
        : [emptyItemRow()],
    );
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  protected addItemRow(): void {
    this.formItems.set([...this.formItems(), emptyItemRow()]);
  }

  protected removeItemRow(index: number): void {
    this.formItems.set(this.formItems().filter((_, i) => i !== index));
  }

  protected readonly newProductOption = NEW_PRODUCT_OPTION;

  /** Ao escolher um produto do catálogo, pré-preenche nome/código/unidade/custo/perecibilidade. */
  protected onProductSelected(row: PurchaseFormItemRow, productId: string): void {
    if (productId === NEW_PRODUCT_OPTION) {
      row.productId = '';
      row.isNewProduct = true;
      row.name = '';
      row.code = '';
      this.touchItems();
      return;
    }

    row.productId = productId;
    row.isNewProduct = false;
    const product = this.products().find((p) => p.id === productId);
    if (product) {
      row.name = product.name;
      row.code = product.code;
      row.unit = product.unit;
      row.unitCost = product.costPrice;
      row.isPerishable = product.isPerishable;
    }
    this.touchItems();
  }

  /** Volta o item para o modo de busca no catálogo, descartando os dados do produto novo digitados. */
  protected cancelNewProduct(row: PurchaseFormItemRow): void {
    row.isNewProduct = false;
    row.name = '';
    row.newCategory = '';
    row.newSellingPrice = 0;
    this.touchItems();
  }

  /**
   * `formItems` é um array de objetos editados por mutação direta (via ngModel); como os `computed()`
   * de totais só reavaliam quando a referência do signal muda, isso força esse "toque" após cada edição.
   */
  protected touchItems(): void {
    this.formItems.update((items) => [...items]);
  }

  protected itemSubtotal(row: PurchaseFormItemRow): number {
    return row.quantity * row.unitCost;
  }

  protected saveEntry(): void {
    if (!this.form.supplierName.trim()) {
      this.appState.triggerToast('Informe o nome do fornecedor antes de salvar.');
      return;
    }

    if (!this.form.entryDate) {
      this.appState.triggerToast('Informe a data da entrada da mercadoria.');
      return;
    }

    if (this.form.entryDate > todayLocalIso()) {
      this.appState.triggerToast('A data da entrada não pode ser no futuro.');
      return;
    }

    const validItems = this.formItems().filter(
      (item) => (item.productId || (item.isNewProduct && item.name.trim())) && item.quantity > 0,
    );
    if (validItems.length === 0) {
      this.appState.triggerToast('Selecione ou cadastre ao menos um produto e informe a quantidade recebida.');
      return;
    }

    const newProductRows = validItems.filter((item) => item.isNewProduct && !item.productId);
    if (newProductRows.length === 0) {
      this.submitPurchase(validItems);
      return;
    }

    // Cadastra primeiro os produtos que ainda não existem no catálogo; a compra só é enviada
    // depois que todos têm um productId real, pra somar certinho ao estoque de cada um.
    forkJoin(
      newProductRows.map((row) =>
        this.api.saveProduct({
          name: row.name.trim(),
          category: row.newCategory.trim() || undefined,
          unit: row.unit as ProductItem['unit'],
          stock: 0,
          costPrice: row.unitCost,
          sellingPrice: row.newSellingPrice || row.unitCost,
          isPerishable: row.isPerishable,
        }),
      ),
    ).subscribe({
      next: (createdProducts) => {
        createdProducts.forEach((product, i) => {
          const row = newProductRows[i];
          row.productId = product.id;
          row.code = product.code;
          row.isNewProduct = false;
        });
        this.api.getProducts().subscribe((list) => this.products.set(list));
        this.loadCategories();
        this.submitPurchase(validItems);
      },
      error: () => this.appState.triggerToast('Não foi possível cadastrar os novos produtos. Tente novamente.'),
    });
  }

  private submitPurchase(validItems: PurchaseFormItemRow[]): void {
    const payload = {
      entryDate: this.form.entryDate || todayLocalIso(),
      supplierName: this.form.supplierName,
      supplierCnpj: this.form.supplierCnpj,
      supplierCity: this.form.supplierCity,
      supplierSif: this.form.supplierSif,
      nfeNumber: this.form.nfeNumber,
      nfeSeries: this.form.nfeSeries,
      itemsCount: validItems.length,
      totalWeightKg: this.totalWeightKg(),
      totalAmount: this.totalItemsAmount(),
      shippingCost: this.form.shippingCost,
      paymentCondition: this.form.paymentCondition,
      paymentMode: this.form.paymentMode,
      items: validItems.map((item) => ({
        id: '',
        productId: item.productId,
        name: item.name,
        code: item.code,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        subtotal: this.itemSubtotal(item),
        expiryDate: item.expiryDate || null,
        lotNumber: item.lotNumber,
        isPerishable: item.isPerishable,
      })),
    };

    const request$ =
      this.isEditing() && this.editingPurchaseId
        ? this.api.updatePurchase(this.editingPurchaseId, payload)
        : this.api.savePurchase(payload);

    request$.subscribe({
      next: () => {
        this.refresh();
        this.isModalOpen.set(false);
        this.appState.triggerToast(
          this.isEditing()
            ? 'Entrada de compra atualizada e o estoque foi recalculado com sucesso.'
            : 'Entrada de compra registrada e somada ao estoque com sucesso.',
        );
      },
      error: () =>
        this.appState.triggerToast(
          this.isEditing()
            ? 'Não foi possível atualizar a entrada. Tente novamente.'
            : 'Não foi possível registrar a entrada. Tente novamente.',
        ),
    });
  }
}
