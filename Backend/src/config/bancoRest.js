import {
  gerarId,
  limparValor,
  achatarEmCaminhos,
  filhosComId,
  partesDoCaminho
} from './caminhos.js';

export function criarBancoRest({ url, segredo }) {
  function endereco(caminho) {
    const sufixo = segredo ? `?auth=${encodeURIComponent(segredo)}` : '';
    return `${url}/${partesDoCaminho(caminho).map(encodeURIComponent).join('/')}.json${sufixo}`;
  }

  async function pedir(metodo, caminho, corpo) {
    let resposta;
    try {
      resposta = await fetch(endereco(caminho), {
        method: metodo,
        headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: corpo === undefined ? undefined : JSON.stringify(limparValor(corpo))
      });
    } catch (erro) {
      throw new Error(`Sem conexão com o Firebase (${url}): ${erro.message}`);
    }
    const texto = await resposta.text();
    if (!resposta.ok) {
      const motivo = resposta.status === 401 ? 'permissão negada pelas regras do banco' : texto;
      throw new Error(`Firebase respondeu ${resposta.status} em ${metodo} /${caminho}: ${motivo}`);
    }
    return texto ? JSON.parse(texto) : null;
  }

  const banco = {
    ler: caminho => pedir('GET', caminho),
    gravar: (caminho, valor) => pedir('PUT', caminho, valor),
    atualizar: (caminho, campos) => pedir('PATCH', caminho, campos),
    mesclar: (caminho, objeto) => pedir('PATCH', caminho, achatarEmCaminhos(objeto)),
    remover: caminho => pedir('DELETE', caminho),
    async adicionar(caminho, valor) {
      const id = gerarId();
      await pedir('PUT', `${caminho}/${id}`, valor);
      return id;
    },
    async listar(caminho) {
      return filhosComId(await banco.ler(caminho));
    },
    atualizarVarios: mapaDeCaminhos => pedir('PATCH', '', mapaDeCaminhos)
  };
  return banco;
}
