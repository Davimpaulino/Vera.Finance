import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('./apoio/ambiente.js');
delete process.env.COLETA_IDENTIFICADA;
delete process.env.CEP_DE_TESTE;

// Monitor de saúde das redes com respostas falsas dos sites: um caso de cada situação.
const resposta = (status, corpo, tipo = 'json') => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => corpo,
  text: async () => (tipo === 'json' ? JSON.stringify(corpo) : corpo)
});
const produtoVtex = (itemId, nome, preco) => ({
  productName: nome,
  brand: 'Camil',
  items: [{ itemId, ean: `789${itemId}`, sellers: [{ sellerId: '1', commertialOffer: { Price: preco, AvailableQuantity: 5 } }] }]
});
const pedidos = [];

globalThis.fetch = async (endereco, opcoes = {}) => {
  const url = new URL(String(endereco));
  pedidos.push(url.href);
  if (url.host === 'www.savegnago.com.br') {
    if (url.pathname.includes('/regions')) return resposta(200, [{ id: 'v2.X', sellers: [{ id: 'loja1', name: 'Loja' }] }]);
    if (url.pathname.includes('/intelligent-search/'))
      return resposta(200, { products: [produtoVtex('1', 'Arroz Camil 5kg', 25), produtoVtex('2', 'Arroz Camil 1kg', 6)] });
    if (url.pathname.includes('/simulation')) {
      const { items: itens, postalCode } = JSON.parse(opcoes.body);
      pedidos.push(`simulação para ${postalCode}`);
      return resposta(200, {
        items: itens.map((_, requestIndex) => ({ requestIndex, availability: 'available', sellingPrice: 2500 }))
      });
    }
  }
  if (url.host === 'www.zaffari.com.br') {
    // Não atende o CEP de teste, mas o catálogo nacional está de pé.
    if (url.pathname.includes('/regions')) return resposta(200, []);
    if (url.pathname.includes('/catalog_system/')) return resposta(200, [produtoVtex('9', 'Arroz Zaffari 5kg', 27)]);
    if (url.pathname.includes('/simulation'))
      return resposta(200, { items: [{ requestIndex: 0, availability: 'cannotBeDelivered' }] });
  }
  if (url.host === 'api.tendaatacado.com.br') return resposta(500, { erro: 'fora do ar' });
  // Página de busca sem nenhum produto: o leitor não acha nada (mudou o HTML?).
  if (url.host === 'www.superpaguemenos.com.br') return resposta(200, '<html><body>nada</body></html>', 'texto');
  throw new Error(`fetch inesperado: ${url}`);
};

const { verificarRede, verificarRedes, formatarTabela, principal } = await import(
  '../scripts/saude-das-redes.mjs'
);
const { RedeModel } = await import('../src/models/RedeModel.js');

const redes = ['savegnago', 'zaffari', 'tenda', 'paguemenos'].map(id => RedeModel.buscar(id));
const porId = resultados => Object.fromEntries(resultados.map(r => [r.id, r]));

test('classifica cada rede: ok, sem entrega no CEP, erro e sem produtos', async () => {
  const r = porId(await verificarRedes(redes, { termo: 'arroz', cep: '01310100' }));
  assert.equal(r.savegnago.estado, 'ok');
  assert.equal(r.savegnago.produtos, 2);
  assert.equal(r.zaffari.estado, 'semEntrega');
  assert.match(r.zaffari.detalhe, /catálogo nacional respondeu com 1 produtos/);
  assert.equal(r.tenda.estado, 'erro');
  assert.match(r.tenda.detalhe, /HTTP 500/);
  assert.equal(r.paguemenos.estado, 'semProdutos');
  for (const item of Object.values(r)) assert.ok(Number.isInteger(item.ms) && item.ms >= 0);
  assert.ok(pedidos.includes('simulação para 01310100'), 'o preço vem da simulação para o CEP');
});

