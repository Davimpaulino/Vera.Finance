import { contexto } from '../models/ContextoModel.js';
import { ListaModel } from '../models/ListaModel.js';
import { MercadoModel } from '../models/MercadoModel.js';
import { ComparacaoModel } from '../models/ComparacaoModel.js';
import { PrecoRegionalModel } from '../models/PrecoRegionalModel.js';
import { GeoModel } from '../models/GeoModel.js';
import { CicloModel } from '../models/CicloModel.js';
import { CategoriaModel } from '../models/CategoriaModel.js';
import { LancamentoModel } from '../models/LancamentoModel.js';
import { HttpError, requireFields } from '../utils/http.js';
import { round2 } from '../utils/money.js';

// O produto escolhido na lista (marca, tamanho, código de barras). Sem ele, o item é genérico.
function produtoEscolhido(produto) {
  if (!produto || typeof produto !== 'object') return null;
  const texto = (valor, max) => String(valor || '').trim().slice(0, max);
  return {
    chave: texto(produto.chave, 120),
    ean: texto(produto.ean, 20).replace(/\D/g, ''),
    marca: texto(produto.marca, 60),
    tamanho: texto(produto.tamanho, 20),
    termo: texto(produto.termo, 80)
  };
}

// Total que compara mercados de igual para igual (com a estimativa do que falta em cada um).
const comparavel = total => total.totalComparavel ?? total.total;

async function montar(ctx) {
  const [itens, regiao, resumo] = await Promise.all([
    ListaModel.listarOrdenado(ctx.ownerUid),
    MercadoModel.daRegiao(ctx.owner.local?.raioKm || 5, ctx.owner.local),
    CicloModel.resumo(ctx)
  ]);
  const habitual = ctx.owner.local?.mercadoHabitual || null;
  const cmp =
    regiao.modo === 'real'
      ? await PrecoRegionalModel.lista(
          itens,
          regiao.mercados,
          habitual,
          await GeoModel.cepParaPrecos(ctx.owner.local)
        )
      : await ComparacaoModel.lista(itens, regiao.mercados, habitual);
  const comida = resumo.categorias.find(c => c.nome === 'Comida') || null;

  // O que a compra faz com a categoria Comida, no melhor mercado e no de sempre.
  const impacto =
    comida && cmp.melhor
      ? {
          categoria: comida.nome,
          limite: comida.limite,
          usadoAntes: comida.usado,
          usadoDepois: round2(comida.usado + (cmp.melhor.porCategoria.Comida || 0)),
          sobra: round2(comida.limite - comida.usado - (cmp.melhor.porCategoria.Comida || 0)),
          restantes: resumo.ciclo.restantes,
          noHabitual:
            cmp.habitual && cmp.habitual.mercadoId !== cmp.melhor.mercadoId
              ? {
                  nome: cmp.habitual.nome,
                  sobra: round2(
                    comida.limite - comida.usado - (cmp.habitual.porCategoria.Comida || 0)
                  )
                }
              : null
        }
      : null;

  return {
    itens: cmp.itens,
    totais: cmp.totais,
    melhor: cmp.melhor,
    habitual: cmp.habitual,
    economia:
      cmp.melhor && cmp.habitual
        ? round2(comparavel(cmp.habitual) - comparavel(cmp.melhor))
        : 0,
    divisao: cmp.divisao || null,
    todosTotais: cmp.todos || cmp.totais,
    semPreco: cmp.semPreco,
    impacto
  };
}

