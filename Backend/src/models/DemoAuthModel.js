import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { db } from './BaseModel.js';

// Credenciais do modo demo (sem Firebase Auth). Senha guardada com scrypt + sal.
const col = () => db.collection('_demoAuth');
const keyOf = email => Buffer.from(email.toLowerCase()).toString('base64url');

export const DemoAuthModel = {
  async register({ email, senha, nome, uid }) {
    const ref = col().doc(keyOf(email));
    if ((await ref.get()).exists) return null;
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(senha, salt, 64).toString('hex');
    const doc = { uid: uid || randomUUID(), email: email.toLowerCase(), nome, salt, hash };
    await ref.set(doc);
    return doc;
  },

  async verify(email, senha) {
    const s = await col().doc(keyOf(email)).get();
    if (!s.exists) return null;
    const d = s.data();
    const a = Buffer.from(d.hash, 'hex');
    const b = scryptSync(senha, d.salt, 64);
    return a.length === b.length && timingSafeEqual(a, b) ? d : null;
  }
};