test('plataforma sem leitor e rede que trava viram erro, sem derrubar o monitor', async () => {
  const estranha = { id: 'x', nome: 'Rede X', plataforma: 'nenhuma' };
  assert.equal((await verificarRede(estranha)).estado, 'erro');
  const travada = { id: 'y', nome: 'Rede Y', plataforma: 'lenta' };
  const leitores = { lenta: { buscar: () => new Promise(() => {}) } };
  const r = await verificarRede(travada, { leitores, limiteMs: 20 });
  assert.equal(r.estado, 'erro');
  assert.match(r.detalhe, /passou de/);
});

test('tabela: cabeçalho, uma linha por rede e resumo com as quebradas', async () => {
  const resultados = await verificarRedes(redes, { termo: 'arroz', cep: '01310100' });
  const linhas = formatarTabela(resultados, { termo: 'arroz', cep: '01310100' }).split('\n');
  assert.match(linhas[0], /^Saúde das redes · busca "arroz" · CEP 01310-100 · user-agent de navegador$/);
  assert.match(linhas[2], /^rede\s+plataforma\s+situação\s+produtos\s+tempo\s+detalhe$/);
  const linhaDe = nome => linhas.find(linha => linha.startsWith(nome));
  assert.match(linhaDe('Savegnago'), /^Savegnago\s+vtex\s+ok\s+2\s+\d+,\d s$/);
  assert.match(linhaDe('Zaffari'), /sem entrega no CEP\s+0\s+\d+,\d s\s+catálogo nacional/);
  assert.match(linhaDe('Tenda Atacado'), /erro\s+0\s+\d+,\d s\s+HTTP 500/);
  assert.match(linhaDe('Pague Menos'), /sem produtos/);
  // As colunas ficam alinhadas: "plataforma" começa na mesma posição em todas as linhas.
  const coluna = linhas[2].indexOf('plataforma');
  for (const nome of ['Savegnago', 'Zaffari', 'Tenda Atacado', 'Pague Menos'])
    assert.equal(linhaDe(nome).search(/vtex|tenda|paguemenos/), coluna, nome);
  assert.equal(
    linhas.at(-2),
    '4 redes: 1 ok, 1 sem entrega no CEP, 1 sem produtos, 1 com erro.'
  );
  assert.equal(linhas.at(-1), 'Quebradas: Tenda Atacado, Pague Menos.');
});

test('código de saída: 1 com rede quebrada, 0 sem nenhuma, 2 com opção errada', async () => {
  const saida = [];
  const escrever = texto => saida.push(texto);
  assert.equal(await principal(['--termo=arroz'], { redes, escrever }), 1);
  assert.match(saida.join('\n'), /Quebradas: Tenda Atacado, Pague Menos/);

  saida.length = 0;
  assert.equal(await principal(['--redes=savegnago,zaffari'], { redes, escrever }), 0);
  assert.match(saida.join('\n'), /2 redes: 1 ok, 1 sem entrega no CEP, 0 sem produtos, 0 com erro\./);
  assert.match(saida.join('\n'), /Nenhuma rede quebrada\./);

  assert.equal(await principal(['--cep=123'], { redes, escrever }), 2);
  assert.equal(await principal(['--redes=nao-existe'], { redes, escrever }), 2);
  assert.equal(await principal(['--termo=a'], { redes, escrever }), 2);
});

test('CEP de teste vem de --cep ou de CEP_DE_TESTE', async () => {
  pedidos.length = 0;
  process.env.CEP_DE_TESTE = '04538-133';
  try {
    assert.equal(await principal(['--redes=savegnago'], { redes, escrever: () => {} }), 0);
  } finally {
    delete process.env.CEP_DE_TESTE;
  }
  assert.ok(pedidos.some(p => p.includes('postalCode=04538133')));
  assert.ok(pedidos.includes('simulação para 04538133'));
  pedidos.length = 0;
  assert.equal(await principal(['--redes=savegnago', '--cep=20040-002'], { redes, escrever: () => {} }), 0);
  assert.ok(pedidos.includes('simulação para 20040002'));
});
