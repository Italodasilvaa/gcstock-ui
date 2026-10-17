/** Período selecionado nos filtros de data. Datas em "yyyy-MM-dd"; string vazia = sem limite naquele lado. */
export interface DateRange {
  from: string;
  to: string;
}

/** Hoje no fuso do computador, "yyyy-MM-dd" (toISOString usa UTC e, depois das 21h em Brasília, devolve o dia seguinte). */
export function todayLocalIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function emptyDateRange(): DateRange {
  return { from: '', to: '' };
}

export function isDateRangeActive(range: DateRange): boolean {
  return !!range.from || !!range.to;
}

/** Primeiro e último dia de um mês "yyyy-MM" (ex.: "2026-09" → 01/09 a 30/09). */
export function monthToDateRange(month: string): DateRange {
  const [year, monthIndex] = month.split('-').map(Number);
  if (!year || !monthIndex) return emptyDateRange();
  const lastDay = new Date(year, monthIndex, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

/**
 * Converte o valor vindo da API para a chave de dia local "yyyy-MM-dd".
 * Datas puras (DateOnly) são usadas como estão — passar por `new Date()` as leria como UTC e poderia
 * voltar um dia; timestamps completos (DateTime) são convertidos para o fuso local.
 */
export function toLocalDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Sem período ativo, tudo passa; com período, registros sem data válida ficam de fora. */
export function isWithinDateRange(value: string | null | undefined, range: DateRange): boolean {
  if (!isDateRangeActive(range)) return true;
  const key = toLocalDateKey(value);
  if (!key) return false;
  if (range.from && key < range.from) return false;
  if (range.to && key > range.to) return false;
  return true;
}
