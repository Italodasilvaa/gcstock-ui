import { Component, DestroyRef, ElementRef, EventEmitter, HostListener, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AppStateService } from '../../core/services/app-state';
import { AppNotification, NotificationService } from '../../core/services/notifications';

/** Intervalo de atualização automática dos alertas do sino. */
const NOTIFICATIONS_REFRESH_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly appState = inject(AppStateService);
  protected readonly notifications = inject(NotificationService);

  @Output() openCompanySwitch = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() toggleSidebar = new EventEmitter<void>();

  protected readonly isNotificationsOpen = signal(false);

  constructor() {
    this.notifications.refresh();

    // Após salvar algo em outra tela (baixa de conta, entrada de estoque...), a troca de rota atualiza o contador.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.notifications.refresh());

    const timer = setInterval(() => this.notifications.refresh(), NOTIFICATIONS_REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected get companyName(): string {
    return this.appState.session()?.company.tradeName || 'Girus Carnes Nobres';
  }

  protected get userName(): string {
    return this.appState.session()?.user.name || 'Carlos Eduardo';
  }

  protected get userRole(): string {
    switch (this.appState.session()?.user.role) {
      case 'admin':
        return 'Administrador';
      case 'gerente':
        return 'Gerente';
      default:
        return 'Operador';
    }
  }

  /** Só o dono/administrador troca de empresa — funcionário fica vinculado à empresa dele. */
  protected get isOwnerSession(): boolean {
    return !this.appState.session()?.user.employeeId;
  }

  protected goToNewSale(): void {
    this.router.navigateByUrl('/vendas');
  }

  protected toggleNotifications(): void {
    const opening = !this.isNotificationsOpen();
    this.isNotificationsOpen.set(opening);
    if (opening) this.notifications.refresh();
  }

  protected openNotification(notification: AppNotification): void {
    this.isNotificationsOpen.set(false);
    this.router.navigateByUrl(notification.path);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.isNotificationsOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.isNotificationsOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.isNotificationsOpen.set(false);
  }
}
