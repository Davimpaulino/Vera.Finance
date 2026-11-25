import { randomBytes } from 'node:crypto';

process.env.TZ = process.env.TZ || 'America/Sao_Paulo';

// Segredo que assina o token do login próprio. Sem ele configurado, qualquer pessoa que lesse o
// código poderia forjar um token de qualquer conta. Por isso, na falta do segredo, sorteia um a cada
// início (as sessões do login próprio caem quando o servidor reinicia) e avisa no log.
const SEGREDO_FRACO = new Set(['', 'troque-este-segredo']);
function segredoDeLogin() {
  const definido = process.env.SEGREDO_LOGIN || '';
  if (!SEGREDO_FRACO.has(definido) && definido.length >= 32) return definido;
  if (process.env.NODE_ENV !== 'test')
    console.warn(
      '[segurança] SEGREDO_LOGIN ausente ou curto (mínimo 32 caracteres). Usando um segredo aleatório: ' +
        'as sessões do login por senha caem a cada reinício. Configure SEGREDO_LOGIN no Render.'
    );
  return randomBytes(48).toString('base64url');
}

export const configuracao = {
  porta: Number(process.env.PORT) || 4000,
  origensPermitidas: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(origem => origem.trim()),
  banco: {
    url: (
      process.env.FIREBASE_URL_BANCO ?? 'https://verafinance-d43d6-default-rtdb.firebaseio.com'
    ).replace(/\/+$/, ''),
    segredo: process.env.FIREBASE_SEGREDO_BANCO || '',
    forcarMemoria: process.env.BANCO === 'memoria'
  },
  // Com DATABASE_URL os dados vão para o PostgreSQL; o login (Firebase Auth) continua igual.
  postgres: {
    url: process.env.DATABASE_URL || '',
    ssl: process.env.PGSSL || ''
  },
  contaDeServico: {
    arquivo: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    idProjeto: process.env.FIREBASE_PROJECT_ID || '',
    emailCliente: process.env.FIREBASE_CLIENT_EMAIL || '',
    chavePrivada: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  },
  segredoLogin: segredoDeLogin(),
  idProjetoFirebase: process.env.FIREBASE_PROJECT_ID || 'verafinance-d43d6'
};

export const temContaDeServico = Boolean(
  configuracao.contaDeServico.arquivo ||
    (configuracao.contaDeServico.idProjeto &&
      configuracao.contaDeServico.emailCliente &&
      configuracao.contaDeServico.chavePrivada)
);
