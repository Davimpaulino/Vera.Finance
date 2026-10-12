import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onIdTokenChanged
} from 'firebase/auth';
import { autenticacaoFirebase, firebaseHabilitado } from './firebase.js';
import { api, setTokenProvider } from './api.js';

const CHAVE_DO_TOKEN = 'vera.token';

const armazenamento = {
  ler() {
    try {
      return localStorage.getItem(CHAVE_DO_TOKEN) || sessionStorage.getItem(CHAVE_DO_TOKEN);
    } catch {
      return null;
    }
  },
  guardar(token, lembrar) {
    try {
      (lembrar ? localStorage : sessionStorage).setItem(CHAVE_DO_TOKEN, token);
    } catch {
      return;
    }
  },
  apagar() {
    try {
      localStorage.removeItem(CHAVE_DO_TOKEN);
      sessionStorage.removeItem(CHAVE_DO_TOKEN);
    } catch {
      return;
    }
  }
};

const usuarioFirebase = () => (firebaseHabilitado ? autenticacaoFirebase.currentUser : null);

// Quem entrou pelo Firebase (e-mail, Google, Apple) manda o token do Firebase;
// as contas criadas antes do Firebase mandam o token do próprio backend.
setTokenProvider(async () => {
  const usuario = usuarioFirebase();
  return usuario ? usuario.getIdToken() : armazenamento.ler();
});

const MENSAGENS_DE_ERRO = {
  'auth/invalid-credential': 'E-mail ou senha não conferem.',
  'auth/wrong-password': 'E-mail ou senha não conferem.',
  'auth/user-not-found': 'E-mail ou senha não conferem.',
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
  'auth/weak-password': 'A senha precisa ter pelo menos 8 caracteres.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/missing-email': 'Digite o seu e-mail.',
  'auth/popup-closed-by-user': 'A janela de login foi fechada antes de terminar.',
  'auth/cancelled-popup-request': 'A janela de login foi fechada antes de terminar.',
  'auth/popup-blocked': 'O navegador bloqueou a janela de login. Libere pop-ups e tente de novo.',
  'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
  'auth/requires-recent-login': 'Por segurança, saia e entre de novo antes de trocar a senha.',
  'auth/operation-not-allowed':
    'Este jeito de entrar ainda não foi ligado no Firebase (Authentication → Sign-in method).',
  'auth/unauthorized-domain':
    'Este endereço não está autorizado no Firebase (Authentication → Settings → Authorized domains).',
  'auth/account-exists-with-different-credential':
    'Este e-mail já entra de outro jeito. Use o mesmo método da primeira vez.',
  'auth/invalid-api-key': 'A chave do Firebase (VITE_FIREBASE_API_KEY) está errada.',
  'auth/configuration-not-found':
    'O login pelo Firebase ainda não foi ativado no projeto (Firebase › Authentication › Começar).'
};

// Firebase Auth ainda não ligado no console: e-mail e senha seguem pelo login próprio da API.
const FIREBASE_DESLIGADO = ['auth/configuration-not-found', 'auth/operation-not-allowed'];

const traduzirErro = erro =>
  new Error(MENSAGENS_DE_ERRO[erro && erro.code] || erro.message || 'Não deu para entrar agora.');

const SEM_FIREBASE =
  'Falta configurar o Firebase Auth no site (VITE_FIREBASE_API_KEY no Frontend/.env).';

const ehCelular = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

async function entrarNoBackend(email, senha, lembrar) {
  const { token } = await api.post('/auth/entrar', { email, senha });
  armazenamento.guardar(token, lembrar);
}

