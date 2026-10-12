import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

process.env.BANCO = 'memoria';
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.FIREBASE_PRIVATE_KEY;
const { handle } = await import('../src/app.js');
const { ContaModel } = await import('../src/models/ContaModel.js');
const { CredencialModel } = await import('../src/models/CredencialModel.js');

let server;
let base;

const chamar = async (metodo, caminho, corpo) => {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const texto = await resposta.text();
  return { status: resposta.status, body: texto ? JSON.parse(texto) : null };
};

before(() => {
  server = createServer(handle).listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

test('Google com o mesmo e-mail entra na conta criada antes pela senha', async () => {
  const antiga = await CredencialModel.cadastrar({
    email: 'Ana@Exemplo.com',
    senha: 'segredo123',
    nome: 'Ana'
  });
  const doGoogle = await ContaModel.uidDaConta({
    uid: 'firebase-google-ana',
    email: 'ana@exemplo.com',
    verificado: true
  });
  assert.equal(doGoogle, antiga.uid);
  const pelaSenha = await ContaModel.uidDaConta({ uid: antiga.uid, email: 'ana@exemplo.com' });
  assert.equal(pelaSenha, antiga.uid);
});

test('cadastro com e-mail não verificado não assume a conta de outra pessoa', async () => {
  const dona = await CredencialModel.cadastrar({
    email: 'bia@exemplo.com',
    senha: 'segredo123',
    nome: 'Bia'
  });
  const intruso = await ContaModel.uidDaConta({
    uid: 'firebase-senha-intruso',
    email: 'bia@exemplo.com',
    verificado: false
  });
  assert.notEqual(intruso, dona.uid);
  assert.equal(intruso, 'firebase-senha-intruso');
});

test('conta nova pelo Google fica com o identificador do Google', async () => {
  const uid = await ContaModel.uidDaConta({
    uid: 'firebase-google-caio',
    email: 'caio@exemplo.com',
    verificado: true
  });
  assert.equal(uid, 'firebase-google-caio');
  assert.equal((await ContaModel.buscar('caio@exemplo.com')).uid, 'firebase-google-caio');
});

test('não cria uma segunda conta para um e-mail que já existe', async () => {
  assert.deepEqual((await chamar('POST', '/auth/email-em-uso', { email: 'caio@exemplo.com' })).body, {
    emUso: true
  });
  assert.deepEqual((await chamar('POST', '/auth/email-em-uso', { email: 'novo@exemplo.com' })).body, {
    emUso: false
  });
  const repetido = await chamar('POST', '/auth/cadastrar', {
    nome: 'Caio',
    email: 'caio@exemplo.com',
    senha: 'segredo123'
  });
  assert.equal(repetido.status, 409);
  const novo = await chamar('POST', '/auth/cadastrar', {
    nome: 'Novo',
    email: 'novo@exemplo.com',
    senha: 'segredo123'
  });
  assert.equal(novo.status, 201);
  assert.equal((await chamar('POST', '/auth/email-em-uso', { email: 'novo@exemplo.com' })).body.emUso, true);
});
