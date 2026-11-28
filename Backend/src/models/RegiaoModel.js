import { banco } from '../config/banco.js';
import { GeoModel, IDENTIFICACAO } from './GeoModel.js';
import { RedeModel } from './RedeModel.js';

// Mercados de verdade perto de um ponto, pelo OpenStreetMap (API Overpass, gratuita).
// A resposta fica guardada por 7 dias por região para não repetir a consulta a cada busca.
const SERVIDORES = [
  'https://overpass-api.de/api/interpreter',
  // Servidor de reserva na União Europeia (antes era um servidor na Rússia, fora do padrão da LGPD
  // para transferência internacional).
  'https://overpass.kumi.systems/api/interpreter'
];
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const RAIO_MAXIMO_KM = 15;
// Cada região guarda a lista inteira de mercados (centenas numa capital), então a memória tem
// teto: passou dele, sai a região usada há mais tempo. Ela continua no banco pelos 7 dias e volta
// de lá, sem consultar o mapa de novo.
const MAXIMO_EM_MEMORIA = 100;
const emCache = new Map();
const emAndamento = new Map();
const esperar = ms => new Promise(resolver => setTimeout(resolver, ms));

/** Região guardada em memória e ainda válida. A usada agora vai para o fim da fila de saída. */
function daMemoria(chave) {
  const mercados = emCache.get(chave);
  if (!mercados) return null;
  emCache.delete(chave);
  if (Date.now() - mercados.em > VALIDADE_MS) return null;
  emCache.set(chave, mercados);
  return mercados;
}

function lembrar(chave, mercados) {
  emCache.delete(chave);
  emCache.set(chave, mercados);
  // O Map guarda a ordem de entrada: o primeiro é o usado há mais tempo.
  while (emCache.size > MAXIMO_EM_MEMORIA) emCache.delete(emCache.keys().next().value);
}

const chaveDaRegiao = (origem, raioKm) =>
  `${Number(origem.lat).toFixed(2)}_${Number(origem.lng).toFixed(2)}_${raioKm}`.replace(/[.-]/g, m =>
    m === '.' ? 'p' : 'm'
  );

