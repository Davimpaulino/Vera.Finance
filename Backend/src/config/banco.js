import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';
import { configuracao, temContaDeServico } from './env.js';
import { criarBancoMemoria } from './bancoMemoria.js';
import { criarBancoRest } from './bancoRest.js';
import { criarBancoAdmin } from './bancoAdmin.js';
import { criarBancoPostgres } from './bancoPostgres.js';

let banco;
let modoBanco;
let autenticacaoFirebase = null;

function aplicativoFirebase(opcoes = {}) {
  const { contaDeServico } = configuracao;
  const credencial = contaDeServico.chavePrivada
    ? cert({
        projectId: contaDeServico.idProjeto,
        clientEmail: contaDeServico.emailCliente,
        privateKey: contaDeServico.chavePrivada
      })
    : applicationDefault();
  return initializeApp({ credential: credencial, ...opcoes });
}

if (configuracao.banco.forcarMemoria) {
  banco = criarBancoMemoria();
  modoBanco = 'memoria';
} else if (configuracao.postgres.url) {
  // Só os dados vão para o PostgreSQL. Com conta de serviço, o login segue no Firebase Auth.
  banco = criarBancoPostgres(configuracao.postgres);
  if (temContaDeServico) autenticacaoFirebase = getAuth(aplicativoFirebase());
  modoBanco = 'postgres';
} else if (!configuracao.banco.url) {
  banco = criarBancoMemoria();
  modoBanco = 'memoria';
} else if (temContaDeServico) {
  const aplicativo = aplicativoFirebase({ databaseURL: configuracao.banco.url });
  banco = criarBancoAdmin(getDatabase(aplicativo));
  autenticacaoFirebase = getAuth(aplicativo);
  modoBanco = 'admin';
} else {
  banco = criarBancoRest(configuracao.banco);
  modoBanco = 'rest';
}

export const loginProprio = !autenticacaoFirebase;

export { banco, modoBanco, autenticacaoFirebase };