export const servicoDeLogin = {
  firebaseHabilitado,

  observar(aoMudar) {
    if (!firebaseHabilitado) {
      aoMudar(!!armazenamento.ler());
      return () => {};
    }
    getRedirectResult(autenticacaoFirebase).catch(() => {});
    return onIdTokenChanged(autenticacaoFirebase, usuario =>
      aoMudar(!!usuario || !!armazenamento.ler())
    );
  },

  /** Login com e-mail: tenta o Firebase e, se a conta não estiver lá, o login próprio do backend. */
  async entrar(email, senha, lembrar = true) {
    try {
      if (firebaseHabilitado) {
        try {
          await setPersistence(
            autenticacaoFirebase,
            lembrar ? browserLocalPersistence : browserSessionPersistence
          );
          await signInWithEmailAndPassword(autenticacaoFirebase, email, senha);
          armazenamento.apagar();
        } catch (erroDoFirebase) {
          if (
            ![
              'auth/invalid-credential',
              'auth/user-not-found',
              'auth/wrong-password',
              ...FIREBASE_DESLIGADO
            ].includes(erroDoFirebase.code)
          )
            throw erroDoFirebase;
          try {
            await entrarNoBackend(email, senha, lembrar);
          } catch {
            throw erroDoFirebase;
          }
        }
      } else {
        await entrarNoBackend(email, senha, lembrar);
      }
      return api.post('/auth/sessao', {});
    } catch (erro) {
      throw traduzirErro(erro);
    }
  },

  async cadastrar(nome, email, senha) {
    if (String(senha).length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
    // Um e-mail, uma conta: se ele já existe (pela senha ou pelo Google), não cria outra.
    const { emUso } = await api.post('/auth/email-em-uso', { email });
    if (emUso)
      throw new Error('Já existe uma conta com esse e-mail. Entre com a sua senha ou com o Google.');
    try {
      const cadastrarNoBackend = async () => {
        const { token } = await api.post('/auth/cadastrar', { nome, email, senha });
        armazenamento.guardar(token, true);
      };
      if (firebaseHabilitado) {
        try {
          const credencial = await createUserWithEmailAndPassword(
            autenticacaoFirebase,
            email,
            senha
          );
          await updateProfile(credencial.user, { displayName: nome });
          await credencial.user.getIdToken(true);
          armazenamento.apagar();
        } catch (erroDoFirebase) {
          if (!FIREBASE_DESLIGADO.includes(erroDoFirebase.code)) throw erroDoFirebase;
          await cadastrarNoBackend();
        }
      } else {
        await cadastrarNoBackend();
      }
      return api.post('/auth/sessao', { nome });
    } catch (erro) {
      throw traduzirErro(erro);
    }
  },

  async entrarComProvedor(provedor) {
    if (!firebaseHabilitado) throw new Error(SEM_FIREBASE);
    const provedorFirebase =
      provedor === 'apple' ? new OAuthProvider('apple.com') : new GoogleAuthProvider();
    if (provedor === 'apple') {
      provedorFirebase.addScope('email');
      provedorFirebase.addScope('name');
    }
    provedorFirebase.setCustomParameters({ locale: 'pt_BR', prompt: 'select_account' });
    try {
      try {
        await signInWithPopup(autenticacaoFirebase, provedorFirebase);
      } catch (erro) {
        if (erro.code === 'auth/popup-blocked' && ehCelular()) {
          await signInWithRedirect(autenticacaoFirebase, provedorFirebase);
          return null;
        }
        throw erro;
      }
      armazenamento.apagar();
      return api.post('/auth/sessao', {});
    } catch (erro) {
      throw traduzirErro(erro);
    }
  },

  async redefinirSenha(email) {
    if (!firebaseHabilitado) throw new Error(SEM_FIREBASE);
    try {
      await sendPasswordResetEmail(autenticacaoFirebase, email);
    } catch (erro) {
      throw traduzirErro(erro);
    }
  },

  /** Como a sessão atual troca a senha: pelo Firebase, pelo backend ou não troca (Google/Apple). */
  jeitoDeTrocarSenha() {
    const usuario = usuarioFirebase();
    if (!usuario) return 'backend';
    return usuario.providerData.some(dado => dado.providerId === 'password') ? 'firebase' : 'provedor';
  },

  async trocarSenha(atual, nova) {
    if (String(nova).length < 8)
      throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
    const usuario = usuarioFirebase();
    try {
      if (usuario) {
        await reauthenticateWithCredential(
          usuario,
          EmailAuthProvider.credential(usuario.email, atual)
        );
        await updatePassword(usuario, nova);
      } else {
        await api.post('/me/senha', { atual, nova });
      }
    } catch (erro) {
      if (erro.code === 'auth/invalid-credential' || erro.code === 'auth/wrong-password')
        throw new Error('A senha atual não confere.');
      throw traduzirErro(erro);
    }
  },

  async sair() {
    if (usuarioFirebase()) await signOut(autenticacaoFirebase);
    armazenamento.apagar();
  }
};
