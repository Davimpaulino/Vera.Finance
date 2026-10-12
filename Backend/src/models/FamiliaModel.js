import { banco } from '../config/banco.js';

function normalizarFamilia(id, familia) {
  if (!familia) return null;
  return { id, membros: [], convites: [], convitesEmails: [], ...familia };
}

export const FamiliaModel = {
  async buscar(id) {
    if (!id) return null;
    return normalizarFamilia(id, await banco.ler(`familias/${id}`));
  },

  async listar() {
    const familias = await banco.listar('familias');
    return familias.map(familia => normalizarFamilia(familia.id, familia));
  },

  async criar(dados) {
    const familia = { ...dados, criadoEm: new Date().toISOString() };
    const id = await banco.adicionar('familias', familia);
    return normalizarFamilia(id, familia);
  },

  async atualizar(id, dados) {
    await banco.atualizar(`familias/${id}`, dados);
    return this.buscar(id);
  }
};
