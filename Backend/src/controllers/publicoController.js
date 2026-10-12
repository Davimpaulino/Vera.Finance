import { PlanoModel } from '../models/PlanoModel.js';
import { InteressadoModel } from '../models/InteressadoModel.js';
import { HttpError } from '../utils/http.js';

export const publicoController = {
  planos: async () => PlanoModel.listar(),

  async lead({ body }) {
    const email = String(body.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new HttpError(400, 'Digite um e-mail válido.');
    await InteressadoModel.adicionar(email);
    return { status: 201, body: { ok: true } };
  },

  saude: async () => ({ ok: true })
};
