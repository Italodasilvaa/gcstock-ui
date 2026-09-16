import { Service, inject, signal } from '@angular/core';
import { MockDataService } from './mock-data';
import { AuthSession } from '../models/models';

/**
 * Estado compartilhado da sessão/UI que hoje vive dentro do App.tsx
 * (sessão ativa, toast de notificação). Fica fora do MockDataService
 * porque é estado de apresentação, não dado persistido.
 */
@Service()
export class AppStateService {
  private readonly mockData = inject(MockDataService);

  readonly session = signal<AuthSession | null>(this.mockData.getCurrentSession());
  readonly toastMessage = signal<string | null>(null);

  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.mockData.change$.subscribe(() => {
      this.session.set(this.mockData.getCurrentSession());
    });
  }

  triggerToast(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimeoutId) clearTimeout(this.toastTimeoutId);
    this.toastTimeoutId = setTimeout(() => this.toastMessage.set(null), 3500);
  }

  logout(): void {
    this.mockData.logout();
    this.session.set(null);
  }
}
