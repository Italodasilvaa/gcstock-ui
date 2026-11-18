import { HttpErrorResponse } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthSession, CompanyTenant } from '../models/models';
import { ApiDataService } from './api-data';
import { TokenStorageService } from './token-storage';
import { httpErrorMessage } from '../utils/http-error';

export type ToastKind = 'success' | 'warning' | 'error';

export interface Toast {
  message: string;
  kind: ToastKind;
  /** Muda a cada aviso, para a animação reiniciar mesmo com o mesmo texto. */
  id: number;
}

const ERROR_HINTS =
  /não foi possível|nao foi possivel|erro|falh|inválid|permissão|não é possível|não pode|insuficiente|excede|sem conexão|incorret|recusad|expirou|não encontrad/i;
const WARNING_HINTS =
  /^(informe|preencha|selecione|escolha|aguarde|adicione|cadastre|confirme)\b|precisa|existem |sem estoque|ajustad|apenas /i;

function inferToastKind(message: string): ToastKind {
  if (ERROR_HINTS.test(message)) return 'error';
  if (WARNING_HINTS.test(message)) return 'warning';
  return 'success';
}

/**
 * Estado compartilhado da sessão/UI (sessão ativa, toast de notificação).
 * A sessão é hidratada uma vez no boot do app (ver `provideAppInitializer` em app.config.ts)
 * a partir do token salvo, e atualizada a cada login/cadastro/troca de empresa bem-sucedidos.
 */
@Service()
export class AppStateService {
  private readonly api = inject(ApiDataService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);

  readonly session = signal<AuthSession | null>(null);
  readonly toast = signal<Toast | null>(null);

  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Outra aba clicou em Sair: encerra a sessão aqui também.
    this.tokenStorage.onRemoteLogout(() => {
      this.session.set(null);
      this.router.navigateByUrl('/login');
    });
  }

  /** Chamado uma única vez no boot do app — resolve assim que a sessão (se houver token) estiver pronta. */
  async bootstrap(): Promise<void> {
    // Aba nova: o token vive no sessionStorage (por aba); tenta copiá-lo de outra aba já logada.
    if (!this.tokenStorage.getToken() && !(await this.tokenStorage.recoverFromOtherTabs())) {
      return;
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

  /** Salva os dados cadastrais da empresa ativa e atualiza a sessão (nome no menu, barra superior etc.). */
  updateCurrentCompany(data: Parameters<ApiDataService['updateCurrentCompany']>[0]): Observable<CompanyTenant> {
    return this.api.updateCurrentCompany(data).pipe(
      tap((company) => this.session.update((s) => (s && s.company.id === company.id ? { ...s, company } : s))),
    );
  }

  private applySession(session: AuthSession): void {
    this.tokenStorage.setToken(session.token);
    this.session.set(session);
  }

  /** O usuário logado tem a permissão? (O dono da empresa recebe todas da API.) */
  can(permission: string): boolean {
    return this.session()?.user.permissions?.includes(permission) ?? false;
  }

  /** Tem ao menos uma das permissões? */
  canAny(...permissions: string[]): boolean {
    return permissions.some((p) => this.can(p));
  }

  /** Trava uma ação na tela: sem a permissão, avisa o usuário e devolve false. (A API também recusa com 403.) */
  requirePermission(permission: string): boolean {
    if (this.can(permission)) return true;
    this.triggerToast('Você não tem permissão para realizar esta ação.');
    return false;
  }

  /** Dono/administrador da empresa (não é funcionário). */
  isOwner(): boolean {
    const user = this.session()?.user;
    return !!user && !user.employeeId;
  }

  /**
   * Mostra um aviso no canto da tela. Sem `kind`, o tipo é deduzido do texto (as telas antigas só passam a mensagem):
   * falha/erro → vermelho, orientação ("Informe...", "Escolha...") → amarelo, o resto → verde.
   * Código novo deve passar o tipo ou usar `toastError` / `toastWarning`.
   */
  triggerToast(message: string, kind?: ToastKind): void {
    const resolved = kind ?? inferToastKind(message);
    this.toast.set({ message, kind: resolved, id: ++this.toastSeq });
    if (this.toastTimeoutId) clearTimeout(this.toastTimeoutId);
    // Erro fica mais tempo na tela: o usuário precisa ler o motivo.
    const duration = resolved === 'error' ? 7000 : resolved === 'warning' ? 5000 : 3500;
    this.toastTimeoutId = setTimeout(() => this.toast.set(null), duration);
  }

  toastError(message: string): void {
    this.triggerToast(message, 'error');
  }

  /**
   * Falha ao carregar dados de uma tela: toast vermelho com o motivo.
   * 403 não repete o aviso (o forbiddenInterceptor já mostrou "sem permissão").
   */
  notifyLoadError(error: unknown, what = 'os dados'): void {
    if (error instanceof HttpErrorResponse && error.status === 403) return;
    this.toastError(httpErrorMessage(error, `Não foi possível carregar ${what}. Tente novamente em instantes.`));
  }

  toastWarning(message: string): void {
    this.triggerToast(message, 'warning');
  }

  dismissToast(): void {
    if (this.toastTimeoutId) clearTimeout(this.toastTimeoutId);
    this.toast.set(null);
  }

  private toastSeq = 0;

  /**
   * `all` (padrão, clique em Sair): encerra a sessão em todas as abas abertas.
   * `local` (inatividade): só esta aba — não derruba quem está trabalhando em outra aba.
   */
  logout(scope: 'all' | 'local' = 'all'): void {
    this.api.logout().subscribe();
    this.tokenStorage.clearToken();
    this.session.set(null);
    if (scope === 'all') this.tokenStorage.broadcastLogout();
  }
}
