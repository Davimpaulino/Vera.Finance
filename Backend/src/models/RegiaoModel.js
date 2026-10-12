import { banco } from '../config/banco.js';
import { GeoModel } from './GeoModel.js';
import { RedeModel } from './RedeModel.js';

// Mercados de verdade perto de um ponto, pelo OpenStreetMap (API Overpass, gratuita).
// A resposta fica guardada por 7 dias por região para não repetir a consulta a cada busca.
const SERVIDORES = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const RAIO_MAXIMO_KM = 15;
const emCache = new Map();
const emAndamento = new Map();
const esperar = ms => new Promise(resolver => setTimeout(resolver, ms));

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

async function consultar(origem, raioKm) {
  const perto = `(around:${Math.round(raioKm * 1000)},${origem.lat},${origem.lng})`;
  const consulta = `[out:json][timeout:25];(nwr[shop=supermarket]${perto};nwr[shop=wholesale]${perto};);out center tags;`;
  for (const servidor of [...SERVIDORES, SERVIDORES[0]]) {
    try {
      const resposta = await fetch(servidor, {
        method: 'POST',
        headers: {
          'User-Agent': 'vera.finance/1.0 (https://github.com/veragroupia/vera-finances)',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(consulta)}`,
        signal: AbortSignal.timeout(25000)
      });
      if (resposta.status === 429) await esperar(1500);
      if (!resposta.ok) continue;
      const dados = await resposta.json();
      return (dados.elements || []).map(paraMercado).filter(Boolean);
    } catch {
      continue;
    }
  }
  return null;
}

export const RegiaoModel = {
  /**
   * Mercados num raio do ponto, do mais perto para o mais longe, com a rede reconhecida.
   * Devolve null quando o mapa não respondeu.
   */
  async mercadosPerto(origem, raioKm) {
    if (!GeoModel.temCoordenadas(origem)) return [];
    const raio = Math.min(RAIO_MAXIMO_KM, Math.max(1, Number(raioKm) || 5));
    const chave = chaveDaRegiao(origem, raio);
    let mercados = emCache.get(chave);
    if (!mercados || Date.now() - mercados.em > VALIDADE_MS) {
      if (!emAndamento.has(chave))
        emAndamento.set(
          chave,
          this.carregar(chave, origem, raio).finally(() => emAndamento.delete(chave))
        );
      mercados = await emAndamento.get(chave);
      if (!mercados) return null;
    }
    return mercados.lista
      .map(mercado => ({ ...mercado, distanciaKm: GeoModel.distanciaKm(origem, mercado) }))
      .filter(mercado => mercado.distanciaKm <= raio)
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  },

  // Uma consulta por região de cada vez: pedidos ao mesmo tempo esperam a mesma resposta.
  async carregar(chave, origem, raio) {
    const salvo = await banco.ler(`regioes/${chave}`).catch(() => null);
    let mercados;
    if (salvo && Date.now() - new Date(salvo.em).getTime() < VALIDADE_MS) {
      mercados = { em: new Date(salvo.em).getTime(), lista: Object.values(salvo.lista || {}) };
    } else {
      const lista = await consultar(origem, raio);
      if (!lista) return null;
      mercados = { em: Date.now(), lista };
      banco.gravar(`regioes/${chave}`, { em: new Date().toISOString(), lista }).catch(() => {});
    }
    emCache.set(chave, mercados);
    return mercados;
  }
};
