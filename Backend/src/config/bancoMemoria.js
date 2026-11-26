import {
  partesDoCaminho,
  gerarId,
  limparValor,
  achatarEmCaminhos,
  filhosComId,
  vazio,
  podar
} from './caminhos.js';

export function criarBancoMemoria() {
  let raiz = {};

  // Só desce por chaves do próprio dado, como o bancoPostgres: um id como "constructor" ou
  // "toString" existe em todo objeto do JavaScript e levaria a uma função do protótipo (que o
  // structuredClone não copia), em vez de dar "não encontrado".
  const lerNo = caminho =>
    partesDoCaminho(caminho).reduce(
      (no, parte) => (no != null && Object.hasOwn(Object(no), parte) ? no[parte] : undefined),
      raiz
    );

  function escreverNo(caminho, valor) {
    const partes = partesDoCaminho(caminho);
    if (!partes.length) {
      raiz = podar(limparValor(valor)) || {};
      return;
    }
    let no = raiz;
    partes.slice(0, -1).forEach(parte => {
      if (!Object.hasOwn(no, parte) || !no[parte] || typeof no[parte] !== 'object') no[parte] = {};
      no = no[parte];
    });
    const ultimo = partes[partes.length - 1];
    const podado = podar(limparValor(valor));
    if (vazio(podado)) delete no[ultimo];
    else no[ultimo] = podado;
    raiz = podar(raiz) || {};
  }

  const banco = {
    async ler(caminho) {
      const valor = lerNo(caminho);
      return valor === undefined ? null : structuredClone(valor);
    },
    async gravar(caminho, valor) {
      escreverNo(caminho, valor);
    },
    async atualizar(caminho, campos) {
      for (const [chave, valor] of Object.entries(campos)) escreverNo(`${caminho}/${chave}`, valor);
    },
    async mesclar(caminho, objeto) {
      await banco.atualizar(caminho, achatarEmCaminhos(objeto));
    },
    async remover(caminho) {
      escreverNo(caminho, null);
    },
    async adicionar(caminho, valor) {
      const id = gerarId();
      escreverNo(`${caminho}/${id}`, valor);
      return id;
    },
    async listar(caminho) {
      return filhosComId(await banco.ler(caminho));
    },
    async atualizarVarios(mapaDeCaminhos) {
      for (const [caminho, valor] of Object.entries(mapaDeCaminhos)) escreverNo(caminho, valor);
    }
  };
  return banco;
}
