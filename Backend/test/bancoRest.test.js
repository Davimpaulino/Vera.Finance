import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { criarBancoMemoria } from '../src/config/bancoMemoria.js';
import { criarBancoRest } from '../src/config/bancoRest.js';

let servidor;
let banco;
const pedidos = [];

before(async () => {
  const bancoDoServidor = criarBancoMemoria();
  servidor = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const caminho = decodeURIComponent(url.pathname.replace(/\.json$/, '').replace(/^\//, ''));
    pedidos.push({ metodo: req.method, caminho, segredo: url.searchParams.get('auth') });
    let corpo = '';
    for await (const pedaco of req) corpo += pedaco;
    const dados = corpo ? JSON.parse(corpo) : null;
    if (req.method === 'GET') return res.end(JSON.stringify(await bancoDoServidor.ler(caminho)));
    if (req.method === 'PUT') await bancoDoServidor.gravar(caminho, dados);
    if (req.method === 'PATCH') await bancoDoServidor.atualizar(caminho, dados);
    if (req.method === 'DELETE') await bancoDoServidor.remover(caminho);
    res.end(JSON.stringify(dados));
  }).listen(0);
  banco = criarBancoRest({
    url: `http://localhost:${servidor.address().port}`,
    segredo: 'segredo-teste'
  });
});
after(() => servidor.close());

test('banco REST grava, mescla, lista e remove pela API do Realtime Database', async () => {
  await banco.gravar('usuarios/u1/perfil', { nome: 'Ana', prefs: { tema: 'tinta' } });
  await banco.mesclar('usuarios/u1/perfil', { prefs: { avisos: true } });
  assert.deepEqual(await banco.ler('usuarios/u1/perfil'), {
    nome: 'Ana',
    prefs: { tema: 'tinta', avisos: true }
  });
  const id = await banco.adicionar('precos', { produto: 'Arroz', preco: 23.4 });
  assert.deepEqual(await banco.listar('precos'), [{ id, produto: 'Arroz', preco: 23.4 }]);
  await banco.atualizarVarios({ [`precos/${id}`]: null, 'mercados/dia/nome': 'Dia' });
  assert.equal(await banco.ler('precos'), null);
  await banco.remover('usuarios/u1');
  assert.equal(await banco.ler('usuarios/u1'), null);
});

test('banco REST envia o segredo do banco em todo pedido', () => {
  assert.ok(pedidos.length > 0);
  assert.ok(pedidos.every(pedido => pedido.segredo === 'segredo-teste'));
});
