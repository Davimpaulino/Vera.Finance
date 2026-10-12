import { banco } from '../config/banco.js';
import { GeoModel } from './GeoModel.js';
import { RegiaoModel } from './RegiaoModel.js';
import { RedeModel } from './RedeModel.js';

const ATACADOS = /atacad|assai|assaí|makro|tenda|roldao|roldão|max atacad|fort atacad|spani/i;

// Distância até quem pergunta: só existe quando os dois lados têm coordenadas.
const distanciaAte = (mercado, origem) => GeoModel.distanciaKm(origem, mercado);

export const MercadoModel = {
  listar: () => banco.listar('mercados'),

  buscar: async id => {
    const mercado = await banco.ler(`mercados/${id}`);
    return mercado ? { id, ...mercado } : null;
  },

  async dentroDoRaio(raioKm, origem) {
    const todos = await this.listar();
    return todos
      .map(mercado => ({ ...mercado, distanciaKm: distanciaAte(mercado, origem) }))
      .filter(mercado => mercado.distanciaKm != null && mercado.distanciaKm <= raioKm)
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  },

  /**
   * Mercados da região de quem pergunta. Com localização: os mercados reais do mapa, mais os
   * mercados das notas lidas (a nota se junta ao mercado do mapa que fica no mesmo lugar).
   * Sem localização não há como saber quais mercados ficam perto: a lista vem vazia.
   */
  async daRegiao(raioKm, local) {
    if (!GeoModel.temCoordenadas(local)) return { modo: 'semLocal', mercados: [] };
    const [doMapa, todos] = await Promise.all([
      RegiaoModel.mercadosPerto(local, raioKm),
      this.listar()
    ]);
    const dasNotas = todos
      .filter(mercado => mercado.origem === 'nfce' && GeoModel.temCoordenadas(mercado))
      .map(mercado => ({ ...mercado, distanciaKm: GeoModel.distanciaKm(local, mercado) }))
      .filter(mercado => mercado.distanciaKm <= raioKm);
    const mapaFalhou = doMapa === null;
    const mercados = (doMapa || []).map(mercado => ({ ...mercado }));
    dasNotas.forEach(daNota => {
      const mesmo = mercados.find(
        mercado => !mercado.notaId && GeoModel.distanciaKm(mercado, daNota) <= 0.15
      );
      if (mesmo) mesmo.notaId = daNota.id;
      else
        mercados.push({
          ...daNota,
          notaId: daNota.id,
          redeId: RedeModel.identificar(daNota.nome)?.id || null
        });
    });
    mercados.sort((a, b) => a.distanciaKm - b.distanciaKm);
    return { modo: 'real', mercados, mapaFalhou };
  },

  gravar: (id, dados) => banco.mesclar(`mercados/${id}`, dados),

  /** Mercado que emitiu a nota, identificado pelo CNPJ. Cria e localiza no mapa na primeira leitura. */
  async registrarDaNota({ cnpj, nome, endereco }) {
    const digitos = String(cnpj || '').replace(/\D/g, '');
    const id = digitos ? `cnpj-${digitos}` : null;
    if (id) {
      const existente = await this.buscar(id);
      if (existente) return existente;
    }
    const coordenadas = await GeoModel.geocodificar(endereco);
    const mercado = {
      nome: nome || 'Mercado',
      endereco: endereco || '',
      cnpj: digitos,
      tipo: ATACADOS.test(nome || '') ? 'atacado' : 'mercado',
      origem: 'nfce',
      ...(coordenadas || {})
    };
    const novoId = id || (await banco.adicionar('mercados', mercado));
    if (id) await banco.gravar(`mercados/${id}`, mercado);
    return { id: novoId, ...mercado };
  }
};
