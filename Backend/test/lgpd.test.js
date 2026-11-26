import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

process.env.BANCO = 'memoria';
process.env.NODE_ENV = 'test';
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.FIREBASE_PRIVATE_KEY;
const { handle } = await import('../src/app.js');
const { popularDadosDeTeste, CONTA_DE_TESTE } = await import('./apoio/dadosDeTeste.js');
const { assinarToken } = await import('../src/middlewares/auth.js');
const { UsuarioModel } = await import('../src/models/UsuarioModel.js');
const { VERSAO_DOS_TERMOS } = await import('../src/config/termos.js');

let server;
let base;
let token;

const pedir = async (metodo, caminho, corpo, tk = token, ip = '10.9.0.1') => {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
      ...(tk ? { Authorization: `Bearer ${tk}` } : {})
    },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const texto = await resposta.text();
  return { status: resposta.status, cabecalhos: resposta.headers, texto };
};
const json = r => JSON.parse(r.texto);

// Procura uma chave em qualquer nível do objeto.
const temChave = (valor, chave) =>
  valor && typeof valor === 'object'
    ? Object.entries(valor).some(([k, v]) => k === chave || temChave(v, chave))
    : false;

before(async () => {
  await popularDadosDeTeste();
  server = createServer(handle).listen(0);
  base = `http://localhost:${server.address().port}/api`;
  token = json(
    await pedir('POST', '/auth/entrar', { email: CONTA_DE_TESTE.email, senha: CONTA_DE_TESTE.senha }, null)
  ).token;
});
after(() => server.close());

test('exportar exige login', async () => {
  const r = await pedir('GET', '/me/exportar', null, null);
  assert.equal(r.status, 401);
});

test('exportar devolve um JSON para baixar com perfil e lançamentos, sem hash nem sal', async () => {
  const r = await pedir('GET', '/me/exportar');
  assert.equal(r.status, 200);
  assert.match(r.cabecalhos.get('content-type'), /application\/json/);
  assert.match(r.cabecalhos.get('content-disposition'), /attachment; filename="vera-meus-dados.json"/);
  const dados = json(r);
  assert.equal(dados.perfil.email, CONTA_DE_TESTE.email);
  assert.equal(dados.perfil.nome, CONTA_DE_TESTE.nome);
  assert.ok(dados.lancamentos.length > 10);
  assert.ok(dados.lancamentos.some(l => l.titulo === 'Freela de design'));
  assert.ok(dados.categorias.some(c => c.nome === 'Comida'));
  assert.ok(dados.metas.length && dados.lista.length && dados.notas.length && dados.fixos.length);
  assert.equal(temChave(dados, 'hash'), false);
  assert.equal(temChave(dados, 'sal'), false);
  assert.doesNotMatch(r.texto, /"hash"|"sal"/);
});

test('exportar não leva dados de outras pessoas: só nome e papel dos membros', async () => {
  const dados = json(await pedir('GET', '/me/exportar'));
  assert.deepEqual(dados.familia, {
    nome: 'Casa Serra',
    membros: [
      { nome: CONTA_DE_TESTE.nome, papel: 'dono' },
      { nome: 'Marina Serra', papel: 'membro' }
    ]
  });
  assert.ok(dados.lancamentos.every(l => !l.quemId || l.quemId === CONTA_DE_TESTE.uid));
  // E-mails de convidados e lançamentos da outra pessoa ficam de fora.
  assert.doesNotMatch(JSON.stringify(dados), /lucas@email\.com/);
  assert.equal(dados.lancamentosNaFamilia.length, 0);
  assert.equal(dados.notasNaFamilia.length + dados.listaNaFamilia.length + dados.aportesNaFamilia.length, 0);
});

const MARINA = { uid: 'marina-serra', email: 'marina@email.com', nome: 'Marina Serra' };
const tokenDaMarina = () => assinarToken(MARINA);

test('membro da família recebe os próprios lançamentos feitos no ciclo do dono', async () => {
  await UsuarioModel.criarSeNaoExistir(MARINA.uid, {
    nome: MARINA.nome,
    email: MARINA.email,
    termosAceitos: { versao: VERSAO_DOS_TERMOS, em: new Date().toISOString() }
  });
  await UsuarioModel.atualizar(MARINA.uid, { familiaId: 'casa-serra' });
  const dados = json(await pedir('GET', '/me/exportar', null, tokenDaMarina()));
  assert.equal(dados.perfil.email, MARINA.email);
  assert.ok(dados.lancamentosNaFamilia.length > 0);
  assert.ok(dados.lancamentosNaFamilia.every(l => l.quemId === MARINA.uid));
  assert.equal(dados.lancamentos.length, 0);
});

