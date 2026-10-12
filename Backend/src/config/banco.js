import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';
import { configuracao, temContaDeServico } from './env.js';
import { criarBancoMemoria } from './bancoMemoria.js';
import { criarBancoRest } from './bancoRest.js';
import { criarBancoAdmin } from './bancoAdmin.js';

let banco;
let modoBanco;
let autenticacaoFirebase = null;

if (configuracao.banco.forcarMemoria || !configuracao.banco.url) {
  banco = criarBancoMemoria();
  modoBanco = 'memoria';
} else if (temContaDeServico) {
  const { contaDeServico } = configuracao;
  const credencial = contaDeServico.chavePrivada
    ? cert({
        projectId: contaDeServico.idProjeto,
        clientEmail: contaDeServico.emailCliente,
        privateKey: contaDeServico.chavePrivada
      })
    : applicationDefault();
  const aplicativo = initializeApp({ credential: credencial, databaseURL: configuracao.banco.url });
  banco = criarBancoAdmin(getDatabase(aplicativo));
  autenticacaoFirebase = getAuth(aplicativo);
  modoBanco = 'admin';
} else {
  banco = criarBancoRest(configuracao.banco);
  modoBanco = 'rest';
}

export const loginProprio = !autenticacaoFirebase;

export { banco, modoBanco, autenticacaoFirebase };
