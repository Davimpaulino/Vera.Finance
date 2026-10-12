// Ciclo da vera: começa no dia da entrada de renda e vai até a véspera do próximo.
const DAY = 86400000;

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d, n) {
  return new Date(startOfDay(d).getTime() + n * DAY);
}

export function diffDays(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY);
}

function dayInMonth(year, month, day) {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

/** Ciclo que contém `ref`, deslocado `offset` ciclos (‑1 = anterior). */
export function cycleFor(diaVirada, ref = new Date(), offset = 0) {
  const r = startOfDay(ref);
  let start = dayInMonth(r.getFullYear(), r.getMonth(), diaVirada);
  if (start > r) start = dayInMonth(r.getFullYear(), r.getMonth() - 1, diaVirada);
  start = dayInMonth(start.getFullYear(), start.getMonth() + offset, diaVirada);
  const next = dayInMonth(start.getFullYear(), start.getMonth() + 1, diaVirada);
  const end = addDays(next, -1);
  const totalDias = diffDays(start, end) + 1;
  const hoje = offset === 0 ? r : end;
  const decorridos = Math.min(totalDias, diffDays(start, hoje) + 1);
  return {
    inicio: start.toISOString(),
    fim: end.toISOString(),
    proximaVirada: next.toISOString(),
    totalDias,
    diaAtual: decorridos,
    restantes: totalDias - decorridos
  };
}

export function inRange(iso, inicio, fim) {
  const t = startOfDay(iso).getTime();
  return t >= startOfDay(inicio).getTime() && t <= startOfDay(fim).getTime();
}
