import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.BANCO = 'memoria';
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.FIREBASE_PRIVATE_KEY;

// Respostas falsas do mapa (Overpass) e dos sites das redes, para testar sem internet.
const MAPA = {
  elements: [
    {
      type: 'node',
      id: 1,
      lat: -23.091,
      lon: -47.219,
      tags: { shop: 'supermarket', name: 'Savegnago', 'addr:street': 'Rua A' }
    },
    {
      type: 'way',
      id: 2,
      center: { lat: -23.1, lon: -47.22 },
      tags: { shop: 'wholesale', name: 'Atacadão', brand: 'Atacadão' }
    },
    {
      type: 'node',
      id: 5,
      lat: -23.093,
      lon: -47.216,
      tags: { shop: 'supermarket', name: 'Pão de Açúcar', brand: 'Pão de Açúcar' }
    },
    {
      type: 'node',
      id: 6,
      lat: -23.094,
      lon: -47.215,
      tags: { shop: 'supermarket', name: 'Supermercados Pague Menos' }
    },
    {
      type: 'node',
      id: 7,
      lat: -23.0955,
      lon: -47.2145,
      tags: { shop: 'wholesale', name: 'Tenda Atacado' }
    },
    {
      type: 'node',
      id: 8,
      lat: -23.0965,
      lon: -47.2135,
      tags: { shop: 'supermarket', name: 'Supermercados Confiança' }
    },
    { type: 'node', id: 3, lat: -23.092, lon: -47.218, tags: { shop: 'supermarket', name: 'Dia' } },
    { type: 'node', id: 4, lat: -23.6, lon: -47.9, tags: { shop: 'supermarket', name: 'Longe' } }
  ]
};
const vtex = (itemId, nome, ean, preco, marca = 'Camil') => ({
  productName: nome,
  brand: marca,
  link: `https://loja/${ean}/p`,
  items: [
    {
      itemId,
      ean,
      measurementUnit: 'un',
      unitMultiplier: 1,
      images: [],
      sellers: [
        { sellerId: '1', commertialOffer: { Price: preco, ListPrice: preco, AvailableQuantity: 10 } }
      ]
    }
  ]
});
const CATALOGOS = {
  'www.savegnago.com.br': [
    vtex('11', 'Arroz Camil Tipo 1 5kg', '789001', 99),
    vtex('12', 'Ração Cão Carne e Arroz 5kg', '789999', 60, 'Dog')
  ],
  'www.atacadao.com.br': [vtex('21', 'Arroz Camil Tipo 1 5kg', '789001', 21.5)]
};
// Preço que a simulação de carrinho devolve para o CEP (em centavos) e se a rede entrega ali.
const SIMULACAO = {
  'www.savegnago.com.br': { 11: ['available', 2490], 12: ['available', 6000] },
  'www.atacadao.com.br': { 21: ['cannotBeDelivered', 2150] }
};
const PAGUE_MENOS = `<div class="item-product" data-id="sku_1"><a href="/arroz-camil-5kg/p" class="item-image"><img data-src="//img/1.png"></a>
<span class="font-size-11">Camil</span><form data-json='{"item_id": 1, "item_name": "Arroz Camil Tipo 1 5kg", "item_brand": "Camil", "price": 26.900000 }'>
<input type="hidden" value="23.99" name="price"/></form></div>`;

