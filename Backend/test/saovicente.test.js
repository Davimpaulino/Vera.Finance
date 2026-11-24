import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.BANCO = 'memoria';
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.FIREBASE_PRIVATE_KEY;

// Grade de busca do São Vicente (Salesforce Commerce Cloud), no formato real do Search-UpdateGrid.
const img = (id, ean, nome) => ({
  small: [
    {
      url: `/on/demandware.static/-/Sites-storefront-catalog-sv/default/dw1/Produtos/${id}-${ean}-${nome}-1.jpg`,
      absURL: `https://www.svicente.com.br/on/demandware.static/-/Sites-storefront-catalog-sv/default/dw1/Produtos/${id}-${ean}-${nome}-1.jpg`
    }
  ]
});
const sv = (id, nome, marca, ean, venda, cheio = null, extra = {}) => ({
  id,
  productName: nome,
  brand: marca,
  available: true,
  price: { sales: { value: venda }, list: cheio ? { value: cheio } : null },
  images: img(id, ean, nome.toLowerCase()),
  productMeasureValue: 'unity',
  weighable: false,
  productShowFullUrl: `https://www.svicente.com.br/${id}.html`,
  ...extra
});
const GRADE = {
  action: 'Search-UpdateGrid',
  productsSearchResult: [
    sv('78166', 'Arroz Tipo 1 Camil Pacote 5kg', 'Camil', '7896006711155', 26.9, 29.9),
    sv('31313', 'Arroz Tipo 1 Prato Fino Pacote 5kg', 'Prato Fino', '7896290300011', 27.9),
    sv('31314', 'Arroz Tipo 1 Prato Fino Pacote 1kg', 'Prato Fino', '7896290300028', 6.49),
    sv('99999', 'Arroz Tipo 1 Tio João Pacote 5kg', 'Tio Joao', '789777', 30, null, { available: false }),
    sv('21172', 'Banana Nanica Kg', 'Hortifruti', '2117200000000', 5.99, null, { weighable: true })
  ]
};

const MAPA = {
  elements: [
    {
      type: 'node',
      id: 1,
      lat: -23.091,
      lon: -47.219,
      tags: { shop: 'supermarket', name: 'Supermercados São Vicente', brand: 'São Vicente' }
    },
    { type: 'node', id: 2, lat: -23.092, lon: -47.218, tags: { shop: 'supermarket', name: 'Savegnago' } }
  ]
};
const vtex = (itemId, nome, ean, preco, marca) => ({
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
      sellers: [{ sellerId: '1', commertialOffer: { Price: preco, ListPrice: preco, AvailableQuantity: 9 } }]
    }
  ]
});
const SAVEGNAGO = [
  vtex('11', 'Arroz Camil Tipo 1 5kg', '7896006711155', 24.9, 'Camil'),
  vtex('12', 'Arroz Prato Fino Tipo 1 1kg', '7896290300028', 5.99, 'Prato Fino')
];

const pedidos = [];
globalThis.fetch = async (endereco, opcoes = {}) => {
  const url = new URL(String(endereco));
  pedidos.push(url);
  const json = corpo => ({ ok: true, status: 200, json: async () => corpo, text: async () => '' });
  if (url.pathname.endsWith('/interpreter')) return json(MAPA);
  if (url.hostname === 'www.svicente.com.br') {
    assert.match(url.pathname, /Sites-SaoVicente-Site\/pt_BR\/Search-UpdateGrid$/);
    return json(GRADE);
  }
  if (url.pathname.includes('/checkout/pub/regions')) return json([]);
  if (url.pathname.includes('/catalog_system/')) return json(SAVEGNAGO);
  throw new Error(`fetch inesperado: ${url} ${opcoes.method || ''}`);
};

const { RedeModel } = await import('../src/models/RedeModel.js');
const { lerGradeSfcc } = await import('../src/models/CatalogoSfccModel.js');
const { MercadoModel } = await import('../src/models/MercadoModel.js');
const { PrecoRegionalModel } = await import('../src/models/PrecoRegionalModel.js');
const { embalagem, precoPorUnidade, tamanhoDaBusca } = await import('../src/utils/embalagem.js');

const LOCAL = { lat: -23.0904, lng: -47.2181 };

