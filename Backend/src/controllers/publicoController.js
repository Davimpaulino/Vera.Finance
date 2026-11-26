import { PlanoModel } from '../models/PlanoModel.js';
import { InteressadoModel } from '../models/InteressadoModel.js';
import { email as emailDoCorpo } from '../utils/validacao.js';

export const publicoController = {
  planos: async () => PlanoModel.listar(),

  async lead({ body }) {
    const email = emailDoCorpo(body.email, 'Digite um e-mail válido.');
    await InteressadoModel.adicionar(email);
    return { status: 201, body: { ok: true } };
  },

  saude: async () => ({ ok: true })
};
