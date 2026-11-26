import { contexto, podeVerCategoria } from '../models/ContextoModel.js';
import { ListaModel } from '../models/ListaModel.js';
import { MercadoModel } from '../models/MercadoModel.js';
import { ComparacaoModel } from '../models/ComparacaoModel.js';
import { PrecoRegionalModel } from '../models/PrecoRegionalModel.js';
import { GeoModel } from '../models/GeoModel.js';
import { CicloModel } from '../models/CicloModel.js';
import { CategoriaModel } from '../models/CategoriaModel.js';
import { LancamentoModel } from '../models/LancamentoModel.js';
import { HttpError, requireFields } from '../utils/http.js';
import {
  TAMANHO_MAXIMO_DO_ID,
  inteiroEntre,
  lista as listaDoCorpo,
  texto
} from '../utils/validacao.js';
import { round2 } from '../utils/money.js';

// Cada item da lista é buscado no site de cada rede da região a cada resposta: o teto de itens e
// o do tamanho do nome seguram quantas buscas uma lista sozinha pode pedir.
export const MAXIMO_DE_ITENS_NA_LISTA = 150;
// O nome pode vir do site da rede ("Arroz Branco Tipo 1 ... Pacote 5kg"), que às vezes é longo.
const nomeDoItem = valor => texto(valor, 'O nome do item', { max: 150, obrigatorio: true });
// Termo de busca nos sites das redes: mais do que isto não é nome de produto.
const MAXIMO_DO_TERMO = 80;

// O produto escolhido na lista (marca, tamanho, código de barras). Sem ele, o item é genérico.
function produtoEscolhido(produto) {
  if (!produto || typeof produto !== 'object' || Array.isArray(produto)) return null;
  // Os campos vêm do site da rede e às vezes passam do tamanho: corta em vez de recusar. Mas só
  // texto ou número: um objeto no lugar do texto quebraria o String() (erro 500).
  const campo = (valor, max) => {
    if (valor === undefined || valor === null || valor === '') return '';
    if (typeof valor !== 'string' && typeof valor !== 'number')
      throw new HttpError(400, 'O produto escolhido está num formato inválido.');
    return String(valor).trim().slice(0, max);
  };
  return {
    chave: campo(produto.chave, 120),
    ean: campo(produto.ean, 20).replace(/\D/g, ''),
    marca: campo(produto.marca, 60),
    tamanho: campo(produto.tamanho, 20),
    termo: campo(produto.termo, 80)
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
    const termo = String(query.get('q') || '').trim().slice(0, MAXIMO_DO_TERMO);
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
    const nome = nomeDoItem(body.nome);
    const ctx = await contexto(user.uid);
    if ((await ListaModel.listar(ctx.ownerUid)).length >= MAXIMO_DE_ITENS_NA_LISTA)
      throw new HttpError(
        409,
        `A lista chegou a ${MAXIMO_DE_ITENS_NA_LISTA} itens. Tire os comprados antes de adicionar mais.`
      );
    await ListaModel.criar(ctx.ownerUid, {
      nome,
      produto: produtoEscolhido(body.produto),
      qtd: 1,
      done: false,
      quemId: user.uid
    });
    return { status: 201, body: await montar(ctx) };
  },

  async update({ user, params, body }) {
    const ctx = await contexto(user.uid);
    const item = await ListaModel.buscar(ctx.ownerUid, params.id);
    if (!item) throw new HttpError(404, 'Item não encontrado.');
    const data = {};
    // A tela só manda de 1 a 99 (os botões param aí).
    if (body.qtd !== undefined)
      data.qtd = inteiroEntre(body.qtd, 1, 99, 'A quantidade vai de 1 a 99.');
    if (body.done !== undefined) data.done = !!body.done;
    if (body.nome !== undefined) data.nome = nomeDoItem(body.nome);
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
    const escolhidos =
      body.itemIds === undefined || body.itemIds === null
        ? null
        : new Set(
            listaDoCorpo(body.itemIds, 'itens', MAXIMO_DE_ITENS_NA_LISTA).map(id =>
              texto(id, 'O item', { max: TAMANHO_MAXIMO_DO_ID })
            )
          );
    const comprados = atual.itens.filter(
      i => !i.done && i.precos[alvo.mercadoId] != null && (!escolhidos || escolhidos.has(i.id))
    );
    if (!comprados.length) throw new HttpError(400, 'Nenhum item com preço nesse mercado.');
    const porCategoria = comprados.reduce((acc, i) => {
      const categoria = i.categoria || 'Comida';
      acc[categoria] = round2((acc[categoria] || 0) + i.precos[alvo.mercadoId] * (Number(i.qtd) || 1));
      return acc;
    }, {});
    // No modo família, quem não é dono só lança nas categorias que o dono compartilhou, como num
    // gasto à mão. Sem nenhuma que sirva, o gasto entra sem categoria (como quando a conta não
    // tem a categoria Comida): a compra fica registrada sem gastar o limite de quem não enxerga.
    const cats = (await CategoriaModel.listar(ctx.ownerUid)).filter(c =>
      podeVerCategoria(ctx, c)
    );
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
