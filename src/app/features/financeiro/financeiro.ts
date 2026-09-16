import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data';
import { AppStateService } from '../../core/services/app-state';
import {
  AccountsPayableTitle,
  AccountsReceivableTitle,
  CardSettlementTitle,
} from '../../core/models/models';

type FinanceiroTab = 'dre' | 'pagar' | 'receber' | 'cartoes';

interface PayableFormModel {
  supplier: string;
  description: string;
  nfeReference: string;
  dueDate: string;
  amount: number;
  paymentMethod: string;
  origin: string;
}

interface ReceivableFormModel {
  clientOrOrigin: string;
  subCategory: string;
  reference: string;
  dueDate: string;
  grossAmount: number;
  feeRetention: number;
  type: AccountsReceivableTitle['type'];
  paymentModeDesc: string;
}

function emptyPayableForm(): PayableFormModel {
  return {
    supplier: '',
    description: '',
    nfeReference: '',
    dueDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'Boleto Bancário',
    origin: 'Despesa Manual',
  };
}

function emptyReceivableForm(): ReceivableFormModel {
  return {
    clientOrOrigin: '',
    subCategory: '',
    reference: '',
    dueDate: new Date().toISOString().split('T')[0],
    grossAmount: 0,
    feeRetention: 0,
    type: 'b2b',
    paymentModeDesc: 'Boleto / Pix',
  };
}

