import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const ID_DO_PROJETO = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'verafinance-d43d6';

// Configuração do app Web do Firebase. Esses valores são públicos (vão para o navegador de
// qualquer forma); quem protege os dados são as regras do banco e a verificação na API.
export const configuracaoFirebase = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDDgmg5xXbmHnHKTJHh32RCG-1_iLR5Uwg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${ID_DO_PROJETO}.firebaseapp.com`,
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    `https://${ID_DO_PROJETO}-default-rtdb.firebaseio.com`,
  projectId: ID_DO_PROJETO,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:697782701749:web:56b68dd02baefe92b5f8fc',
  messagingSenderId: '697782701749',
  storageBucket: `${ID_DO_PROJETO}.firebasestorage.app`
};

export const firebaseHabilitado = Boolean(configuracaoFirebase.apiKey);
export const aplicativoFirebase = firebaseHabilitado ? initializeApp(configuracaoFirebase) : null;
export const autenticacaoFirebase = firebaseHabilitado ? getAuth(aplicativoFirebase) : null;
