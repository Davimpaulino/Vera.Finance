import { contexto } from '../models/ContextoModel.js';
import { CicloModel } from '../models/CicloModel.js';
import { LancamentoModel, TIPOS, ORIGENS } from '../models/LancamentoModel.js';
import { CategoriaModel } from '../models/CategoriaModel.js';
import { materializarRecorrentes } from '../models/RecorrenteModel.js';
import { HttpError, requireFields, toNumber } from '../utils/http.js';
import { normalize } from '../utils/text.js';
import { sum } from '../utils/money.js';

const csvCell = v => {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const lancamentoController = {
  /** Lançamentos do ciclo, agrupados por dia, com filtros de categoria, tipo e busca. */
  async list({ user, query }) {
    const ctx = await contexto(user.uid);
    await materializarRecorrentes(ctx.owner, ctx.ownerUid);
    const resumo = await CicloModel.resumo(ctx, Number(query.get('ciclo')) || 0);
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

    let categoria = null;
    if (tipo === 'saida') {
      if (!body.categoriaId) throw new HttpError(400, 'Escolha a categoria do gasto.');
      categoria = await CategoriaModel.buscar(ctx.ownerUid, body.categoriaId);
      if (!categoria) throw new HttpError(400, 'Categoria não encontrada.');
    }
    const lanc = await LancamentoModel.criar(ctx.ownerUid, {
      titulo: String(body.titulo).trim(),
      valor,
      tipo,
      origem,
      categoriaId: categoria ? categoria.id : null,
      categoriaNome: categoria ? categoria.nome : 'entrada',
      data: body.data ? new Date(body.data).toISOString() : new Date().toISOString(),
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

  /** Planilha (CSV) de todos os lançamentos. */
  async exportar({ user, res }) {
    const ctx = await contexto(user.uid);
    const todos = await LancamentoModel.listar(ctx.ownerUid, { orderBy: 'data', dir: 'desc' });
    const linhas = [['data', 'tipo', 'descricao', 'categoria', 'valor', 'origem', 'quem']].concat(
      todos.map(l => [
        l.data.slice(0, 10),
        l.tipo,
        l.titulo,
        l.categoriaNome,
        String(l.valor).replace('.', ','),
        l.origem,
        l.quemNome
      ])
    );
    const csv = '﻿' + linhas.map(r => r.map(csvCell).join(';')).join('\n');
    return {
      raw: csv,
      contentType: 'text/csv; charset=utf-8',
      headers: { 'Content-Disposition': 'attachment; filename="vera-lancamentos.csv"' }
    };
  }
};
