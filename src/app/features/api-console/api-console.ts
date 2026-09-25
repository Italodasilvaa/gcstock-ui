import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { ApiLogService } from '../../core/services/api-log';
import { ApiLog } from '../../core/models/models';

/**
 * Console de depuração que exibe, em tempo real, os logs das chamadas HTTP
 * reais feitas à Girus API (capturadas pelo `apiLogInterceptor`).
 */
@Component({
  selector: 'app-api-console',
  imports: [],
  templateUrl: './api-console.html',
})
export class ApiConsole {
  @Output() close = new EventEmitter<void>();

  private readonly apiLog = inject(ApiLogService);

  protected readonly logs = this.apiLog.logs;
  protected readonly selectedLog = signal<ApiLog | null>(null);

  protected onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  protected selectLog(log: ApiLog): void {
    this.selectedLog.set(log);
  }

  protected clearLogs(): void {
    this.apiLog.clear();
    this.selectedLog.set(null);
  }

  protected exportLogs(): void {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
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
