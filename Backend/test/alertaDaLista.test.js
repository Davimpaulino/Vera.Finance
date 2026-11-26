import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

await import('./apoio/ambiente.js');

// Alerta de preço da lista: item mais barato em outro mercado do raio do que no de sempre.
// O mapa e os sites das redes respondem de mentira, como no test/regiao.test.js.
const LOCAL = { lat: -23.0904, lng: -47.2181 };
const MAPA = {
  elements: [
    { type: 'node', id: 1, lat: -23.091, lon: -47.219, tags: { shop: 'supermarket', name: 'Savegnago' } },
    { type: 'node', id: 7, lat: -23.0955, lon: -47.2145, tags: { shop: 'wholesale', name: 'Tenda Atacado' } },
    { type: 'node', id: 8, lat: -23.0965, lon: -47.2135, tags: { shop: 'supermarket', name: 'Supermercados Confiança' } },
    { type: 'node', id: 3, lat: -23.092, lon: -47.218, tags: { shop: 'supermarket', name: 'Dia' } }
  ]
};
const vtex = (itemId, nome, ean, preco) => ({
  productName: nome,
  brand: 'Camil',
  items: [{ itemId, ean, sellers: [{ sellerId: '1', commertialOffer: { Price: preco, AvailableQuantity: 10 } }] }]
});

const externos = [];
const fetchDeVerdade = globalThis.fetch;
globalThis.fetch = async (endereco, opcoes = {}) => {
  const url = new URL(String(endereco));
  if (url.hostname === 'localhost') return fetchDeVerdade(endereco, opcoes);
  externos.push(url.href);
  const json = corpo => ({ ok: true, status: 200, json: async () => corpo, text: async () => '' });
  if (url.pathname.endsWith('/interpreter')) return json(MAPA);
  if (url.hostname === 'www.savegnago.com.br') {
    if (url.pathname.includes('/regions')) return json([{ id: 'v2.X', sellers: [] }]);
    if (url.pathname.includes('/catalog_system/'))
      return json([vtex('11', 'Arroz Camil Tipo 1 5kg', '789001', 24.9), vtex('12', 'Café Camil 500g', '789070', 15)]);
    if (url.pathname.includes('/simulation')) {
      const corpo = JSON.parse(opcoes.body);
      const precos = { 11: 2490, 12: 1500 };
      return json({
        items: corpo.items.map((item, requestIndex) => ({
          requestIndex,
          availability: 'available',
          sellingPrice: precos[item.id],
          listPrice: precos[item.id]
        }))
      });
    }
  }
  if (url.hostname === 'api.tendaatacado.com.br')
    return json({
      products: [
        { name: 'Arroz Camil Tipo 1 5kg', brand: 'Camil', barcode: '789001', price: 22.9, availability: 'in_stock' },
        // Café: R$ 0,60 a menos (4%), pouco para valer o alerta.
        { name: 'Café Camil 500g', brand: 'Camil', barcode: '789070', price: 14.4, availability: 'in_stock' }
      ]
    });
  if (url.hostname === 'www.confianca.com.br') return json({ resultsList: { records: [] } });
  throw new Error(`fetch inesperado: ${url}`);
};

const { handle } = await import('../src/app.js');
const { banco } = await import('../src/config/banco.js');
const { CredencialModel } = await import('../src/models/CredencialModel.js');
const { VERSAO_DOS_TERMOS } = await import('../src/config/termos.js');
const { itensMaisBaratos } = await import('../src/models/AlertaDaListaModel.js');

let server;
let base;
let token;
const chamar = async (metodo, caminho, corpo) => {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const texto = await resposta.text();
  return { status: resposta.status, body: texto ? JSON.parse(texto) : null };
};
const alertasDaLista = async () =>
  (await chamar('GET', '/notificacoes')).body.notificacoes.filter(aviso => aviso.tipo === 'lista');

const ARROZ = { ean: '789001', marca: 'Camil', tamanho: '5kg', termo: 'arroz 5kg' };
const CAFE = { ean: '789070', marca: 'Camil', tamanho: '500g', termo: 'cafe' };

