import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiDataService } from '../../core/services/api-data';
import { AuditLogEntry, Employee } from '../../core/models/models';
import { DateRange, emptyDateRange, isDateRangeActive, isWithinDateRange } from '../../core/utils/date-range';
import { DateRangeFilter } from '../../shared/date-range-filter/date-range-filter';

@Component({
  selector: 'app-atividades',
  imports: [FormsModule, DateRangeFilter],
  templateUrl: './atividades.html',
})
export class Atividades {
  private readonly api = inject(ApiDataService);

  private readonly log = signal<AuditLogEntry[]>([]);
  private readonly employees = signal<Employee[]>([]);

  protected readonly searchTerm = signal('');
  protected readonly userFilter = signal('');
  protected readonly actionFilter = signal<AuditLogEntry['action'] | ''>('');
  protected readonly dateRange = signal<DateRange>(emptyDateRange());
  protected readonly isDateFilterActive = computed(() => isDateRangeActive(this.dateRange()));

  constructor() {
    this.api.getAuditLog().subscribe((list) => this.log.set(list));
    this.api.getEmployees().subscribe((list) => this.employees.set(list));
  }

  protected readonly userOptions = computed(() => {
    const names = new Set<string>();
    for (const entry of this.log()) {
      names.add(entry.userName);
    }
    for (const employee of this.employees()) {
      names.add(employee.name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  });

  protected readonly actionOptions: AuditLogEntry['action'][] = [
    'criou',
    'editou',
    'excluiu',
    'vendeu',
    'baixou',
    'recebeu',
    'antecipou',
    'liquidou',
  ];

  protected readonly filteredLog = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const user = this.userFilter();
    const action = this.actionFilter();
    const range = this.dateRange();

    return this.log().filter((entry) => {
      const matchesTerm =
        !term ||
        entry.entityLabel.toLowerCase().includes(term) ||
        entry.userName.toLowerCase().includes(term) ||
        entry.entityType.toLowerCase().includes(term);
      const matchesUser = !user || entry.userName === user;
      const matchesAction = !action || entry.action === action;
      const matchesDate = isWithinDateRange(entry.timestamp, range);
      return matchesTerm && matchesUser && matchesAction && matchesDate;
    });
  });

  protected readonly totalCount = computed(() => this.log().length);

  protected readonly actionSummary = computed(() => {
    const counts = new Map<AuditLogEntry['action'], number>();
    for (const entry of this.log()) {
      counts.set(entry.action, (counts.get(entry.action) ?? 0) + 1);
    }
    return this.actionOptions
      .map((action) => ({ action, count: counts.get(action) ?? 0 }))
      .filter((item) => item.count > 0);
  });

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.userFilter.set('');
    this.actionFilter.set('');
    this.dateRange.set(emptyDateRange());
  }

  protected roleLabel(role: AuditLogEntry['userRole']): string {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'gerente':
        return 'Gerente';
      case 'operador':
        return 'Operador';
    }
  }

  protected roleBadgeClasses(role: AuditLogEntry['userRole']): string {
    switch (role) {
      case 'admin':
        return 'bg-[#0F1F3D]/10 text-[#0F1F3D] border-[#0F1F3D]/20';
      case 'gerente':
        return 'bg-[#d8a34a]/10 text-[#8a6a2e] border-[#d8a34a]/40';
      case 'operador':
        return 'bg-[#827565]/10 text-[#4f4537] border-[#827565]/20';
    }
  }

  protected actionLabel(action: AuditLogEntry['action']): string {
    switch (action) {
      case 'criou':
        return 'Criou';
      case 'editou':
        return 'Editou';
      case 'excluiu':
        return 'Excluiu';
      case 'vendeu':
        return 'Vendeu';
      case 'baixou':
        return 'Baixou';
      case 'recebeu':
        return 'Recebeu';
      case 'antecipou':
        return 'Antecipou';
      case 'liquidou':
        return 'Liquidou';
    }
  }

  protected actionSummaryLabel(action: AuditLogEntry['action'], count: number): string {
    const noun = (() => {
      switch (action) {
        case 'criou':
          return count === 1 ? 'criação' : 'criações';
        case 'editou':
          return count === 1 ? 'edição' : 'edições';
        case 'excluiu':
          return count === 1 ? 'exclusão' : 'exclusões';
        case 'vendeu':
          return count === 1 ? 'venda' : 'vendas';
        case 'baixou':
          return count === 1 ? 'baixa' : 'baixas';
        case 'recebeu':
          return count === 1 ? 'recebimento' : 'recebimentos';
        case 'antecipou':
          return count === 1 ? 'antecipação' : 'antecipações';
        case 'liquidou':
          return count === 1 ? 'liquidação' : 'liquidações';
      }
    })();
    return `${count} ${noun}`;
  }

  protected actionIcon(action: AuditLogEntry['action']): string {
    switch (action) {
      case 'criou':
        return 'add_circle';
      case 'editou':
        return 'edit';
      case 'excluiu':
        return 'delete';
      case 'vendeu':
        return 'point_of_sale';
      case 'baixou':
        return 'payments';
      case 'recebeu':
        return 'trending_up';
      case 'antecipou':
        return 'bolt';
      case 'liquidou':
        return 'task_alt';
    }
  }

  protected actionIconClasses(action: AuditLogEntry['action']): string {
    switch (action) {
      case 'criou':
        return 'bg-[#4caf50]/10 text-[#4caf50]';
      case 'editou':
        return 'bg-[#0F1F3D]/10 text-[#0F1F3D]';
      case 'excluiu':
        return 'bg-[#ba1a1a]/10 text-[#ba1a1a]';
      case 'vendeu':
        return 'bg-[#d8a34a]/10 text-[#8a6a2e]';
      case 'baixou':
        return 'bg-[#2563eb]/10 text-[#2563eb]';
      case 'recebeu':
        return 'bg-[#4caf50]/10 text-[#4caf50]';
      case 'antecipou':
        return 'bg-[#0F1F3D]/10 text-[#0F1F3D]';
      case 'liquidou':
        return 'bg-[#4caf50]/10 text-[#4caf50]';
    }
  }
}
