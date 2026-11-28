// Cobertura das cidades prioritárias: para cada cidade, acha o ponto central no mapa (Nominatim) e
// lista as redes com preço online que têm loja a até 15 km dele (OpenStreetMap, pela Overpass).
// Se o mapa não responde para 15 km, tenta 10 e depois 5 km; o raio usado vai no JSON (raioKm) e
// na página da cidade ("a até X km do centro").
// O resultado vai para Frontend/src/conteudo/cidades.json, que o site usa nas páginas
// /onde-funciona/<cidade>.
//
// Uso (na pasta Backend):
//   npm run cobertura:cidades
//   npm run cobertura:cidades -- --cidades=sao-paulo-sp,recife-pe
// Só escreve o JSON: não grava nada no banco (roda sempre com o banco em memória) e não guarda as
// regiões do mapa. Se o mapa falhar numa cidade, ela fica como estava no JSON e o script avisa
// (sai com código 1). Os pedidos ao Nominatim saem na fila de 1 por segundo do GeoModel.
// Cada tentativa no mapa sai numa linha (servidor, status HTTP ou erro, tempo), para saber por
// que uma cidade falhou.
import { readFile, writeFile } from 'node:fs/promises';
import { rodouDireto } from '../src/utils/execucao.js';

// Antes de carregar os models: o banco é escolhido na hora do import (src/config/banco.js).
process.env.BANCO = 'memoria';

const { GeoModel } = await import('../src/models/GeoModel.js');
const { RegiaoModel } = await import('../src/models/RegiaoModel.js');
const { agruparPorRede } = await import('../src/models/CoberturaModel.js');
const { normalize } = await import('../src/utils/text.js');

export const ARQUIVO = new URL('../../Frontend/src/conteudo/cidades.json', import.meta.url);
export const RAIO_KM = 15;
// Raios tentados, nesta ordem, quando o mapa não responde.
export const RAIOS_KM = [RAIO_KM, 10, 5];
// O mapa para o script: espera mais que o app (25 s) e pede a consulta mais leve, o retângulo em
// volta do raio, com teto de tempo e de memória na própria consulta (RegiaoModel.consultaDosMercados).
// A espera do pedido passa um pouco do [timeout] da consulta, para receber a resposta do servidor.
export const MAPA = {
  esperaMs: 100_000,
  consulta: { forma: 'caixa', timeoutS: 90, maxsize: 128 * 1024 * 1024 }
};

// As cidades mais populosas do Brasil, na ordem em que aparecem no site.
export const CIDADES = [
  ['São Paulo', 'SP'],
  ['Rio de Janeiro', 'RJ'],
  ['Brasília', 'DF'],
  ['Fortaleza', 'CE'],
  ['Salvador', 'BA'],
  ['Belo Horizonte', 'MG'],
  ['Manaus', 'AM'],
  ['Curitiba', 'PR'],
  ['Recife', 'PE'],
  ['Goiânia', 'GO'],
  ['Porto Alegre', 'RS'],
  ['Campinas', 'SP']
].map(([nome, uf]) => ({ slug: slugDaCidade(nome, uf), nome, uf }));