globalThis.fetch = async (endereco, opcoes = {}) => {
  const url = new URL(String(endereco));
  const json = corpo => ({ ok: true, status: 200, json: async () => corpo, text: async () => '' });
  if (url.pathname.endsWith('/interpreter')) {
    assert.match(decodeURIComponent(String(opcoes.body)), /shop=supermarket/);
    return json(MAPA);
  }
  if (url.pathname.includes('/checkout/pub/regions')) return json([{ id: 'v2.X', sellers: [] }]);
  if (url.pathname.includes('/checkout/pub/orderForms/simulation')) {
    const corpo = JSON.parse(opcoes.body);
    assert.equal(corpo.postalCode, '13334100');
    return json({
      items: corpo.items.map((item, requestIndex) => {
        const [availability, sellingPrice] = SIMULACAO[url.hostname][item.id];
        return { id: item.id, requestIndex, availability, sellingPrice, listPrice: sellingPrice };
      })
    });
  }
  if (url.pathname.includes('/catalog_system/')) return json(CATALOGOS[url.hostname] || []);
  if (url.hostname === 'api.vendas.gpa.digital' && url.pathname.endsWith('/delivery/options'))
    return json({ content: { deliveryTypes: [{ storeid: 4, storeName: '2385 - Indaiatuba' }] } });
  if (url.hostname === 'api.vendas.gpa.digital' && url.pathname.endsWith('/search/search'))
    return json({
      products: [
        { name: 'Arroz Tipo 1 Camil Pacote 5kg', brand: 'CAMIL', price: 27.9, stock: true },
        { name: 'Arroz Tipo 1 Prato Fino Pacote 5kg', brand: 'PRATO FINO', price: 30, stock: false }
      ]
    });
  if (url.hostname === 'api.tendaatacado.com.br')
    return json({
      products: [
        { name: 'Arroz Camil Tipo 1 5kg', brand: 'Camil', barcode: '789001', price: 22.9, availability: 'in_stock' },
        { name: 'Arroz Camil Tipo 1 5kg', brand: 'Camil', barcode: '789003', price: 1, availability: 'out_of_stock' },
        { name: 'Feijão Carioca Kicaldo 1kg', brand: 'Kicaldo', barcode: '789050', price: 7.5, availability: 'in_stock' }
      ]
    });
  if (url.hostname === 'www.confianca.com.br')
    return json({
      resultsList: {
        records: [
          {
            records: [
              {
                attributes: {
                  'sku.displayName': ['Arroz Camil Tipo 1 5kg'],
                  'sku.activePrice': ['25.49'],
                  'sku.listPrice': ['27.90'],
                  'sku.availabilityStatus': ['INSTOCK'],
                  'sku.url': ['/arroz-camil/p/1'],
                  'product.brand': ['Camil']
                }
              }
            ]
          },
          {
            records: [
              {
                attributes: {
                  'sku.displayName': ['Feijão Carioca Kicaldo 1kg'],
                  'sku.activePrice': ['6.20'],
                  'sku.availabilityStatus': ['INSTOCK'],
                  'product.brand': ['Kicaldo']
                }
              }
            ]
          }
        ]
      }
    });
  if (url.hostname === 'www.superpaguemenos.com.br')
    return { ok: true, status: 200, text: async () => PAGUE_MENOS, json: async () => ({}) };
  throw new Error(`fetch inesperado: ${url}`);
};

const { MercadoModel } = await import('../src/models/MercadoModel.js');
const { PrecoRegionalModel } = await import('../src/models/PrecoRegionalModel.js');
const { RedeModel } = await import('../src/models/RedeModel.js');
const { lerPaginaPagueMenos } = await import('../src/models/CatalogoPagueMenosModel.js');
const { round2 } = await import('../src/utils/money.js');

const LOCAL = { lat: -23.0904, lng: -47.2181 };
const CEP = '13334100';

test('reconhece a rede pelo nome ou pela marca do mercado', () => {
  assert.equal(RedeModel.identificar('Supermercado Covrabra').id, 'covabra');
  assert.equal(RedeModel.identificar('Loja 12', "Sam's Club").id, 'samsclub');
  assert.equal(RedeModel.identificar('Minuto Pão de Açúcar').id, 'paodeacucar');
  assert.equal(RedeModel.identificar('Mercadinho da Esquina'), null);
  assert.equal(RedeModel.identificar('Recanto Supermercado e Hortifruti'), null);
  assert.equal(RedeModel.identificar('Tenda Atacado').id, 'tenda');
});

