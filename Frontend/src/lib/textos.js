import { brl, brlCents, diaDeMes, diaMes, mesAnoCurto } from './format.js';

// Frases do app montadas a partir dos números da API.

/** "acaba hoje", "acaba amanhã", "acaba em 5 dias". */
export const acabaEm = dias =>
  dias <= 0 ? 'acaba hoje' : dias === 1 ? 'acaba amanhã' : `acaba em ${dias} dias`;

export const toneCategoria = c =>
  c.status === 'estourou' ? 'danger' : c.status === 'vai-apertar' ? 'warning' : 'data';

export function notaCategoria(c) {
  const de = `de ${brl(c.limite)}`;
  if (!c.limite) return 'sem limite definido';
  if (c.status === 'estourou')
    return `${de} · estourou ${brl(c.usado - c.limite)}${c.estourouEm ? ` em ${diaMes(c.estourouEm)}` : ''}`;
  if (c.status === 'vai-apertar') return `${de} · ${acabaEm(c.diasRestantes)} no ritmo atual`;
  if (c.esgotaEm) return `${de} · dá até ${diaDeMes(c.esgotaEm)}`;
  if (c.status === 'folgada') return `${de} · sobra folgada`;
  return `${de} · dá até o fim do ciclo`;
}

export function badgeCategoria(c) {
  if (c.status === 'estourou') return ['estourou', 'danger'];
  if (c.status === 'vai-apertar') return ['vai apertar', 'warning'];
  if (c.status === 'folgada') return ['folgada', 'data'];
  return [`${c.lancamentos} ${c.lancamentos === 1 ? 'lançamento' : 'lançamentos'}`, 'neutral'];
}

export function origemCategoria(c) {
  if (c.recorrentes && c.recorrentes === c.lancamentos)
    return `${c.recorrentes} ${c.recorrentes === 1 ? 'cobrança recorrente' : 'cobranças recorrentes'}`;
  if (c.deNota) return `${c.deNota} de nota fiscal`;
  if (!c.lancamentos) return 'nenhum lançamento ainda';
  return 'todos manuais';
}

export function previsaoMeta(m) {
  if (m.falta === 0) return 'meta batida';
  if (m.ciclosRestantes == null) return 'sem data, entra o que sobrar';
  if (m.ciclosRestantes <= 6)
    return `faltam ${m.ciclosRestantes} ${m.ciclosRestantes === 1 ? 'mês' : 'meses'}`;
  return `no ritmo, pronto em ${mesAnoCurto(m.previsao)}`;
}

export const aporteMeta = m =>
  m.aportePorCiclo ? `${brl(m.aportePorCiclo)} por ciclo` : 'o que sobrar na virada';

const ORIGEM = {
  nota: 'nota escaneada',
  manual: 'manual',
  recorrente: 'recorrente',
  lista: 'lista de compras'
};

export function metaLancamento(l, { comQuem } = {}) {
  if (l.tipo === 'entrada') return 'entrada · reservada em categorias';
  const quem = comQuem && l.quemNome ? l.quemNome.split(' ')[0] : null;
  return `${l.categoriaNome} · ${quem || ORIGEM[l.origem] || 'manual'}`;
}

export function iconeLancamento(l, categorias = []) {
  if (l.tipo === 'entrada') return 'arrow-down-left';
  const c = categorias.find(x => x.id === l.categoriaId);
  return c ? c.icon : 'wallet';
}

export const valorLancamento = l =>
  l.tipo === 'entrada' ? `+ ${brl(l.valor)}` : brlCents(l.valor);
