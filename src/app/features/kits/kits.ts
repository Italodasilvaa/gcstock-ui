import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data';
import { CartBridgeService } from '../../core/services/cart-bridge';
import { AppStateService } from '../../core/services/app-state';
import { BarbecueKit } from '../../core/models/models';

interface KitFormModel {
  id?: string;
  name: string;
  tag: string;
  serveLabel: string;
  description: string;
  suggestedPrice: number;
  costPrice: number;
  totalWeightKg: number;
  imageUrl: string;
  componentsSummary: string;
}

function emptyForm(): KitFormModel {
  return {
    name: '',
    tag: '',
    serveLabel: 'Serve 6 a 8 pessoas',
    description: '',
    suggestedPrice: 0,
    costPrice: 0,
    totalWeightKg: 0,
    imageUrl: '',
    componentsSummary: '',
  };
}

@Component({
  selector: 'app-kits',
  imports: [FormsModule],
  templateUrl: './kits.html',
})
export class Kits {
  private readonly mockData = inject(MockDataService);
  private readonly cartBridge = inject(CartBridgeService);
  private readonly appState = inject(AppStateService);
  private readonly router = inject(Router);

  protected readonly kits = signal<BarbecueKit[]>(this.mockData.getKits());
  protected readonly isModalOpen = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly expandedKitId = signal<string | null>(null);
  protected form: KitFormModel = emptyForm();

  private refresh(): void {
    this.kits.set(this.mockData.getKits());
  }

  protected stockBadgeClass(status: BarbecueKit['stockStatus']): string {
    switch (status) {
      case 'amplo':
        return 'bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30';
      case 'alerta':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/30';
      default:
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30';
    }
  }

  protected stockLabel(status: BarbecueKit['stockStatus']): string {
    switch (status) {
      case 'amplo':
        return 'Estoque amplo';
      case 'alerta':
        return 'Estoque em alerta';
      default:
        return 'Disponível';
    }
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected toggleExpand(kit: BarbecueKit): void {
    this.expandedKitId.set(this.expandedKitId() === kit.id ? null : kit.id);
  }

  protected openNewKitModal(): void {
    this.isEditing.set(false);
    this.form = emptyForm();
    this.isModalOpen.set(true);
  }

  protected openEditKitModal(kit: BarbecueKit): void {
    this.isEditing.set(true);
    this.form = {
      id: kit.id,
      name: kit.name,
      tag: kit.tag,
      serveLabel: kit.serveLabel,
      description: kit.description,
      suggestedPrice: kit.suggestedPrice,
      costPrice: kit.costPrice,
      totalWeightKg: kit.totalWeightKg,
      imageUrl: kit.imageUrl,
      componentsSummary: kit.componentsSummary,
    };
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  protected saveKit(): void {
    if (!this.form.name.trim()) {
      this.appState.triggerToast('Informe o nome do kit antes de salvar.');
      return;
    }

    const marginPercent =
      this.form.suggestedPrice > 0
        ? ((this.form.suggestedPrice - this.form.costPrice) / this.form.suggestedPrice) * 100
        : 0;

    this.mockData.saveKit({
      id: this.form.id,
      name: this.form.name,
      tag: this.form.tag,
      serveLabel: this.form.serveLabel,
      description: this.form.description,
      suggestedPrice: this.form.suggestedPrice,
      costPrice: this.form.costPrice,
      marginPercent: Math.round(marginPercent * 10) / 10,
      totalWeightKg: this.form.totalWeightKg,
      imageUrl: this.form.imageUrl,
      componentsSummary: this.form.componentsSummary,
    });

    this.refresh();
    this.isModalOpen.set(false);
    this.appState.triggerToast(
      this.isEditing() ? 'Kit de churrasco atualizado com sucesso.' : 'Kit de churrasco criado com sucesso.',
    );
  }

  protected sellKit(kit: BarbecueKit): void {
    this.cartBridge.setKitForSale(kit);
    this.router.navigateByUrl('/vendas');
  }
}
