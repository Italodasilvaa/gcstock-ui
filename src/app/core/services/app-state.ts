import { Service, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthSession } from '../models/models';
import { ApiDataService } from './api-data';
import { TokenStorageService } from './token-storage';

/**
 * Estado compartilhado da sessão/UI (sessão ativa, toast de notificação).
 * A sessão é hidratada uma vez no boot do app (ver `provideAppInitializer` em app.config.ts)
 * a partir do token salvo, e atualizada a cada login/cadastro/troca de empresa bem-sucedidos.
 */
@Service()
export class AppStateService {
  private readonly api = inject(ApiDataService);
  private readonly tokenStorage = inject(TokenStorageService);

  readonly session = signal<AuthSession | null>(null);
  readonly toastMessage = signal<string | null>(null);

  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** Chamado uma única vez no boot do app — resolve assim que a sessão (se houver token) estiver pronta. */
  bootstrap(): Promise<void> {
    if (!this.tokenStorage.getToken()) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.api.getCurrentSession().subscribe({
        next: (session) => {
          this.session.set(session);
          resolve();
        },
        error: () => {
          this.tokenStorage.clearToken();
          this.session.set(null);
          resolve();
        },
      });
    });
  }

  login(email: string, password?: string): Observable<AuthSession | null> {
    return this.api.login(email, password).pipe(tap((session) => session && this.applySession(session)));
  }

  registerCompany(data: Parameters<ApiDataService['registerCompany']>[0]): Observable<AuthSession> {
    return this.api.registerCompany(data).pipe(tap((session) => this.applySession(session)));
  }

  switchCompany(companyId: string): Observable<AuthSession | null> {
    return this.api.switchCompany(companyId).pipe(tap((session) => session && this.applySession(session)));
  }

  /** Renova o token da sessão atual — chamado quando o usuário confirma presença no aviso de inatividade. */
  renewToken(): Observable<AuthSession | null> {
    return this.api.renewToken().pipe(tap((session) => session && this.applySession(session)));
  }

  private applySession(session: AuthSession): void {
    this.tokenStorage.setToken(session.token);
    this.session.set(session);
  }

  triggerToast(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimeoutId) clearTimeout(this.toastTimeoutId);
    this.toastTimeoutId = setTimeout(() => this.toastMessage.set(null), 3500);
  }

  logout(): void {
    this.api.logout().subscribe();
    this.tokenStorage.clearToken();
    this.session.set(null);
  }
}
