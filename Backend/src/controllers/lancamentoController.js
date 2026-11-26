import { contexto, podeVerCategoria, podeVerLancamento } from '../models/ContextoModel.js';
import { CicloModel } from '../models/CicloModel.js';
import { LancamentoModel, TIPOS, ORIGENS } from '../models/LancamentoModel.js';
import { CategoriaModel } from '../models/CategoriaModel.js';
import { materializarRecorrentes } from '../models/RecorrenteModel.js';
import { HttpError, requireFields, toNumber } from '../utils/http.js';
import { idValido, texto } from '../utils/validacao.js';
import { normalize } from '../utils/text.js';
import { sum } from '../utils/money.js';

// Quantos ciclos para trás (ou para a frente) a tela pode pedir: 10 anos bastam, e um número
// absurdo levaria a uma data inválida.
const CICLOS_MAXIMOS = 120;
const deslocamentoDoCiclo = valor => {
  const numero = Math.trunc(Number(valor) || 0);
  return Math.max(-CICLOS_MAXIMOS, Math.min(CICLOS_MAXIMOS, numero));
};

function dataDoCorpo(valor) {
  if (valor === undefined || valor === null || valor === '') return new Date().toISOString();
  const data = typeof valor === 'string' || typeof valor === 'number' ? new Date(valor) : null;
  const ano = data?.getFullYear();
  if (!data || !Number.isFinite(data.getTime()) || ano < 1900 || ano > 2200)
    throw new HttpError(400, 'Data inválida.');
  return data.toISOString();
}

// Cada célula vai entre aspas (com as aspas de dentro dobradas): vírgula, ponto e vírgula ou
// quebra de linha no meio do texto não partem a célula.
const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const CABECALHO_DA_PLANILHA = 'data;tipo;descricao;categoria;valor;origem;quem';

// Texto que a pessoa digitou (descrição, categoria, nome de quem lançou) e que começa com = + - @
// vira fórmula ao abrir a planilha no Excel ou no Google Planilhas. No modo família, um membro
// poderia pôr uma fórmula na planilha do dono. O apóstrofo na frente deixa o texto como texto.
// Vale também logo depois de vírgula, ponto e vírgula, tabulação ou quebra de linha: um programa
// que separa as colunas por outro caractere (o Excel em inglês usa a vírgula) parte o texto ali,
// e o pedaço seguinte vira o começo de outra célula.
const COMECO_DE_FORMULA = /(^|[,;\t\r\n])(\s*)([=+\-@])/g;
const textoDaPlanilha = v => String(v ?? '').replace(COMECO_DE_FORMULA, "$1$2'$3");

