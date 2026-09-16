import { Component, EventEmitter, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { MockDataService } from '../../core/services/mock-data';
import { ApiLog } from '../../core/models/models';

/**
 * Console de depuração que exibe, em tempo real, os logs de "chamadas de API"
 * simulados internamente pelo MockDataService a cada operação de CRUD.
 * Não existe nenhuma chamada de rede real — tudo é lido do próprio serviço.
 */
@Component({
  selector: 'app-api-console',
  imports: [],
  templateUrl: './api-console.html',
})
export class ApiConsole implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  private readonly mockData = inject(MockDataService);
  private changeSubscription?: Subscription;

  protected readonly logs = signal<ApiLog[]>(this.mockData.getApiLogs());
  protected readonly selectedLog = signal<ApiLog | null>(null);
  protected readonly latencyMs = signal<number>(this.mockData.getLatency());

  ngOnInit(): void {
    this.changeSubscription = this.mockData.change$.subscribe(() => this.refresh());
  }

  ngOnDestroy(): void {
    this.changeSubscription?.unsubscribe();
  }

  private refresh(): void {
    this.logs.set(this.mockData.getApiLogs());
    this.latencyMs.set(this.mockData.getLatency());
  }

  protected onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  protected onLatencyInput(value: string): void {
    const ms = Number(value);
    if (!Number.isNaN(ms) && ms >= 0) {
      this.mockData.setLatency(ms);
    }
  }

  protected selectLog(log: ApiLog): void {
    this.selectedLog.set(log);
  }

  protected clearLogs(): void {
    this.mockData.clearApiLogs();
    this.selectedLog.set(null);
  }

  protected resetDemoData(): void {
    const confirmed = window.confirm(
      'Isso vai apagar todos os dados de demonstração desta empresa e recarregar o aplicativo do zero. Deseja continuar?',
    );
    if (!confirmed) {
      return;
    }
    this.mockData.resetToDefaults();
    window.location.reload();
  }

  protected exportLogs(): void {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      simulatedLatencyMs: this.latencyMs(),
      totalLogs: this.logs().length,
      logs: this.logs(),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `girus-api-console-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected formatPayload(payload: unknown): string {
    if (payload === undefined || payload === null) {
      return '— sem payload —';
    }
    return JSON.stringify(payload, null, 2);
  }

  protected methodBadgeClass(method: ApiLog['method']): string {
    switch (method) {
      case 'GET':
        return 'bg-[#0F1F3D]/10 text-[#0F1F3D]';
      case 'POST':
        return 'bg-[#4caf50]/15 text-[#2e7d32]';
      case 'PUT':
        return 'bg-[#d8a34a]/20 text-[#7f5700]';
      case 'PATCH':
        return 'bg-[#827565]/15 text-[#4f4537]';
      case 'DELETE':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a]';
      default:
        return 'bg-[#efeeeb] text-[#4f4537]';
    }
  }

  protected statusClass(statusCode: number): string {
    return statusCode >= 400 ? 'text-[#ba1a1a]' : 'text-[#4caf50]';
  }

  protected statusDotClass(statusCode: number): string {
    return statusCode >= 400 ? 'bg-[#ba1a1a]' : 'bg-[#4caf50]';
  }
}
