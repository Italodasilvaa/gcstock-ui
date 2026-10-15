import { Service } from '@angular/core';

const TOKEN_KEY = 'gcstock_token';
const CHANNEL_NAME = 'gcstock-auth';
const RECOVER_TIMEOUT_MS = 300;

type AuthMessage = { type: 'request-token' } | { type: 'token'; token: string } | { type: 'logout' };

/**
 * Acesso ao JWT emitido pela GC Stock API.
 *
 * O token fica no sessionStorage de propósito: o navegador o apaga ao fechar a aba/janela, então fechar o app
 * (todas as abas) exige novo login. Recarregar a página (F5) mantém a sessão.
 *
 * Para que abrir o sistema em uma segunda aba não peça login, a aba nova pergunta às demais (BroadcastChannel,
 * restrito à mesma origem) se existe uma sessão ativa e copia o token. Enquanto qualquer aba estiver aberta, a sessão vive.
 */
@Service()
export class TokenStorageService {
  private readonly channel: BroadcastChannel | null =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

  private pendingRecovery: ((token: string | null) => void) | null = null;
  private remoteLogoutHandler: (() => void) | null = null;

  constructor() {
    // Remove tokens deixados no localStorage por versões anteriores, que sobreviviam ao fechamento do app.
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Armazenamento indisponível (modo restrito): sem efeito.
    }

    if (this.channel) {
      this.channel.onmessage = (event: MessageEvent<AuthMessage>) => this.handleMessage(event.data);
    }
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  /** Aba nova, sem token: tenta copiar a sessão de outra aba aberta. Resolve `true` se recebeu o token. */
  recoverFromOtherTabs(): Promise<boolean> {
    if (this.getToken()) return Promise.resolve(true);
    if (!this.channel) return Promise.resolve(false);

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.pendingRecovery = null;
        resolve(false);
      }, RECOVER_TIMEOUT_MS);

      this.pendingRecovery = (token) => {
        clearTimeout(timeoutId);
        this.pendingRecovery = null;
        if (token) this.setToken(token);
        resolve(token !== null);
      };

      this.channel!.postMessage({ type: 'request-token' } satisfies AuthMessage);
    });
  }

  /** Avisa as outras abas que o usuário clicou em Sair, para que também voltem ao login. */
  broadcastLogout(): void {
    this.channel?.postMessage({ type: 'logout' } satisfies AuthMessage);
  }

  /** Registra o que fazer quando outra aba fizer logout (limpar a sessão da UI e ir ao login). */
  onRemoteLogout(handler: () => void): void {
    this.remoteLogoutHandler = handler;
  }

  private handleMessage(message: AuthMessage): void {
    switch (message.type) {
      case 'request-token': {
        const token = this.getToken();
        if (token) this.channel?.postMessage({ type: 'token', token } satisfies AuthMessage);
        break;
      }
      case 'token':
        // Só aceita se esta aba está esperando (boot sem token); nunca sobrescreve uma sessão existente.
        this.pendingRecovery?.(message.token);
        break;
      case 'logout':
        if (this.getToken()) {
          this.clearToken();
          this.remoteLogoutHandler?.();
        }
        break;
    }
  }
}