export const lancamentoController = {
  /** Lançamentos do ciclo, agrupados por dia, com filtros de categoria, tipo e busca. */
  async list({ user, query }) {
    const ctx = await contexto(user.uid);
    await materializarRecorrentes(ctx.owner, ctx.ownerUid);
    const resumo = await CicloModel.resumo(ctx, deslocamentoDoCiclo(query.get('ciclo')));
    const categoriaId = query.get('categoria') || '';
    const tipo = query.get('tipo') || '';
    const q = normalize(query.get('q') || '');

    const todos = resumo.lancamentos;
    const filtrados = todos.filter(
      l =>
        (!categoriaId || l.categoriaId === categoriaId) &&
        (!tipo || l.tipo === tipo) &&
        (!q || normalize(`${l.titulo} ${l.categoriaNome} ${(l.itens || []).join(' ')}`).includes(q))
    );

    const dias = [];
    filtrados.forEach(l => {
      const dt = new Date(l.data);
      const dia = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      let g = dias.find(d => d.dia === dia);
      if (!g) {
        g = { dia, itens: [] };
        dias.push(g);
      }
      g.itens.push(l);
    });
    dias.forEach(d => {
      d.saidas = sum(
        d.itens.filter(i => i.tipo === 'saida'),
        i => i.valor
      );
      d.entradas = sum(
        d.itens.filter(i => i.tipo === 'entrada'),
        i => i.valor
      );
    });

    const saidas = todos.filter(l => l.tipo === 'saida');
    const entradas = todos.filter(l => l.tipo === 'entrada');
    const deNota = saidas.filter(l => l.origem === 'nota').length;
    return {
      ciclo: resumo.ciclo,
      stats: {
        saidas: resumo.saidas,
        saidasCount: saidas.length,
        entradas: sum(entradas, l => l.valor),
        entradasDescricao: entradas.map(l => l.titulo),
        deNota,
        deNotaPct: saidas.length ? Math.round((deNota / saidas.length) * 100) : 0
      },
      categorias: resumo.categorias
        .concat(resumo.reservas)
        .map(c => ({ id: c.id, nome: c.nome, icon: c.icon })),
      dias
    };
  },

  async create({ user, body }) {
    requireFields(body, ['titulo', 'valor']);
    const ctx = await contexto(user.uid);
    const tipo = body.tipo || 'saida';
    if (!TIPOS.includes(tipo)) throw new HttpError(400, 'Tipo inválido.');
    const origem = ORIGENS.includes(body.origem) ? body.origem : 'manual';
    const valor = toNumber(body.valor, 'valor');
    if (valor <= 0) throw new HttpError(400, 'O valor precisa ser maior que zero.');

    const titulo = texto(body.titulo, 'A descrição', { max: 120, obrigatorio: true });
    const data = dataDoCorpo(body.data);

    let categoria = null;
    if (tipo === 'saida') {
      if (!body.categoriaId) throw new HttpError(400, 'Escolha a categoria do gasto.');
      if (!idValido(body.categoriaId)) throw new HttpError(400, 'Categoria não encontrada.');
      categoria = await CategoriaModel.buscar(ctx.ownerUid, body.categoriaId);
      // No modo família, quem não é dono só lança nas categorias que o dono compartilhou.
      if (!categoria || !podeVerCategoria(ctx, categoria))
        throw new HttpError(400, 'Categoria não encontrada.');
    }
    const lanc = await LancamentoModel.criar(ctx.ownerUid, {
      titulo,
      valor,
      tipo,
      origem,
      categoriaId: categoria ? categoria.id : null,
      categoriaNome: categoria ? categoria.nome : 'entrada',
      data,
      quemId: user.uid,
      quemNome: ctx.user.nome || 'Você'
    });
    return { status: 201, body: lanc };
  },

  async remove({ user, params }) {
    const ctx = await contexto(user.uid);
    const l = await LancamentoModel.buscar(ctx.ownerUid, params.id);
    if (!l) throw new HttpError(404, 'Lançamento não encontrado.');
    if (!ctx.isDono && l.quemId !== user.uid)
      throw new HttpError(403, 'Só quem lançou pode apagar.');
    await LancamentoModel.remover(ctx.ownerUid, params.id);
    return { status: 204 };
  },

  /** Planilha (CSV) dos lançamentos que a pessoa pode ver (no modo família, os mesmos da tela). */
  async exportar({ user }) {
    const ctx = await contexto(user.uid);
    const [todos, categorias] = await Promise.all([
      LancamentoModel.listar(ctx.ownerUid, { ordenarPor: 'data', direcao: 'desc' }),
      CategoriaModel.listar(ctx.ownerUid)
    ]);
    const visiveis = todos.filter(podeVerLancamento(ctx, categorias));
    const linhas = visiveis.map(l =>
      [
        String(l.data || '').slice(0, 10),
        textoDaPlanilha(l.tipo),
        textoDaPlanilha(l.titulo),
        textoDaPlanilha(l.categoriaNome),
        String(l.valor).replace('.', ','),
        textoDaPlanilha(l.origem),
        textoDaPlanilha(l.quemNome)
      ]
        .map(csvCell)
        .join(';')
    );
    // O BOM no começo faz o Excel abrir a planilha como UTF-8 (com os acentos certos).
    const csv = '﻿' + [CABECALHO_DA_PLANILHA, ...linhas].join('\n');
    return {
      raw: csv,
      contentType: 'text/csv; charset=utf-8',
      headers: { 'Content-Disposition': 'attachment; filename="vera-lancamentos.csv"' }
    };
  }
};