// Página mínima da Sefaz, para a leitura da nota não sair para a internet.
const QR_DA_MARINA =
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35261012345678000190650010000999991000099999|2|1|1|ABC';
const PAGINA_DA_NOTA = `<div id="u20" class="txtTopo">FEIRA DA MARINA LTDA</div>
<div class="text">CNPJ: 12.345.678/0001-90</div>
<table id="tabResult"><tr id="Item + 1"><td><span class="txtTit">PAO DE FORMA 500G</span>
<span class="Rqtd"><strong>Qtde.:</strong>1</span><span class="RvlUnit"><strong>Vl. Unit.:</strong>&nbsp;9,90</span></td>
<td><span class="valor">9,90</span></td></tr></table>
<span class="totalNumb txtMax">9,90</span>`;

test('no modo família, nota lida, item da lista e aporte vão para a exportação de quem fez', async () => {
  const fetchDeVerdade = globalThis.fetch;
  globalThis.fetch = (endereco, opcoes) =>
    String(endereco) === QR_DA_MARINA
      ? Promise.resolve(new Response(PAGINA_DA_NOTA, { headers: { 'content-type': 'text/html' } }))
      : /^https?:\/\/localhost[:/]/.test(String(endereco))
        ? fetchDeVerdade(endereco, opcoes)
        : Promise.reject(new Error('sem internet nos testes'));
  try {
    const tk = tokenDaMarina();
    assert.equal((await pedir('POST', '/notas/ler', { endereco: QR_DA_MARINA }, tk)).status, 201);
    assert.equal((await pedir('POST', '/lista', { nome: 'pão de forma da Marina' }, tk)).status, 201);
    assert.equal((await pedir('POST', '/metas/viagem/aportes', { valor: 50 }, tk)).status, 200);
  } finally {
    globalThis.fetch = fetchDeVerdade;
  }

  // Tudo fica no espaço do dono, mas o dono não leva o que a Marina fez.
  const doDono = json(await pedir('GET', '/me/exportar'));
  assert.ok(doDono.notas.length > 0 && doDono.notas.every(n => !n.quemId || n.quemId === CONTA_DE_TESTE.uid));
  assert.ok(!doDono.notas.some(n => n.estabelecimento === 'FEIRA DA MARINA LTDA'));
  assert.ok(doDono.lista.length > 0 && !doDono.lista.some(i => i.nome === 'pão de forma da Marina'));
  const viagem = doDono.metas.find(m => m.id === 'viagem');
  assert.ok(viagem.aportes.length > 0 && viagem.aportes.every(a => a.quemId !== MARINA.uid));

  // A Marina leva a nota, o item e o aporte que fez no espaço do dono.
  const daMarina = json(await pedir('GET', '/me/exportar', null, tokenDaMarina()));
  assert.deepEqual(
    daMarina.notasNaFamilia.map(n => [n.estabelecimento, n.valor, n.quemId]),
    [['FEIRA DA MARINA LTDA', 9.9, MARINA.uid]]
  );
  assert.deepEqual(daMarina.listaNaFamilia.map(i => i.nome), ['pão de forma da Marina']);
  assert.equal(daMarina.aportesNaFamilia.length, 1);
  assert.equal(daMarina.aportesNaFamilia[0].meta, 'Viagem em janeiro');
  assert.equal(daMarina.aportesNaFamilia[0].valor, 50);
  assert.equal(daMarina.metas.length + daMarina.lista.length + daMarina.notas.length, 0);
});

test('cadastro com aceite grava a versão dos termos e a data no perfil', async () => {
  const r = await pedir(
    'POST',
    '/auth/cadastrar',
    { nome: 'Ana', email: 'ana-aceite@email.com', senha: 'senha-boa-1', aceite: { versao: VERSAO_DOS_TERMOS } },
    null,
    '10.9.1.1'
  );
  assert.equal(r.status, 201);
  const me = json(await pedir('GET', '/me', null, json(r).token));
  assert.equal(me.versaoDosTermos, VERSAO_DOS_TERMOS);
  assert.equal(me.termosAceitos.versao, VERSAO_DOS_TERMOS);
  assert.ok(Math.abs(Date.now() - new Date(me.termosAceitos.em).getTime()) < 60000);
});

test('cadastro sem aceite é recusado e não cria a conta', async () => {
  const r = await pedir(
    'POST',
    '/auth/cadastrar',
    { nome: 'Bia', email: 'bia-sem-aceite@email.com', senha: 'senha-boa-1' },
    null,
    '10.9.1.2'
  );
  assert.equal(r.status, 400);
  assert.match(json(r).erro, /18 anos/);
  const emUso = json(await pedir('POST', '/auth/email-em-uso', { email: 'bia-sem-aceite@email.com' }, null));
  assert.equal(emUso.emUso, false);
});

