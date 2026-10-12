import { loginProprio, modoBanco } from '../config/banco.js';
import { CredencialModel } from '../models/CredencialModel.js';
import { ContaModel } from '../models/ContaModel.js';
import { UsuarioModel } from '../models/UsuarioModel.js';
import { assinarToken } from '../middlewares/auth.js';
import { HttpError, requireFields } from '../utils/http.js';

const emailValido = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));

export const authController = {
  configuracao: async () => ({ loginProprio, modoBanco }),

  async cadastrar({ body }) {
    requireFields(body, ['nome', 'email', 'senha']);
    if (!emailValido(body.email)) throw new HttpError(400, 'E-mail inválido.');
    if (String(body.senha).length < 8)
      throw new HttpError(400, 'A senha precisa ter pelo menos 8 caracteres.');
    if (await ContaModel.buscar(body.email))
      throw new HttpError(
        409,
        'Já existe uma conta com esse e-mail. Entre com a sua senha ou com o Google.'
      );
    const credencial = await CredencialModel.cadastrar({
      email: body.email,
      senha: body.senha,
      nome: body.nome
    });
    if (!credencial) throw new HttpError(409, 'Já existe uma conta com esse e-mail.');
    await ContaModel.registrar(credencial.email, credencial.uid);
    await UsuarioModel.criarSeNaoExistir(credencial.uid, {
      nome: body.nome,
      email: credencial.email
    });
    return {
      status: 201,
      body: {
        token: assinarToken({ uid: credencial.uid, email: credencial.email, nome: body.nome })
      }
    };
  },

  /** Antes de um cadastro novo: o e-mail já é de alguma conta? */
  async emailEmUso({ body }) {
    requireFields(body, ['email']);
    const email = String(body.email).trim();
    return {
      emUso: Boolean((await ContaModel.buscar(email)) || (await CredencialModel.existe(email)))
    };
  },

  async entrar({ body }) {
    requireFields(body, ['email', 'senha']);
    const credencial = await CredencialModel.verificar(body.email, String(body.senha));
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
    if (String(body.nova).length < 8)
      throw new HttpError(400, 'A nova senha precisa ter pelo menos 8 caracteres.');
    const credencial = await CredencialModel.verificar(user.email, String(body.atual));
    if (!credencial) throw new HttpError(401, 'A senha atual não confere.');
    await CredencialModel.trocarSenha(user.email, String(body.nova));
    return { status: 204 };
  },

  async sessao({ user, body }) {
    const perfil = await UsuarioModel.criarSeNaoExistir(user.uid, {
      nome: body.nome || user.name,
      email: user.email
    });
    if (!perfil.nome && (body.nome || user.name))
      return UsuarioModel.atualizar(user.uid, { nome: body.nome || user.name });
    return perfil;
  }
};
