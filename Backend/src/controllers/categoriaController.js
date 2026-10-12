import { contexto } from '../models/ContextoModel.js';
import { CicloModel } from '../models/CicloModel.js';
import { CategoriaModel, ICONES_CATEGORIA } from '../models/CategoriaModel.js';
import { LancamentoModel } from '../models/LancamentoModel.js';
import { HttpError, requireFields, toNumber } from '../utils/http.js';

export const categoriaController = {
  async list({ user }) {
    const ctx = await contexto(user.uid);
    const r = await CicloModel.resumo(ctx);
    return {
      ciclo: r.ciclo,
      entradas: r.entradas,
      reservado: r.reservado,
      semDestino: r.semDestino,
      consumidoPct: Math.round((r.ciclo.diaAtual / r.ciclo.totalDias) * 100),
      categorias: r.categorias,
      reservas: r.reservas,
      icones: ICONES_CATEGORIA
    };
  },

  async create({ user, body }) {
    requireFields(body, ['nome']);
    const ctx = await contexto(user.uid);
    if (!ctx.isDono) throw new HttpError(403, 'Só o dono do ciclo cria categorias.');
    if (await CategoriaModel.buscarPorNome(ctx.ownerUid, body.nome))
      throw new HttpError(409, 'Já existe uma categoria com esse nome.');
    const atuais = await CategoriaModel.listar(ctx.ownerUid);
    const cat = await CategoriaModel.criar(ctx.ownerUid, {
      nome: String(body.nome).trim(),
      icon: ICONES_CATEGORIA.includes(body.icon) ? body.icon : 'wallet',
      limite: toNumber(body.limite || 0, 'limite'),
      reserva: false,
      alerta80: true,
      compartilhada: false,
      ordem: atuais.length
    });
    return { status: 201, body: cat };
  },

  async update({ user, params, body }) {
    const ctx = await contexto(user.uid);
    if (!ctx.isDono) throw new HttpError(403, 'Só o dono do ciclo muda categorias.');
    const atual = await CategoriaModel.buscar(ctx.ownerUid, params.id);
    if (!atual) throw new HttpError(404, 'Categoria não encontrada.');
    const data = {};
    if (body.nome !== undefined) data.nome = String(body.nome).trim();
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.limite !== undefined) data.limite = toNumber(body.limite, 'limite');
    if (body.alerta80 !== undefined) data.alerta80 = !!body.alerta80;
    if (body.compartilhada !== undefined) data.compartilhada = !!body.compartilhada;
    return CategoriaModel.atualizar(ctx.ownerUid, params.id, data);
  },

  async remove({ user, params }) {
    const ctx = await contexto(user.uid);
    if (!ctx.isDono) throw new HttpError(403, 'Só o dono do ciclo apaga categorias.');
    const usados = (await LancamentoModel.listar(ctx.ownerUid)).filter(
      l => l.categoriaId === params.id
    );
    if (usados.length)
      throw new HttpError(
        409,
        'Essa categoria tem lançamentos. Mova ou apague os lançamentos antes.'
      );
    await CategoriaModel.remover(ctx.ownerUid, params.id);
    return { status: 204 };
  }
};
