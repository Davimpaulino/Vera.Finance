import { banco, autenticacaoFirebase } from '../config/banco.js';
import { FamiliaModel } from './FamiliaModel.js';
import { UsuarioModel } from './UsuarioModel.js';

// Exclusão de conta (LGPD, art. 18, VI). O pedido fica num índice próprio com a data marcada;
// um passo diário apaga de verdade o que venceu: perfil e dados, login, e a participação na família.
const chaveDoEmail = email => Buffer.from(String(email).trim().toLowerCase()).toString('base64url');

export const ExclusaoModel = {
  async agendar(uid, quando) {
    await banco.gravar(`exclusoes/${uid}`, { quando });
    await UsuarioModel.atualizar(uid, { exclusaoAgendadaPara: quando });
  },

  async cancelar(uid) {
    await banco.remover(`exclusoes/${uid}`);
    await UsuarioModel.atualizar(uid, { exclusaoAgendadaPara: null });
  },

  /**
   * Apaga tudo de uma pessoa. Com apagarLogin: false, o login do Firebase com o e-mail dela fica:
   * serve para a restauração de um backup, quando esse e-mail já pode ser de uma conta nova.
   */
  async apagar(uid, { apagarLogin = true } = {}) {
    const perfil = await UsuarioModel.buscar(uid);
    const familia = perfil?.familiaId ? await FamiliaModel.buscar(perfil.familiaId) : null;
    if (familia) {
      if (familia.donoId === uid) {
        // Sem o dono a família acaba; quem era membro volta a ter a própria conta.
        for (const membro of familia.membros.filter(m => m.uid !== uid))
          await UsuarioModel.atualizar(membro.uid, { familiaId: null }).catch(() => {});
        await banco.remover(`familias/${familia.id}`);
      } else
        await FamiliaModel.atualizar(familia.id, {
          membros: familia.membros.filter(m => m.uid !== uid)
        });
    }
    if (perfil?.email) {
      const chave = chaveDoEmail(perfil.email);
      const conta = await banco.ler(`contas/${chave}`);
      if (!conta || conta.uid === uid) await banco.remover(`contas/${chave}`);
      const credencial = await banco.ler(`credenciais/${chave}`);
      if (!credencial || credencial.uid === uid) await banco.remover(`credenciais/${chave}`);
      if (apagarLogin && autenticacaoFirebase)
        await autenticacaoFirebase
          .getUserByEmail(perfil.email)
          .then(usuario => autenticacaoFirebase.deleteUser(usuario.uid))
          .catch(() => {});
    }
    await banco.remover(`usuarios/${uid}`);
    await banco.remover(`exclusoes/${uid}`);
  },

  /** Executa os pedidos vencidos. Devolve quantas contas foram apagadas. */
  async executarVencidas(agora = new Date()) {
    const pedidos = await banco.listar('exclusoes');
    let apagadas = 0;
    for (const pedido of pedidos) {
      if (!pedido.quando || new Date(pedido.quando) > agora) continue;
      try {
        await this.apagar(pedido.id);
        apagadas += 1;
      } catch (erro) {
        console.error(`[exclusão] falhou para ${pedido.id}:`, erro.message);
      }
    }
    return apagadas;
  }
};
