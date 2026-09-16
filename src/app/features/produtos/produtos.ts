import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data';
import { AppStateService } from '../../core/services/app-state';
import { ProductItem } from '../../core/models/models';

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
}

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
  };
}

@Component({
  selector: 'app-produtos',
  imports: [FormsModule],
  templateUrl: './produtos.html',
})
export class Produtos {
  private readonly mockData = inject(MockDataService);
  private readonly appState = inject(AppStateService);

  protected readonly products = signal<ProductItem[]>(this.mockData.getProducts());
  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal('todas');

  protected readonly isModalOpen = signal(false);
  protected readonly isEditing = signal(false);
  protected form: ProductFormModel = emptyForm();

  protected readonly categories = computed(() =>
    Array.from(new Set(this.products().map((p) => p.category))).sort((a, b) => a.localeCompare(b)),
  );

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
    this.products.set(this.mockData.getProducts());
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
    };
    this.isModalOpen.set(true);
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

    const { expiryDaysRemaining, expiryStatus } = this.computeExpiryMeta(this.form.nearestExpiry);

    this.mockData.saveProduct({
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
      nearestExpiry: this.form.nearestExpiry,
      expiryDaysRemaining,
      expiryStatus,
      lotNumber: this.form.lotNumber.trim(),
      supplier: this.form.supplier.trim(),
    });

    this.refresh();
    this.isModalOpen.set(false);
    this.appState.triggerToast(
      this.isEditing() ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.',
    );
  }

  protected removeProduct(product: ProductItem): void {
    const confirmed = confirm(`Excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    this.mockData.deleteProduct(product.id);
    this.refresh();
    this.appState.triggerToast('Produto excluído com sucesso.');
  }
}
