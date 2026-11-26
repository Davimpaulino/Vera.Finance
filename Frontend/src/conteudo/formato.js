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
 * "2026-11-26" → "26 de novembro de 2026". Lê os números direto, sem new Date: a data sem hora
 * vira meia-noite em UTC, e no fuso do Brasil o dia apareceria um antes.
 */
export function dataPorExtenso(iso) {
  const [ano, mes, dia] = String(iso).slice(0, 10).split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}
