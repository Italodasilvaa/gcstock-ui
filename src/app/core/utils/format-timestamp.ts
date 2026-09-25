/** Formata um timestamp ISO (vindo da API) como rótulo relativo em pt-BR: "Hoje 11:34", "Ontem 18:20" ou "18/09 14:05". */
export function formatRelativeTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return `Hoje ${time}`;
  if (isSameDay(date, yesterday)) return `Ontem ${time}`;

  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${day} ${time}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
