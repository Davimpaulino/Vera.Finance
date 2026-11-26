// Formato dos textos de conteúdo (ajuda e blog), para escrever artigo novo sem mexer em componente.
// Num texto, [rótulo](/caminho) vira link: caminho interno navega sem recarregar a página;
// mailto: e https: viram link comum. Fora isso é texto puro, sem HTML.

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Quebra o texto em pedaços: { texto } ou { texto, href } para cada link. */
export function partesDoTexto(texto) {
  const partes = [];
  let inicio = 0;
  for (const achado of String(texto).matchAll(LINK)) {
    if (achado.index > inicio) partes.push({ texto: texto.slice(inicio, achado.index) });
    partes.push({ texto: achado[1], href: achado[2] });
    inicio = achado.index + achado[0].length;
  }
  if (inicio < String(texto).length) partes.push({ texto: String(texto).slice(inicio) });
  return partes;
}

/** Caminhos internos citados num texto ("/ajuda/x"), para conferir se existem no build. */
export const linksInternos = texto =>
  partesDoTexto(texto)
    .filter(parte => parte.href && parte.href.startsWith('/'))
    .map(parte => parte.href.split('#')[0]);

/** Texto sem a marcação de link, para o JSON-LD e para resumos. */
export const textoPuro = texto => String(texto).replace(LINK, '$1');

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

/**
 * A data é AAAA-MM-DD e existe: mês de 01 a 12 e dia que cabe no mês (31 de abril não passa,
 * 29 de fevereiro só em ano bissexto). As contas são em UTC, então o fuso não muda o dia.
 */
export function dataValida(iso) {
  const achado = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!achado) return false;
  const [ano, mes, dia] = achado.slice(1).map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

/**
 * "2026-11-26" → "26 de novembro de 2026". Lê os números direto, sem new Date: a data sem hora
 * vira meia-noite em UTC, e no fuso do Brasil o dia apareceria um antes. Data que não existe
 * volta como veio (o build já para antes, em problemasDoConteudo), nunca como "undefined".
 */
export function dataPorExtenso(iso) {
  const texto = String(iso).slice(0, 10);
  if (!dataValida(texto)) return String(iso);
  const [ano, mes, dia] = texto.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}
