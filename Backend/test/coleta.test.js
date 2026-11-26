import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

await import('./apoio/ambiente.js');

// Robô de coleta identificado (COLETA_IDENTIFICADA): user-agent próprio e robots.txt respeitado.
// Tudo com respostas falsas: nenhum pedido sai para a internet.
process.env.SITE_URL = 'https://vera.teste';
delete process.env.COLETA_IDENTIFICADA;

const pedidos = [];
let robots = {};

const resposta = (status, corpo, tipo = 'json') => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => corpo,
  text: async () => (tipo === 'json' ? JSON.stringify(corpo) : corpo)
});

const PAGUE_MENOS = `<div class="item-product" data-id="sku_1"><a href="/arroz-camil-5kg/p" class="item-image"></a>
<form data-json='{"item_id": 1, "item_name": "Arroz Camil Tipo 1 5kg", "item_brand": "Camil", "price": 26.9 }'>
<input type="hidden" value="23.99" name="price"/></form></div>`;

globalThis.fetch = async (endereco, opcoes = {}) => {
  const url = new URL(String(endereco));
  pedidos.push({ url: url.href, agente: opcoes.headers?.['User-Agent'] });
  if (url.pathname === '/robots.txt') {
    const regra = robots[url.host];
    if (regra instanceof Error) throw regra;
    if (!regra) return resposta(404, 'não tem', 'texto');
    return resposta(regra.status || 200, regra.texto, 'texto');
  }
  if (url.host === 'api.tendaatacado.com.br')
    return resposta(200, {
      products: [
        { name: 'Arroz Camil Tipo 1 5kg', brand: 'Camil', barcode: '789001', price: 22.9, availability: 'in_stock' }
      ]
    });
  if (url.host === 'www.superpaguemenos.com.br') return resposta(200, PAGUE_MENOS, 'texto');
  if (url.host === 'www.savegnago.com.br') {
    if (url.pathname.includes('/checkout/pub/regions')) return resposta(200, [{ id: 'v2.X', sellers: [{ id: 'loja1', name: 'Loja' }] }]);
    if (url.pathname.includes('/intelligent-search/'))
      return resposta(200, {
        products: [
          {
            productName: 'Arroz Camil Tipo 1 5kg',
            brand: 'Camil',
            items: [{ itemId: '11', ean: '789001', sellers: [{ sellerId: '1', commertialOffer: { Price: 25, AvailableQuantity: 5 } }] }]
          }
        ]
      });
    if (url.pathname.includes('/orderForms/simulation'))
      return resposta(200, { items: [{ requestIndex: 0, availability: 'available', sellingPrice: 2490, listPrice: 2490 }] });
  }
  throw new Error(`fetch inesperado: ${url}`);
};

const { lerRobots, permitido } = await import('../src/utils/robots.js');
const { ColetaModel, NAVEGADOR, agenteDaColeta } = await import('../src/models/ColetaModel.js');
const { CatalogoModel } = await import('../src/models/CatalogoModel.js');
const { RedeModel } = await import('../src/models/RedeModel.js');

const tenda = RedeModel.buscar('tenda');
const pagueMenos = RedeModel.buscar('paguemenos');
const savegnago = RedeModel.buscar('savegnago');
const ROBO = 'vera.finance-bot/1.0 (+https://vera.teste/robo)';
const pedidosA = host => pedidos.filter(p => new URL(p.url).host === host && !p.url.endsWith('/robots.txt'));
const robotsPedidos = host => pedidos.filter(p => p.url === `https://${host}/robots.txt`);

beforeEach(() => {
  pedidos.length = 0;
  robots = {};
  CatalogoModel.limparCache();
  ColetaModel.limparCache();
  delete process.env.COLETA_IDENTIFICADA;
});

test('robots.txt: grupo do robô, "*" na falta dele, regra mais longa e Allow no empate', () => {
  const grupos = lerRobots(`# comentário
User-agent: *
Disallow: /api/
Allow: /api/publica/
Disallow: /*.pdf$

User-agent: OutroRobo
User-agent: vera.finance-bot/2.0
Disallow: /busca
Allow: /busca/arroz

user-agent: alguem
disallow:
`);
  // Sem grupo próprio, vale o "*".
  assert.equal(permitido(grupos, 'robo-qualquer', '/api/produtos?q=arroz'), false);
  assert.equal(permitido(grupos, 'robo-qualquer', '/api/publica/x'), true, 'Allow mais longo ganha');
  assert.equal(permitido(grupos, 'robo-qualquer', '/manual.pdf'), false);
  assert.equal(permitido(grupos, 'robo-qualquer', '/manual.pdf?v=1'), true, '$ prende o fim');
  assert.equal(permitido(grupos, 'robo-qualquer', '/'), true);
  // Com grupo próprio (nome sem diferenciar maiúsculas nem versão), o "*" deixa de valer.
  assert.equal(permitido(grupos, 'Vera.Finance-Bot', '/api/produtos'), true);
  assert.equal(permitido(grupos, 'vera.finance-bot', '/busca?q=feijao'), false);
  assert.equal(permitido(grupos, 'vera.finance-bot', '/busca/arroz'), true);
  // "Disallow:" vazio não proíbe nada.
  assert.equal(permitido(grupos, 'alguem', '/qualquer'), true);
  assert.equal(permitido(lerRobots(''), 'vera.finance-bot', '/api'), true, 'arquivo vazio libera');
  assert.equal(
    permitido(lerRobots('User-agent: *\nDisallow: /\nAllow: /'), 'x', '/a'),
    true,
    'empate de tamanho fica com o Allow'
  );
});

