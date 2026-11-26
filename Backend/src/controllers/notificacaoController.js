import { contexto } from '../models/ContextoModel.js';
import { NotificacaoModel } from '../models/NotificacaoModel.js';
import { lista, texto } from '../utils/validacao.js';

// As vistas ficam no perfil: no máximo 200 ids, cada um do tamanho dos ids que a vera gera.
const MAXIMO_DE_IDS = 200;

export const notificacaoController = {
  async listar({ user }) {
    return NotificacaoModel.montar(await contexto(user.uid));
  },

  async marcarVistas({ user, body }) {
    const ids = lista(body.ids, 'notificações', MAXIMO_DE_IDS)
      .map(id => texto(id, 'A notificação', { max: 200 }))
      .filter(Boolean);
    await NotificacaoModel.marcarVistas(user.uid, ids);
    return NotificacaoModel.montar(await contexto(user.uid));
  }
};
