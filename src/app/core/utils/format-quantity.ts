/** Formata uma quantidade com a unidade do produto: "7,2 kg", "5 pct", "2 un". */
export function formatQuantity(value: number, unit: string | null | undefined, withSign = false): string {
  const un = (unit ?? 'kg').trim() || 'kg';
  const text = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: un === 'kg' ? 1 : 0,
    maximumFractionDigits: 3,
  });
  const sign = value < 0 ? '-' : withSign && value > 0 ? '+' : '';
  return `${sign}${text} ${un}`;
}

/** Soma por unidade (kg, pct, un...) — nunca mistura unidades diferentes num total só. */
export function totalsByUnit(items: { value: number; unit: string | null | undefined }[]): { unit: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const unit = (item.unit ?? 'kg').trim() || 'kg';
    totals.set(unit, (totals.get(unit) ?? 0) + item.value);
  }
  return [...totals].map(([unit, total]) => ({ unit, total }));
}

/** "42,0 kg • 8 pct • 3 un" */
export function formatTotalsByUnit(items: { value: number; unit: string | null | undefined }[]): string {
  const totals = totalsByUnit(items);
  return totals.length === 0 ? '0 kg' : totals.map((t) => formatQuantity(t.total, t.unit)).join(' • ');
}
