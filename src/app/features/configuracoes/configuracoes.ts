import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data';
import { AppStateService } from '../../core/services/app-state';
import { PaymentFeeSetting, GlobalAlertSetting } from '../../core/models/models';

@Component({
  selector: 'app-configuracoes',
  imports: [FormsModule],
  templateUrl: './configuracoes.html',
})
export class Configuracoes {
  private readonly mockData = inject(MockDataService);
  private readonly appState = inject(AppStateService);

  protected readonly fees = signal<PaymentFeeSetting[]>(this.mockData.getFees());
  protected readonly editingFee = signal<PaymentFeeSetting | null>(null);

  protected alertForm: GlobalAlertSetting = this.mockData.getAlertConfig();
  protected readonly newRecipient = signal('');

  protected onFeeUpdated(fee: PaymentFeeSetting): void {
    this.mockData.updateFee(fee.id, fee.feePercent, fee.active);
    this.appState.triggerToast(`Taxa de "${fee.method}" atualizada com sucesso.`);
  }

  protected toggleFeeActive(fee: PaymentFeeSetting): void {
    fee.active = !fee.active;
    this.onFeeUpdated(fee);
  }

  protected openEditFeeModal(fee: PaymentFeeSetting): void {
    this.editingFee.set({ ...fee });
  }

  protected closeEditFeeModal(): void {
    this.editingFee.set(null);
  }

  protected saveEditingFee(): void {
    const fee = this.editingFee();
    if (!fee) return;

    if (!fee.method.trim() || !fee.channel.trim()) {
      this.appState.triggerToast('Preencha ao menos o método e o canal/adquirente.');
      return;
    }

    const saved = this.mockData.saveFee(fee);
    this.fees.set(this.fees().map((f) => (f.id === saved.id ? saved : f)));
    this.appState.triggerToast(`Taxa de "${saved.method}" atualizada com sucesso.`);
    this.closeEditFeeModal();
  }

  protected addRecipient(): void {
    const value = this.newRecipient().trim();
    if (!value) {
      return;
    }
    this.alertForm.recipients = [...this.alertForm.recipients, value];
    this.newRecipient.set('');
  }

  protected removeRecipient(index: number): void {
    this.alertForm.recipients = this.alertForm.recipients.filter((_, i) => i !== index);
  }

  protected saveAlertConfig(): void {
    this.mockData.updateAlertConfig(this.alertForm);
    this.appState.triggerToast('Configurações de alertas sanitários salvas com sucesso.');
  }
}
