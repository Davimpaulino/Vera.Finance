// SDK do Firebase (app + login). Só entra por import() em servicoDeLogin.js: as páginas do site
// (home, preços, perguntas, termos, privacidade) não baixam este pedaço, só entrar, cadastro e o app.
// Não importe este arquivo direto de outro lugar, senão o SDK volta para o JavaScript principal.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { configuracaoFirebase } from './configuracaoFirebase.js';

export {
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
  sendEmailVerification,
  reload,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onIdTokenChanged
} from 'firebase/auth';

export const aplicativoFirebase = initializeApp(configuracaoFirebase);
export const autenticacaoFirebase = getAuth(aplicativoFirebase);

// E-mails do Firebase (confirmação de e-mail, troca de senha) e telas de login em português.
autenticacaoFirebase.languageCode = 'pt-BR';
