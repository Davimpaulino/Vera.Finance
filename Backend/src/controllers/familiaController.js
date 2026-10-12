import { contexto } from '../models/ContextoModel.js';
import { FamiliaModel } from '../models/FamiliaModel.js';
import { UsuarioModel } from '../models/UsuarioModel.js';
import { CicloModel } from '../models/CicloModel.js';
import { PlanoModel } from '../models/PlanoModel.js';
import { HttpError, requireFields } from '../utils/http.js';
import { round2, sum } from '../utils/money.js';

async function montar(ctx) {
  const resumo = await CicloModel.resumo(ctx);
  const familia = ctx.familia;
  const plano = PlanoModel.buscar(ctx.owner.plano);
  if (!familia)
    return {
      familia: null,
      plano: plano.id,
      limitePessoas: plano.limites.familia,
      categorias: resumo.categorias
    };

  const saidas = resumo.lancamentos.filter(l => l.tipo === 'saida');
  const total = sum(saidas, l => l.valor);
  const pessoas = familia.membros.map(m => {
    const valor = sum(
      saidas.filter(l => l.quemId === m.uid),
      l => l.valor
    );
    const pct = total ? Math.round((valor / total) * 100) : 0;
    return {
      uid: m.uid,
      nome: m.nome,
      papel: m.papel,
      divisao: m.divisao,
      desde: m.desde,
      valor,
      pct
    };
  });
  // Quem fica abaixo da própria parte, projetando no ritmo atual até a virada.
  const fator = resumo.ciclo.totalDias / Math.max(1, resumo.ciclo.diaAtual);
  const abaixo =
    pessoas
      .map(p => ({ ...p, folga: round2(total * fator * (p.divisao / 100) - p.valor * fator) }))
      .filter(p => p.folga > 0)
      .sort((a, b) => b.folga - a.folga)[0] || null;

  return {
    familia: { id: familia.id, nome: familia.nome, donoId: familia.donoId },
    souDono: ctx.isDono,
    plano: plano.id,
    limitePessoas: plano.limites.familia,
    pessoas,
    convites: familia.convites || [],
    abaixoDaParte: abaixo ? { nome: abaixo.nome, folga: abaixo.folga } : null,
    categorias: resumo.categorias
  };
}

export const familiaController = {
  async get({ user }) {
    return montar(await contexto(user.uid));
  },

  async criar({ user, body }) {
    const ctx = await contexto(user.uid);
    if (ctx.familia) throw new HttpError(409, 'Você já está em um modo família.');
    const plano = PlanoModel.buscar(ctx.user.plano);
    if (plano.limites.familia < 2) throw new HttpError(403, 'O modo família faz parte do vera+.');
    const familia = await FamiliaModel.criar({
      nome: body.nome || `Casa ${(ctx.user.nome || '').split(' ').pop() || ''}`.trim(),
      donoId: user.uid,
      membros: [
        {
          uid: user.uid,
          nome: ctx.user.nome,
          papel: 'dono',
          divisao: 100,
          desde: new Date().toISOString()
        }
      ],
      convites: [],
      convitesEmails: []
    });
    await UsuarioModel.atualizar(user.uid, { familiaId: familia.id });
    return { status: 201, body: await montar(await contexto(user.uid)) };
  },

  async convidar({ user, body }) {
    requireFields(body, ['email']);
    const ctx = await contexto(user.uid);
    if (!ctx.familia || !ctx.isDono)
      throw new HttpError(403, 'Só o dono do ciclo convida pessoas.');
    const plano = PlanoModel.buscar(ctx.owner.plano);
    const ocupados = ctx.familia.membros.length + (ctx.familia.convites || []).length;
    if (ocupados >= plano.limites.familia)
      throw new HttpError(
        403,
        `Seu plano permite ${plano.limites.familia} pessoas no modo família.`
      );
    const email = String(body.email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'E-mail inválido.');
    if ((ctx.familia.convites || []).some(c => c.email === email))
      throw new HttpError(409, 'Esse e-mail já foi convidado.');
    const convites = [
      ...(ctx.familia.convites || []),
      { email, enviadoEm: new Date().toISOString() }
    ];
    await FamiliaModel.atualizar(ctx.familia.id, {
      convites,
      convitesEmails: convites.map(c => c.email)
    });
    return montar(await contexto(user.uid));
  },

  /** Convites pendentes para o e-mail de quem está logado. */
  async meusConvites({ user }) {
    const email = String(user.email || '').toLowerCase();
    const familias = await FamiliaModel.listar();
    return familias
      .filter(familia => familia.convitesEmails.includes(email))
      .map(familia => ({ familiaId: familia.id, nome: familia.nome }));
  },

  async aceitar({ user, params }) {
    const familia = await FamiliaModel.buscar(params.id);
    const email = String(user.email || '').toLowerCase();
    if (!familia || !(familia.convites || []).some(c => c.email === email))
      throw new HttpError(404, 'Convite não encontrado.');
    const perfil = await UsuarioModel.buscar(user.uid);
    await FamiliaModel.atualizar(familia.id, {
      convites: familia.convites.filter(c => c.email !== email),
      convitesEmails: familia.convites.filter(c => c.email !== email).map(c => c.email),
      membros: [
        ...familia.membros,
        {
          uid: user.uid,
          nome: perfil?.nome || email,
          papel: 'membro',
          divisao: 0,
          desde: new Date().toISOString()
        }
      ]
    });
    await UsuarioModel.atualizar(user.uid, { familiaId: familia.id });
    return montar(await contexto(user.uid));
  }
};
