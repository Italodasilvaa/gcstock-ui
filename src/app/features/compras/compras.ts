import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data';
import { AppStateService } from '../../core/services/app-state';
import { PurchaseEntry } from '../../core/models/models';

interface PurchaseFormModel {
  supplierName: string;
  supplierCnpj: string;
  supplierCity: string;
  supplierSif: string;
  nfeNumber: string;
  nfeSeries: string;
  itemsCount: number;
  totalWeightKg: number;
  totalAmount: number;
  shippingCost: number;
  paymentCondition: string;
  paymentMode: PurchaseEntry['paymentMode'];
}

function emptyForm(): PurchaseFormModel {
  return {
    supplierName: '',
    supplierCnpj: '',
    supplierCity: '',
    supplierSif: '',
    nfeNumber: '',
    nfeSeries: 'Série 1',
    itemsCount: 0,
    totalWeightKg: 0,
    totalAmount: 0,
    shippingCost: 0,
    paymentCondition: '',
    paymentMode: 'a_prazo',
  };
}

@Component({
  selector: 'app-compras',
  imports: [FormsModule],
  templateUrl: './compras.html',
})
export class Compras {
  private readonly mockData = inject(MockDataService);
  private readonly appState = inject(AppStateService);

  protected readonly purchases = signal<PurchaseEntry[]>(this.mockData.getPurchases());
  protected readonly isModalOpen = signal(false);
  protected readonly expandedPurchaseId = signal<string | null>(null);
  protected form: PurchaseFormModel = emptyForm();

  protected readonly paymentModeOptions: { value: PurchaseEntry['paymentMode']; label: string }[] = [
    { value: 'pix', label: 'Pix' },
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cartao', label: 'Cartão' },
    { value: 'a_prazo', label: 'A Prazo' },
  ];

  private refresh(): void {
    this.purchases.set(this.mockData.getPurchases());
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
    this.form = emptyForm();
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  protected saveEntry(): void {
    if (!this.form.supplierName.trim()) {
      this.appState.triggerToast('Informe o nome do fornecedor antes de salvar.');
      return;
    }
    if (!this.form.nfeNumber.trim()) {
      this.appState.triggerToast('Informe o número da NF-e antes de salvar.');
      return;
    }

    this.mockData.savePurchase({
      supplierName: this.form.supplierName,
      supplierCnpj: this.form.supplierCnpj,
      supplierCity: this.form.supplierCity,
      supplierSif: this.form.supplierSif,
      nfeNumber: this.form.nfeNumber,
      nfeSeries: this.form.nfeSeries,
      itemsCount: this.form.itemsCount,
      totalWeightKg: this.form.totalWeightKg,
      totalAmount: this.form.totalAmount,
      shippingCost: this.form.shippingCost,
      paymentCondition: this.form.paymentCondition,
      paymentMode: this.form.paymentMode,
      items: [],
    });

    this.refresh();
    this.isModalOpen.set(false);
    this.appState.triggerToast('Entrada de compra registrada com sucesso.');
  }
}
