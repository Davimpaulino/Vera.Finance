import { gerarId, limparValor, achatarEmCaminhos, filhosComId } from './caminhos.js';

export function criarBancoAdmin(bancoFirebase) {
  const referencia = caminho => bancoFirebase.ref(caminho || '/');

  const banco = {
    async ler(caminho) {
      const foto = await referencia(caminho).once('value');
      return foto.exists() ? foto.val() : null;
    },
    gravar: (caminho, valor) => referencia(caminho).set(limparValor(valor)),
    atualizar: (caminho, campos) => referencia(caminho).update(limparValor(campos)),
    mesclar: (caminho, objeto) =>
      referencia(caminho).update(limparValor(achatarEmCaminhos(objeto))),
    remover: caminho => referencia(caminho).remove(),
    async adicionar(caminho, valor) {
      const id = gerarId();
      await referencia(`${caminho}/${id}`).set(limparValor(valor));
      return id;
    },
    async listar(caminho) {
      return filhosComId(await banco.ler(caminho));
    },
    atualizarVarios: mapaDeCaminhos => referencia('/').update(limparValor(mapaDeCaminhos))
  };
  return banco;
}
