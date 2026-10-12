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
