import { contexto } from '../models/ContextoModel.js';
import { NotificacaoModel } from '../models/NotificacaoModel.js';

export const notificacaoController = {
  async listar({ user }) {
    return NotificacaoModel.montar(await contexto(user.uid));
  },

  async marcarVistas({ user, body }) {
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
    await NotificacaoModel.marcarVistas(user.uid, ids);
    return NotificacaoModel.montar(await contexto(user.uid));
  }
};
