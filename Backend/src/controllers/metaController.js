import { contexto } from '../models/ContextoModel.js';
import { MetaModel } from '../models/MetaModel.js';
import { CicloModel } from '../models/CicloModel.js';
import { PlanoModel } from '../models/PlanoModel.js';
import { HttpError, requireFields, toNumber } from '../utils/http.js';
import { inRange } from '../utils/dates.js';
import { round2, sum } from '../utils/money.js';

export function apresentarMeta(m, ciclo) {
  const aportes = m.aportes || [];
  const guardado = sum(aportes, a => a.valor);
  const alvo = Number(m.alvo) || 0;
  const { ciclos, falta } = MetaModel.simular({ alvo, guardado }, m.aportePorCiclo);
  let previsao = null;
  if (ciclos != null) {
    const d = new Date(ciclo.proximaVirada);
    d.setMonth(d.getMonth() + ciclos - 1);
    previsao = d.toISOString();
  }
  return {
    id: m.id,
    nome: m.nome,
    icon: m.icon || 'target',
    alvo,
    guardado,
    aportePorCiclo: Number(m.aportePorCiclo) || 0,
    sobraNaVirada: !!m.sobraNaVirada,
    pct: alvo ? Math.min(100, Math.round((guardado / alvo) * 100)) : 0,
    falta,
    ciclosRestantes: ciclos,
    previsao,
    aporteCiclo: sum(
      aportes.filter(a => inRange(a.data, ciclo.inicio, ciclo.fim)),
      a => a.valor
    )
  };
}

export const metaController = {
  async list({ user }) {
    const ctx = await contexto(user.uid);
    const resumo = await CicloModel.resumo(ctx);
    const metas = (await MetaModel.listar(ctx.ownerUid, { orderBy: 'criadoEm' })).map(m =>
      apresentarMeta(m, resumo.ciclo)
    );
    const estouradas = resumo.categorias.filter(c => c.status === 'estourou');
    return {
      metas,
      limites: resumo.categorias,
      stats: {
        guardado: sum(metas, m => m.guardado),
        aporteCiclo: sum(metas, m => m.aporteCiclo),
        ativas: metas.length,
        estouradas: estouradas.map(c => ({ nome: c.nome, acima: round2(c.usado - c.limite) }))
      }
    };
  },

  async create({ user, body }) {
    requireFields(body, ['nome', 'alvo']);
    const ctx = await contexto(user.uid);
    const limite = (PlanoModel.buscar(ctx.owner.plano) || {}).limites?.metas;
    if (limite) {
      const atuais = await MetaModel.listar(ctx.ownerUid);
      if (atuais.length >= limite)
        throw new HttpError(
          403,
          `O plano grátis permite até ${limite} metas. Assine o vera+ para ter metas ilimitadas.`
        );
    }
    const meta = await MetaModel.criar(ctx.ownerUid, {
      nome: String(body.nome).trim(),
      icon: body.icon || 'target',
      alvo: toNumber(body.alvo, 'alvo'),
      aportePorCiclo: toNumber(body.aportePorCiclo || 0, 'aportePorCiclo'),
      sobraNaVirada: !!body.sobraNaVirada,
      aportes: body.guardado
        ? [{ data: new Date().toISOString(), valor: toNumber(body.guardado, 'guardado') }]
        : []
    });
    const resumo = await CicloModel.resumo(ctx);
    return { status: 201, body: apresentarMeta(meta, resumo.ciclo) };
  },

  async update({ user, params, body }) {
    const ctx = await contexto(user.uid);
    const atual = await MetaModel.buscar(ctx.ownerUid, params.id);
    if (!atual) throw new HttpError(404, 'Meta não encontrada.');
    const data = {};
    if (body.nome !== undefined) data.nome = String(body.nome).trim();
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.alvo !== undefined) data.alvo = toNumber(body.alvo, 'alvo');
    if (body.aportePorCiclo !== undefined)
      data.aportePorCiclo = toNumber(body.aportePorCiclo, 'aportePorCiclo');
    if (body.sobraNaVirada !== undefined) data.sobraNaVirada = !!body.sobraNaVirada;
    if (data.nome === '') throw new HttpError(400, 'Dê um nome para a meta.');
    if (data.alvo !== undefined && data.alvo <= 0)
      throw new HttpError(400, 'O valor da meta precisa ser maior que zero.');
    const meta = await MetaModel.atualizar(ctx.ownerUid, params.id, data);
    const resumo = await CicloModel.resumo(ctx);
    return apresentarMeta(meta, resumo.ciclo);
  },

  /** Guarda (valor positivo) ou retira (valor negativo) dinheiro da meta. */
  async aporte({ user, params, body }) {
    requireFields(body, ['valor']);
    const ctx = await contexto(user.uid);
    const atual = await MetaModel.buscar(ctx.ownerUid, params.id);
    if (!atual) throw new HttpError(404, 'Meta não encontrada.');
    const valor = toNumber(body.valor, 'valor');
    if (!valor) throw new HttpError(400, 'Digite um valor.');
    const guardado = sum(atual.aportes || [], a => a.valor);
    if (guardado + valor < 0)
      throw new HttpError(400, `Só há R$ ${guardado.toFixed(2).replace('.', ',')} guardados nesta meta.`);
    const aportes = [...(atual.aportes || []), { data: new Date().toISOString(), valor }];
    const meta = await MetaModel.atualizar(ctx.ownerUid, params.id, { aportes });
    const resumo = await CicloModel.resumo(ctx);
    return apresentarMeta(meta, resumo.ciclo);
  },

  async simular({ user, params, query }) {
    const ctx = await contexto(user.uid);
    const atual = await MetaModel.buscar(ctx.ownerUid, params.id);
    if (!atual) throw new HttpError(404, 'Meta não encontrada.');
    const resumo = await CicloModel.resumo(ctx);
    const aporte = toNumber(query.get('aporte') || atual.aportePorCiclo || 0, 'aporte');
    const meta = apresentarMeta({ ...atual, aportePorCiclo: aporte }, resumo.ciclo);
    return { aporte, ciclos: meta.ciclosRestantes, previsao: meta.previsao, falta: meta.falta };
  },

  async remove({ user, params }) {
    const ctx = await contexto(user.uid);
    await MetaModel.remover(ctx.ownerUid, params.id);
    return { status: 204 };
  }
};
