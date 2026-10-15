import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiDataService } from '../../core/services/api-data';
import { CartBridgeService } from '../../core/services/cart-bridge';
import { AppStateService } from '../../core/services/app-state';
import { PERMISSION } from '../../core/models/permissions';
import { BarbecueKit, ProductItem } from '../../core/models/models';
import { resizeImageToJpeg } from '../../core/utils/image-resize';

/** Maior lado da foto enviada ao storage — reduz o tamanho sem perder qualidade nos cards. */
const MAX_IMAGE_SIDE = 800;

interface KitFormModel {
  id?: string;
  name: string;
  tag: string;
  serveLabel: string;
  description: string;
  suggestedPrice: number;
  totalWeightKg: number;
  imageUrl: string;
}

interface KitFormComponentRow {
  productId: string;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  unitCost: number;
  availableStock: number;
}

function emptyForm(): KitFormModel {
  return {
    name: '',
    tag: '',
    serveLabel: 'Serve 6 a 8 pessoas',
    description: '',
    suggestedPrice: 0,
    totalWeightKg: 0,
    imageUrl: '',
  };
}

function emptyComponentRow(): KitFormComponentRow {
  return { productId: '', name: '', code: '', unit: 'kg', quantity: 0, unitCost: 0, availableStock: 0 };
}

@Component({
  selector: 'app-kits',
  imports: [FormsModule],
  templateUrl: './kits.html',
})
export class Kits {
  private readonly api = inject(ApiDataService);
  private readonly cartBridge = inject(CartBridgeService);
  private readonly appState = inject(AppStateService);
  protected readonly PERMISSION = PERMISSION;

  protected can(permission: string): boolean {
    return this.appState.can(permission);
  }
  private readonly router = inject(Router);

  protected readonly kits = signal<BarbecueKit[]>([]);
  protected readonly isUploadingImage = signal(false);
  protected readonly products = signal<ProductItem[]>([]);
  protected readonly isModalOpen = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly expandedKitId = signal<string | null>(null);
  protected form: KitFormModel = emptyForm();
  protected readonly formComponents = signal<KitFormComponentRow[]>([]);

  protected readonly totalComponentsCost = computed(() =>
    this.formComponents().reduce((sum, c) => sum + c.quantity * c.unitCost, 0),
  );

  constructor() {
    this.refresh();
    this.api.getProducts().subscribe((list) => this.products.set(list));
  }

  private refresh(): void {
    this.api.getKits().subscribe((list) => this.kits.set(list));
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
    if (!this.appState.requirePermission(PERMISSION.KitsCreate)) return;
    this.isEditing.set(false);
    this.form = emptyForm();
    this.formComponents.set([emptyComponentRow()]);
    this.isModalOpen.set(true);
  }

  protected openEditKitModal(kit: BarbecueKit): void {
    if (!this.appState.requirePermission(PERMISSION.KitsEdit)) return;
    this.isEditing.set(true);
    this.form = {
      id: kit.id,
      name: kit.name,
      tag: kit.tag,
      serveLabel: kit.serveLabel,
      description: kit.description,
      suggestedPrice: kit.suggestedPrice,
      totalWeightKg: kit.totalWeightKg,
      imageUrl: kit.imageUrl,
    };
    this.formComponents.set(
      kit.components.length > 0
        ? kit.components.map((c) => ({
            productId: c.productId,
            name: c.name,
            code: c.code,
            unit: c.unit,
            quantity: c.quantity,
            unitCost: c.unitCost,
            availableStock: c.availableStock,
          }))
        : [emptyComponentRow()],
    );
    this.isModalOpen.set(true);
  }

