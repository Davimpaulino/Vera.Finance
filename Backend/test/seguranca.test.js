import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';

await import('./apoio/ambiente.js');
process.env.NODE_ENV = 'test';
delete process.env.SEGREDO_LOGIN;
const { handle } = await import('../src/app.js');
const { banco } = await import('../src/config/banco.js');
const { configuracao } = await import('../src/config/env.js');
const { assinarToken } = await import('../src/middlewares/auth.js');
const { ExclusaoModel } = await import('../src/models/ExclusaoModel.js');
const { UsuarioModel } = await import('../src/models/UsuarioModel.js');

let server;
let base;
before(() => {
  server = createServer(handle).listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

const pedir = (metodo, caminho, corpo, token, ip = '10.0.0.1') =>
  fetch(base + caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: corpo ? JSON.stringify(corpo) : undefined
  });

test('sem SEGREDO_LOGIN, o segredo não é o padrão conhecido: ninguém forja token', async () => {
  assert.notEqual(configuracao.segredoLogin, 'troque-este-segredo');
  assert.ok(configuracao.segredoLogin.length >= 32);
  const corpo = Buffer.from(JSON.stringify({ uid: 'vitima', email: 'v@x.com', emitidoEm: Date.now() })).toString('base64url');
  const forjado = `${corpo}.${createHmac('sha256', 'troque-este-segredo').update(corpo).digest('base64url')}`;
  assert.equal((await pedir('GET', '/me', null, forjado)).status, 401);
});

test('token do login próprio expira em 30 dias', async () => {
  await UsuarioModel.criarSeNaoExistir('u-velho', { nome: 'A', email: 'a@x.com' });
  const corpo = Buffer.from(
    JSON.stringify({ uid: 'u-velho', email: 'a@x.com', emitidoEm: Date.now() - 31 * 86400000 })
  ).toString('base64url');
  const velho = `${corpo}.${createHmac('sha256', configuracao.segredoLogin).update(corpo).digest('base64url')}`;
  assert.equal((await pedir('GET', '/me', null, velho)).status, 401);
  assert.equal((await pedir('GET', '/me', null, assinarToken({ uid: 'u-velho', email: 'a@x.com' }))).status, 200);
});

test('a API responde com cabeçalhos de segurança e sem cache', async () => {
  const resposta = await pedir('GET', '/saude');
  assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(resposta.headers.get('cache-control'), 'no-store');
  assert.equal(resposta.headers.get('x-frame-options'), 'DENY');
});

test('login por senha é limitado por IP (força bruta)', async () => {
  const tentativa = () => pedir('POST', '/auth/entrar', { email: 'x@x.com', senha: 'errada123' }, null, '10.9.9.9');
  for (let i = 0; i < 10; i++) assert.equal((await tentativa()).status, 401);
  const bloqueada = await tentativa();
  assert.equal(bloqueada.status, 429);
  assert.ok(Number(bloqueada.headers.get('retry-after')) > 0);
  assert.equal(
    (await pedir('POST', '/auth/entrar', { email: 'x@x.com', senha: 'errada123' }, null, '10.9.9.8')).status,
    401,
    'outro IP segue livre'
  );
});

test('exclusão de conta: agenda, pode desistir e, vencida, apaga dados, login e família', async () => {
  const cadastro = await pedir('POST', '/auth/cadastrar', { nome: 'Bia', email: 'bia@x.com', senha: '12345678' }, null, '10.1.1.1');
  const { token } = await cadastro.json();
  const { uid } = JSON.parse(Buffer.from(token.split('.')[0], 'base64url'));
  await banco.gravar(`usuarios/${uid}/lancamentos/l1`, { valor: 10 });
  await banco.gravar('familias/f1', { donoId: uid, membros: [{ uid }, { uid: 'membro' }] });
  await UsuarioModel.atualizar(uid, { familiaId: 'f1' });
  await UsuarioModel.criarSeNaoExistir('membro', { nome: 'M', email: 'm@x.com' });
  await UsuarioModel.atualizar('membro', { familiaId: 'f1' });

  const agendada = await (await pedir('DELETE', '/me', null, token)).json();
  assert.ok(agendada.exclusaoAgendadaPara);
  await pedir('POST', '/me/cancelar-exclusao', {}, token);
  assert.equal(await banco.ler(`exclusoes/${uid}`), null, 'desistiu: nada é apagado');
  assert.equal(await ExclusaoModel.executarVencidas(new Date(Date.now() + 40 * 86400000)), 0);

  await pedir('DELETE', '/me', null, token);
  assert.equal(await ExclusaoModel.executarVencidas(), 0, 'ainda não venceu');
  assert.equal(await ExclusaoModel.executarVencidas(new Date(Date.now() + 31 * 86400000)), 1);
  assert.equal(await banco.ler(`usuarios/${uid}`), null);
  assert.equal(await banco.ler(`credenciais/${Buffer.from('bia@x.com').toString('base64url')}`), null);
  assert.equal(await banco.ler('familias/f1'), null);
  assert.equal((await UsuarioModel.buscar('membro')).familiaId, null, 'o membro fica com a própria conta');
  assert.equal((await pedir('POST', '/auth/entrar', { email: 'bia@x.com', senha: '12345678' }, null, '10.1.1.2')).status, 401);
});
