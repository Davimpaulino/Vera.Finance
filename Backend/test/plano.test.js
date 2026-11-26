import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

await import('./apoio/ambiente.js');
const { handle } = await import('../src/app.js');
const { PlanoModel } = await import('../src/models/PlanoModel.js');
const { UsuarioModel } = await import('../src/models/UsuarioModel.js');
const { VERSAO_DOS_TERMOS } = await import('../src/config/termos.js');

// Cancelar o vera+ mantém o plano até o fim do período já começado; depois a conta volta para o
// grátis, com os limites do grátis. O artigo de ajuda "planos-e-cancelamento" e a tela de
// Configurações prometem isso.

const fetchDeVerdade = globalThis.fetch;
globalThis.fetch = (endereco, opcoes) =>
  /^https?:\/\/localhost[:/]/.test(String(endereco))
    ? fetchDeVerdade(endereco, opcoes)
    : Promise.reject(new Error('sem internet nos testes'));

let server;
let base;

const call = async (method, path, body, tk) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tk ? { Authorization: `Bearer ${tk}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

before(() => {
  server = createServer(handle).listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

test('emVigor: assinatura ativa ou cancelada dentro do período continua valendo', () => {
  const agora = new Date('2026-11-26T12:00:00Z');
  const ativa = { plano: 'mensal', desde: '2026-11-01T00:00:00Z', cancelada: false };
  assert.deepEqual(PlanoModel.emVigor({ plano: 'mensal', assinatura: ativa }, agora), {
    plano: 'mensal',
    assinatura: ativa
  });
  const cancelada = { ...ativa, cancelada: true, ativaAte: '2026-12-01T00:00:00Z' };
  assert.deepEqual(PlanoModel.emVigor({ plano: 'mensal', assinatura: cancelada }, agora), {
    plano: 'mensal',
    assinatura: cancelada
  });
  assert.deepEqual(PlanoModel.emVigor({ plano: 'gratis' }, agora), {
    plano: 'gratis',
    assinatura: null
  });
});

test('emVigor: cancelada com o período vencido (ou sem data de fim) volta para o grátis', () => {
  const agora = new Date('2026-11-26T12:00:00Z');
  const base = { plano: 'anual', desde: '2025-11-01T00:00:00Z', cancelada: true };
  for (const ativaAte of ['2026-11-01T00:00:00Z', '2026-11-26T12:00:00Z', null, 'data errada'])
    assert.deepEqual(
      PlanoModel.emVigor({ plano: 'anual', assinatura: { ...base, ativaAte } }, agora),
      { plano: 'gratis', assinatura: null },
      String(ativaAte)
    );
});

test('depois do fim do período cancelado, a conta segue os limites do grátis', async () => {
  const email = `plano${Date.now()}@x.com`;
  const reg = await call('POST', '/auth/cadastrar', {
    nome: 'Bia',
    email,
    senha: '12345678',
    aceite: { versao: VERSAO_DOS_TERMOS }
  });
  assert.equal(reg.status, 201);
  const tk = reg.body.token;
  assert.equal(
    (await call('POST', '/onboarding', { renda: { rendaFixa: 2000 }, plano: 'mensal' }, tk)).status,
    201
  );

  const cancelado = await call('POST', '/me/cancelar-assinatura', null, tk);
  assert.equal(cancelado.status, 200);
  assert.equal(cancelado.body.plano, 'mensal');
  assert.equal(cancelado.body.assinatura.cancelada, true);
  assert.ok(Date.parse(cancelado.body.assinatura.ativaAte) > Date.now());
  // Ainda no período: o vera+ continua (meta além de 3 e modo família).
  for (let i = 0; i < 4; i++)
    assert.equal((await call('POST', '/metas', { nome: `M${i}`, alvo: 100 }, tk)).status, 201);

  // O período acaba: o fim do vera+ fica para trás.
  const uid = (await call('GET', '/me', null, tk)).body.id;
  await UsuarioModel.atualizar(uid, {
    assinatura: { ...cancelado.body.assinatura, ativaAte: '2020-01-01T00:00:00.000Z' }
  });

  const me = await call('GET', '/me', null, tk);
  assert.equal(me.body.plano, 'gratis');
  assert.equal(me.body.planoInfo.id, 'gratis');
  assert.equal(me.body.assinatura, null);
  // As 4 metas continuam, mas não dá para criar outra; o modo família é do vera+.
  assert.equal((await call('GET', '/metas', null, tk)).status, 200);
  assert.equal((await call('POST', '/metas', { nome: 'M5', alvo: 100 }, tk)).status, 403);
  assert.equal((await call('POST', '/familia', {}, tk)).status, 403);
  // Já está no grátis: não há o que cancelar.
  assert.equal((await call('POST', '/me/cancelar-assinatura', null, tk)).status, 400);

  // Assinar de novo volta a valer na hora.
  const assinou = await call('PATCH', '/me/plano', { plano: 'mensal' }, tk);
  assert.equal(assinou.body.plano, 'mensal');
  assert.equal(assinou.body.assinatura.cancelada, false);
  assert.equal((await call('POST', '/metas', { nome: 'M5', alvo: 100 }, tk)).status, 201);
});