test('lê nome, marca e preço de venda da página do Pague Menos', () => {
  const [item] = lerPaginaPagueMenos(PAGUE_MENOS, 'https://www.superpaguemenos.com.br');
  assert.equal(item.produto, 'Arroz Camil Tipo 1 5kg');
  assert.equal(item.preco, 23.99);
  assert.equal(item.precoDe, 26.9);
  assert.equal(item.link, 'https://www.superpaguemenos.com.br/arroz-camil-5kg/p');
});

test('com localização, os mercados vêm do mapa e ficam dentro do raio', async () => {
  const { modo, mercados } = await MercadoModel.daRegiao(5, LOCAL);
  assert.equal(modo, 'real');
  assert.ok(!mercados.some(m => m.nome === 'Longe'));
  assert.equal(mercados.find(m => m.nome === 'Atacadão').tipo, 'atacado');
  assert.equal(mercados.find(m => m.nome === 'Dia').redeId, null);
});

test('sem localização não há mercados nem preços inventados', async () => {
  const { modo, mercados } = await MercadoModel.daRegiao(5, { cep: '' });
  assert.equal(modo, 'semLocal');
  assert.deepEqual(mercados, []);
});

test('usa o preço e a disponibilidade para o CEP e explica quem ficou sem preço', async () => {
  const { mercados } = await MercadoModel.daRegiao(5, LOCAL);
  const r = await PrecoRegionalModel.comparar('arroz 5kg', mercados, null, { cep: CEP });
  const linha = nome => r.mercados.find(m => m.nome === nome);

  assert.equal(linha('Savegnago').preco, 24.9, 'preço da simulação para o CEP, não o do catálogo');
  assert.equal(linha('Savegnago').regional, true);
  assert.equal(linha('Atacadão').preco, null, 'a rede não entrega no CEP');
  assert.match(linha('Atacadão').motivo, /não atende o seu CEP/);
  assert.equal(linha('Pão de Açúcar').preco, 27.9);
  assert.equal(linha('Pão de Açúcar').lojaOnline, 'Indaiatuba');
  assert.equal(linha('Supermercados Pague Menos').preco, 23.99);
  assert.match(linha('Dia').motivo, /leia uma nota/);

  assert.equal(linha('Tenda Atacado').preco, 22.9, 'só o item em estoque');
  assert.equal(linha('Supermercados Confiança').preco, 25.49);
  assert.equal(linha('Supermercados Confiança').precoDe, 27.9);
  assert.equal(r.mercados.filter(m => m.igual).length, 5, 'o mesmo arroz nas cinco redes');
  assert.equal(linha('Tenda Atacado').melhor, true);
  assert.ok(r.opcoes.length >= 1);
  assert.ok(!r.opcoes.some(o => /ra[cç][aã]o/i.test(o.produto)), 'ração não entra no arroz');
});

test('lista soma os itens pelo preço do site para o CEP', async () => {
  const { mercados } = await MercadoModel.daRegiao(5, LOCAL);
  const r = await PrecoRegionalModel.lista(
    [{ id: 'i1', nome: 'Arroz 5kg', qtd: 2 }],
    mercados,
    mercados.find(m => m.nome === 'Savegnago').id,
    CEP
  );
  assert.equal(r.melhor.nome, 'Tenda Atacado');
  assert.equal(r.melhor.total, 45.8);
  assert.equal(r.habitual.nome, 'Savegnago');
  assert.ok(!r.totais.some(t => t.nome === 'Atacadão'));
});

test('opções para a lista trazem marca, tamanho e menor preço de cada produto', async () => {
  const { mercados } = await MercadoModel.daRegiao(5, LOCAL);
  const opcoes = await PrecoRegionalModel.opcoes('arroz 5kg', mercados, CEP);
  const camil = opcoes.find(o => o.ean === '789001');
  assert.equal(camil.marca, 'Camil');
  assert.equal(camil.tamanho, '5kg');
  assert.ok(camil.redes >= 3);
  assert.equal(camil.menorPreco, 22.9);
});

