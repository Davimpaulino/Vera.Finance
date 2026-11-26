import { lerRobots, permitido } from '../utils/robots.js';

// Como a vera pede os preços aos sites das redes. Todos os leitores de catálogo passam por aqui.
//
// COLETA_IDENTIFICADA desligada (padrão, o comportamento de sempre): os pedidos vão com o
// user-agent de um navegador comum.
// COLETA_IDENTIFICADA=1: os pedidos vão com o user-agent do robô da vera, com o endereço da
// página que explica o robô, e antes de cada consulta o robots.txt do site é conferido (guardado
// por 24 h). Caminho bloqueado para o nosso robô (ou, sem grupo para ele, para "*") não é
// consultado: o leitor recebe ColetaBloqueada e a rede fica como 'falhou' naquela busca.
//
// As variáveis são lidas a cada pedido (e não uma vez ao subir) para os testes poderem trocar.
export const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
// O nome do robô segue a RFC 9309 (2.2.1): só letras, "_" e "-". Com ponto ("vera.finance-bot"),
// leitores que seguem a RFC, como o do Google, leriam só "vera" na linha User-agent do site.
export const NOME_DO_ROBO = 'vera-finance-bot';

const DIA_MS = 24 * 60 * 60 * 1000;
// Sem resposta do robots.txt (erro 5xx, rede fora): a RFC 9309 manda tratar como tudo
// bloqueado. Esse resultado fica guardado por pouco tempo, para tentar de novo logo.
const FALHA_MS = 10 * 60 * 1000;
const robotsDosSites = new Map();
const emAndamento = new Map();

export class ColetaBloqueada extends Error {
  constructor(endereco) {
    super(`o robots.txt de ${new URL(endereco).host} não deixa o robô da vera consultar este caminho`);
    this.name = 'ColetaBloqueada';
  }
}

export const coletaIdentificada = () =>
  /^(1|true|sim|on|ligad[ao])$/i.test(String(process.env.COLETA_IDENTIFICADA || '').trim());

const enderecoDoSite = () =>
  String(process.env.SITE_URL || 'https://vera-finance.onrender.com').replace(/\/+$/, '');

/** User-agent dos pedidos às redes, conforme COLETA_IDENTIFICADA. */
export const agenteDaColeta = () =>
  coletaIdentificada() ? `${NOME_DO_ROBO}/1.0 (+${enderecoDoSite()}/robo)` : NAVEGADOR;

async function baixarRobots(origem) {
  try {
    const resposta = await fetch(`${origem}/robots.txt`, {
      headers: { 'User-Agent': agenteDaColeta(), Accept: 'text/plain' },
      signal: AbortSignal.timeout(6000)
    });
    // 4xx (inclusive 404, sem robots.txt): a RFC libera tudo.
    if (resposta.status >= 400 && resposta.status < 500) return { em: Date.now(), grupos: [] };
    if (!resposta.ok) return { em: Date.now(), bloqueado: true, validade: FALHA_MS };
    return { em: Date.now(), grupos: lerRobots(await resposta.text()) };
  } catch {
    return { em: Date.now(), bloqueado: true, validade: FALHA_MS };
  }
}

/** Regras do robots.txt do site, guardadas por 24 h (falhas, por 10 min). */
async function robotsDe(origem) {
  const guardado = robotsDosSites.get(origem);
  if (guardado && Date.now() - guardado.em < (guardado.validade || DIA_MS)) return guardado;
  // Vários leitores ao mesmo tempo no mesmo site esperam o mesmo download.
  if (!emAndamento.has(origem))
    emAndamento.set(
      origem,
      baixarRobots(origem)
        .then(lido => {
          robotsDosSites.set(origem, lido);
          return lido;
        })
        .finally(() => emAndamento.delete(origem))
    );
  return emAndamento.get(origem);
}

/** O robô da vera pode consultar este endereço? */
export async function robotsPermite(endereco) {
  const url = new URL(endereco);
  const robots = await robotsDe(url.origin);
  if (robots.bloqueado) return false;
  return permitido(robots.grupos, NOME_DO_ROBO, `${url.pathname}${url.search}`);
}

/**
 * fetch para os sites das redes: põe o user-agent da coleta e, com a coleta identificada,
 * confere o robots.txt antes. Caminho bloqueado: lança ColetaBloqueada sem fazer o pedido.
 */
export async function pedirNaRede(endereco, opcoes = {}) {
  if (coletaIdentificada() && !(await robotsPermite(endereco)))
    throw new ColetaBloqueada(endereco);
  return fetch(endereco, {
    ...opcoes,
    headers: { ...(opcoes.headers || {}), 'User-Agent': agenteDaColeta() }
  });
}

/**
 * Para os .catch() dos leitores que trocam um erro por um valor padrão (ex.: região VTEX vazia):
 * o bloqueio do robots.txt não pode virar "sem entrega" nem "sem produtos", tem de subir.
 */
export const salvoBloqueio = padrao => erro => {
  if (erro instanceof ColetaBloqueada) throw erro;
  return padrao;
};

export const ColetaModel = {
  limparCache() {
    robotsDosSites.clear();
  }
};
