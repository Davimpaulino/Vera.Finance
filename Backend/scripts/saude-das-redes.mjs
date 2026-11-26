// Monitor de saúde das redes: faz uma busca simples no site de cada rede do RedeModel, mede o
// tempo, conta os produtos e diz quem quebrou. Feito para rodar como cron job no Render: sai com
// código 1 quando alguma rede deu erro ou voltou sem produtos, e o Render avisa da falha.
//
// Uso (na pasta Backend):
//   npm run saude:redes
//   npm run saude:redes -- --cep=01310100 --termo=arroz --redes=atacadao,tenda
// O CEP de teste também pode vir de CEP_DE_TESTE. Não grava nada no banco: usa os leitores direto,
// sem o cache nem o histórico do CatalogoModel. Respeita COLETA_IDENTIFICADA como a API.
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { REDES } from '../src/models/RedeModel.js';
import { LEITORES } from '../src/models/LeitoresDeCatalogo.js';
import { coletaIdentificada, agenteDaColeta } from '../src/models/ColetaModel.js';

// Av. Paulista, São Paulo: um CEP de rua (não termina em 000) numa região que várias redes atendem.
const CEP_PADRAO = '01310100';
const TERMO_PADRAO = 'arroz';
// A VTEX tem catálogo nacional: quando a rede não entrega no CEP de teste, a mesma busca sem CEP
// mostra se o site está de pé.
const TEM_CATALOGO_NACIONAL = new Set(['vtex']);
// Uma rede travada não pode segurar o job inteiro (cada pedido do leitor já tem 9 s de limite).
const LIMITE_POR_REDE_MS = 60 * 1000;
const AO_MESMO_TEMPO = 4;

export const ROTULOS = {
  ok: 'ok',
  semEntrega: 'sem entrega no CEP',
  semProdutos: 'sem produtos',
  erro: 'erro'
};
// Sem entrega no CEP de teste não é defeito: a rede só não atende aquela região.
export const QUEBRADAS = new Set(['semProdutos', 'erro']);

function comLimite(promessa, ms) {
  let relogio;
  const estouro = new Promise((_, rejeitar) => {
    relogio = setTimeout(() => rejeitar(new Error(`passou de ${ms / 1000} s`)), ms);
  });
  // Desliga o relógio quando a busca termina, para o job não ficar esperando à toa.
  return Promise.race([promessa, estouro]).finally(() => clearTimeout(relogio));
}

/** Busca o termo numa rede e classifica: ok, semEntrega, semProdutos ou erro. */
export async function verificarRede(
  rede,
  { termo = TERMO_PADRAO, cep = CEP_PADRAO, leitores = LEITORES, limiteMs = LIMITE_POR_REDE_MS } = {}
) {
  const inicio = performance.now();
  const base = { id: rede.id, nome: rede.nome, plataforma: rede.plataforma };
  const tempo = () => Math.round(performance.now() - inicio);
  try {
    const leitor = leitores[rede.plataforma];
    if (!leitor) throw new Error(`plataforma sem leitor: ${rede.plataforma}`);
    const lido = await comLimite(leitor.buscar(rede, termo, cep), limiteMs);
    const produtos = (lido.produtos || []).length;
    if (produtos) return { ...base, estado: 'ok', produtos, ms: tempo(), detalhe: '' };
    if (lido.situacao !== 'semEntrega')
      return {
        ...base,
        estado: 'semProdutos',
        produtos: 0,
        ms: tempo(),
        // Site que responde sem nenhum produto para "arroz" costuma ser leitor quebrado (mudou o HTML ou a API).
        detalhe: lido.situacao === 'ok' ? 'o site respondeu sem nenhum produto' : `situação ${lido.situacao}`
      };
    if (!TEM_CATALOGO_NACIONAL.has(rede.plataforma))
      return { ...base, estado: 'semEntrega', produtos: 0, ms: tempo(), detalhe: '' };
    const nacional = await comLimite(leitor.buscar(rede, termo, ''), limiteMs);
    const doCatalogo = (nacional.produtos || []).length;
    if (!doCatalogo)
      return {
        ...base,
        estado: 'semProdutos',
        produtos: 0,
        ms: tempo(),
        detalhe: 'sem entrega no CEP e catálogo nacional vazio'
      };
    return {
      ...base,
      estado: 'semEntrega',
      produtos: 0,
      ms: tempo(),
      detalhe: `catálogo nacional respondeu com ${doCatalogo} produtos`
    };
  } catch (erro) {
    // "fetch failed" sozinho não diz nada: a causa (ENOTFOUND, timeout...) vem junto.
    const causa = erro.cause?.code || erro.cause?.message;
    const detalhe = [erro.message || String(erro), causa].filter(Boolean).join(': ');
    return { ...base, estado: 'erro', produtos: 0, ms: tempo(), detalhe };
  }
}

