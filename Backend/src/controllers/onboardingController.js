import { UsuarioModel } from '../models/UsuarioModel.js';
import { CategoriaModel, ICONES_CATEGORIA } from '../models/CategoriaModel.js';
import { FixoModel } from '../models/FixoModel.js';
import { MercadoModel } from '../models/MercadoModel.js';
import { PlanoModel } from '../models/PlanoModel.js';
import { GeoModel } from '../models/GeoModel.js';
import { origemDaBuscaOuCep } from './mercadoController.js';
import { materializarRecorrentes } from '../models/RecorrenteModel.js';
import { HttpError, toNumber } from '../utils/http.js';
import { round2, sum } from '../utils/money.js';
import {
  inteiroEntre,
  lista,
  localDoCorpo,
  objeto,
  raioKm,
  texto
} from '../utils/validacao.js';
import { cicloDoCorpo } from './userController.js';

// O cadastro guiado grava tudo de uma vez: cada lista tem teto e cada campo, tipo e tamanho.
const MAXIMO_DE_CATEGORIAS = 30;
const MAXIMO_DE_FIXOS = 50;

function valorNaoNegativo(valor, campo) {
  const numero = toNumber(valor, campo);
  if (numero < 0) throw new HttpError(400, 'Os valores não podem ser negativos.');
  return numero;
}

const iconeDaCategoria = (icon, padrao) => (ICONES_CATEGORIA.includes(icon) ? icon : padrao);

function fixosDoCorpo(corpo) {
  return lista(corpo, 'Os gastos fixos', MAXIMO_DE_FIXOS).map(item => {
    const fixo = objeto(item, 'O gasto fixo');
    return {
      nome: texto(fixo.nome, 'O nome do gasto fixo', { max: 60 }),
      categoria: texto(fixo.categoria, 'A categoria do gasto fixo', { max: 40 }) || 'Casa',
      // Ícone do fixo (zap, wifi...): nome de ícone, não um texto qualquer.
      icon: typeof fixo.icon === 'string' && /^[a-z0-9-]{1,40}$/.test(fixo.icon) ? fixo.icon : '',
      dia: fixo.dia === undefined ? 1 : inteiroEntre(fixo.dia, 1, 31, 'O dia do gasto fixo vai de 1 a 31.'),
      valor: valorNaoNegativo(fixo.valor, 'valor')
    };
  });
}

function categoriasDoCorpo(corpo) {
  return lista(corpo, 'As categorias', MAXIMO_DE_CATEGORIAS).map(item => {
    const categoria = objeto(item, 'A categoria');
    return {
      nome: texto(categoria.nome, 'O nome da categoria', { max: 40, obrigatorio: true }),
      icon: categoria.icon,
      limite: valorNaoNegativo(categoria.limite || 0, 'limite'),
      reserva: !!categoria.reserva
    };
  });
}

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
    return { ...GeoModel.aproximar(local), cidade: local.cidade || '' };
  const achado = await GeoModel.porCep(local.cep);
  return { cidade: local.cidade || achado?.cidade || '', ...(achado?.lat ? { lat: achado.lat, lng: achado.lng } : {}) };
}

export const onboardingController = {
  /** Divisão sugerida do que sobra depois dos fixos. */
  async sugestao({ body }) {
    const renda =
      valorNaoNegativo(body.rendaFixa || 0, 'rendaFixa') +
      valorNaoNegativo(body.rendaVariavel || 0, 'rendaVariavel');
    const fixos = sum(lista(body.fixos, 'Os gastos fixos', MAXIMO_DE_FIXOS), f =>
      valorNaoNegativo(objeto(f, 'O gasto fixo').valor, 'valor')
    );
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
    const km = raioKm(query.get('km'));
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
    const plano = body.plano ?? 'gratis';
    if (typeof plano !== 'string' || !PlanoModel.buscar(plano))
      throw new HttpError(400, 'Plano desconhecido.');
    const renda = cicloDoCorpo(body.renda);
    const rendaFixa = renda.rendaFixa || 0;
    if (rendaFixa <= 0) throw new HttpError(400, 'Informe a renda fixa do mês.');
    const fixos = fixosDoCorpo(body.fixos);
    const categorias = categoriasDoCorpo(body.categorias);
    const local = localDoCorpo(body.local);

    await UsuarioModel.criarSeNaoExistir(user.uid, { nome: user.name, email: user.email });
    await Promise.all([CategoriaModel.removerTodos(user.uid), FixoModel.removerTodos(user.uid)]);

    // Categorias dos fixos (Casa, Assinaturas…) com limite igual à soma deles.
    // Map, não objeto: um nome como "__proto__" ou "constructor" é só um nome.
    const porCat = new Map();
    fixos.forEach(f => {
      porCat.set(f.categoria, round2((porCat.get(f.categoria) || 0) + f.valor));
    });
    let ordem = 0;
    const criadas = new Map();
    for (const c of categorias) {
      criadas.set(
        c.nome,
        await CategoriaModel.criar(user.uid, {
          nome: c.nome,
          icon: iconeDaCategoria(c.icon, 'wallet'),
          limite: c.limite,
          reserva: c.reserva,
          alerta80: true,
          compartilhada: false,
          ordem: ordem++
        })
      );
    }
    for (const [nome, limite] of porCat) {
      if (criadas.has(nome)) continue;
      criadas.set(
        nome,
        await CategoriaModel.criar(user.uid, {
          nome,
          icon: Object.hasOwn(ICONE_FIXO, nome) ? ICONE_FIXO[nome] : 'wallet',
          limite,
          reserva: false,
          alerta80: true,
          compartilhada: false,
          ordem: ordem++
        })
      );
    }
    for (const f of fixos) {
      const cat = criadas.get(f.categoria);
      await FixoModel.criar(user.uid, {
        nome: f.nome,
        icon:
          f.icon || (Object.hasOwn(ICONE_FIXO, f.categoria) ? ICONE_FIXO[f.categoria] : 'repeat'),
        categoria: cat.nome,
        categoriaId: cat.id,
        dia: f.dia,
        valor: f.valor
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
        rendaVariavel: renda.rendaVariavel || 0,
        diaVirada: renda.diaVirada || 5,
        frequencia: renda.frequencia || 'Uma vez por mês'
      },
      local: {
        ...(await localizarCep(local)),
        cep: local.cep || '',
        raioKm: local.raioKm || 5,
        mercados: local.mercados || [],
        mercadoHabitual: (local.mercados || [])[0] || null
      }
    });
    await materializarRecorrentes(atualizado, user.uid);
    return { status: 201, body: atualizado };
  }
};
