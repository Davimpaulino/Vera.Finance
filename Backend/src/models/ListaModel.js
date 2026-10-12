import { ColecaoDoUsuario, banco } from './ColecaoDoUsuario.js';

class Lista extends ColecaoDoUsuario {
  constructor() {
    super('lista');
  }

  listarOrdenado(uid) {
    return this.listar(uid, { ordenarPor: 'criadoEm', direcao: 'desc' });
  }

  async removerComprados(uid) {
    const itens = await this.listar(uid);
    const remocoes = Object.fromEntries(
      itens.filter(item => item.done).map(item => [this.caminho(uid, item.id), null])
    );
    if (Object.keys(remocoes).length) await banco.atualizarVarios(remocoes);
  }
}

export const ListaModel = new Lista();
