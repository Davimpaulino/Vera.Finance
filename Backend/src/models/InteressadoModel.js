import { banco } from '../config/banco.js';

export const InteressadoModel = {
  async adicionar(email) {
    const id = Buffer.from(email.toLowerCase()).toString('base64url');
    await banco.gravar(`interessados/${id}`, {
      email: email.toLowerCase(),
      criadoEm: new Date().toISOString()
    });
  }
};
