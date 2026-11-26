import { UsuarioModel } from './UsuarioModel.js';
import { FamiliaModel } from './FamiliaModel.js';
import { HttpError } from '../utils/http.js';

/**
 * Quem é o dono dos dados do ciclo. No modo família, todos lançam no ciclo do dono;
 * quem não é dono só enxerga categorias compartilhadas (e os próprios lançamentos).
 */
export async function contexto(uid) {
  const user = await UsuarioModel.buscar(uid);
  if (!user) throw new HttpError(404, 'Perfil não encontrado. Termine o cadastro.');
  const familia = user.familiaId ? await FamiliaModel.buscar(user.familiaId) : null;
  const ownerUid = familia ? familia.donoId : uid;
  const owner = ownerUid === uid ? user : await UsuarioModel.buscar(ownerUid);
  return { uid, user, owner, ownerUid, familia, isDono: ownerUid === uid };
}

export function podeVerCategoria(ctx, categoria) {
  return ctx.isDono || !categoria || categoria.compartilhada;
}

/**
 * Filtro dos lançamentos que a pessoa enxerga: o dono vê todos; quem não é dono vê as entradas,
 * os gastos das categorias compartilhadas e os próprios. Vale para a tela, o relatório e a planilha.
 */
export function podeVerLancamento(ctx, categorias) {
  if (ctx.isDono) return () => true;
  const visiveis = new Set(categorias.filter(c => podeVerCategoria(ctx, c)).map(c => c.id));
  return l => l.tipo === 'entrada' || visiveis.has(l.categoriaId) || l.quemId === ctx.uid;
}

/**
 * Nota lida no modo família: fica no espaço do dono, mas antes de virar lançamento é só de quem a
 * leu (mostra o mercado, o valor e cada produto comprado). O dono vê e confirma todas.
 */
export function podeVerNota(ctx, nota) {
  return ctx.isDono || nota.quemId === ctx.uid;
}
