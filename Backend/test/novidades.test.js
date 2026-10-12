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
const { interpretarPagina, validarEndereco, chaveDoEndereco } = await import(
  '../src/models/NfceModel.js'
);
const { GeoModel } = await import('../src/models/GeoModel.js');

let server;
let base;
let token;

const chamar = async (metodo, caminho, corpo, tk = token) => {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(tk ? { Authorization: `Bearer ${tk}` } : {})
    },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const texto = await resposta.text();
  return { status: resposta.status, body: texto ? JSON.parse(texto) : null };
};

before(async () => {
  await popularDadosDeTeste();
  server = createServer(handle).listen(0);
  base = `http://localhost:${server.address().port}/api`;
  token = (
    await chamar('POST', '/auth/entrar', { email: 'demo@vera.finance', senha: 'vera1234' }, null)
  ).body.token;
});
after(() => server.close());

const PAGINA = `<div id="u20" class="txtTopo">SUPERMERCADO EXEMPLO LTDA</div>
<div class="text">CNPJ: 12.345.678/0001-90</div>
<div class="text">RUA DAS FLORES, 100, , CENTRO, LIMEIRA, SP</div>
<table id="tabResult">
<tr id="Item + 1"><td><span class="txtTit">ARROZ TIPO 1 5KG</span><span class="RCod">(Código: 789100 )</span>
<span class="Rqtd"><strong>Qtde.:</strong>2</span><span class="RUN"><strong>UN: </strong>UN</span>
<span class="RvlUnit"><strong>Vl. Unit.:</strong>&nbsp;24,90</span></td>
<td class="txtTit noWrap">Vl. Total<br><span class="valor">49,80</span></td></tr>
<tr id="Item + 2"><td><span class="txtTit">DETERGENTE LIQUIDO 500ML</span>
<span class="Rqtd"><strong>Qtde.:</strong>1</span><span class="RvlUnit"><strong>Vl. Unit.:</strong>&nbsp;2,49</span></td>
<td><span class="valor">2,49</span></td></tr></table>
<span class="totalNumb txtMax">52,29</span>
<li><strong>Emissão: </strong>10/10/2026 18:22:10 - Via Consumidor</li>`;

test('NFC-e: lê emitente, itens, preços, total e data da página da Sefaz', () => {
  const nota = interpretarPagina(PAGINA, '3'.repeat(44));
  assert.equal(nota.estabelecimento, 'SUPERMERCADO EXEMPLO LTDA');
  assert.equal(nota.cnpj, '12345678000190');
  assert.equal(nota.endereco, 'RUA DAS FLORES, 100, CENTRO, LIMEIRA, SP');
  assert.equal(nota.itens.length, 2);
  assert.deepEqual(
    nota.itens.map(item => [item.produto, item.quantidade, item.preco, item.categoria]),
    [
      ['Arroz Tipo 1 5kg', 2, 24.9, 'Comida'],
      ['Detergente Liquido 500ml', 1, 2.49, 'Limpeza']
    ]
  );
  assert.equal(nota.valor, 52.29);
  assert.equal(nota.compradoEm, '2026-10-10T21:22:10.000Z');
});

test('NFC-e: só aceita link da Sefaz e acha a chave de 44 números', () => {
  const url = validarEndereco(
    'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35261012345678000190650010000123451000123456|2|1|1|ABC'
  );
  assert.equal(chaveDoEndereco(url), '35261012345678000190650010000123451000123456');
  assert.throws(() => validarEndereco('http://169.254.169.254/latest'), /Sefaz/);
  assert.throws(() => validarEndereco('não é link'), /NFC-e/);
});

test('ler nota recusa link que não é da Sefaz', async () => {
  const r = await chamar('POST', '/notas/ler', { endereco: 'https://exemplo.com/nota' });
  assert.equal(r.status, 400);
});

test('distância entre dois pontos em km', () => {
  const se = { lat: -23.5503, lng: -46.6339 };
  const paulista = { lat: -23.5614, lng: -46.6559 };
  assert.equal(GeoModel.distanciaKm(se, paulista), 2.6);
  assert.equal(GeoModel.distanciaKm(se, null), null);
});

test('token com cara de Firebase mas inválido é recusado', async () => {
  const r = await chamar('GET', '/me', null, 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0.assinatura');
  assert.equal(r.status, 401);
});

test('notificações levam para a página certa e podem ser marcadas como vistas', async () => {
  const { status, body } = await chamar('GET', '/notificacoes');
  assert.equal(status, 200);
  const nota = body.notificacoes.find(n => n.tipo === 'nota');
  assert.ok(nota.notaId);
  const limite = body.notificacoes.find(n => n.tipo === 'limite');
  assert.equal(limite.destino, '/app/metas');
  assert.equal(body.naoVistas, body.notificacoes.length);

  const depois = await chamar('POST', '/notificacoes/vistas', { ids: [nota.id] });
  assert.equal(depois.body.naoVistas, body.naoVistas - 1);
  assert.equal(depois.body.notificacoes.find(n => n.id === nota.id).vista, true);
});

test('metas: editar, guardar, retirar e excluir', async () => {
  const meta = (await chamar('GET', '/metas')).body.metas[0];
  const editada = await chamar('PATCH', `/metas/${meta.id}`, {
    nome: 'Viagem de fim de ano',
    icon: 'plane',
    alvo: 6000
  });
  assert.equal(editada.body.nome, 'Viagem de fim de ano');
  assert.equal(editada.body.alvo, 6000);

  const retirada = await chamar('POST', `/metas/${meta.id}/aportes`, { valor: -100 });
  assert.equal(retirada.body.guardado, meta.guardado - 100);
  const demais = await chamar('POST', `/metas/${meta.id}/aportes`, { valor: -999999 });
  assert.equal(demais.status, 400);

  assert.equal((await chamar('DELETE', `/metas/${meta.id}`)).status, 204);
  const restantes = (await chamar('GET', '/metas')).body.metas;
  assert.ok(!restantes.some(m => m.id === meta.id));
});

test('trocar senha confere a atual e passa a valer a nova', async () => {
  const errada = await chamar('POST', '/me/senha', { atual: 'errada123', nova: 'novaSenha1' });
  assert.equal(errada.status, 401);
  const certa = await chamar('POST', '/me/senha', { atual: 'vera1234', nova: 'novaSenha1' });
  assert.equal(certa.status, 204);
  const entrar = await chamar(
    'POST',
    '/auth/entrar',
    { email: 'demo@vera.finance', senha: 'novaSenha1' },
    null
  );
  assert.ok(entrar.body.token);
  await chamar('POST', '/me/senha', { atual: 'novaSenha1', nova: 'vera1234' });
});
