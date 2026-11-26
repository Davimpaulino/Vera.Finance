import { contexto } from '../models/ContextoModel.js';
import { MetaModel } from '../models/MetaModel.js';
import { CicloModel } from '../models/CicloModel.js';
import { PlanoModel } from '../models/PlanoModel.js';
import { HttpError, requireFields, toNumber } from '../utils/http.js';
import { texto } from '../utils/validacao.js';
import { inRange } from '../utils/dates.js';
import { round2, sum } from '../utils/money.js';

const nomeDaMeta = valor => texto(valor, 'O nome da meta', { max: 80, obrigatorio: true });

// Nome de ícone (lucide): letras minúsculas, números e hífen.
function iconeDaMeta(valor) {
  if (typeof valor !== 'string' || !/^[a-z0-9-]{1,40}$/.test(valor))
    throw new HttpError(400, 'Ícone desconhecido.');
  return valor;
}

function valorPositivo(valor, campo, mensagem) {
  const numero = toNumber(valor, campo);
  if (numero < 0) throw new HttpError(400, mensagem);
  return numero;
}

/**
 * No modo família as metas ficam no espaço do dono e todos guardam nelas (cada aporte leva quem
 * guardou). Mudar o nome, o valor ou apagar a meta é do dono ou de quem a criou.
 */
function exigirQuemPodeMudar(ctx, meta) {
  if (!ctx.isDono && meta.quemId !== ctx.uid)
    throw new HttpError(403, 'Só o dono do ciclo ou quem criou a meta pode mudar ou apagar.');
}

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
    const nome = nomeDaMeta(body.nome);
    const alvo = toNumber(body.alvo, 'alvo');
    if (alvo <= 0) throw new HttpError(400, 'O valor da meta precisa ser maior que zero.');
    const guardado = body.guardado
      ? valorPositivo(body.guardado, 'guardado', 'O valor guardado não pode ser negativo.')
      : 0;
    const meta = await MetaModel.criar(ctx.ownerUid, {
      nome,
      icon: body.icon ? iconeDaMeta(body.icon) : 'target',
      alvo,
      aportePorCiclo: valorPositivo(
        body.aportePorCiclo || 0,
        'aportePorCiclo',
        'O aporte por ciclo não pode ser negativo.'
      ),
      sobraNaVirada: !!body.sobraNaVirada,
      quemId: user.uid,
      aportes: guardado
        ? [{ data: new Date().toISOString(), valor: guardado, quemId: user.uid }]
        : []
    });
    const resumo = await CicloModel.resumo(ctx);
    return { status: 201, body: apresentarMeta(meta, resumo.ciclo) };
  },

  async update({ user, params, body }) {
    const ctx = await contexto(user.uid);
    const atual = await MetaModel.buscar(ctx.ownerUid, params.id);
    if (!atual) throw new HttpError(404, 'Meta não encontrada.');
    exigirQuemPodeMudar(ctx, atual);
    const data = {};
    if (body.nome !== undefined) {
      if (typeof body.nome === 'string' && !body.nome.trim())
        throw new HttpError(400, 'Dê um nome para a meta.');
      data.nome = nomeDaMeta(body.nome);
    }
    if (body.icon !== undefined) data.icon = iconeDaMeta(body.icon);
    if (body.alvo !== undefined) data.alvo = toNumber(body.alvo, 'alvo');
    if (body.aportePorCiclo !== undefined)
      data.aportePorCiclo = valorPositivo(
        body.aportePorCiclo,
        'aportePorCiclo',
        'O aporte por ciclo não pode ser negativo.'
      );
    if (body.sobraNaVirada !== undefined) data.sobraNaVirada = !!body.sobraNaVirada;
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
    // quemId: no modo família, cada aporte é de quem guardou (vai na exportação dessa pessoa).
    const aportes = [
      ...(atual.aportes || []),
      { data: new Date().toISOString(), valor, quemId: user.uid }
    ];
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
    const atual = await MetaModel.buscar(ctx.ownerUid, params.id);
    if (!atual) return { status: 204 };
    exigirQuemPodeMudar(ctx, atual);
    await MetaModel.remover(ctx.ownerUid, params.id);
    return { status: 204 };
  }
};