before(async () => {
  const uid = 'alerta-ana';
  await CredencialModel.cadastrar({ email: 'ana@alerta.teste', senha: 'senha1234', nome: 'Ana', uid });
  await banco.gravar(`usuarios/${uid}/perfil`, {
    nome: 'Ana',
    email: 'ana@alerta.teste',
    plano: 'gratis',
    onboardingCompleto: true,
    termosAceitos: { versao: VERSAO_DOS_TERMOS, em: new Date().toISOString() },
    ciclo: { diaVirada: 1, frequencia: 'Uma vez por mês', rendaFixa: 3000, rendaVariavel: 0 },
    local: { cep: '13334-100', ...LOCAL, raioKm: 5, mercados: ['osm-n1'], mercadoHabitual: 'osm-n1' },
    prefs: { alertaAltaPreco: true }
  });
  const item = (nome, produto) => ({ nome, produto, qtd: 2, done: false, criadoEm: new Date().toISOString() });
  await banco.gravar(`usuarios/${uid}/lista/arroz`, item('Arroz Camil Tipo 1 5kg', ARROZ));
  await banco.gravar(`usuarios/${uid}/lista/cafe`, item('Café Camil 500g', CAFE));
  server = createServer(handle).listen(0);
  base = `http://localhost:${server.address().port}/api`;
  const entrada = await fetch(`${base}/auth/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ana@alerta.teste', senha: 'senha1234' })
  });
  token = (await entrada.json()).token;
});
after(() => server.close());

test('diferença relevante: pelo menos 5% e R$ 1 a menos, só do mesmo produto e item não comprado', () => {
  const mercados = [
    { id: 'hab', nome: 'Habitual', distanciaKm: 1 },
    { id: 'a', nome: 'Mercado A', distanciaKm: 2 },
    { id: 'b', nome: 'Mercado B', distanciaKm: 3 }
  ];
  const item = (id, precos, extra = {}) => ({ id, nome: id, qtd: 1, done: false, precos, ...extra });
  const comparacao = {
    habitual: { mercadoId: 'hab', nome: 'Habitual' },
    itens: [
      item('vale', { hab: 24.9, a: 22.9, b: 23.5 }), // R$ 2,00 e 8%: alerta, no mais barato
      item('poucoPct', { hab: 30, a: 29 }), // R$ 1,00 mas 3%
      item('poucoReal', { hab: 10, a: 9.4 }), // 6% mas R$ 0,60
      item('comprado', { hab: 24.9, a: 20 }, { done: true }),
      item('semHabitual', { a: 5, b: 9 }),
      item('outraMarca', { hab: 24.9, a: 20 }, { situacao: { hab: 'exato', a: 'substituto' } }),
      item('daNota', { hab: 12, b: 10 }, { situacao: { hab: 'exato', b: 'nota' }, qtd: 3 }),
      item('foraDoRaio', { hab: 12, longe: 5 })
    ]
  };
  const achados = itensMaisBaratos(comparacao, mercados);
  assert.deepEqual(
    achados.map(a => [a.itemId, a.mercadoId, a.preco, a.precoHabitual]),
    [
      ['daNota', 'b', 10, 12], // R$ 2,00 x 3 economiza mais que R$ 2,00 x 1
      ['vale', 'a', 22.9, 24.9]
    ]
  );
  assert.equal(achados[1].mercado, 'Mercado A');
  assert.equal(achados[1].mercadoHabitual, 'Habitual');
  assert.deepEqual(itensMaisBaratos({ itens: comparacao.itens, habitual: null }, mercados), []);
});

test('o alerta nasce da comparação da lista e o sino não consulta site nem mapa', async () => {
  assert.deepEqual(await alertasDaLista(), [], 'antes de abrir a lista não há o que avisar');

  const lista = await chamar('GET', '/lista');
  assert.equal(lista.status, 200);
  assert.equal(lista.body.habitual.nome, 'Savegnago');
  const precos = id => lista.body.itens.find(item => item.id === id).precos;
  assert.deepEqual([precos('arroz')['osm-n1'], precos('arroz')['osm-n7']], [24.9, 22.9]);
  assert.deepEqual([precos('cafe')['osm-n1'], precos('cafe')['osm-n7']], [15, 14.4]);

  const antes = externos.length;
  const [alerta, ...outros] = await alertasDaLista();
  assert.equal(externos.length, antes, 'montar as notificações não sai para a internet');
  assert.deepEqual(outros, [], 'o café está só 4% mais barato: não avisa');
  assert.equal(alerta.titulo, 'Arroz Camil Tipo 1 5kg está mais barato no Tenda Atacado');
  assert.equal(alerta.texto, 'R$ 22,90 lá e R$ 24,90 no Savegnago: R$ 2,00 a menos (8%), a 0,7 km.');
  assert.equal(alerta.destino, '/app/lista');
  assert.equal(alerta.tom, 'success');
  assert.equal(alerta.id, 'lista-arroz-osm-n7-2290');
  assert.equal(alerta.vista, false);

  // Id estável: depois de vista, não volta como nova.
  await chamar('POST', '/notificacoes/vistas', { ids: [alerta.id] });
  await chamar('GET', '/lista');
  const [denovo] = await alertasDaLista();
  assert.equal(denovo.id, alerta.id);
  assert.equal(denovo.vista, true);
});

test('some quando o item é comprado, o alerta é desligado ou o mercado de sempre muda', async () => {
  await chamar('GET', '/lista');
  assert.equal((await alertasDaLista()).length, 1);

  await chamar('PATCH', '/me', { prefs: { alertaAltaPreco: false } });
  assert.deepEqual(await alertasDaLista(), [], 'respeita o alerta desligado');
  await chamar('PATCH', '/me', { prefs: { alertaAltaPreco: true } });
  assert.equal((await alertasDaLista()).length, 1);

  await chamar('PATCH', '/me', { local: { mercadoHabitual: 'osm-n7' } });
  assert.deepEqual(await alertasDaLista(), [], 'o guardado era contra outro mercado');
  await chamar('PATCH', '/me', { local: { mercadoHabitual: 'osm-n1' } });

  await chamar('PATCH', '/lista/arroz', { done: true });
  assert.deepEqual(await alertasDaLista(), [], 'item comprado não gera alerta');
});
