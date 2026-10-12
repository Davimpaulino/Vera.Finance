import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

process.env.BANCO = 'memoria';
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.FIREBASE_PRIVATE_KEY;
const { handle } = await import('../src/app.js');
const { popularDadosDeTeste } = await import('./apoio/dadosDeTeste.js');

// Testes não saem para a internet: o mapa e os sites das redes ficam indisponíveis aqui.
const fetchDeVerdade = globalThis.fetch;
globalThis.fetch = (endereco, opcoes) =>
  /^https?:\/\/localhost[:/]/.test(String(endereco))
    ? fetchDeVerdade(endereco, opcoes)
    : Promise.reject(new Error('sem internet nos testes'));

let server;
let base;
let token;

const call = async (method, path, body, tk = token) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tk ? { Authorization: `Bearer ${tk}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return {
    status: res.status,
    body: text && res.headers.get('content-type').includes('json') ? JSON.parse(text) : text
  };
};

before(async () => {
  await popularDadosDeTeste();
  server = createServer(handle).listen(0);
  base = `http://localhost:${server.address().port}/api`;
  token = (
    await call('POST', '/auth/entrar', { email: 'demo@vera.finance', senha: 'vera1234' }, null)
  ).body.token;
});
after(() => server.close());

test('rotas privadas exigem login', async () => {
  const r = await call('GET', '/dashboard', null, null);
  assert.equal(r.status, 401);
});

test('token adulterado é recusado', async () => {
  const r = await call('GET', '/me', null, token.slice(0, -2) + 'xx');
  assert.equal(r.status, 401);
});

test('painel traz saldo, projeção do ciclo inteiro e categorias', async () => {
  const { status, body } = await call('GET', '/dashboard');
  assert.equal(status, 200);
  assert.equal(body.projecao.length, body.ciclo.totalDias);
  assert.ok(body.categorias.some(c => c.nome === 'Comida'));
  assert.equal(body.categorias.find(c => c.nome === 'Assinaturas').status, 'estourou');
});

test('novo gasto entra no ciclo e reduz o livre', async () => {
  const antes = (await call('GET', '/dashboard')).body.livre;
  const cats = (await call('GET', '/categorias')).body.categorias;
  const r = await call('POST', '/lancamentos', {
    titulo: 'Padaria',
    valor: '12,50',
    categoriaId: cats[0].id
  });
  assert.equal(r.status, 201);
  const depois = (await call('GET', '/dashboard')).body.livre;
  assert.equal(Math.round((antes - depois) * 100) / 100, 12.5);
});

test('gasto sem categoria é recusado', async () => {
  const r = await call('POST', '/lancamentos', { titulo: 'X', valor: 10 });
  assert.equal(r.status, 400);
});

test('comparar mercados ordena do mais barato e marca o melhor', async () => {
  const { body } = await call('GET', '/mercados/comparar?produto=arroz');
  assert.equal(body.produto, 'Arroz branco 5kg');
  const precos = body.mercados.filter(m => m.preco != null).map(m => m.preco);
  assert.deepEqual(
    precos,
    [...precos].sort((a, b) => a - b)
  );
  assert.equal(body.mercados[0].melhor, true);
});

test('lista: adicionar, quantidade e totais por mercado', async () => {
  let { body } = await call('POST', '/lista', { nome: 'feijão carioca' });
  const item = body.itens.find(i => i.nome === 'feijão carioca');
  assert.equal(item.produtoDaNota, 'Feijão carioca 1kg');
  ({ body } = await call('PATCH', `/lista/${item.id}`, { qtd: 3 }));
  assert.equal(body.itens.find(i => i.id === item.id).qtd, 3);
  assert.ok(body.totais.length > 0);
  assert.ok(body.totais[0].total <= body.totais[body.totais.length - 1].total);
});

test('cadastro guiado cria categorias, fixos e a renda do ciclo', async () => {
  const reg = await call(
    'POST',
    '/auth/cadastrar',
    { nome: 'Bia', email: `bia${Date.now()}@x.com`, senha: '12345678' },
    null
  );
  assert.equal(reg.status, 201);
  const tk = reg.body.token;
  const sug = await call(
    'POST',
    '/onboarding/sugestao',
    { rendaFixa: 4200, rendaVariavel: 600, fixos: [{ valor: 2114 }] },
    tk
  );
  assert.equal(sug.body.disponivel, 2686);
  assert.equal(sug.body.reservado, 2455);
  const r = await call(
    'POST',
    '/onboarding',
    {
      renda: { rendaFixa: 3000, diaVirada: 1 },
      fixos: [{ nome: 'Aluguel', categoria: 'Casa', dia: 1, valor: 1000 }],
      categorias: sug.body.categorias,
      local: { raioKm: 5, mercados: ['nagumo'] },
      plano: 'gratis'
    },
    tk
  );
  assert.equal(r.status, 201);
  const cats = (await call('GET', '/categorias', null, tk)).body;
  assert.ok(cats.categorias.some(c => c.nome === 'Casa' && c.limite === 1000));
  const lanc = (await call('GET', '/lancamentos', null, tk)).body;
  assert.equal(lanc.stats.entradas, 3000);
});

test('plano grátis limita metas a 3', async () => {
  const reg = await call(
    'POST',
    '/auth/cadastrar',
    { nome: 'Caio', email: `caio${Date.now()}@x.com`, senha: '12345678' },
    null
  );
  const tk = reg.body.token;
  await call('POST', '/onboarding', { renda: { rendaFixa: 2000 }, plano: 'gratis' }, tk);
  for (let i = 0; i < 3; i++)
    assert.equal((await call('POST', '/metas', { nome: `M${i}`, alvo: 100 }, tk)).status, 201);
  assert.equal((await call('POST', '/metas', { nome: 'M4', alvo: 100 }, tk)).status, 403);
});

test('exportação gera CSV com cabeçalho', async () => {
  const r = await call('GET', '/lancamentos/export');
  assert.match(r.body, /^\uFEFF?data;tipo;descricao;categoria;valor;origem;quem/);
});
