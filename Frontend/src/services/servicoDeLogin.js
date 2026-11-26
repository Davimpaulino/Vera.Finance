import { firebaseHabilitado } from './configuracaoFirebase.js';
import { api, ApiError, SEM_CONEXAO, setTokenProvider } from './api.js';
import { recarregarParaVersaoNova } from '../lib/versaoNova.js';

// O SDK do Firebase (services/firebase.js) só é baixado quando alguém precisa do login: na tela
// Entrar, no cadastro ou no app. As páginas do site não pagam esse peso. Depois de carregado,
// o módulo fica guardado aqui e as funções o usam sem esperar de novo.
let firebase = null;
let carregando = null;

/**
 * Baixa o SDK uma vez só. Se não vier com a internet ligada, quase sempre é a aba aberta antes
 * de um deploy (o arquivo antigo sumiu): a página recarrega e a promessa fica esperando, com o
 * "Carregando" na tela. Sem internet (ou se já recarregou há pouco) vira "Sem conexão", e o
 * erro leva `recarregar`, para o "Tentar de novo" recarregar a página em vez de pedir o mesmo
 * arquivo outra vez.
 */
function carregarFirebase() {
  if (!firebaseHabilitado) return Promise.resolve(null);
  if (firebase) return Promise.resolve(firebase);
  carregando ??= import('./firebase.js').then(
    modulo => (firebase = modulo),
    () => {
      carregando = null;
      if (recarregarParaVersaoNova()) return new Promise(() => {});
      const erro = new ApiError(0, SEM_CONEXAO);
      erro.recarregar = true;
      throw erro;
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

// Marca de "sessão aberta neste aparelho": só um "1", nada da conta. As páginas do site não
// ligam o login (nem baixam o Firebase), então o "Ver o painel" decide por ela se manda para o
// app ou para o cadastro. O AuthContext põe a marca quando a sessão abre e tira quando ela fecha.
const CHAVE_DA_SESSAO = 'vera.sessao';
const marcaDeSessao = {
  ler() {
    try {
      return localStorage.getItem(CHAVE_DA_SESSAO) === '1';
    } catch {
      return false;
    }
  },
  gravar(aberta) {
    try {
      if (aberta) localStorage.setItem(CHAVE_DA_SESSAO, '1');
      else localStorage.removeItem(CHAVE_DA_SESSAO);
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

// O endereço de volta do e-mail precisa estar em Authentication → Settings → Authorized domains.
// Se não estiver, o e-mail vai sem o botão "Continuar" (o link de confirmação funciona igual).
const VOLTA_RECUSADA = [
  'auth/unauthorized-continue-uri',
  'auth/invalid-continue-uri',
  'auth/missing-continue-uri'
];

// Conta para a qual o e-mail de confirmação já saiu deste aparelho (no cadastro ou pelo botão do
// aviso). Quem criou a conta antes da confirmação existir nunca recebeu esse e-mail, e o aviso do
// app não pode dizer "clique no link que enviamos". Guarda só o uid, não o endereço.
const CHAVE_DO_ENVIO = 'vera.confirmacaoEnviada';
const envioDaConfirmacao = {
  feitoPara(uid) {
    try {
      return Boolean(uid) && localStorage.getItem(CHAVE_DO_ENVIO) === uid;
    } catch {
      return false;
    }
  },
  marcar(uid) {
    try {
      localStorage.setItem(CHAVE_DO_ENVIO, uid);
    } catch {
      return;
    }
  }
};

/** E-mail de confirmação do Firebase, em português, com o botão que volta para o app. */
// Só é chamada com uma conta do Firebase na mão, ou seja, com o SDK já carregado.
async function enviarConfirmacao(usuario) {
  firebase.autenticacaoFirebase.languageCode = 'pt-BR';
  try {
    await firebase.sendEmailVerification(usuario, { url: `${window.location.origin}/app` });
  } catch (erro) {
    if (!VOLTA_RECUSADA.includes(erro.code)) throw erro;
    await firebase.sendEmailVerification(usuario);
  }
  envioDaConfirmacao.marcar(usuario.uid);
}

/** E-mail que falta confirmar. Só conta de e-mail e senha: Google e Apple já vêm confirmados. */
function emailParaConfirmar() {
  const usuario = usuarioFirebase();
  if (!usuario || usuario.emailVerified) return null;
  return usuario.providerData.some(dado => dado.providerId === 'password') ? usuario.email : null;
}

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
    // O onIdTokenChanged dispara também quando o token renova e no reload() da confirmação do
    // e-mail. Cada aviso reabre a sessão na API, e uma falha dela nessa hora tiraria a pessoa do
    // app. Por isso só avisa quando a conta muda: uid do Firebase, 'backend' (login próprio) ou
    // null. O primeiro aviso sempre passa, e cada inscrição nova começa do zero.
    let ultimaChave;
    const avisar = chave => {
      if (chave === ultimaChave) return;
      ultimaChave = chave;
      aoMudar(chave !== null);
    };
    carregarFirebase().then(
      modulo => {
        if (cancelado) return;
        if (!modulo) {
          aoMudar(!!armazenamento.ler());
          return;
        }
        modulo.getRedirectResult(modulo.autenticacaoFirebase).catch(() => {});
        desligar = modulo.onIdTokenChanged(modulo.autenticacaoFirebase, usuario =>
          avisar(usuario ? usuario.uid : armazenamento.ler() ? 'backend' : null)
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
          // Confirmação do e-mail: não segura o cadastro. Se não sair agora, o aviso do app
          // tem o botão "Enviar link".
          await enviarConfirmacao(credencial.user).catch(() => {});
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

  emailParaConfirmar,

  /** O e-mail de confirmação desta conta já foi enviado deste aparelho? */
  confirmacaoJaEnviada() {
    return envioDaConfirmacao.feitoPara(usuarioFirebase()?.uid);
  },

  /**
   * Recarrega a conta no Firebase (a pessoa pode ter clicado no link em outra aba) e devolve o
   * e-mail que ainda falta confirmar, ou null.
   */
  async conferirConfirmacao() {
    const usuario = usuarioFirebase();
    if (!usuario) return null;
    try {
      await firebase.reload(usuario);
    } catch {
      // Sem internet agora: fica valendo o que já se sabia.
    }
    return emailParaConfirmar();
  },

  async reenviarConfirmacao() {
    const usuario = usuarioFirebase();
    if (!usuario) return;
    try {
      await enviarConfirmacao(usuario);
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

  /** Põe (sessão aberta) ou tira (sessão fechada) a marca usada pelo "Ver o painel". */
  lembrarSessao: aberta => marcaDeSessao.gravar(aberta),

  /** A sessão estava aberta da última vez que o login ligou neste aparelho? */
  lembraDeSessao: () => marcaDeSessao.ler(),

  /**
   * Tem alguém conectado neste aparelho? Vale o que dá para saber sem a API: a conta do Firebase
   * (se o SDK já carregou) ou o token do login próprio. A tela "Sem conexão" usa isto para
   * mostrar "Sair da conta" só para quem tem de onde sair.
   */
  temSessao() {
    return !!usuarioFirebase() || !!armazenamento.ler();
  },

  // Sair não depende da rede: o signOut do Firebase e o token do login próprio são locais.
  async sair() {
    if (usuarioFirebase()) await firebase.signOut(firebase.autenticacaoFirebase);
    armazenamento.apagar();
  }
};
