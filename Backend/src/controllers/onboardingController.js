import { UsuarioModel } from '../models/UsuarioModel.js';
import { CategoriaModel } from '../models/CategoriaModel.js';
import { FixoModel } from '../models/FixoModel.js';
import { MercadoModel } from '../models/MercadoModel.js';
import { PlanoModel } from '../models/PlanoModel.js';
import { GeoModel } from '../models/GeoModel.js';
import { origemDaBuscaOuCep } from './mercadoController.js';
import { materializarRecorrentes } from '../models/RecorrenteModel.js';
import { HttpError, toNumber } from '../utils/http.js';
import { round2, sum } from '../utils/money.js';

const SUGESTAO = [
  { nome: 'Comida', icon: 'shopping-basket', pct: 0.32 },
  { nome: 'Transporte', icon: 'car', pct: 0.075 },
  { nome: 'Rolê', icon: 'beer', pct: 0.11 },
  { nome: 'Saúde', icon: 'pill', pct: 0.075 },
  { nome: 'Guardar', icon: 'target', pct: 0.335, reserva: true }
];

const ICONE_FIXO = {
  Casa: 'house',
  Assinaturas: 'repeat',
  Educação: 'graduation-cap',
  Transporte: 'car',
  Saúde: 'pill'
};

// Coordenadas vindas do navegador ou, na falta delas, do CEP.
async function localizarCep(local) {
  if (GeoModel.temCoordenadas(local))
    return { lat: Number(local.lat), lng: Number(local.lng), cidade: local.cidade || '' };
  const achado = await GeoModel.porCep(local.cep);
  return { cidade: local.cidade || achado?.cidade || '', ...(achado?.lat ? { lat: achado.lat, lng: achado.lng } : {}) };
}

export const onboardingController = {
  /** Divisão sugerida do que sobra depois dos fixos. */
  async sugestao({ body }) {
    const renda =
      toNumber(body.rendaFixa || 0, 'rendaFixa') +
      toNumber(body.rendaVariavel || 0, 'rendaVariavel');
    const fixos = sum(body.fixos || [], f => toNumber(f.valor, 'valor'));
    const disponivel = round2(renda - fixos);
    const categorias = SUGESTAO.map(c => ({
      ...c,
      limite: Math.max(0, Math.round((disponivel * c.pct) / 5) * 5)
    }));
    const reservado = sum(categorias, c => c.limite);
    return {
      renda: round2(renda),
      fixos,
      disponivel,
      categorias,
      reservado,
      sobra: round2(disponivel - reservado)
    };
  },

  async raio({ query }) {
    const km = Number(query.get('km')) || 5;
    const { mercados } = await MercadoModel.daRegiao(km, await origemDaBuscaOuCep(query));
    return {
      raioKm: km,
      mercados: mercados.length,
      atacados: mercados.filter(m => m.tipo === 'atacado').length,
      comPrecoOnline: mercados.filter(m => m.redeId).length
    };
  },

  /** Grava as cinco respostas de uma vez e abre o ciclo. */
  async concluir({ user, body }) {
    const { renda = {}, fixos = [], categorias = [], local = {}, plano = 'gratis' } = body;
    if (!PlanoModel.buscar(plano)) throw new HttpError(400, 'Plano desconhecido.');
    const rendaFixa = toNumber(renda.rendaFixa || 0, 'rendaFixa');
    if (rendaFixa <= 0) throw new HttpError(400, 'Informe a renda fixa do mês.');

    await UsuarioModel.criarSeNaoExistir(user.uid, { nome: user.name, email: user.email });
    await Promise.all([CategoriaModel.removerTodos(user.uid), FixoModel.removerTodos(user.uid)]);

    // Categorias dos fixos (Casa, Assinaturas…) com limite igual à soma deles.
    const porCat = {};
    fixos.forEach(f => {
      porCat[f.categoria || 'Casa'] = round2(
        (porCat[f.categoria || 'Casa'] || 0) + toNumber(f.valor, 'valor')
      );
    });
    let ordem = 0;
    const criadas = {};
    for (const c of categorias) {
      criadas[c.nome] = await CategoriaModel.criar(user.uid, {
        nome: c.nome,
        icon: c.icon || 'wallet',
        limite: toNumber(c.limite || 0, 'limite'),
        reserva: !!c.reserva,
        alerta80: true,
        compartilhada: false,
        ordem: ordem++
      });
    }
    for (const [nome, limite] of Object.entries(porCat)) {
      if (criadas[nome]) continue;
      criadas[nome] = await CategoriaModel.criar(user.uid, {
        nome,
        icon: ICONE_FIXO[nome] || 'wallet',
        limite,
        reserva: false,
        alerta80: true,
        compartilhada: false,
        ordem: ordem++
      });
    }
    for (const f of fixos) {
      const cat = criadas[f.categoria || 'Casa'];
      await FixoModel.criar(user.uid, {
        nome: f.nome,
        icon: f.icon || ICONE_FIXO[f.categoria] || 'repeat',
        categoria: cat.nome,
        categoriaId: cat.id,
        dia: Number(f.dia) || 1,
        valor: toNumber(f.valor, 'valor')
      });
    }

    const assinatura =
      plano !== 'gratis' ? { plano, desde: new Date().toISOString(), cancelada: false } : null;
    const atualizado = await UsuarioModel.atualizar(user.uid, {
      onboardingCompleto: true,
      plano,
      assinatura,
      ciclo: {
        rendaFixa,
        rendaVariavel: toNumber(renda.rendaVariavel || 0, 'rendaVariavel'),
        diaVirada: Number(renda.diaVirada) || 5,
        frequencia: renda.frequencia || 'Uma vez por mês'
      },
      local: {
        ...(await localizarCep(local)),
        cep: local.cep || '',
        raioKm: Number(local.raioKm) || 5,
        mercados: Array.isArray(local.mercados) ? local.mercados : [],
        mercadoHabitual: (local.mercados || [])[0] || null
      }
    });
    await materializarRecorrentes(atualizado, user.uid);
    return { status: 201, body: atualizado };
  }
};
