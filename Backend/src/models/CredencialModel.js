import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { banco } from '../config/banco.js';

const chaveDoEmail = email => Buffer.from(email.toLowerCase()).toString('base64url');
const caminhoDaCredencial = email => `credenciais/${chaveDoEmail(email)}`;

export const CredencialModel = {
  existe: async email => Boolean(await banco.ler(caminhoDaCredencial(email))),

  async cadastrar({ email, senha, nome, uid }) {
    if (await banco.ler(caminhoDaCredencial(email))) return null;
    const sal = randomBytes(16).toString('hex');
    const hash = scryptSync(senha, sal, 64).toString('hex');
    const credencial = { uid: uid || randomUUID(), email: email.toLowerCase(), nome, sal, hash };
    await banco.gravar(caminhoDaCredencial(email), credencial);
    return credencial;
  },

  async trocarSenha(email, senha) {
    const sal = randomBytes(16).toString('hex');
    const hash = scryptSync(senha, sal, 64).toString('hex');
    await banco.atualizar(caminhoDaCredencial(email), { sal, hash });
  },

  async verificar(email, senha) {
    const credencial = await banco.ler(caminhoDaCredencial(email));
    if (!credencial) return null;
    const esperado = Buffer.from(credencial.hash, 'hex');
    const recebido = scryptSync(senha, credencial.sal, 64);
    return esperado.length === recebido.length && timingSafeEqual(esperado, recebido)
      ? credencial
      : null;
  }
};
