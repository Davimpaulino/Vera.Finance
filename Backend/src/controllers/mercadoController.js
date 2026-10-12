import { contexto } from '../models/ContextoModel.js';
import { MercadoModel } from '../models/MercadoModel.js';
import { PrecoModel } from '../models/PrecoModel.js';
import { GeoModel } from '../models/GeoModel.js';
import { PrecoRegionalModel } from '../models/PrecoRegionalModel.js';
import { HttpError } from '../utils/http.js';

/** Ponto de onde medir: lat/lng da busca ou, na falta, o CEP. */
export async function origemDaBuscaOuCep(query) {
  const ponto = origemDaBusca(query);
  if (ponto) return ponto;
  const achado = query.get('cep') ? await GeoModel.porCep(query.get('cep')) : null;
  return achado?.lat ? { lat: achado.lat, lng: achado.lng } : null;
}

export const origemDaBusca = query =>
  query.get('lat') && query.get('lng')
    ? { lat: Number(query.get('lat')), lng: Number(query.get('lng')) }
    : null;

export const mercadoController = {
  /** Lista pública de mercados (usada no cadastro para escolher os de costume). */
  async list({ query }) {
    const km = Number(query.get('raio')) || 15;
    const origem = await origemDaBuscaOuCep(query);
    return (await MercadoModel.daRegiao(km, origem)).mercados.slice(0, 40);
  },

  async produtos({ user, query }) {
    const q = query.get('q') || '';
    if (q.trim().length < 2) return [];
    const ctx = await contexto(user.uid);
    const { modo, mercados } = await MercadoModel.daRegiao(
      ctx.owner.local?.raioKm || 5,
      ctx.owner.local
    );
    const dasNotas = (await PrecoModel.buscarProdutos(q)).slice(0, 8).map(p => p.produto);
    if (modo !== 'real' || q.trim().length < 3) return dasNotas;
    const cep = await GeoModel.cepParaPrecos(ctx.owner.local);
    const dosSites = await PrecoRegionalModel.sugestoes(q, mercados, cep);
    return [...new Set([...dosSites, ...dasNotas])].slice(0, 8);
  },

  async comparar({ user, query }) {
    const produto = (query.get('produto') || '').trim();
    if (produto.length < 2) throw new HttpError(400, 'Digite o nome do produto.');
    const ctx = await contexto(user.uid);
    const raioKm = ctx.owner.local?.raioKm || 5;
    const habitual = ctx.owner.local?.mercadoHabitual || null;
    const { modo, mercados, mapaFalhou } = await MercadoModel.daRegiao(raioKm, ctx.owner.local);
    if (modo === 'real') {
      const cep = await GeoModel.cepParaPrecos(ctx.owner.local);
      const real = await PrecoRegionalModel.comparar(produto, mercados, habitual, {
        cep,
        opcao: query.get('opcao') || ''
      });
      return {
        ...real,
        modo,
        raioKm,
        totalMercados: mercados.length,
        lista: null,
        mapaFalhou,
        temLocalizacao: true
      };
    }
    // Sem localização não há mercados perto para comparar: nada de mercados de exemplo.
    return {
      produto: null,
      opcoes: [],
      sugestoes: [],
      mercados: [],
      historico: null,
      troca: null,
      lista: null,
      modo,
      raioKm,
      totalMercados: 0,
      temLocalizacao: false
    };
  }
};
