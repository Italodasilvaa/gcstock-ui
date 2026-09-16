import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data';
import { AppStateService } from '../../core/services/app-state';
import { Client } from '../../core/models/models';

interface ClientFormModel {
  id?: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  type: 'pf' | 'pj';
  creditLimit: number;
  favoriteCuts: string;
  notes: string;
}

function emptyForm(): ClientFormModel {
  return {
    name: '',
    document: '',
    phone: '',
    email: '',
    type: 'pf',
    creditLimit: 0,
    favoriteCuts: '',
    notes: '',
  };
}

@Component({
  selector: 'app-clientes',
  imports: [FormsModule],
  templateUrl: './clientes.html',
})
export class Clientes {
  private readonly mockData = inject(MockDataService);
  private readonly appState = inject(AppStateService);

  protected readonly clients = signal<Client[]>(this.mockData.getClients());
  protected readonly searchTerm = signal('');
  protected readonly isModalOpen = signal(false);
  protected readonly isEditing = signal(false);
  protected form: ClientFormModel = emptyForm();

  protected readonly filteredClients = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.clients();
    return this.clients().filter(
      (c) => c.name.toLowerCase().includes(term) || c.document.toLowerCase().includes(term),
    );
  });

  private refresh(): void {
    this.clients.set(this.mockData.getClients());
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected typeLabel(type: Client['type']): string {
    return type === 'pj' ? 'PJ' : 'PF';
  }

  protected typeBadgeClass(type: Client['type']): string {
    return type === 'pj'
      ? 'bg-[#0F1F3D]/10 text-[#0F1F3D] border border-[#0F1F3D]/30'
      : 'bg-[#d8a34a]/10 text-[#8a6a2e] border border-[#d8a34a]/40';
  }

  protected openNewClientModal(): void {
    this.isEditing.set(false);
    this.form = emptyForm();
    this.isModalOpen.set(true);
  }

  protected openEditClientModal(client: Client): void {
    this.isEditing.set(true);
    this.form = {
      id: client.id,
      name: client.name,
      document: client.document,
      phone: client.phone,
      email: client.email || '',
      type: client.type,
      creditLimit: client.creditLimit,
      favoriteCuts: client.favoriteCuts,
      notes: client.notes || '',
    };
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  protected saveClient(): void {
    if (!this.form.name.trim()) {
      this.appState.triggerToast('Informe o nome do cliente antes de salvar.');
      return;
    }
    if (!this.form.document.trim()) {
      this.appState.triggerToast('Informe o CPF/CNPJ do cliente antes de salvar.');
      return;
    }

    this.mockData.saveClient({
      id: this.form.id,
      name: this.form.name,
      document: this.form.document,
      phone: this.form.phone,
      email: this.form.email,
      type: this.form.type,
      creditLimit: this.form.creditLimit,
      favoriteCuts: this.form.favoriteCuts,
      notes: this.form.notes,
    });

    this.refresh();
    this.isModalOpen.set(false);
    this.appState.triggerToast(
      this.isEditing() ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.',
    );
  }
}
