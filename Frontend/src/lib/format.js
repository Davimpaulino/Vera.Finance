// Formatação para a tela. A API devolve números e datas ISO; o texto nasce aqui.
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
];
const MESES_CURTOS = MESES.map(m => m.slice(0, 3));

const num = (n, casas) =>
  Math.abs(n).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });

/** R$ resumido, em reais inteiros: para saldos, totais e limites. */
export function brl(n) {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '− ' : '') + 'R$ ' + num(v, 0);
}

/** R$ sempre com centavos, para itens de extrato e preços. */
export function brlCents(n) {
  const v = Number(n) || 0;
  return (v < 0 ? '− ' : '') + 'R$ ' + num(v, 2);
}

/** Valor para um campo de dinheiro: 4.200,00 */
export const moneyField = n => num(Number(n) || 0, 2);

/** Lê "4.200,50" ou "4200.5" como número. */
export function parseMoney(s) {
  if (typeof s === 'number') return s;
  const limpo = String(s || '').replace(/[^\d,.-]/g, '');
  const n = limpo.includes(',')
    ? Number(limpo.replace(/\./g, '').replace(',', '.'))
    : Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

export const oculto = '•• •••';
export const mask = (ocultar, txt) => (ocultar ? oculto : txt);

const d = iso => new Date(iso);
export const diaMes = iso => `${d(iso).getDate()} ${MESES_CURTOS[d(iso).getMonth()]}`;
export const diaDeMes = iso => `${d(iso).getDate()} de ${MESES[d(iso).getMonth()]}`;
export const mes = iso => MESES[d(iso).getMonth()];
export const mesCurto = iso => MESES_CURTOS[d(iso).getMonth()];
export const mesAno = iso => `${MESES[d(iso).getMonth()]} ${d(iso).getFullYear()}`;
export const mesAnoCurto = iso => `${MESES_CURTOS[d(iso).getMonth()]} ${d(iso).getFullYear()}`;

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function diasAtras(iso) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const x = d(iso);
  x.setHours(0, 0, 0, 0);
  return Math.round((hoje - x) / 86400000);
}

/** "hoje, 19 de agosto", "ontem, 18 de agosto" ou "17 de agosto". */
export function diaRelativo(iso) {
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  if (mesmoDia(d(iso), hoje)) return `hoje, ${diaDeMes(iso)}`;
  if (mesmoDia(d(iso), ontem)) return `ontem, ${diaDeMes(iso)}`;
  return diaDeMes(iso);
}

export function idadeNota(dias) {
  if (dias === 0) return 'nota de hoje';
  if (dias === 1) return 'nota de ontem';
  return `nota de há ${dias} dias`;
}

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
export const km = n => `${String(n).replace('.', ',')} km`;
export const hojeLabel = () =>
  `${mesAno(new Date().toISOString())} · hoje, ${new Date().getDate()}`;
export const iniciais = nome =>
  String(nome || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