  /** Reduz a foto no navegador e envia ao storage (R2) pela API; o formulário guarda só a URL pública. */
  protected async onImageFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.appState.triggerToast('Selecione um arquivo de imagem (JPG, PNG, etc.).');
      return;
    }

    this.isUploadingImage.set(true);
    try {
      const resized = await resizeImageToJpeg(file, MAX_IMAGE_SIDE);
      this.api.uploadFile(resized, 'kits').subscribe({
        next: (uploaded) => {
          this.form.imageUrl = uploaded.url;
          this.isUploadingImage.set(false);
        },
        error: () => {
          this.isUploadingImage.set(false);
          this.appState.triggerToast('Não foi possível enviar a imagem. Tente novamente.');
        },
      });
    } catch {
      this.isUploadingImage.set(false);
      this.appState.triggerToast('Não foi possível ler essa imagem.');
    }
  }

  protected addComponentRow(): void {
    this.formComponents.set([...this.formComponents(), emptyComponentRow()]);
  }

  protected removeComponentRow(index: number): void {
    this.formComponents.set(this.formComponents().filter((_, i) => i !== index));
  }

  /** Ao escolher um produto do estoque, pré-preenche nome/código/unidade/custo/saldo disponível. */
  protected onComponentProductSelected(row: KitFormComponentRow, productId: string): void {
    row.productId = productId;
    const product = this.products().find((p) => p.id === productId);
    if (product) {
      row.name = product.name;
      row.code = product.code;
      row.unit = product.unit;
      row.unitCost = product.costPrice;
      row.availableStock = product.stock;
    }
    this.touchComponents();
  }

  /**
   * `formComponents` é editado por mutação direta (via ngModel); como `totalComponentsCost` só
   * reavalia quando a referência do signal muda, isso força esse "toque" após cada edição.
   */
  protected touchComponents(): void {
    this.formComponents.update((components) => [...components]);
  }

  protected componentSubtotal(row: KitFormComponentRow): number {
    return row.quantity * row.unitCost;
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  protected saveKit(): void {
    if (this.isUploadingImage()) {
      this.appState.triggerToast('Aguarde o envio da imagem terminar.');
      return;
    }
    if (!this.form.name.trim()) {
      this.appState.triggerToast('Informe o nome do kit antes de salvar.');
      return;
    }

    const validComponents = this.formComponents().filter((c) => c.productId && c.quantity > 0);
    if (validComponents.length === 0) {
      this.appState.triggerToast('Selecione ao menos um produto do estoque para compor o kit.');
      return;
    }

    const costPrice = this.totalComponentsCost();
    const marginPercent =
      this.form.suggestedPrice > 0 ? ((this.form.suggestedPrice - costPrice) / this.form.suggestedPrice) * 100 : 0;
    const componentsSummary = validComponents.map((c) => `${c.name} (${c.quantity}${c.unit})`).join(', ');

    this.api
      .saveKit({
        id: this.form.id,
        name: this.form.name,
        tag: this.form.tag,
        serveLabel: this.form.serveLabel,
        description: this.form.description,
        suggestedPrice: this.form.suggestedPrice,
        costPrice,
        marginPercent: Math.round(marginPercent * 10) / 10,
        totalWeightKg: this.form.totalWeightKg,
        imageUrl: this.form.imageUrl,
        componentsSummary,
        components: validComponents.map((c) => ({
          productId: c.productId,
          name: c.name,
          code: c.code,
          lotNumber: '',
          quantity: c.quantity,
          unit: c.unit,
          unitCost: c.unitCost,
          subtotal: this.componentSubtotal(c),
          availableStock: c.availableStock,
        })),
      })
      .subscribe({
        next: () => {
          this.refresh();
          this.isModalOpen.set(false);
          this.appState.triggerToast(
            this.isEditing()
              ? 'Kit de churrasco atualizado com sucesso.'
              : 'Kit de churrasco criado com sucesso. A venda dele agora baixa automaticamente o estoque dos componentes.',
          );
        },
        error: () => this.appState.triggerToast('Não foi possível salvar o kit. Tente novamente.'),
      });
  }

  protected sellKit(kit: BarbecueKit): void {
    this.cartBridge.setKitForSale(kit);
    this.router.navigateByUrl('/vendas');
  }

  /** Vender um kit nunca o exclui — só baixa o estoque dos componentes. Excluir é sempre uma ação explícita. */
  protected removeKit(kit: BarbecueKit): void {
    if (!this.appState.requirePermission(PERMISSION.KitsDelete)) return;
    if (!confirm(`Excluir o kit "${kit.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    this.api.deleteKit(kit.id).subscribe({
      next: () => {
        this.refresh();
        this.appState.triggerToast(`Kit "${kit.name}" excluído com sucesso.`);
      },
      error: () => this.appState.triggerToast('Não foi possível excluir o kit. Tente novamente.'),
    });
  }
}
