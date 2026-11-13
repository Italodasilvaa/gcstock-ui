import { Signal, WritableSignal, computed, effect, signal } from '@angular/core';

/** Quantidades de registros por página disponíveis em todas as listas. */
export const PAGE_SIZE_OPTIONS = [15, 30, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 15;

const STORAGE_KEY = 'gcstock.pageSize';

/** Última quantidade escolhida pelo usuário (vale para todas as listas); sem armazenamento, volta ao padrão. */
function loadPageSize(): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

function savePageSize(size: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(size));
  } catch {
    // sem armazenamento (navegação privada): a escolha só vale até recarregar
  }
}

/** Paginação de uma lista já carregada: itens da página, total, navegação e quantidade por página. */
export interface Pager<T> {
  readonly pageSize: WritableSignal<number>;
  readonly pageItems: Signal<T[]>;
  readonly total: Signal<number>;
  readonly totalPages: Signal<number>;
  /** Página atual (1 a totalPages), já ajustada se a lista encolheu. */
  readonly page: Signal<number>;
  /** Posição do primeiro e do último registro exibidos (para "1–15 de 120"). */
  readonly firstIndex: Signal<number>;
  readonly lastIndex: Signal<number>;
  setPageSize(size: number): void;
  goTo(page: number): void;
  next(): void;
  previous(): void;
  reset(): void;
}

/**
 * Cria a paginação de uma lista. Chame no corpo do componente (precisa do contexto de injeção, por causa do effect).
 * Ao mudar a quantidade de itens (um filtro, uma busca), volta para a página 1; recarregar a mesma lista mantém a página.
 */
export function createPager<T>(items: () => T[]): Pager<T> {
  const pageSize = signal(loadPageSize());
  const requestedPage = signal(1);

  const total = computed(() => items().length);
  const totalPages = computed(() => Math.max(1, Math.ceil(total() / pageSize())));
  const page = computed(() => Math.min(Math.max(1, requestedPage()), totalPages()));
  const pageItems = computed(() => {
    const start = (page() - 1) * pageSize();
    return items().slice(start, start + pageSize());
  });
  const firstIndex = computed(() => (total() === 0 ? 0 : (page() - 1) * pageSize() + 1));
  const lastIndex = computed(() => Math.min(total(), page() * pageSize()));

  let lastTotal = total();
  effect(() => {
    const current = total();
    if (current !== lastTotal) {
      lastTotal = current;
      requestedPage.set(1);
    }
  });

  return {
    pageSize,
    pageItems,
    total,
    totalPages,
    page,
    firstIndex,
    lastIndex,
    setPageSize: (size) => {
      pageSize.set(size);
      requestedPage.set(1);
      savePageSize(size);
    },
    goTo: (target) => requestedPage.set(Math.min(Math.max(1, target), totalPages())),
    next: () => requestedPage.set(Math.min(page() + 1, totalPages())),
    previous: () => requestedPage.set(Math.max(page() - 1, 1)),
    reset: () => requestedPage.set(1),
  };
}