function endereco(tags) {
  const rua = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ');
  return [rua, tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(' · ');
}

function paraMercado(elemento) {
  const tags = elemento.tags || {};
  const nome = tags.name || tags.brand;
  if (!nome) return null;
  const lat = elemento.lat ?? elemento.center?.lat;
  const lng = elemento.lon ?? elemento.center?.lon;
  if (lat == null || lng == null) return null;
  const rede = RedeModel.identificar(tags.name, tags.brand);
  return {
    id: `osm-${elemento.type[0]}${elemento.id}`,
    nome,
    marca: tags.brand || '',
    endereco: endereco(tags),
    lat,
    lng,
    tipo:
      tags.shop === 'wholesale' || /atacad/i.test(nome) || rede?.tipo === 'atacado'
        ? 'atacado'
        : 'mercado',
    redeId: rede ? rede.id : null,
    origem: 'mapa'
  };
}

// Padrão do app: o pedido ao mapa espera até 25 s, e a consulta pede ao Overpass o mesmo teto.
const ESPERA_PADRAO_MS = 25000;
const METROS_POR_GRAU = 111320;

/**
 * Consulta Overpass dos supermercados e atacados a até `raioKm` do ponto (com 150 m de folga).
 * `forma: 'circulo'` (o app) usa (around:...). `forma: 'caixa'` (o script das cidades) pede o
 * retângulo em volta do mesmo círculo: o Overpass só confere o índice, sem medir a distância de
 * cada rua, e pesa menos numa capital. Vem um pouco mais (os cantos), mas mercadosPerto confere a
 * distância de cada mercado ao ponto do mesmo jeito, então o resultado é o mesmo.
 * `timeoutS` e `maxsize` (bytes) vão na própria consulta: o servidor aceita mais fácil uma
 * consulta que pede menos memória que o padrão dele (512 MiB).
 */
export function consultaDosMercados(origem, raioKm, { forma = 'circulo', timeoutS = 25, maxsize = null } = {}) {
  // O ponto vai arredondado (~100 m): o mapa não precisa do endereço exato de quem pergunta.
  const lat = Number(Number(origem.lat).toFixed(3));
  const lng = Number(Number(origem.lng).toFixed(3));
  const metros = Math.round(raioKm * 1000) + 150;
  let area;
  if (forma === 'caixa') {
    const dLat = metros / METROS_POR_GRAU;
    const dLng = metros / (METROS_POR_GRAU * Math.cos((lat * Math.PI) / 180));
    const borda = valor => valor.toFixed(4);
    area = `(${borda(lat - dLat)},${borda(lng - dLng)},${borda(lat + dLat)},${borda(lng + dLng)})`;
  } else area = `(around:${metros},${lat.toFixed(3)},${lng.toFixed(3)})`;
  const limites = `[timeout:${timeoutS}]${maxsize ? `[maxsize:${maxsize}]` : ''}`;
  if (forma === 'caixa')
    return `[out:json]${limites};nwr["shop"~"^(supermarket|wholesale)$"]${area};out center tags qt;`;
  return `[out:json]${limites};(nwr[shop=supermarket]${area};nwr[shop=wholesale]${area};);out center tags;`;
}

const segundos = ms => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

/**
 * Pergunta ao mapa, servidor por servidor. Devolve a lista ou null se nenhum respondeu.
 * `registrar(texto)` recebe uma linha por tentativa (servidor, status HTTP ou erro, tempo); o
 * app não passa nada e não registra. `esperaMs` é quanto cada pedido espera a resposta.
 */
async function consultar(origem, raioKm, { esperaMs = ESPERA_PADRAO_MS, consulta = {}, registrar } = {}) {
  const texto = consultaDosMercados(origem, raioKm, consulta);
  const anotar = linha => {
    try {
      registrar?.(linha);
    } catch {
      // Quem registra não pode derrubar a consulta.
    }
  };
  for (const servidor of [...SERVIDORES, SERVIDORES[0]]) {
    const nome = new URL(servidor).hostname;
    const inicio = Date.now();
    try {
      const resposta = await fetch(servidor, {
        method: 'POST',
        headers: {
          'User-Agent': IDENTIFICACAO,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(texto)}`,
        signal: AbortSignal.timeout(esperaMs)
      });
      if (!resposta.ok) {
        anotar(`${nome}: HTTP ${resposta.status} em ${segundos(Date.now() - inicio)}`);
        if (resposta.status === 429) await esperar(1500);
        continue;
      }
      const dados = await resposta.json();
      // Com [out:json], estouro de tempo ou de memória no Overpass volta 200 com um "remark" e a
      // lista pela metade: conta como falha, para não guardar uma região vazia por 7 dias.
      if (/runtime error/i.test(dados.remark || '')) {
        anotar(`${nome}: ${dados.remark} (${segundos(Date.now() - inicio)})`);
        continue;
      }
      const lista = (dados.elements || []).map(paraMercado).filter(Boolean);
      anotar(
        `${nome}: ${lista.length} ${lista.length === 1 ? 'mercado' : 'mercados'} em ${segundos(Date.now() - inicio)}`
      );
      return lista;
    } catch (erro) {
      const motivo =
        erro?.name === 'TimeoutError' ? `sem resposta em ${segundos(esperaMs)}` : erro?.message || String(erro);
      anotar(`${nome}: ${motivo}`);
      continue;
    }
  }
  return null;
}

export const RegiaoModel = {
  /**
   * Mercados num raio do ponto, do mais perto para o mais longe, com a rede reconhecida.
   * Devolve null quando o mapa não respondeu.
   *
   * `guardar: false` (o verificador público de CEP, que qualquer um chama sem login) usa o que já
   * estiver guardado, mas o que vier do mapa não é gravado no banco nem fica na memória: pedido
   * anônimo não faz o banco nem a memória crescerem.
   *
   * `registrar`, `esperaMs` e `consulta` são do script das cidades (scripts/cobertura-das-cidades.mjs):
   * uma linha por tentativa no console, mais tempo de espera e a consulta mais leve (veja
   * consultaDosMercados). O app não passa nenhum dos três.
   */
  async mercadosPerto(origem, raioKm, { guardar = true, ...mapa } = {}) {
    if (!GeoModel.temCoordenadas(origem)) return [];
    // Raio em km inteiros: 5 e 5,0001 são a mesma região (e a mesma consulta ao mapa).
    const raio = Math.min(RAIO_MAXIMO_KM, Math.max(1, Math.round(Number(raioKm) || 5)));
    const chave = chaveDaRegiao(origem, raio);
    let mercados = daMemoria(chave);
    if (!mercados) {
      const chaveDaCarga = guardar ? chave : `${chave}|sem-guardar`;
      // Pedidos ao mesmo tempo esperam a mesma carga. Quem não guarda pode esperar a carga de
      // quem guarda (dá o mesmo resultado); o contrário não, para a região não deixar de ser gravada.
      let carga = emAndamento.get(chave) || emAndamento.get(chaveDaCarga);
      if (!carga) {
        carga = this.carregar(chave, origem, raio, { guardar, ...mapa }).finally(() =>
          emAndamento.delete(chaveDaCarga)
        );
        emAndamento.set(chaveDaCarga, carga);
      }
      mercados = await carga;
      if (!mercados) return null;
    }
    return mercados.lista
      .map(mercado => ({ ...mercado, distanciaKm: GeoModel.distanciaKm(origem, mercado) }))
      .filter(mercado => mercado.distanciaKm <= raio)
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  },

  // Uma consulta por região de cada vez: pedidos ao mesmo tempo esperam a mesma resposta.
  async carregar(chave, origem, raio, { guardar = true, ...mapa } = {}) {
    const salvo = await banco.ler(`regioes/${chave}`).catch(() => null);
    let mercados;
    if (salvo && Date.now() - new Date(salvo.em).getTime() < VALIDADE_MS) {
      mercados = { em: new Date(salvo.em).getTime(), lista: Object.values(salvo.lista || {}) };
    } else {
      const lista = await consultar(origem, raio, mapa);
      if (!lista) return null;
      mercados = { em: Date.now(), lista };
      if (guardar)
        banco.gravar(`regioes/${chave}`, { em: new Date().toISOString(), lista }).catch(() => {});
    }
    if (guardar) lembrar(chave, mercados);
    return mercados;
  }
};
