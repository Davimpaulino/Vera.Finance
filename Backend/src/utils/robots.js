// Leitura do robots.txt pelas regras da RFC 9309, o padrão que os buscadores seguem.
// - Vale o grupo com o nome do nosso robô; sem ele, o grupo "*"; sem nenhum dos dois, tudo liberado.
// - Entre Allow e Disallow, ganha a regra mais longa que casa com o caminho; no empate, Allow.
// - "*" casa com qualquer sequência e "$" no fim prende o fim do caminho.
// - Regra e caminho são comparados já normalizados (RFC 9309, 2.2.2): "/açúcar" na regra e
//   "/a%C3%A7%C3%BAcar" no endereço são o mesmo caminho, e "%c3" é o mesmo que "%C3".

// A RFC pede ler pelo menos 500 KiB; o que passar disso é ignorado.
const TAMANHO_MAXIMO = 500 * 1024;

const NAO_RESERVADO = /^[A-Za-z0-9\-._~]$/;

/**
 * Caminho (ou regra) no formato de comparação: o que não é ASCII vira %XX em UTF-8, todo %xx fica
 * com hexadecimal maiúsculo e %XX de caractere não reservado (letra, número, "-", ".", "_", "~")
 * volta a ser o caractere. "*" e "$" não mudam, e "%2A" continua sendo um asterisco de verdade
 * (não o curinga).
 */
export function normalizarCaminho(texto) {
  return String(texto || '')
    .replace(/[^\x00-\x7F]+/gu, trecho => {
      try {
        return encodeURIComponent(trecho);
      } catch {
        // Pedaço de caractere inválido (surrogate solto): não há como codificar, sai da comparação.
        return '';
      }
    })
    .replace(/%([0-9a-fA-F]{2})/g, (_, hex) => {
      const caractere = String.fromCharCode(parseInt(hex, 16));
      return NAO_RESERVADO.test(caractere) ? caractere : `%${hex.toUpperCase()}`;
    });
}

// Nome do robô na linha User-agent (RFC 9309, 2.2.1): só letras, "_" e "-". Como no leitor do
// Google, vale o começo do valor até o primeiro caractere fora disso ("vera-finance-bot/2.0" vira
// "vera-finance-bot", e "vera.finance-bot" vira "vera"), sem diferenciar maiúsculas. "*" sozinho é
// o grupo de todos os robôs.
const nomeDoAgente = valor => {
  const texto = String(valor || '').trim();
  if (texto === '*' || /^\*\s/.test(texto)) return '*';
  return (texto.match(/^[A-Za-z_-]+/) || [''])[0].toLowerCase();
};

/** Grupos do arquivo: [{ agentes: ['*'], regras: [{ permitir, caminho }] }]. */
export function lerRobots(texto) {
  const grupos = [];
  let atual = null;
  let lendoAgentes = false;
  for (const linhaCrua of String(texto || '').slice(0, TAMANHO_MAXIMO).split(/\r\n|\r|\n/)) {
    const linha = linhaCrua.replace(/#.*$/, '').trim();
    const separador = linha.indexOf(':');
    if (separador < 0) continue;
    const chave = linha.slice(0, separador).trim().toLowerCase();
    const valor = linha.slice(separador + 1).trim();
    if (chave === 'user-agent') {
      // Linhas de user-agent seguidas formam um grupo só.
      if (!lendoAgentes) {
        atual = { agentes: [], regras: [] };
        grupos.push(atual);
      }
      atual.agentes.push(nomeDoAgente(valor));
      lendoAgentes = true;
    } else if (chave === 'allow' || chave === 'disallow') {
      lendoAgentes = false;
      // Regra antes de qualquer user-agent não pertence a grupo nenhum.
      if (!atual) continue;
      // "Disallow:" vazio não proíbe nada.
      if (!valor) continue;
      // Já normalizada: a "regra mais longa" também é medida assim.
      atual.regras.push({ permitir: chave === 'allow', caminho: normalizarCaminho(valor) });
    }
    // Sitemap, Crawl-delay e outras linhas são ignoradas, como fazem os buscadores.
  }
  return grupos;
}

const escaparRegex = texto => texto.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

function casa(padrao, caminho) {
  const ancorado = padrao.endsWith('$');
  const corpo = ancorado ? padrao.slice(0, -1) : padrao;
  const expressao = corpo.split('*').map(escaparRegex).join('.*');
  return new RegExp(`^${expressao}${ancorado ? '$' : ''}`).test(caminho);
}

/** Regras que valem para o robô: as do grupo dele ou, na falta, as do grupo "*". */
export function regrasPara(grupos, robo) {
  const nome = nomeDoAgente(robo);
  const doRobo = grupos.filter(grupo => grupo.agentes.includes(nome));
  const escolhidos = doRobo.length ? doRobo : grupos.filter(grupo => grupo.agentes.includes('*'));
  return escolhidos.flatMap(grupo => grupo.regras);
}

/** O robô pode pedir este caminho (com a busca, ex.: "/api/busca?q=arroz")? */
export function permitido(grupos, robo, caminhoCru) {
  const caminho = normalizarCaminho(caminhoCru);
  if (caminho === '/robots.txt') return true;
  let vencedora = null;
  for (const regra of regrasPara(grupos, robo)) {
    if (!casa(regra.caminho, caminho)) continue;
    const maisLonga = !vencedora || regra.caminho.length > vencedora.caminho.length;
    const empateComAllow =
      vencedora && regra.caminho.length === vencedora.caminho.length && regra.permitir;
    if (maisLonga || empateComAllow) vencedora = regra;
  }
  return !vencedora || vencedora.permitir;
}