test('coleta desligada (padrão): user-agent de navegador e nenhum robots.txt baixado', async () => {
  assert.equal(agenteDaColeta(), NAVEGADOR);
  const r = await CatalogoModel.buscar(tenda, 'arroz 5kg');
  assert.equal(r.situacao, 'ok');
  assert.equal(r.produtos[0].preco, 22.9);
  assert.equal(pedidosA('api.tendaatacado.com.br')[0].agente, NAVEGADOR);
  assert.equal(pedidos.filter(p => p.url.endsWith('/robots.txt')).length, 0);
});

test('coleta identificada: user-agent do robô e robots.txt guardado por 24 h', async () => {
  process.env.COLETA_IDENTIFICADA = '1';
  robots['api.tendaatacado.com.br'] = { texto: 'User-agent: *\nDisallow: /privado/' };
  const primeira = await CatalogoModel.buscar(tenda, 'arroz 5kg');
  const segunda = await CatalogoModel.buscar(tenda, 'feijao');
  assert.equal(primeira.situacao, 'ok');
  assert.equal(segunda.situacao, 'ok');
  assert.ok(pedidosA('api.tendaatacado.com.br').every(p => p.agente === ROBO));
  assert.equal(robotsPedidos('api.tendaatacado.com.br').length, 1, 'baixa o robots.txt uma vez só');
  assert.equal(robotsPedidos('api.tendaatacado.com.br')[0].agente, ROBO);

  // Passadas 24 h, baixa de novo.
  const agora = Date.now;
  Date.now = () => agora() + 25 * 60 * 60 * 1000;
  try {
    await CatalogoModel.buscar(tenda, 'cafe');
  } finally {
    Date.now = agora;
  }
  assert.equal(robotsPedidos('api.tendaatacado.com.br').length, 2);
});

test('caminho bloqueado para "*": não consulta e a rede fica como falhou', async () => {
  process.env.COLETA_IDENTIFICADA = 'sim';
  robots['api.tendaatacado.com.br'] = { texto: 'User-agent: *\nDisallow: /api/' };
  const r = await CatalogoModel.buscar(tenda, 'arroz 5kg');
  assert.deepEqual(r, { situacao: 'falhou', produtos: [] });
  assert.equal(pedidosA('api.tendaatacado.com.br').length, 0, 'a API não foi chamada');
});

test('caminho bloqueado para o nosso robô: não consulta, mesmo com "*" liberado', async () => {
  process.env.COLETA_IDENTIFICADA = '1';
  robots['www.superpaguemenos.com.br'] = {
    texto: 'User-agent: *\nAllow: /\n\nUser-agent: vera.finance-bot\nDisallow: /busca/'
  };
  const r = await CatalogoModel.buscar(pagueMenos, 'arroz 5kg');
  assert.equal(r.situacao, 'falhou');
  assert.equal(pedidosA('www.superpaguemenos.com.br').length, 0);

  // Bloqueio só para outro robô não atinge a vera.
  ColetaModel.limparCache();
  CatalogoModel.limparCache();
  robots['www.superpaguemenos.com.br'] = { texto: 'User-agent: OutroRobo\nDisallow: /' };
  const liberado = await CatalogoModel.buscar(pagueMenos, 'arroz 5kg');
  assert.equal(liberado.situacao, 'ok');
  assert.equal(liberado.produtos[0].preco, 23.99);
});

test('bloqueio no meio da consulta VTEX (simulação de carrinho) também vira falhou', async () => {
  process.env.COLETA_IDENTIFICADA = '1';
  robots['www.savegnago.com.br'] = {
    texto: 'User-agent: *\nDisallow: /api/checkout/pub/orderForms/'
  };
  const r = await CatalogoModel.buscar(savegnago, 'arroz 5kg', '13334100');
  assert.equal(r.situacao, 'falhou', 'não pode virar "sem entrega" nem "sem produtos"');
  assert.ok(pedidos.some(p => p.url.includes('/checkout/pub/regions')), 'a região é liberada');
  assert.ok(!pedidos.some(p => p.url.includes('/orderForms/')), 'a simulação não foi pedida');

  // Liberado, a mesma busca usa o preço da simulação para o CEP.
  ColetaModel.limparCache();
  CatalogoModel.limparCache();
  robots['www.savegnago.com.br'] = { texto: 'User-agent: *\nDisallow: /minha-conta' };
  const ok = await CatalogoModel.buscar(savegnago, 'arroz 5kg', '13334100');
  assert.equal(ok.situacao, 'ok');
  assert.equal(ok.produtos[0].preco, 24.9);
});

test('sem robots.txt (404) libera; robots.txt fora do ar (5xx ou rede) bloqueia', async () => {
  process.env.COLETA_IDENTIFICADA = '1';
  assert.equal((await CatalogoModel.buscar(tenda, 'arroz 5kg')).situacao, 'ok');

  ColetaModel.limparCache();
  CatalogoModel.limparCache();
  robots['api.tendaatacado.com.br'] = { status: 503, texto: 'fora do ar' };
  assert.equal((await CatalogoModel.buscar(tenda, 'arroz 5kg')).situacao, 'falhou');

  ColetaModel.limparCache();
  CatalogoModel.limparCache();
  robots['api.tendaatacado.com.br'] = new Error('sem rede');
  assert.equal((await CatalogoModel.buscar(tenda, 'arroz 5kg')).situacao, 'falhou');
});
