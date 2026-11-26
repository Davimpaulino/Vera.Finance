import { firebaseHabilitado } from './configuracaoFirebase.js';
import { api, ApiError, SEM_CONEXAO, setTokenProvider } from './api.js';

// O SDK do Firebase (services/firebase.js) só é baixado quando alguém precisa do login: na tela
// Entrar, no cadastro ou no app. As páginas do site não pagam esse peso. Depois de carregado,
// o módulo fica guardado aqui e as funções o usam sem esperar de novo.
let firebase = null;
let carregando = null;

/** Baixa o SDK uma vez só. Sem rede, a falha não fica guardada: "Tentar de novo" baixa de novo. */
function carregarFirebase() {
  if (!firebaseHabilitado) return Promise.resolve(null);
  if (firebase) return Promise.resolve(firebase);
  carregando ??= import('./firebase.js').then(
    modulo => (firebase = modulo),
    () => {
      carregando = null;
      throw new ApiError(0, SEM_CONEXAO);
    }
  );
  return carregando;
}

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

// Aceite dos termos feito no cadastro. Fica guardado até a sessão abrir, porque no celular
// o login do Google/Apple sai do site (redirecionamento) e volta sem passar pelo formulário.
// Vale por 10 minutos e para um login só: um redirecionamento abandonado não pode deixar
// o aceite na aba para a próxima conta que entrar.
const CHAVE_DO_ACEITE = 'vera.aceite';
const VALIDADE_DO_ACEITE_MS = 10 * 60 * 1000;
const aceitePendente = {
  ler() {
    try {
      const guardado = JSON.parse(sessionStorage.getItem(CHAVE_DO_ACEITE) || 'null');
      if (guardado?.aceite && Date.now() - guardado.guardadoEm < VALIDADE_DO_ACEITE_MS)
        return guardado.aceite;
      sessionStorage.removeItem(CHAVE_DO_ACEITE);
      return null;
    } catch {
      return null;
    }
  },
  /** Guarda o aceite deste login. Sem aceite, apaga o que tiver sobrado de outro login. */
  guardar(aceite) {
    try {
      if (aceite)
        sessionStorage.setItem(
          CHAVE_DO_ACEITE,
          JSON.stringify({ aceite, guardadoEm: Date.now() })
        );
      else sessionStorage.removeItem(CHAVE_DO_ACEITE);
    } catch {
      return;
    }
  },
  apagar() {
    try {
      sessionStorage.removeItem(CHAVE_DO_ACEITE);
    } catch {
      return;
    }
  }
};

/** Abre a sessão na API (cria o perfil na primeira vez), levando o aceite pendente, se houver. */
async function abrirSessao(corpo = {}) {
  const aceite = aceitePendente.ler();
  try {
    return await api.post('/auth/sessao', aceite ? { ...corpo, aceite } : corpo);
  } finally {
    // Gravado ou recusado (versão antiga dos termos), o aceite não vai de novo sozinho.
    if (aceite) aceitePendente.apagar();
  }
}

