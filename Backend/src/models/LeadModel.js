import { db } from './BaseModel.js';

export const LeadModel = {
  async add(email) {
    const id = Buffer.from(email.toLowerCase()).toString('base64url');
    await db
      .collection('leads')
      .doc(id)
      .set({ email: email.toLowerCase(), criadoEm: new Date().toISOString() }, { merge: true });
  }
};