test('reconhece o São Vicente sem confundir com a cidade de São Vicente', () => {
  assert.equal(RedeModel.identificar('Supermercados São Vicente').id, 'saovicente');
  assert.equal(RedeModel.identificar('Loja 30', 'São Vicente').id, 'saovicente');
  assert.equal(RedeModel.identificar('Supermercado Sao Vicente').id, 'saovicente');
  assert.equal(RedeModel.identificar('Mercado Bom Preço São Vicente'), null);
  assert.equal(RedeModel.identificar('Oba Hortifruti').id, 'oba');
  assert.equal(RedeModel.identificar('Coop').id, 'coop');
  assert.equal(RedeModel.identificar('Hortifruti Cooperativa do Bairro'), null);
});

test('lê a grade do São Vicente: preço, promoção, código de barras da foto e item por kg', () => {
  const produtos = lerGradeSfcc(GRADE, 'https://www.svicente.com.br');
  assert.equal(produtos.length, 4, 'o item indisponível fica de fora');
  const [camil] = produtos;
  assert.equal(camil.produto, 'Arroz Tipo 1 Camil Pacote 5kg');
  assert.equal(camil.ean, '7896006711155');
  assert.equal(camil.preco, 26.9);
  assert.equal(camil.precoDe, 29.9);
  assert.equal(camil.link, 'https://www.svicente.com.br/78166.html');
  assert.match(camil.imagem, /^https:\/\/www\.svicente\.com\.br\//);
  assert.equal(produtos.find(p => /banana/i.test(p.produto)).unidade, 'kg');
});

test('o São Vicente entra na comparação com o mesmo produto das outras redes', async () => {
  const { mercados } = await MercadoModel.daRegiao(5, LOCAL);
  assert.equal(mercados.find(m => /são vicente/i.test(m.nome)).redeId, 'saovicente');
  const r = await PrecoRegionalModel.comparar('arroz 5kg', mercados, null, { cep: '' });
  const sv = r.mercados.find(m => m.redeId === 'saovicente');
  assert.equal(sv.preco, 26.9);
  assert.equal(sv.igual, true, 'mesmo código de barras do Camil no Savegnago');
  assert.equal(sv.regional, false, 'sem CEP, nenhum preço é regional');
  assert.equal(r.mercados.find(m => m.melhor).nome, 'Savegnago');
});

test('opções trazem foto, preço por kg e vêm primeiro no tamanho digitado', async () => {
  const { mercados } = await MercadoModel.daRegiao(5, LOCAL);
  const opcoes = await PrecoRegionalModel.opcoes('arroz 1kg', mercados, '');
  assert.equal(opcoes[0].tamanho, '1kg', 'pediu 1kg: o pacote de 1kg vem antes dos de 5kg');
  assert.equal(opcoes[0].redes, 2);
  assert.deepEqual(opcoes[0].precoUnidade, { valor: 5.99, unidade: 'kg' });
  const camil = (await PrecoRegionalModel.opcoes('arroz', mercados, '')).find(
    o => o.ean === '7896006711155'
  );
  assert.deepEqual(camil.precoUnidade, { valor: 4.98, unidade: 'kg' });
  assert.equal(camil.maiorPreco, 26.9);
  assert.equal(camil.emPromocao, true);
  assert.ok(camil.imagem);
});

test('embalagem: kg, litros, fardos e "leve X pague Y"', () => {
  assert.deepEqual(embalagem('Arroz Tipo 1 Prato Fino Pacote 5kg'), { quantidade: 5, unidade: 'kg' });
  assert.deepEqual(embalagem('Leite Integral Italac 1L c/ 12 unid.'), { quantidade: 12, unidade: 'l' });
  assert.deepEqual(embalagem('Cerveja Skol Lata 350ml c/ 12 Unid.'), { quantidade: 4.2, unidade: 'l' });
  assert.deepEqual(embalagem('Suco Aurora Uva 1,5L'), { quantidade: 1.5, unidade: 'l' });
  assert.deepEqual(embalagem('Papel Higiênico Neve Leve 12 Pague 11'), { quantidade: 12, unidade: 'un' });
  assert.deepEqual(embalagem('Yakult c/6 Unid. de 80g - 480g'), { quantidade: 0.48, unidade: 'kg' });
  assert.equal(embalagem('Abacaxi Pérola Unidade'), null);
  assert.deepEqual(precoPorUnidade(5.99, 'Banana Nanica Kg'), { valor: 5.99, unidade: 'kg' });
  assert.deepEqual(precoPorUnidade(12, 'Detergente 500ml'), { valor: 24, unidade: 'l' });
  assert.equal(tamanhoDaBusca('arroz 5 kg'), '5kg');
  assert.equal(tamanhoDaBusca('leite integral'), '');
});