// Sem o SDK carregado ninguém entrou pelo Firebase nesta aba: as rotas que usam o login
// (e as chamadas com token) só acontecem depois que ele carrega.
const usuarioFirebase = () => (firebase ? firebase.autenticacaoFirebase.currentUser : null);

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
  'auth/network-request-failed': SEM_CONEXAO,
  // A janela do Google depende de scripts do Google; sem rede (ou com bloqueador) o SDK devolve isto.
  'auth/internal-error':
    'Não deu para abrir o login agora. Confira a internet (ou o bloqueador de anúncios) e tente de novo.',
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
  abrirSessao,

  /**
   * Avisa `aoMudar(logado)` a cada troca de sessão. Baixa o SDK do Firebase na primeira vez.
   * Se o SDK não baixar (sem internet), chama `aoFalhar(erro)`; quem chamou decide tentar de novo.
   */
  observar(aoMudar, aoFalhar = () => {}) {
    let cancelado = false;
    let desligar = () => {};
    carregarFirebase().then(
      modulo => {
        if (cancelado) return;
        if (!modulo) {
          aoMudar(!!armazenamento.ler());
          return;
        }
        modulo.getRedirectResult(modulo.autenticacaoFirebase).catch(() => {});
        desligar = modulo.onIdTokenChanged(modulo.autenticacaoFirebase, usuario =>
          aoMudar(!!usuario || !!armazenamento.ler())
        );
      },
      erro => {
        if (!cancelado) aoFalhar(erro);
      }
    );
    return () => {
      cancelado = true;
      desligar();
    };
  },

  /** Login com e-mail: tenta o Firebase e, se a conta não estiver lá, o login próprio do backend. */
  async entrar(email, senha, lembrar = true) {
    // Login de quem já tem conta: nenhum aceite que sobrou na aba vai junto.
    aceitePendente.apagar();
    try {
      const fb = await carregarFirebase();
      if (fb) {
        try {
          await fb.setPersistence(
            fb.autenticacaoFirebase,
            lembrar ? fb.browserLocalPersistence : fb.browserSessionPersistence
          );
          await fb.signInWithEmailAndPassword(fb.autenticacaoFirebase, email, senha);
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
      return abrirSessao();
    } catch (erro) {
      throw traduzirErro(erro);
    }
  },

  /** Cadastro por e-mail. `aceite` é { versao } dos termos aceitos no formulário. */
  async cadastrar(nome, email, senha, aceite) {
    if (String(senha).length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
    // Um e-mail, uma conta: se ele já existe (pela senha ou pelo Google), não cria outra.
    const { emUso } = await api.post('/auth/email-em-uso', { email });
    if (emUso)
      throw new Error('Já existe uma conta com esse e-mail. Entre com a sua senha ou com o Google.');
    aceitePendente.guardar(aceite);
    try {
      const cadastrarNoBackend = async () => {
        const { token } = await api.post('/auth/cadastrar', { nome, email, senha, aceite });
        armazenamento.guardar(token, true);
      };
      const fb = await carregarFirebase();
      if (fb) {
        try {
          const credencial = await fb.createUserWithEmailAndPassword(
            fb.autenticacaoFirebase,
            email,
            senha
          );
          await fb.updateProfile(credencial.user, { displayName: nome });
          await credencial.user.getIdToken(true);
          armazenamento.apagar();
        } catch (erroDoFirebase) {
          if (!FIREBASE_DESLIGADO.includes(erroDoFirebase.code)) throw erroDoFirebase;
          await cadastrarNoBackend();
        }
      } else {
        await cadastrarNoBackend();
      }
      return abrirSessao({ nome });
    } catch (erro) {
      aceitePendente.apagar();
      throw traduzirErro(erro);
    }
  },

  /** Google ou Apple. No cadastro, `aceite` é { versao } dos termos aceitos; na tela Entrar, nada. */
  async entrarComProvedor(provedor, aceite) {
    if (!firebaseHabilitado) throw new Error(SEM_FIREBASE);
    // Nas telas Entrar e Cadastro o SDK já carregou junto com a página. Usar o módulo direto,
    // sem esperar, mantém a janela do Google no mesmo clique (senão o navegador bloqueia o pop-up).
    let fb = firebase;
    try {
      fb ??= await carregarFirebase();
    } catch (erro) {
      throw traduzirErro(erro);
    }
    aceitePendente.guardar(aceite);
    const provedorFirebase =
      provedor === 'apple' ? new fb.OAuthProvider('apple.com') : new fb.GoogleAuthProvider();
    if (provedor === 'apple') {
      provedorFirebase.addScope('email');
      provedorFirebase.addScope('name');
    }
    provedorFirebase.setCustomParameters({ locale: 'pt_BR', prompt: 'select_account' });
    try {
      try {
        await fb.signInWithPopup(fb.autenticacaoFirebase, provedorFirebase);
      } catch (erro) {
        if (erro.code === 'auth/popup-blocked' && ehCelular()) {
          await fb.signInWithRedirect(fb.autenticacaoFirebase, provedorFirebase);
          return null;
        }
        throw erro;
      }
      armazenamento.apagar();
      return abrirSessao();
    } catch (erro) {
      aceitePendente.apagar();
      throw traduzirErro(erro);
    }
  },

  async redefinirSenha(email) {
    if (!firebaseHabilitado) throw new Error(SEM_FIREBASE);
    try {
      const fb = await carregarFirebase();
      await fb.sendPasswordResetEmail(fb.autenticacaoFirebase, email);
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
        await firebase.reauthenticateWithCredential(
          usuario,
          firebase.EmailAuthProvider.credential(usuario.email, atual)
        );
        await firebase.updatePassword(usuario, nova);
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
    if (usuarioFirebase()) await firebase.signOut(firebase.autenticacaoFirebase);
    armazenamento.apagar();
  }
};
