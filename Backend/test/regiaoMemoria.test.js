import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('./apoio/ambiente.js');

// Memória das regiões do mapa (RegiaoModel): tem teto, e a região que sai volta do banco.
let consultasAoMapa = 0;
globalThis.fetch = async (endereco, opcoes = {}) => {
  const url = new URL(String(endereco));
  if (!url.pathname.endsWith('/interpreter')) throw new Error(`fetch inesperado: ${url}`);
  consultasAoMapa += 1;
  // Um mercado no próprio ponto consultado.
  const [, lat, lon] = decodeURIComponent(String(opcoes.body)).match(/around:\d+,([-\d.]+),([-\d.]+)/);
  const corpo = {
    elements: [{ type: 'node', id: consultasAoMapa, lat: Number(lat), lon: Number(lon), tags: { shop: 'supermarket', name: 'Mercado' } }]
  };
  return { ok: true, status: 200, json: async () => corpo };
};

const { RegiaoModel } = await import('../src/models/RegiaoModel.js');
const { banco } = await import('../src/config/banco.js');

// Pontos a ~2 km um do outro: cada um é uma região diferente.
const ponto = i => ({ lat: -23 - i * 0.02, lng: -46 });

test('a memória guarda até 100 regiões; a mais antiga sai e volta do banco, sem consultar o mapa', async () => {
  for (let i = 0; i <= 100; i++) await RegiaoModel.mercadosPerto(ponto(i), 5);
  assert.equal(consultasAoMapa, 101);

  const lidos = [];
  const lerDeVerdade = banco.ler;
  banco.ler = async caminho => {
    lidos.push(caminho);
    return lerDeVerdade.call(banco, caminho);
  };
  try {
    await RegiaoModel.mercadosPerto(ponto(100), 5);
    assert.deepEqual(lidos, [], 'a mais recente ainda está na memória');
    await RegiaoModel.mercadosPerto(ponto(0), 5);
    assert.equal(lidos.length, 1, 'a mais antiga saiu da memória e foi lida do banco');
    assert.match(lidos[0], /^regioes\//);
  } finally {
    banco.ler = lerDeVerdade;
  }
  assert.equal(consultasAoMapa, 101, 'nenhuma consulta nova ao mapa');
});

test('sem guardar (verificador público): não grava no banco nem ocupa a memória', async () => {
  const longe = { lat: -10, lng: -40 };
  const antes = consultasAoMapa;
  assert.equal((await RegiaoModel.mercadosPerto(longe, 15, { guardar: false })).length, 1);
  assert.equal((await RegiaoModel.mercadosPerto(longe, 15, { guardar: false })).length, 1);
  assert.equal(consultasAoMapa, antes + 2, 'sem memória, cada pedido consulta o mapa');
  const regioes = Object.keys((await banco.ler('regioes')) || {});
  assert.ok(!regioes.some(chave => chave.startsWith('m10p00_m40p00')), 'nada gravado no banco');

  // O que já está guardado serve para os dois.
  await RegiaoModel.mercadosPerto(longe, 15);
  const depois = consultasAoMapa;
  await RegiaoModel.mercadosPerto(longe, 15, { guardar: false });
  assert.equal(consultasAoMapa, depois);
});
