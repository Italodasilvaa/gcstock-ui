import { Service, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from './app-state';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const WARNING_DURATION_S = 2 * 60;
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Detecta inatividade do usuário (5 min sem interação), exibe um aviso "você está online?"
 * com contagem regressiva de 2 min e, se confirmado, renova o token via AppStateService.
 * Se o tempo esgotar sem resposta, desloga. Só deve rodar enquanto há sessão ativa (ver Shell).
 */
@Service()
export class IdleSessionService {
  private readonly appState = inject(AppStateService);
  private readonly router = inject(Router);

  readonly showWarning = signal(false);
  readonly secondsRemaining = signal(WARNING_DURATION_S);

  private idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private countdownIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly onActivity = () => this.resetIdleTimer();
  private listening = false;

  start(): void {
    if (this.listening) return;
    this.listening = true;
    ACTIVITY_EVENTS.forEach((event) => document.addEventListener(event, this.onActivity));
    this.resetIdleTimer();
  }

  stop(): void {
    this.listening = false;
    ACTIVITY_EVENTS.forEach((event) => document.removeEventListener(event, this.onActivity));
    this.clearTimers();
    this.showWarning.set(false);
  }

  /** Usuário confirmou presença no aviso — renova o token e reinicia a contagem de inatividade. */
  confirmActive(): void {
    this.appState.renewToken().subscribe();
    this.showWarning.set(false);
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.showWarning()) return;

    if (this.idleTimeoutId) clearTimeout(this.idleTimeoutId);
    this.idleTimeoutId = setTimeout(() => this.startWarningCountdown(), IDLE_TIMEOUT_MS);
  }

  private startWarningCountdown(): void {
    this.showWarning.set(true);
    this.secondsRemaining.set(WARNING_DURATION_S);

    this.countdownIntervalId = setInterval(() => {
      const next = this.secondsRemaining() - 1;
      if (next <= 0) {
        this.clearTimers();
        this.showWarning.set(false);
        this.appState.logout();
        this.router.navigateByUrl('/login');
        return;
      }
      this.secondsRemaining.set(next);
    }, 1000);
  }

  private clearTimers(): void {
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }
}
