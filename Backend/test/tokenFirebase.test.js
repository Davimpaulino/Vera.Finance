import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';

// Conferência do token do Firebase sem conta de serviço (modo REST): assinatura RS256 com as
// chaves públicas do Google, emissor, público e validade. As chaves aqui são locais.
const { verificarTokenFirebase } = await import('../src/utils/tokenFirebase.js');

const PROJETO = 'projeto-de-teste';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const outra = generateKeyPairSync('rsa', { modulusLength: 2048 });
const CHAVES = { 'chave-1': publicKey.export({ type: 'spki', format: 'pem' }) };

globalThis.fetch = async () =>
  new Response(JSON.stringify(CHAVES), { headers: { 'cache-control': 'public, max-age=600' } });

const b64 = objeto => Buffer.from(JSON.stringify(objeto)).toString('base64url');
function token({ kid = 'chave-1', chave = privateKey, ...campos } = {}) {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = b64({ alg: 'RS256', kid, typ: 'JWT' });
  const corpo = b64({
    iss: `https://securetoken.google.com/${PROJETO}`,
    aud: PROJETO,
    sub: 'uid-1',
    iat: agora - 10,
    exp: agora + 3600,
    email: 'a@x.com',
    email_verified: true,
    ...campos
  });
  const assinatura = createSign('RSA-SHA256').update(`${cabecalho}.${corpo}`).sign(chave).toString('base64url');
  return `${cabecalho}.${corpo}.${assinatura}`;
}

test('token do Firebase assinado pela chave publicada é aceito', async () => {
  const lido = await verificarTokenFirebase(token(), PROJETO);
  assert.deepEqual(lido, { uid: 'uid-1', email: 'a@x.com', name: undefined, verificado: true });
});

test('token com kid que não é uma chave publicada (constructor, __proto__) é recusado', async () => {
  for (const kid of ['constructor', '__proto__', 'toString', 'nao-existe'])
    await assert.rejects(verificarTokenFirebase(token({ kid }), PROJETO), /Chave desconhecida/, kid);
});

test('token assinado por outra chave, de outro projeto ou vencido é recusado', async () => {
  await assert.rejects(verificarTokenFirebase(token({ chave: outra.privateKey }), PROJETO));
  await assert.rejects(verificarTokenFirebase(token({ aud: 'outro-projeto' }), PROJETO));
  await assert.rejects(
    verificarTokenFirebase(token({ exp: Math.floor(Date.now() / 1000) - 1 }), PROJETO)
  );
});
