import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';
import { configuracao, temContaDeServico } from './env.js';
import { credencialFirebase } from './credencialFirebase.js';
import { criarBancoMemoria } from './bancoMemoria.js';
import { criarBancoRest } from './bancoRest.js';
import { criarBancoAdmin } from './bancoAdmin.js';
import { criarBancoPostgres } from './bancoPostgres.js';

let banco;
let modoBanco;
let autenticacaoFirebase = null;

function aplicativoFirebase(opcoes = {}) {
  return initializeApp({ credential: credencialFirebase(configuracao.contaDeServico), ...opcoes });
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