export const listaController = {
  async get({ user }) {
    return montar(await contexto(user.uid));
  },

  /** Produtos para escolher ao adicionar: marca, tamanho e preço a partir de, na região. */
  async opcoes({ user, query }) {
    const termo = String(query.get('q') || '').trim();
    if (termo.length < 2) return { opcoes: [] };
    const ctx = await contexto(user.uid);
    const regiao = await MercadoModel.daRegiao(ctx.owner.local?.raioKm || 5, ctx.owner.local);
    if (regiao.modo === 'real') {
      const cep = await GeoModel.cepParaPrecos(ctx.owner.local);
      return { modo: 'real', opcoes: await PrecoRegionalModel.opcoes(termo, regiao.mercados, cep) };
    }
    return { modo: regiao.modo, opcoes: [] };
  },

  async add({ user, body }) {
    requireFields(body, ['nome']);
    const ctx = await contexto(user.uid);
    await ListaModel.criar(ctx.ownerUid, {
      nome: String(body.nome).trim(),
      produto: produtoEscolhido(body.produto),
      qtd: 1,
      done: false
    });
    return { status: 201, body: await montar(ctx) };
  },

  async update({ user, params, body }) {
    const ctx = await contexto(user.uid);
    const item = await ListaModel.buscar(ctx.ownerUid, params.id);
    if (!item) throw new HttpError(404, 'Item não encontrado.');
    const data = {};
    if (body.qtd !== undefined) data.qtd = Math.max(1, Math.min(99, parseInt(body.qtd, 10) || 1));
    if (body.done !== undefined) data.done = !!body.done;
    if (body.nome !== undefined) data.nome = String(body.nome).trim();
    if (body.produto !== undefined) data.produto = produtoEscolhido(body.produto);
    await ListaModel.atualizar(ctx.ownerUid, params.id, data);
    return montar(ctx);
  },

  async remove({ user, params }) {
    const ctx = await contexto(user.uid);
    await ListaModel.remover(ctx.ownerUid, params.id);
    return montar(ctx);
  },

  async limparComprados({ user }) {
    const ctx = await contexto(user.uid);
    await ListaModel.removerComprados(ctx.ownerUid);
    return montar(ctx);
  },

  /** Lança a compra no mercado escolhido, uma linha por categoria, e marca os itens. */
  /**
   * Lança a compra no mercado escolhido, uma linha por categoria, e marca os itens comprados.
   * Com `itemIds` (compra dividida), lança só aqueles itens naquele mercado.
   */
  async finalizar({ user, body }) {
    const ctx = await contexto(user.uid);
    const atual = await montar(ctx);
    const mercadoId = body.mercadoId || (atual.melhor || {}).mercadoId;
    const alvo = (atual.todosTotais || atual.totais).find(t => t.mercadoId === mercadoId);
    if (!alvo) throw new HttpError(400, 'Nenhum mercado com preço para essa lista.');
    const escolhidos = Array.isArray(body.itemIds) ? new Set(body.itemIds.map(String)) : null;
    const comprados = atual.itens.filter(
      i => !i.done && i.precos[alvo.mercadoId] != null && (!escolhidos || escolhidos.has(i.id))
    );
    if (!comprados.length) throw new HttpError(400, 'Nenhum item com preço nesse mercado.');
    const porCategoria = comprados.reduce((acc, i) => {
      const categoria = i.categoria || 'Comida';
      acc[categoria] = round2((acc[categoria] || 0) + i.precos[alvo.mercadoId] * (Number(i.qtd) || 1));
      return acc;
    }, {});
    const cats = await CategoriaModel.listar(ctx.ownerUid);
    const economia =
      !escolhidos && atual.habitual && atual.habitual.mercadoId !== alvo.mercadoId
        ? round2(comparavel(atual.habitual) - comparavel(alvo))
        : escolhidos && atual.divisao
          ? round2(atual.divisao.economia / 2)
          : 0;
    const criados = [];
    let primeiro = true;
    for (const [nome, valor] of Object.entries(porCategoria)) {
      const cat = cats.find(c => c.nome === nome) || cats.find(c => c.nome === 'Comida');
      criados.push(
        await LancamentoModel.criar(ctx.ownerUid, {
          titulo: alvo.nome,
          valor,
          tipo: 'saida',
          origem: 'lista',
          categoriaId: cat ? cat.id : null,
          categoriaNome: cat ? cat.nome : nome,
          data: new Date().toISOString(),
          quemId: user.uid,
          quemNome: ctx.user.nome || 'Você',
          economia: primeiro && economia > 0 ? economia : 0,
          itens: comprados.map(i => i.nome)
        })
      );
      primeiro = false;
    }
    for (const i of comprados) await ListaModel.atualizar(ctx.ownerUid, i.id, { done: true });
    return { lancamentos: criados, lista: await montar(ctx) };
  }

};
