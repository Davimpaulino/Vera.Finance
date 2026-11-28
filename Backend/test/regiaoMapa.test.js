import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

await import('./apoio/ambiente.js');

// Pedido ao mapa de mercados (Overpass) no RegiaoModel: a consulta, as tentativas por servidor e o
// registro de cada uma (só para quem pede, como o script das cidades). Fetch de mentira.
let respostas = [];
let pedidos = [];
globalThis.fetch = async (endereco, opcoes = {}) => {
  const url = new URL(String(endereco));
  if (!url.pathname.endsWith('/interpreter')) throw new Error(`fetch inesperado: ${url}`);
  pedidos.push({ servidor: url.hostname, corpo: decodeURIComponent(String(opcoes.body)), opcoes });
  const proxima = respostas.shift();
  if (proxima instanceof Error) throw proxima;
  const { status = 200, corpo = { elements: [] } } = proxima || {};
  return { ok: status < 400, status, json: async () => corpo };
};

const { RegiaoModel, consultaDosMercados } = await import('../src/models/RegiaoModel.js');

const MERCADO = { type: 'node', id: 1, lat: -23.5505, lon: -46.6333, tags: { shop: 'supermarket', name: 'Mercado' } };
// Cada teste num ponto diferente, para não reaproveitar a região de outro.
let n = 0;
const ponto = () => ({ lat: -23.5505 - (n += 0.05), lng: -46.6333 });

beforeEach(() => {
  respostas = [];
  pedidos = [];
});

test('a consulta do app continua a mesma: círculo, [timeout:25] e sem [maxsize]', () => {
  assert.equal(
    consultaDosMercados({ lat: -23.55052, lng: -46.63331 }, 15),
    '[out:json][timeout:25];(nwr[shop=supermarket](around:15150,-23.551,-46.633);nwr[shop=wholesale](around:15150,-23.551,-46.633););out center tags;'
  );
});

test('a consulta em retângulo cobre o círculo inteiro e leva os limites pedidos', () => {
  const consulta = consultaDosMercados({ lat: -23.55, lng: -46.63 }, 15, {
    forma: 'caixa',
    timeoutS: 90,
    maxsize: 134217728
  });
  assert.match(consulta, /^\[out:json\]\[timeout:90\]\[maxsize:134217728\];nwr\["shop"~"\^\(supermarket\|wholesale\)\$"\]\(/);
  assert.match(consulta, /out center tags qt;$/);
  const [sul, oeste, norte, leste] = consulta.match(/\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/).slice(1).map(Number);
  // 15,15 km para cada lado: ~0,136° de latitude e ~0,149° de longitude em São Paulo.
  assert.ok(sul < -23.55 - 0.136 && norte > -23.55 + 0.136, `${sul} ${norte}`);
  assert.ok(oeste < -46.63 - 0.148 && leste > -46.63 + 0.148, `${oeste} ${leste}`);
});

test('registrar recebe cada tentativa: servidor, status HTTP ou erro, e tempo', async () => {
  const erroDeRede = new TypeError('fetch failed');
  respostas = [{ status: 504 }, erroDeRede, { corpo: { elements: [MERCADO] } }];
  const linhas = [];
  const mercados = await RegiaoModel.mercadosPerto(ponto(), 5, { guardar: false, registrar: linha => linhas.push(linha) });
  assert.equal(mercados.length, 0, 'o mercado ficou longe do ponto novo');
  assert.deepEqual(
    pedidos.map(pedido => pedido.servidor),
    ['overpass-api.de', 'overpass.kumi.systems', 'overpass-api.de']
  );
  assert.equal(linhas.length, 3);
  assert.match(linhas[0], /^overpass-api\.de: HTTP 504 em \d+,\d s$/);
  assert.equal(linhas[1], 'overpass.kumi.systems: fetch failed');
  assert.match(linhas[2], /^overpass-api\.de: 1 mercado em \d+,\d s$/);
  // Identificação nova do projeto no User-Agent.
  assert.match(pedidos[0].opcoes.headers['User-Agent'], /\(\+https:\/\/github\.com\/Davimpaulino\/Vera\.Finance\)$/);
});

test('tempo esgotado e "runtime error" do Overpass contam como falha', async () => {
  const esgotado = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  respostas = [
    esgotado,
    { corpo: { elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 26 seconds.' } },
    { status: 429 }
  ];
  const linhas = [];
  const mercados = await RegiaoModel.mercadosPerto(ponto(), 5, {
    guardar: false,
    esperaMs: 40_000,
    registrar: linha => linhas.push(linha)
  });
  assert.equal(mercados, null, 'nenhum servidor respondeu de verdade');
  assert.deepEqual(linhas.slice(0, 2), [
    'overpass-api.de: sem resposta em 40,0 s',
    'overpass.kumi.systems: runtime error: Query timed out in "query" at line 1 after 26 seconds. (0,0 s)'
  ]);
  assert.match(linhas[2], /^overpass-api\.de: HTTP 429 em/);
});

test('o app não passa registrar: nada no console, e quem registra com erro não derruba a consulta', async () => {
  const doConsole = console.error;
  const doLog = console.log;
  const escrito = [];
  console.error = console.log = (...partes) => escrito.push(partes.join(' '));
  try {
    respostas = [{ status: 500 }, { corpo: { elements: [] } }];
    assert.deepEqual(await RegiaoModel.mercadosPerto(ponto(), 5), []);
    respostas = [{ status: 500 }, { corpo: { elements: [] } }];
    const quebrado = () => {
      throw new Error('falhou ao escrever');
    };
    assert.deepEqual(await RegiaoModel.mercadosPerto(ponto(), 5, { guardar: false, registrar: quebrado }), []);
  } finally {
    console.error = doConsole;
    console.log = doLog;
  }
  assert.deepEqual(escrito, []);
  // O app pede sempre o círculo, com o teto de 25 s.
  assert.match(pedidos[0].corpo, /^data=\[out:json\]\[timeout:25\];\(nwr\[shop=supermarket\]\(around:5150,/);
});