test('item com produto escolhido só soma o preço daquele produto', async () => {
  const { mercados } = await MercadoModel.daRegiao(5, LOCAL);
  const r = await PrecoRegionalModel.lista(
    [
      {
        id: 'i1',
        nome: 'Arroz Camil Tipo 1 5kg',
        qtd: 1,
        produto: { ean: '789001', marca: 'Camil', tamanho: '5kg', termo: 'arroz 5kg' }
      },
      {
        id: 'i2',
        nome: 'Arroz Tipo 1 Prato Fino Pacote 5kg',
        qtd: 1,
        produto: { ean: '', marca: 'Prato Fino', tamanho: '5kg', termo: 'arroz 5kg' }
      }
    ],
    mercados,
    null,
    CEP
  );
  const camil = r.itens[0];
  assert.equal(Object.keys(camil.precos).length, 5, 'o mesmo arroz em cinco redes');
  assert.equal(camil.melhorPreco, 22.9);
  assert.ok(Object.values(camil.situacao).every(s => s === 'exato'));
  const pratoFino = r.itens[1];
  assert.ok(
    Object.values(pratoFino.situacao).every(s => s === 'substituto'),
    'nenhuma rede tem o Prato Fino: entra o arroz 5kg equivalente de cada uma'
  );
  assert.ok(Object.values(pratoFino.substitutos).every(nome => /camil/i.test(nome)));
});

test('cada item da lista recebe só os próprios preços', async () => {
  const { mercados } = await MercadoModel.daRegiao(5, LOCAL);
  const r = await PrecoRegionalModel.lista(
    [
      { id: 'a', nome: 'Arroz 5kg', qtd: 1 },
      { id: 'b', nome: 'Feijão preto 1kg', qtd: 1 }
    ],
    mercados,
    null,
    CEP
  );
  assert.ok(Object.keys(r.itens[0].precos).length > 0);
  assert.deepEqual(r.itens[1].precos, {}, 'nenhuma rede vende feijão nas respostas simuladas');
});

test('mercado que não vende um item não ganha por isso: total comparável e compra dividida', async () => {
  const { mercados } = await MercadoModel.daRegiao(5, LOCAL);
  const r = await PrecoRegionalModel.lista(
    [
      {
        id: 'arroz',
        nome: 'Arroz Camil Tipo 1 5kg',
        qtd: 5,
        produto: { ean: '789001', marca: 'Camil', tamanho: '5kg', termo: 'arroz 5kg' }
      },
      {
        id: 'feijao',
        nome: 'Feijão Carioca Kicaldo 1kg',
        qtd: 10,
        produto: { ean: '789050', marca: 'Kicaldo', tamanho: '1kg', termo: 'feijao carioca' }
      }
    ],
    mercados,
    null,
    CEP
  );
  const feijao = r.itens[1];
  assert.equal(feijao.disponivelEm, 2, 'o feijão só existe no Tenda e no Confiança');
  assert.equal(feijao.estimativa, 6.85, 'mediana de 7,50 e 6,20');

  const total = nome => r.todos.find(t => t.nome === nome);
  const savegnago = total('Savegnago');
  assert.equal(savegnago.total, 124.5, 'só o arroz tem preço de verdade lá');
  assert.equal(savegnago.estimado, 68.5, 'o feijão que falta entra pela mediana');
  assert.equal(savegnago.totalComparavel, 193);
  assert.deepEqual(savegnago.faltando, [{ item: 'Feijão Carioca Kicaldo 1kg', estimativa: 6.85 }]);
  assert.ok(
    savegnago.totalComparavel > total('Supermercados Confiança').totalComparavel,
    'sem o feijão, o Savegnago não passa na frente de quem tem a lista inteira'
  );

  assert.ok(r.divisao, 'dividir entre dois mercados economiza');
  const partes = Object.fromEntries(r.divisao.mercados.map(m => [m.nome, m.itens.map(i => i.item)]));
  assert.deepEqual(partes['Tenda Atacado'], ['Arroz Camil Tipo 1 5kg']);
  assert.deepEqual(partes['Supermercados Confiança'], ['Feijão Carioca Kicaldo 1kg']);
  assert.equal(r.divisao.total, 176.5);
  assert.equal(r.divisao.economia, round2(r.melhor.totalComparavel - 176.5));
});
