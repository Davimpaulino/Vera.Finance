import { ColecaoDoUsuario } from './ColecaoDoUsuario.js';

class Notas extends ColecaoDoUsuario {
  constructor() {
    super('notas');
  }

  async buscarPorChave(uid, chave) {
    const todas = await this.listar(uid);
    return todas.find(nota => nota.chave === chave) || null;
  }

  async lidasNoMes(uid, hoje = new Date()) {
    const todas = await this.listar(uid);
    return todas.filter(nota => {
      const lida = new Date(nota.lidaEm);
      return lida.getFullYear() === hoje.getFullYear() && lida.getMonth() === hoje.getMonth();
    }).length;
  }

  async pendentes(uid) {
    const todas = await this.listar(uid, { ordenarPor: 'lidaEm', direcao: 'desc' });
    return todas.filter(nota => nota.status === 'pendente');
  }
}

export const NotaModel = new Notas();
