import { db, snapToObj } from './BaseModel.js';

const DEFAULTS = {
  plano: 'gratis',
  onboardingCompleto: false,
  ciclo: { diaVirada: 5, frequencia: 'Uma vez por mês', rendaFixa: 0, rendaVariavel: 0 },
  local: { cep: '', cidade: '', raioKm: 5, mercados: [] },
  prefs: {
    tema: 'tinta',
    ocultarValores: false,
    zerarNaVirada: true,
    resumoAntesDeFechar: false,
    contribuirPrecos: true,
    alertaAltaPreco: true
  },
  familiaId: null,
  exclusaoAgendadaPara: null
};

const ref = uid => db.collection('users').doc(uid);

export const UserModel = {
  DEFAULTS,

  async get(uid) {
    const s = await ref(uid).get();
    return s.exists ? snapToObj(s) : null;
  },

  async createIfMissing(uid, { nome, email }) {
    const atual = await this.get(uid);
    if (atual) return atual;
    const doc = {
      ...structuredClone(DEFAULTS),
      nome: nome || '',
      email: email || '',
      criadoEm: new Date().toISOString()
    };
    await ref(uid).set(doc);
    return { id: uid, ...doc };
  },

  /** Atualização parcial, com merge profundo em ciclo, local e prefs. */
  async update(uid, data) {
    await ref(uid).set({ ...data, atualizadoEm: new Date().toISOString() }, { merge: true });
    return this.get(uid);
  }
};
