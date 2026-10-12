import { createHmac, timingSafeEqual } from 'node:crypto';
import { autenticacaoFirebase } from '../config/banco.js';
import { configuracao } from '../config/env.js';
import { HttpError } from '../utils/http.js';
import { pareceTokenFirebase, verificarTokenFirebase } from '../utils/tokenFirebase.js';
import { ContaModel } from '../models/ContaModel.js';

const paraBase64 = texto => Buffer.from(texto).toString('base64url');

export function assinarToken(dados) {
  const corpo = paraBase64(JSON.stringify({ ...dados, emitidoEm: Date.now() }));
  const assinatura = createHmac('sha256', configuracao.segredoLogin)
    .update(corpo)
    .digest('base64url');
  return `${corpo}.${assinatura}`;
}

function lerTokenProprio(token) {
  const [corpo, assinatura] = token.split('.');
  if (!corpo || !assinatura) return null;
  const esperada = createHmac('sha256', configuracao.segredoLogin)
    .update(corpo)
    .digest('base64url');
  const recebidaBytes = Buffer.from(assinatura);
  const esperadaBytes = Buffer.from(esperada);
  if (
    recebidaBytes.length !== esperadaBytes.length ||
    !timingSafeEqual(recebidaBytes, esperadaBytes)
  )
    return null;
  try {
    return JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function lerTokenFirebase(token) {
  if (autenticacaoFirebase) {
    const decodificado = await autenticacaoFirebase.verifyIdToken(token);
    return {
      uid: decodificado.uid,
      email: decodificado.email,
      name: decodificado.name,
      verificado: decodificado.email_verified === true
    };
  }
  return verificarTokenFirebase(token, configuracao.idProjetoFirebase);
}

// Aceita os dois tipos de sessão: o token do Firebase Auth (e-mail, Google, Apple)
// e o token próprio do backend (conta de demonstração e contas antigas).
export async function exigirLogin(ctx) {
  const cabecalho = ctx.req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : '';
  if (!token) throw new HttpError(401, 'Faça login para continuar.');

  if (pareceTokenFirebase(token)) {
    let lido;
    try {
      lido = await lerTokenFirebase(token);
    } catch {
      throw new HttpError(401, 'Sessão expirada. Entre de novo.');
    }
    // O mesmo e-mail entra sempre na mesma conta, venha do Google, do Firebase ou da senha da API.
    ctx.user = {
      uid: await ContaModel.uidDaConta(lido),
      uidFirebase: lido.uid,
      email: lido.email,
      name: lido.name,
      firebase: true
    };
    return;
  }
  const dados = lerTokenProprio(token);
  if (!dados) throw new HttpError(401, 'Sessão inválida. Entre de novo.');
  ctx.user = {
    uid: await ContaModel.uidDaConta({ uid: dados.uid, email: dados.email }),
    email: dados.email,
    name: dados.nome
  };
}
