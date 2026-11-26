import { loginProprio } from '../config/banco.js';
import { CredencialModel } from '../models/CredencialModel.js';
import { ContaModel } from '../models/ContaModel.js';
import { UsuarioModel } from '../models/UsuarioModel.js';
import { assinarToken } from '../middlewares/auth.js';
import { HttpError, requireFields } from '../utils/http.js';
import { email as emailDoCorpo, texto } from '../utils/validacao.js';
import { VERSAO_DOS_TERMOS, aceiteOpcional, exigirAceite } from '../config/termos.js';

const TAMANHO_MAXIMO_DO_NOME = 100;
const SENHA_MINIMA = 8;
// Teto da senha: o scrypt aceita qualquer tamanho, mas ninguém digita mais do que isto.
const SENHA_MAXIMA = 200;

function senhaDoCorpo(valor, rotulo = 'A senha') {
  if (typeof valor !== 'string') throw new HttpError(400, `${rotulo} precisa ser um texto.`);
  if (valor.length > SENHA_MAXIMA)
    throw new HttpError(400, `${rotulo} pode ter até ${SENHA_MAXIMA} caracteres.`);
  return valor;
}

const nomeDoCorpo = valor => texto(valor, 'O nome', { max: TAMANHO_MAXIMO_DO_NOME });

export const authController = {
  // Rota pública: diz só o que a tela precisa. Qual banco a API usa não é da conta de ninguém.
  configuracao: async () => ({ loginProprio, versaoDosTermos: VERSAO_DOS_TERMOS }),

  async cadastrar({ body }) {
    requireFields(body, ['nome', 'email', 'senha']);
    const email = emailDoCorpo(body.email);
    const nome = nomeDoCorpo(body.nome);
    const senha = senhaDoCorpo(body.senha);
    if (senha.length < SENHA_MINIMA)
      throw new HttpError(400, `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
    // Sem o aceite dos termos e da idade mínima, a conta não é criada (não basta a caixa da tela).
    const termosAceitos = exigirAceite(body);
    if (await ContaModel.buscar(email))
      throw new HttpError(
        409,
        'Já existe uma conta com esse e-mail. Entre com a sua senha ou com o Google.'
      );
    const credencial = await CredencialModel.cadastrar({ email, senha, nome });
    if (!credencial) throw new HttpError(409, 'Já existe uma conta com esse e-mail.');
    await ContaModel.registrar(credencial.email, credencial.uid);
    await UsuarioModel.criarSeNaoExistir(credencial.uid, {
      nome,
      email: credencial.email,
      termosAceitos
    });
    return {
      status: 201,
      body: {
        token: assinarToken({ uid: credencial.uid, email: credencial.email, nome })
      }
    };
  },

  /** Antes de um cadastro novo: o e-mail já é de alguma conta? */
  async emailEmUso({ body }) {
    requireFields(body, ['email']);
    const email = emailDoCorpo(body.email);
    return {
      emUso: Boolean((await ContaModel.buscar(email)) || (await CredencialModel.existe(email)))
    };
  },

  async entrar({ body }) {
    requireFields(body, ['email', 'senha']);
    const email = emailDoCorpo(body.email, 'E-mail ou senha não conferem.');
    const senha = senhaDoCorpo(body.senha);
    const credencial = await CredencialModel.verificar(email, senha);
    if (!credencial) throw new HttpError(401, 'E-mail ou senha não conferem.');
    return {
      token: assinarToken({ uid: credencial.uid, email: credencial.email, nome: credencial.nome })
    };
  },

  /** Troca a senha de quem entrou com o login próprio (quem usa o Firebase troca pelo próprio Firebase). */
  async trocarSenha({ user, body }) {
    requireFields(body, ['atual', 'nova']);
    if (user.firebase)
      throw new HttpError(400, 'Esta conta usa o Firebase: troque a senha pelo link enviado ao e-mail.');
    const atual = senhaDoCorpo(body.atual, 'A senha atual');
    const nova = senhaDoCorpo(body.nova, 'A nova senha');
    if (nova.length < SENHA_MINIMA)
      throw new HttpError(400, `A nova senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
    const credencial = await CredencialModel.verificar(user.email, atual);
    if (!credencial) throw new HttpError(401, 'A senha atual não confere.');
    await CredencialModel.trocarSenha(user.email, nova);
    return { status: 204 };
  },

  async sessao({ user, body }) {
    const termosAceitos = aceiteOpcional(body);
    // O nome do Google pode passar do tamanho do formulário: corta em vez de recusar o login.
    const nome =
      nomeDoCorpo(body.nome) || String(user.name || '').trim().slice(0, TAMANHO_MAXIMO_DO_NOME);
    const perfil = await UsuarioModel.criarSeNaoExistir(user.uid, {
      nome,
      email: user.email,
      termosAceitos
    });
    // Perfil que já existia: o aceite (de uma versão nova, por exemplo) também fica registrado.
    const mudancas = {};
    if (!perfil.nome && nome) mudancas.nome = nome;
    if (termosAceitos && perfil.termosAceitos?.versao !== termosAceitos.versao)
      mudancas.termosAceitos = termosAceitos;
    return Object.keys(mudancas).length ? UsuarioModel.atualizar(user.uid, mudancas) : perfil;
  }
};