/** Verifica as redes, poucas de cada vez para não sobrecarregar ninguém. A ordem é a da lista. */
export async function verificarRedes(redes, opcoes = {}) {
  const resultados = new Array(redes.length);
  let proxima = 0;
  const trabalhar = async () => {
    while (proxima < redes.length) {
      const atual = proxima++;
      resultados[atual] = await verificarRede(redes[atual], opcoes);
    }
  };
  const quantos = Math.min(opcoes.aoMesmoTempo || AO_MESMO_TEMPO, redes.length);
  await Promise.all(Array.from({ length: quantos }, trabalhar));
  return resultados;
}

const segundos = ms => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
const cepBonito = cep => (cep ? `${cep.slice(0, 5)}-${cep.slice(5)}` : 'sem CEP');

/** Tabela de texto, uma linha por rede, e o resumo no fim. */
export function formatarTabela(resultados, { termo = TERMO_PADRAO, cep = CEP_PADRAO } = {}) {
  const colunas = [
    ['rede', r => r.nome],
    ['plataforma', r => r.plataforma],
    ['situação', r => ROTULOS[r.estado]],
    ['produtos', r => String(r.produtos)],
    ['tempo', r => segundos(r.ms)],
    ['detalhe', r => r.detalhe || '']
  ];
  const larguras = colunas.map(([titulo, valor]) =>
    Math.max(titulo.length, ...resultados.map(r => valor(r).length))
  );
  // Números alinhados à direita; texto à esquerda. O detalhe, último, não precisa de espaço no fim.
  const direita = new Set(['produtos', 'tempo']);
  const linha = celulas =>
    celulas
      .map((celula, i) =>
        i === celulas.length - 1
          ? celula
          : direita.has(colunas[i][0])
            ? celula.padStart(larguras[i])
            : celula.padEnd(larguras[i])
      )
      .join('  ')
      .trimEnd();
  const contagem = estado => resultados.filter(r => r.estado === estado).length;
  const quebradas = resultados.filter(r => QUEBRADAS.has(r.estado));
  return [
    `Saúde das redes · busca "${termo}" · CEP ${cepBonito(cep)} · ${coletaIdentificada() ? `robô identificado (${agenteDaColeta()})` : 'user-agent de navegador'}`,
    '',
    linha(colunas.map(([titulo]) => titulo)),
    ...resultados.map(r => linha(colunas.map(([, valor]) => valor(r)))),
    '',
    `${resultados.length} ${resultados.length === 1 ? 'rede' : 'redes'}: ${contagem('ok')} ok, ${contagem('semEntrega')} sem entrega no CEP, ` +
      `${contagem('semProdutos')} sem produtos, ${contagem('erro')} com erro.`,
    quebradas.length
      ? `Quebradas: ${quebradas.map(r => r.nome).join(', ')}.`
      : 'Nenhuma rede quebrada.'
  ].join('\n');
}

function lerOpcoes(argumentos) {
  const valor = nome => {
    const achado = argumentos.find(argumento => argumento.startsWith(`--${nome}=`));
    return achado === undefined ? undefined : achado.slice(nome.length + 3);
  };
  return {
    cep: String(valor('cep') ?? process.env.CEP_DE_TESTE ?? CEP_PADRAO).replace(/\D/g, ''),
    termo: String(valor('termo') ?? TERMO_PADRAO).trim(),
    redes: valor('redes')
  };
}

/** Roda o monitor. Devolve o código de saída: 0 tudo bem, 1 alguma rede quebrou, 2 uso errado. */
export async function principal(argumentos, { redes = REDES, escrever = console.log, ...opcoes } = {}) {
  const { cep, termo, redes: filtro } = lerOpcoes(argumentos);
  if (cep.length !== 8) {
    console.error('O CEP de teste precisa ter 8 números (--cep=01310100 ou CEP_DE_TESTE).');
    return 2;
  }
  if (termo.length < 2) {
    console.error('O termo de busca precisa ter pelo menos 2 letras (--termo=arroz).');
    return 2;
  }
  let escolhidas = redes;
  if (filtro) {
    const ids = filtro.split(',').map(id => id.trim()).filter(Boolean);
    const desconhecidas = ids.filter(id => !redes.some(rede => rede.id === id));
    if (desconhecidas.length) {
      console.error(`Redes desconhecidas: ${desconhecidas.join(', ')}.`);
      return 2;
    }
    escolhidas = redes.filter(rede => ids.includes(rede.id));
  }
  const resultados = await verificarRedes(escolhidas, { termo, cep, ...opcoes });
  escrever(formatarTabela(resultados, { termo, cep }));
  return resultados.some(r => QUEBRADAS.has(r.estado)) ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href)
  principal(process.argv.slice(2))
    .then(codigo => (process.exitCode = codigo))
    .catch(erro => {
      console.error(erro);
      process.exitCode = 1;
    });
