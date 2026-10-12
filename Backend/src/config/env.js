process.env.TZ = process.env.TZ || 'America/Sao_Paulo';

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
  contaDeServico: {
    arquivo: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    idProjeto: process.env.FIREBASE_PROJECT_ID || '',
    emailCliente: process.env.FIREBASE_CLIENT_EMAIL || '',
    chavePrivada: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  },
  segredoLogin: process.env.SEGREDO_LOGIN || 'troque-este-segredo',
  idProjetoFirebase: process.env.FIREBASE_PROJECT_ID || 'verafinance-d43d6'
};

export const temContaDeServico = Boolean(
  configuracao.contaDeServico.arquivo ||
    (configuracao.contaDeServico.idProjeto &&
      configuracao.contaDeServico.emailCliente &&
      configuracao.contaDeServico.chavePrivada)
);
