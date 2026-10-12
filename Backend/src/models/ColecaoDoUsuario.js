import { banco } from '../config/banco.js';

export function ordenar(lista, campo, direcao = 'asc') {
  const sinal = direcao === 'desc' ? -1 : 1;
  return [...lista].sort((a, b) => {
    const x = a[campo];
    const y = b[campo];
    if (x === y) return 0;
    if (x === undefined || x === null) return 1;
    if (y === undefined || y === null) return -1;
    return (x < y ? -1 : 1) * sinal;
  });
}

export class ColecaoDoUsuario {
  constructor(nome) {
    this.nome = nome;
  }

  caminho(uid, id) {
    return id ? `usuarios/${uid}/${this.nome}/${id}` : `usuarios/${uid}/${this.nome}`;
  }

  async listar(uid, { ordenarPor, direcao = 'asc' } = {}) {
    const itens = await banco.listar(this.caminho(uid));
    return ordenarPor ? ordenar(itens, ordenarPor, direcao) : itens;
  }

  async buscar(uid, id) {
    const valor = await banco.ler(this.caminho(uid, id));
    return valor ? { id, ...valor } : null;
  }

  async criar(uid, dados) {
    const documento = { ...dados, criadoEm: new Date().toISOString() };
    const id = await banco.adicionar(this.caminho(uid), documento);
    return { id, ...documento };
  }

  async gravarSeNovo(uid, id, dados) {
    const existente = await this.buscar(uid, id);
    if (existente) return { ...existente, jaExistia: true };
    const documento = { ...dados, criadoEm: new Date().toISOString() };
    await banco.gravar(this.caminho(uid, id), documento);
    return { id, ...documento };
  }

  async atualizar(uid, id, dados) {
    await banco.atualizar(this.caminho(uid, id), {
      ...dados,
      atualizadoEm: new Date().toISOString()
    });
    return this.buscar(uid, id);
  }

  async remover(uid, id) {
    await banco.remover(this.caminho(uid, id));
  }

  async removerTodos(uid) {
    await banco.remover(this.caminho(uid));
  }
}

export { banco };
