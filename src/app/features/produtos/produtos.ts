import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiDataService } from '../../core/services/api-data';
import { AppStateService } from '../../core/services/app-state';
import { ProductCategory, ProductItem } from '../../core/models/models';

interface ProductFormModel {
  id?: string;
  name: string;
  sku: string;
  category: string;
  unit: ProductItem['unit'];
  stock: number;
  minStock: number;
  costPrice: number;
  sellingPrice: number;
  isPerishable: boolean;
  alertDays: number;
  storageTemp: string;
  nearestExpiry: string;
  lotNumber: string;
  supplier: string;
  imageUrl: string;
}

/** Maior lado da foto salva — reduz o tamanho enviado à API sem perder qualidade nos cards. */
const MAX_IMAGE_SIDE = 800;

function emptyForm(): ProductFormModel {
  return {
    name: '',
    sku: '',
    category: 'Carnes Bovinas',
    unit: 'kg',
    stock: 0,
    minStock: 0,
    costPrice: 0,
    sellingPrice: 0,
    isPerishable: true,
    alertDays: 3,
    storageTemp: '-2°C a 2°C',
    nearestExpiry: '',
    lotNumber: '',
    supplier: '',
    imageUrl: '',
  };
}

@Component({
  selector: 'app-produtos',
  imports: [FormsModule, DatePipe],
  templateUrl: './produtos.html',
})
export class Produtos {
  private readonly api = inject(ApiDataService);
  private readonly appState = inject(AppStateService);

  protected readonly products = signal<ProductItem[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal('todas');

  constructor() {
    this.refresh();
  }

  protected readonly isModalOpen = signal(false);
  protected readonly isEditing = signal(false);
  protected form: ProductFormModel = emptyForm();

  private readonly registeredCategories = signal<ProductCategory[]>([]);

  /** Categorias cadastradas (na ordem definida no PDV) + qualquer categoria de produto ainda não cadastrada. */
  protected readonly categories = computed(() => {
    const names = this.registeredCategories().map((c) => c.name);
    const extras = this.products()
      .map((p) => p.category)
      .filter((name) => name && !names.includes(name));
    return Array.from(new Set([...names, ...extras.sort((a, b) => a.localeCompare(b))]));
  });

  protected readonly filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.categoryFilter();

    return this.products().filter((p) => {
      const matchesTerm =
        !term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.code.toLowerCase().includes(term);
      const matchesCategory = category === 'todas' || p.category === category;
      return matchesTerm && matchesCategory;
    });
  });

  private refresh(): void {
    this.api.getProducts().subscribe((list) => this.products.set(list));
    this.api.getCategories().subscribe((list) => this.registeredCategories.set(list));
  }

  protected formatCurrency(value: number): string {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected isLowStock(product: ProductItem): boolean {
    return product.stock < product.minStock;
  }

  protected expiryBadgeClass(status: ProductItem['expiryStatus']): string {
    switch (status) {
      case 'vencido':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/30';
      case 'critico':
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30';
      default:
        return 'bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30';
    }
  }

  protected expiryStatusLabel(status: ProductItem['expiryStatus']): string {
    switch (status) {
      case 'vencido':
        return 'Vencido';
      case 'critico':
        return 'Crítico';
      case 'longo':
        return 'Longo prazo';
      default:
        return 'Normal';
    }
  }

  protected openNewProductModal(): void {
    this.isEditing.set(false);
    this.form = emptyForm();
    this.isModalOpen.set(true);
  }

  protected openEditProductModal(product: ProductItem): void {
    this.isEditing.set(true);
    this.form = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      stock: product.stock,
      minStock: product.minStock,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      isPerishable: product.isPerishable,
      alertDays: product.alertDays,
      storageTemp: product.storageTemp,
      nearestExpiry: product.nearestExpiry,
      lotNumber: product.lotNumber,
      supplier: product.supplier,
      imageUrl: product.imageUrl ?? '',
    };
    this.isModalOpen.set(true);
  }

  protected onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.appState.triggerToast('Selecione um arquivo de imagem (JPG, PNG, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        this.form.imageUrl = canvas.toDataURL('image/jpeg', 0.85);
      };
      img.onerror = () => this.appState.triggerToast('Não foi possível ler essa imagem.');
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  /**
   * Calcula dias restantes e status de validade a partir da data informada
   * no formulário, mantendo os badges da listagem coerentes com o cadastro.
   */
  private computeExpiryMeta(dateStr: string): {
    expiryDaysRemaining: number;
    expiryStatus: ProductItem['expiryStatus'];
  } {
    const parsed = new Date(dateStr);
    if (!dateStr || isNaN(parsed.getTime())) {
      return { expiryDaysRemaining: 999, expiryStatus: 'longo' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsed.setHours(0, 0, 0, 0);
    const diffDays = Math.round((parsed.getTime() - today.getTime()) / 86400000);

    let status: ProductItem['expiryStatus'];
    if (diffDays < 0) status = 'vencido';
    else if (diffDays <= 7) status = 'critico';
    else if (diffDays <= 180) status = 'normal';
    else status = 'longo';

    return { expiryDaysRemaining: diffDays, expiryStatus: status };
  }

  protected saveProduct(): void {
    if (!this.form.name.trim() || !this.form.sku.trim()) {
      this.appState.triggerToast('Informe nome e SKU do produto antes de salvar.');
      return;
    }

    // Validade é opcional: normalmente vem dos lotes lançados em Compras. Vazia = não envia (a API mantém/define).
    const expiryFields = this.form.nearestExpiry
      ? { nearestExpiry: this.form.nearestExpiry, ...this.computeExpiryMeta(this.form.nearestExpiry) }
      : {};

    this.api
      .saveProduct({
        id: this.form.id,
        name: this.form.name.trim(),
        sku: this.form.sku.trim().toUpperCase(),
        category: this.form.category.trim() || 'Carnes Bovinas',
        unit: this.form.unit,
        stock: Number(this.form.stock) || 0,
        minStock: Number(this.form.minStock) || 0,
        costPrice: Number(this.form.costPrice) || 0,
        sellingPrice: Number(this.form.sellingPrice) || 0,
        isPerishable: this.form.isPerishable,
        alertDays: Number(this.form.alertDays) || 0,
        storageTemp: this.form.storageTemp.trim(),
        ...expiryFields,
        lotNumber: this.form.lotNumber.trim(),
        supplier: this.form.supplier.trim(),
        imageUrl: this.form.imageUrl.trim(),
      })
      .subscribe({
        next: () => {
          this.refresh();
          this.isModalOpen.set(false);
          this.appState.triggerToast(
            this.isEditing() ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.',
          );
        },
        error: () => this.appState.triggerToast('Não foi possível salvar o produto. Tente novamente.'),
      });
  }

  protected removeProduct(product: ProductItem): void {
    const confirmed = confirm(`Excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    this.api.deleteProduct(product.id).subscribe({
      next: () => {
        this.refresh();
        this.appState.triggerToast('Produto excluído com sucesso.');
      },
      error: () => this.appState.triggerToast('Não foi possível excluir o produto. Tente novamente.'),
    });
  }
}