test('cadastro com uma versão dos termos que não está em vigor é recusado', async () => {
  const r = await pedir(
    'POST',
    '/auth/cadastrar',
    { nome: 'Rui', email: 'rui-versao@email.com', senha: 'senha-boa-1', aceite: { versao: 'qualquer' } },
    null,
    '10.9.1.3'
  );
  assert.equal(r.status, 400);
  assert.match(json(r).erro, /Recarregue a página/);
});

test('sessão com uma versão que não está em vigor não grava aceite', async () => {
  const tk = assinarToken({ uid: 'google-versao-falsa', email: 'falsa@gmail.com', nome: 'Davi' });
  const r = await pedir('POST', '/auth/sessao', { aceite: { versao: 'v1999-01-01' } }, tk);
  assert.equal(r.status, 400);
  assert.equal(await UsuarioModel.buscar('google-versao-falsa'), null);
  const semAceite = json(await pedir('POST', '/auth/sessao', {}, tk));
  assert.equal(semAceite.termosAceitos, undefined);
});

test('sessão (Google/Apple) com aceite grava o aceite no perfil novo', async () => {
  const tk = assinarToken({ uid: 'google-novo', email: 'novo@gmail.com', nome: 'Caio' });
  const r = await pedir('POST', '/auth/sessao', { aceite: { versao: VERSAO_DOS_TERMOS } }, tk);
  assert.equal(r.status, 200);
  assert.equal(json(r).termosAceitos.versao, VERSAO_DOS_TERMOS);
  // Sessões seguintes, sem aceite, não apagam o registro.
  await pedir('POST', '/auth/sessao', {}, tk);
  const perfil = await UsuarioModel.buscar('google-novo');
  assert.equal(perfil.termosAceitos.versao, VERSAO_DOS_TERMOS);
});

test('sem o aceite em vigor o app não abre, mas perfil, dados e exclusão seguem livres', async () => {
  // Conta nova pelo Google na tela Entrar: a sessão abre sem aceite.
  const tk = assinarToken({ uid: 'google-sem-aceite', email: 'sem-aceite@gmail.com', nome: 'Edu' });
  assert.equal((await pedir('POST', '/auth/sessao', {}, tk)).status, 200);
  for (const [metodo, caminho, corpo] of [
    ['GET', '/dashboard'],
    ['GET', '/lista'],
    ['POST', '/lista', { nome: 'arroz' }],
    ['POST', '/onboarding', { renda: { rendaFixa: 2000 }, plano: 'gratis' }],
    ['PATCH', '/me', { nome: 'Outro' }]
  ]) {
    const r = await pedir(metodo, caminho, corpo, tk);
    assert.equal(r.status, 403, `${metodo} ${caminho}`);
    assert.equal(json(r).detalhes.motivo, 'termos');
  }
  const me = json(await pedir('GET', '/me', null, tk));
  assert.equal(me.termosAceitos, null);
  assert.equal((await pedir('GET', '/me/exportar', null, tk)).status, 200);
  assert.equal((await pedir('GET', '/lancamentos/export', null, tk)).status, 200);

  // Depois do aceite, o app abre.
  await pedir('POST', '/auth/sessao', { aceite: { versao: VERSAO_DOS_TERMOS } }, tk);
  assert.equal((await pedir('GET', '/lista', null, tk)).status, 200);
  assert.equal((await pedir('DELETE', '/me', null, tk)).status, 200);
});

test('aceite de uma versão anterior também pede o aceite de novo', async () => {
  await UsuarioModel.criarSeNaoExistir('aceite-antigo', {
    nome: 'Flor',
    email: 'flor@email.com',
    termosAceitos: { versao: 'v2025-01-01', em: '2025-01-01T00:00:00.000Z' }
  });
  const tk = assinarToken({ uid: 'aceite-antigo', email: 'flor@email.com', nome: 'Flor' });
  assert.equal((await pedir('GET', '/lista', null, tk)).status, 403);
  const perfil = json(await pedir('POST', '/auth/sessao', { aceite: { versao: VERSAO_DOS_TERMOS } }, tk));
  assert.equal(perfil.termosAceitos.versao, VERSAO_DOS_TERMOS);
  assert.equal((await pedir('GET', '/lista', null, tk)).status, 200);
});

test('a configuração pública informa a versão dos termos', async () => {
  const r = json(await pedir('GET', '/auth/configuracao', null, null));
  assert.equal(r.versaoDosTermos, VERSAO_DOS_TERMOS);
});
