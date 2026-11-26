import { ColecaoDoUsuario } from './ColecaoDoUsuario.js';

class Categorias extends ColecaoDoUsuario {
  constructor() {
    super('categorias');
  }

  listarOrdenado(uid) {
    return this.listar(uid, { ordenarPor: 'ordem' });
  }

  async buscarPorNome(uid, nome) {
    const todas = await this.listar(uid);
    return (
      todas.find(categoria => categoria.nome.toLowerCase() === String(nome).toLowerCase()) || null
    );
  }
}

export const CategoriaModel = new Categorias();

// Teto de categorias por conta, igual na tela de categorias e no cadastro guiado: cada uma entra
// no resumo do ciclo, recalculado a cada tela do app.
export const MAXIMO_DE_CATEGORIAS = 40;

export const ICONES_CATEGORIA = [
  'shopping-basket',
  'car',
  'beer',
  'house',
  'pill',
  'repeat',
  'target',
  'graduation-cap',
  'shirt',
  'dog',
  'baby',
  'gift',
  'plane',
  'dumbbell',
  'gamepad-2',
  'book-open',
  'heart',
  'wallet'
];
