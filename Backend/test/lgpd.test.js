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
});

test('membro da família recebe os próprios lançamentos feitos no ciclo do dono', async () => {
  await UsuarioModel.criarSeNaoExistir('marina-serra', { nome: 'Marina Serra', email: 'marina@email.com' });
  await UsuarioModel.atualizar('marina-serra', { familiaId: 'casa-serra' });
  const tk = assinarToken({ uid: 'marina-serra', email: 'marina@email.com', nome: 'Marina Serra' });
  const dados = json(await pedir('GET', '/me/exportar', null, tk));
  assert.equal(dados.perfil.email, 'marina@email.com');
  assert.ok(dados.lancamentosNaFamilia.length > 0);
  assert.ok(dados.lancamentosNaFamilia.every(l => l.quemId === 'marina-serra'));
  assert.equal(dados.lancamentos.length, 0);
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

test('a configuração pública informa a versão dos termos', async () => {
  const r = json(await pedir('GET', '/auth/configuracao', null, null));
  assert.equal(r.versaoDosTermos, VERSAO_DOS_TERMOS);
});
