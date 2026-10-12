import {
  partesDoCaminho,
  gerarId,
  limparValor,
  achatarEmCaminhos,
  filhosComId
} from './caminhos.js';

function vazio(valor) {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === 'object') return Object.keys(valor).length === 0;
  return false;
}

function podar(valor) {
  if (Array.isArray(valor)) {
    const lista = valor.map(podar).filter(item => !vazio(item));
    return lista.length ? lista : null;
  }
  if (valor && typeof valor === 'object') {
    const objeto = {};
    for (const [chave, filho] of Object.entries(valor)) {
      const podado = podar(filho);
      if (!vazio(podado)) objeto[chave] = podado;
    }
    return Object.keys(objeto).length ? objeto : null;
  }
  return valor;
}

export function criarBancoMemoria() {
  let raiz = {};

  const lerNo = caminho =>
    partesDoCaminho(caminho).reduce((no, parte) => (no == null ? undefined : no[parte]), raiz);

  function escreverNo(caminho, valor) {
    const partes = partesDoCaminho(caminho);
    if (!partes.length) {
      raiz = podar(limparValor(valor)) || {};
      return;
    }
    let no = raiz;
    partes.slice(0, -1).forEach(parte => {
      if (!no[parte] || typeof no[parte] !== 'object') no[parte] = {};
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
