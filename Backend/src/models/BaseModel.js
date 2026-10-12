import { db } from '../config/firebase.js';

const snapToObj = s => ({ id: s.id, ...s.data() });

/** Coleção dentro de users/{uid}. Cada model de dado do usuário estende esta classe. */
export class UserSubcollection {
  constructor(name) {
    this.name = name;
  }

  col(uid) {
    return db.collection('users').doc(uid).collection(this.name);
  }

  async list(uid, { orderBy, dir = 'asc' } = {}) {
    let q = this.col(uid);
    if (orderBy) q = q.orderBy(orderBy, dir);
    const snap = await q.get();
    return snap.docs.map(snapToObj);
  }

  async get(uid, id) {
    const s = await this.col(uid).doc(id).get();
    return s.exists ? snapToObj(s) : null;
  }

  async create(uid, data) {
    const ref = this.col(uid).doc();
    const doc = { ...data, criadoEm: new Date().toISOString() };
    await ref.set(doc);
    return { id: ref.id, ...doc };
  }

  /** Cria ou substitui com id conhecido (idempotente). */
  async put(uid, id, data) {
    const ref = this.col(uid).doc(id);
    const existente = await ref.get();
    if (existente.exists) return { id, ...existente.data(), jaExistia: true };
    const doc = { ...data, criadoEm: new Date().toISOString() };
    await ref.set(doc);
    return { id, ...doc };
  }

  async update(uid, id, data) {
    await this.col(uid)
      .doc(id)
      .update({ ...data, atualizadoEm: new Date().toISOString() });
    return this.get(uid, id);
  }

  async remove(uid, id) {
    await this.col(uid).doc(id).delete();
  }

  async removeAll(uid) {
    const snap = await this.col(uid).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

export { db, snapToObj };