@Component({
  selector: 'app-financeiro',
  imports: [FormsModule],
  templateUrl: './financeiro.html',
})
export class Financeiro implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly mockData = inject(MockDataService);
  private readonly appState = inject(AppStateService);

  protected readonly activeTab = signal<FinanceiroTab>('dre');

  protected readonly payables = signal<AccountsPayableTitle[]>(this.mockData.getPayables());
  protected readonly receivables = signal<AccountsReceivableTitle[]>(this.mockData.getReceivables());
  protected readonly cardSettlements = signal<CardSettlementTitle[]>(this.mockData.getCardSettlements());

  protected readonly isPayableModalOpen = signal(false);
  protected readonly isReceivableModalOpen = signal(false);
  protected payableForm: PayableFormModel = emptyPayableForm();
  protected receivableForm: ReceivableFormModel = emptyReceivableForm();

  // KPIs - DRE
  protected readonly totalPayableOpen = computed(() =>
    this.payables()
      .filter((p) => p.status !== 'pago')
      .reduce((sum, p) => sum + p.amount, 0),
  );

  protected readonly totalPayableOverdue = computed(() =>
    this.payables()
      .filter((p) => p.status === 'vencido')
      .reduce((sum, p) => sum + p.amount, 0),
  );

  protected readonly totalReceivableOpen = computed(() =>
    this.receivables()
      .filter((r) => r.status !== 'recebido')
      .reduce((sum, r) => sum + r.netAmount, 0),
  );

  protected readonly totalReceivableOverdue = computed(() =>
    this.receivables()
      .filter((r) => r.status === 'vencido')
      .reduce((sum, r) => sum + r.netAmount, 0),
  );

  protected readonly projectedBalance = computed(
    () => this.totalReceivableOpen() - this.totalPayableOpen(),
  );

  protected readonly pendingCardSettlements = computed(() =>
    this.cardSettlements().filter((c) => c.status === 'a_liquidar'),
  );

  protected readonly pendingCardSettlementsTotal = computed(() =>
    this.pendingCardSettlements().reduce((sum, c) => sum + c.netAmount, 0),
  );

  ngOnInit(): void {
    const initialTab = this.route.snapshot.data['initialTab'] as FinanceiroTab | undefined;
    this.activeTab.set(initialTab ?? 'dre');
  }

  private refreshPayables(): void {
    this.payables.set(this.mockData.getPayables());
  }

  private refreshReceivables(): void {
    this.receivables.set(this.mockData.getReceivables());
  }

  private refreshCardSettlements(): void {
    this.cardSettlements.set(this.mockData.getCardSettlements());
  }

  protected setTab(tab: FinanceiroTab): void {
    this.activeTab.set(tab);
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Contas a Pagar
  protected payableStatusLabel(status: AccountsPayableTitle['status']): string {
    switch (status) {
      case 'vencido':
        return 'Vencido';
      case 'a_vencer':
        return 'A Vencer';
      case 'pago':
        return 'Pago';
    }
  }

  protected payableStatusClasses(status: AccountsPayableTitle['status']): string {
    switch (status) {
      case 'vencido':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/30';
      case 'a_vencer':
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30';
      case 'pago':
        return 'bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30';
    }
  }

  protected settlePayable(item: AccountsPayableTitle): void {
    this.mockData.settlePayable(item.id, 'Conta Padrão', 'Manual');
    this.refreshPayables();
    this.appState.triggerToast(`Título "${item.description}" baixado com sucesso.`);
  }

  protected openNewPayableModal(): void {
    this.payableForm = emptyPayableForm();
    this.isPayableModalOpen.set(true);
  }

  protected closePayableModal(): void {
    this.isPayableModalOpen.set(false);
  }

  protected savePayable(): void {
    if (!this.payableForm.supplier.trim() || !this.payableForm.description.trim()) {
      this.appState.triggerToast('Informe o fornecedor e a descrição antes de salvar.');
      return;
    }

    this.mockData.addPayable({
      supplier: this.payableForm.supplier,
      description: this.payableForm.description,
      nfeReference: this.payableForm.nfeReference || 'Doc Manual',
      dueDate: this.payableForm.dueDate,
      dueLabel: new Date(this.payableForm.dueDate + 'T00:00:00').toLocaleDateString('pt-BR'),
      amount: Number(this.payableForm.amount) || 0,
      paymentMethod: this.payableForm.paymentMethod,
      origin: this.payableForm.origin,
    });

    this.refreshPayables();
    this.isPayableModalOpen.set(false);
    this.appState.triggerToast('Novo lançamento de contas a pagar criado com sucesso.');
  }

  // Contas a Receber
  protected receivableStatusLabel(status: AccountsReceivableTitle['status']): string {
    switch (status) {
      case 'vencido':
        return 'Vencido';
      case 'a_vencer':
        return 'A Vencer';
      case 'recebido':
        return 'Recebido';
    }
  }

  protected receivableStatusClasses(status: AccountsReceivableTitle['status']): string {
    switch (status) {
      case 'vencido':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/30';
      case 'a_vencer':
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30';
      case 'recebido':
        return 'bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30';
    }
  }

  protected receivableTypeLabel(type: AccountsReceivableTitle['type']): string {
    switch (type) {
      case 'b2b':
        return 'B2B';
      case 'adquirente':
        return 'Adquirente';
      case 'evento':
        return 'Evento';
    }
  }

  protected settleReceivable(item: AccountsReceivableTitle): void {
    this.mockData.settleReceivable(item.id);
    this.refreshReceivables();
    this.appState.triggerToast(`Título de "${item.clientOrOrigin}" marcado como recebido.`);
  }

  protected openNewReceivableModal(): void {
    this.receivableForm = emptyReceivableForm();
    this.isReceivableModalOpen.set(true);
  }

  protected closeReceivableModal(): void {
    this.isReceivableModalOpen.set(false);
  }

  protected saveReceivable(): void {
    if (!this.receivableForm.clientOrOrigin.trim()) {
      this.appState.triggerToast('Informe o cliente ou origem antes de salvar.');
      return;
    }

    const gross = Number(this.receivableForm.grossAmount) || 0;
    const fee = Number(this.receivableForm.feeRetention) || 0;

    this.mockData.addReceivable({
      clientOrOrigin: this.receivableForm.clientOrOrigin,
      subCategory: this.receivableForm.subCategory || 'Venda a Prazo',
      reference: this.receivableForm.reference || undefined,
      dueDate: this.receivableForm.dueDate,
      dueLabel: new Date(this.receivableForm.dueDate + 'T00:00:00').toLocaleDateString('pt-BR'),
      grossAmount: gross,
      feeRetention: fee,
      netAmount: gross - fee,
      type: this.receivableForm.type,
      paymentModeDesc: this.receivableForm.paymentModeDesc,
    });

    this.refreshReceivables();
    this.isReceivableModalOpen.set(false);
    this.appState.triggerToast('Novo lançamento de contas a receber criado com sucesso.');
  }

  // Liquidação de Cartões
  protected cardStatusLabel(status: CardSettlementTitle['status']): string {
    switch (status) {
      case 'a_liquidar':
        return 'A Liquidar';
      case 'liquidado':
        return 'Liquidado';
      case 'antecipado':
        return 'Antecipado';
    }
  }

  protected cardStatusClasses(status: CardSettlementTitle['status']): string {
    switch (status) {
      case 'a_liquidar':
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30';
      case 'liquidado':
        return 'bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/30';
      case 'antecipado':
        return 'bg-[#0F1F3D]/10 text-[#0F1F3D] border border-[#0F1F3D]/30';
    }
  }

  protected anticipateCard(item: CardSettlementTitle): void {
    this.mockData.anticipateCardTitle(item.id);
    this.refreshCardSettlements();
    this.appState.triggerToast(`Recebível da ${item.acquirer} antecipado com sucesso.`);
  }
}