/** "São Paulo", "SP" → "sao-paulo-sp". */
export function slugDaCidade(nome, uf) {
  return normalize(`${nome} ${uf}`).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Cidade sem levantamento: o site mostra o texto geral e o verificador de CEP, sem lista. */
export const semLevantamento = ({ slug, nome, uf }) => ({
  slug,
  nome,
  uf,
  raioKm: RAIO_KM,
  totalMercados: null,
  redes: null,
  levantadoEm: null
});

/** AAAA-MM-DD no fuso do Brasil. */
export const hojeNoBrasil = (agora = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora);

const umaCasa = km => Math.round(km * 10) / 10;

/**
 * Levanta uma cidade. Devolve { ok: true, cidade } com a entrada do JSON, ou { ok: false, motivo }
 * quando o mapa não achou o centro ou não respondeu em nenhum dos raios.
 * `registrar(linha)` recebe cada tentativa no mapa.
 */
export async function levantarCidade(
  cidade,
  { hoje = hojeNoBrasil(), raios = RAIOS_KM, mapa = MAPA, registrar = () => {} } = {}
) {
  const centro = await GeoModel.geocodificar(`${cidade.nome}, ${cidade.uf}`);
  if (!GeoModel.temCoordenadas(centro)) return { ok: false, motivo: 'o mapa não achou o centro da cidade' };
  let mercados = null;
  let raioKm = null;
  for (const raio of raios) {
    // guardar: false — a região não vai para o banco nem fica na memória.
    mercados = await RegiaoModel.mercadosPerto(centro, raio, {
      guardar: false,
      ...mapa,
      registrar: linha => registrar(`${cidade.nome} (${cidade.uf}), ${raio} km: ${linha}`)
    });
    if (mercados) {
      raioKm = raio;
      break;
    }
  }
  if (!mercados)
    return { ok: false, motivo: `o mapa de mercados não respondeu (tentei ${raios.join(', ')} km)` };
  const redes = agruparPorRede(mercados)
    .filter(grupo => grupo.precoOnline)
    .map(({ id, nome, tipo, lojas, distanciaKm }) => ({
      id,
      nome,
      tipo,
      lojas,
      distanciaKm: umaCasa(distanciaKm)
    }));
  return {
    ok: true,
    cidade: {
      ...semLevantamento(cidade),
      raioKm,
      totalMercados: mercados.length,
      redes,
      levantadoEm: hoje
    }
  };
}

async function lerJson(arquivo) {
  try {
    const lido = JSON.parse(await readFile(arquivo, 'utf8'));
    return Array.isArray(lido) ? lido : [];
  } catch (erro) {
    if (erro.code === 'ENOENT') return [];
    throw erro;
  }
}

function lerOpcoes(argumentos) {
  const achado = argumentos.find(argumento => argumento.startsWith('--cidades='));
  return {
    cidades: achado
      ? achado
          .slice('--cidades='.length)
          .split(',')
          .map(slug => slug.trim())
          .filter(Boolean)
      : null
  };
}

const descrever = cidade =>
  `${cidade.nome} (${cidade.uf}): ${cidade.redes.length} ${cidade.redes.length === 1 ? 'rede' : 'redes'} com preço online, ` +
  `${cidade.totalMercados} ${cidade.totalMercados === 1 ? 'mercado' : 'mercados'} no mapa a até ${cidade.raioKm} km do centro`;

/**
 * Roda o levantamento e grava o JSON. Devolve o código de saída: 0 tudo certo, 1 alguma cidade
 * falhou (ficou como estava), 2 uso errado.
 */
export async function principal(
  argumentos,
  {
    arquivo = ARQUIVO,
    cidades = CIDADES,
    escrever = console.log,
    avisar = console.error,
    hoje = hojeNoBrasil(),
    raios = RAIOS_KM,
    mapa = MAPA
  } = {}
) {
  const { cidades: filtro } = lerOpcoes(argumentos);
  if (filtro) {
    const desconhecidas = filtro.filter(slug => !cidades.some(cidade => cidade.slug === slug));
    if (desconhecidas.length) {
      avisar(`Cidades desconhecidas: ${desconhecidas.join(', ')}.`);
      return 2;
    }
  }
  const anteriores = new Map((await lerJson(arquivo)).map(cidade => [cidade.slug, cidade]));
  const resultado = [];
  const falhas = [];
  for (const cidade of cidades) {
    const anterior = anteriores.get(cidade.slug);
    if (filtro && !filtro.includes(cidade.slug)) {
      resultado.push(anterior || semLevantamento(cidade));
      continue;
    }
    const levantado = await levantarCidade(cidade, {
      hoje,
      raios,
      mapa,
      registrar: linha => avisar(`  ${linha}`)
    });
    if (levantado.ok) {
      resultado.push(levantado.cidade);
      escrever(descrever(levantado.cidade));
    } else {
      // Mantém o que já havia (ou a cidade sem levantamento), para o site não perder a página.
      resultado.push(anterior || semLevantamento(cidade));
      falhas.push(cidade);
      avisar(
        `${cidade.nome} (${cidade.uf}): ${levantado.motivo}. Ficou ${anterior?.levantadoEm ? `o levantamento de ${anterior.levantadoEm}` : 'sem levantamento'}.`
      );
    }
  }
  await writeFile(arquivo, `${JSON.stringify(resultado, null, 2)}\n`);
  escrever(`Gravado: ${arquivo instanceof URL ? arquivo.pathname : arquivo}`);
  if (falhas.length) {
    avisar(`Rode de novo mais tarde para: ${falhas.map(cidade => cidade.slug).join(', ')}.`);
    return 1;
  }
  return 0;
}

if (rodouDireto(import.meta.url))
  principal(process.argv.slice(2))
    .then(codigo => (process.exitCode = codigo))
    .catch(erro => {
      console.error(erro);
      process.exitCode = 1;
    });
