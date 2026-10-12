import { banco } from '../config/banco.js';

// Uma conta por e-mail. O login próprio da API e o Firebase Auth (e-mail, Google, Apple) geram
// identificadores diferentes para a mesma pessoa; aqui o e-mail aponta para o identificador dono
// dos dados, e os outros jeitos de entrar passam a usar esse mesmo identificador.
// Só um e-mail verificado (Google, Apple, link do Firebase) é ligado a uma conta que já existe:
// assim ninguém entra nos dados de outra pessoa só por digitar o e-mail dela num cadastro novo.
const chaveDoEmail = email => Buffer.from(String(email).trim().toLowerCase()).toString('base64url');
const caminhoDaConta = email => `contas/${chaveDoEmail(email)}`;
const caminhoDaCredencial = email => `credenciais/${chaveDoEmail(email)}`;

const VALIDADE_MS = 10 * 60 * 1000;
const emCache = new Map();

export const ContaModel = {
  buscar: email => (email ? banco.ler(caminhoDaConta(email)) : null),

  /** Identificador que guarda os dados de quem entrou. */
  async uidDaConta({ uid, email, verificado = false }) {
    if (!email) return uid;
    const chave = `${uid}|${chaveDoEmail(email)}|${verificado}`;
    const guardado = emCache.get(chave);
    if (guardado && Date.now() - guardado.em < VALIDADE_MS) return guardado.uid;
    const escolhido = await this.resolver({ uid, email, verificado });
    emCache.set(chave, { em: Date.now(), uid: escolhido });
    return escolhido;
  },

  async resolver({ uid, email, verificado }) {
    const conta = await banco.ler(caminhoDaConta(email));
    if (conta?.uid) {
      if (conta.uid === uid) return uid;
      return verificado ? conta.uid : uid;
    }
    // Primeira vez que o e-mail aparece: a conta antiga do login próprio, se houver, é a dona.
    const credencial = await banco.ler(caminhoDaCredencial(email));
    const dono = credencial?.uid || uid;
    await this.registrar(email, dono);
    if (dono === uid) return uid;
    return verificado ? dono : uid;
  },

  limparCache() {
    emCache.clear();
  },

  /** Registra a conta de um e-mail ainda livre. Devolve false se o e-mail já tem dono. */
  async registrar(email, uid) {
    if (await banco.ler(caminhoDaConta(email))) return false;
    await banco.gravar(caminhoDaConta(email), {
      uid,
      email: String(email).trim().toLowerCase(),
      criadaEm: new Date().toISOString()
    });
    return true;
  }
};
