import { Service, signal } from '@angular/core';
import { ApiLog } from '../models/models';

const MAX_LOGS = 100;

/**
 * Histórico das chamadas HTTP reais feitas à GC Stock API, alimentado pelo `apiLogInterceptor`.
 * Substitui o antigo log simulado do MockDataService — os dados aqui são requisições de verdade.
 */
@Service()
export class ApiLogService {
  private readonly logsSignal = signal<ApiLog[]>([]);
  readonly logs = this.logsSignal.asReadonly();

  record(entry: Omit<ApiLog, 'id'>): void {
    const log: ApiLog = { id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), ...entry };
    this.logsSignal.update((list) => [log, ...list].slice(0, MAX_LOGS));
  }

  clear(): void {
    this.logsSignal.set([]);
  }
}
