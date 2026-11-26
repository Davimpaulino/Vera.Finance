import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

await import('./apoio/ambiente.js');

// Verificador público de CEP (GET /api/publico/redes): ViaCEP, Nominatim e o mapa (Overpass)
// respondem de mentira, no estilo do test/regiao.test.js. Nada sai para a internet.
const INDAIATUBA = { lat: -23.0904, lng: -47.2181 };
const MAPA = {
  elements: [
    { type: 'node', id: 1, lat: -23.091, lon: -47.219, tags: { shop: 'supermarket', name: 'Savegnago', 'addr:street': 'Rua A' } },
    { type: 'node', id: 2, lat: -23.12, lon: -47.2181, tags: { shop: 'supermarket', name: 'Savegnago Supermercados' } },
    { type: 'way', id: 3, center: { lat: -23.1, lon: -47.22 }, tags: { shop: 'wholesale', name: 'Atacadão', brand: 'Atacadão' } },
    { type: 'node', id: 4, lat: -23.092, lon: -47.218, tags: { shop: 'supermarket', name: 'Dia', brand: 'Dia' } },
    { type: 'node', id: 5, lat: -23.095, lon: -47.21, tags: { shop: 'supermarket', name: 'Dia Supermercado', brand: 'Dia' } },
    { type: 'node', id: 6, lat: -23.2, lon: -47.2, tags: { shop: 'supermarket', name: 'Mercadinho Bom Preço' } },
    { type: 'node', id: 7, lat: -23.093, lon: -47.217, tags: { shop: 'supermarket' } },
    { type: 'node', id: 8, lat: -23.6, lon: -47.9, tags: { shop: 'supermarket', name: 'Muito Longe' } }
  ]
};
const CEPS = {
  13334100: { logradouro: 'Rua das Flores', bairro: 'Centro', localidade: 'Indaiatuba', uf: 'SP' },
  13334200: { logradouro: 'Rua das Palmeiras', bairro: 'Centro', localidade: 'Indaiatuba', uf: 'SP' },
  // CEP cujo mapa não responde (outra região, para não cair no cache da primeira).
  69900000: { logradouro: '', bairro: '', localidade: 'Rio Branco', uf: 'AC' },
  99999999: { erro: true }
};
const LUGARES = { Indaiatuba: INDAIATUBA, 'Rio Branco': { lat: -9.97, lng: -67.81 } };

const consultas = [];
const horasNoNominatim = [];
const fetchDeVerdade = globalThis.fetch;
globalThis.fetch = async (endereco, opcoes = {}) => {
  const url = new URL(String(endereco));
  if (url.hostname === 'localhost') return fetchDeVerdade(endereco, opcoes);
  consultas.push(url.hostname);
  if (url.hostname === 'nominatim.openstreetmap.org') horasNoNominatim.push(Date.now());
  const json = (corpo, status = 200) => ({ ok: status < 400, status, json: async () => corpo });
  if (url.hostname === 'viacep.com.br') {
    const cep = url.pathname.split('/')[2];
    if (cep === '22222222') throw new Error('ViaCEP fora do ar');
    return json(CEPS[cep] || { erro: true });
  }
  if (url.hostname === 'nominatim.openstreetmap.org') {
    const lugar = Object.keys(LUGARES).find(nome => url.searchParams.get('q').includes(nome));
    return json(lugar ? [{ lat: String(LUGARES[lugar].lat), lon: String(LUGARES[lugar].lng) }] : []);
  }
  if (url.pathname.endsWith('/interpreter')) {
    const consulta = decodeURIComponent(String(opcoes.body));
    assert.match(consulta, /around:15150,/, 'raio de 15 km');
    if (consulta.includes('-9.970')) return json({}, 500);
    return json(MAPA);
  }
  throw new Error(`fetch inesperado: ${url}`);
};

const { handle } = await import('../src/app.js');
const { banco } = await import('../src/config/banco.js');
const { CoberturaModel } = await import('../src/models/CoberturaModel.js');

let server;
let base;
before(() => {
  server = createServer(handle).listen(0);
  base = `http://localhost:${server.address().port}/api/publico/redes`;
});
after(() => server.close());

// Cada teste usa um IP próprio, para o limite de tentativas de um não atrapalhar o outro.
const pedir = async (cep, ip = '10.0.0.1') => {
  const resposta = await fetch(`${base}?cep=${cep}`, { headers: { 'X-Forwarded-For': ip } });
  const texto = await resposta.text();
  return { status: resposta.status, cabecalhos: resposta.headers, texto, corpo: JSON.parse(texto) };
};

test('diz quais redes com preço online têm loja a até 15 km e a distância da mais perto', async () => {
  const { status, corpo, cabecalhos, texto } = await pedir('13334-100');
  assert.equal(status, 200);
  assert.equal(corpo.situacao, 'ok');
  assert.equal(corpo.cep, '13334-100');
  assert.equal(corpo.cidade, 'Indaiatuba - SP');
  assert.equal(corpo.raioKm, 15);
  assert.equal(corpo.comPrecoOnline, 2);
  assert.equal(corpo.totalMercados, 6, 'sem a loja sem nome e sem a que fica a 90 km');
  assert.match(corpo.mensagem, /^2 redes com preço online a até 15 km/);

  const [primeira, segunda, ...semPreco] = corpo.redes;
  assert.deepEqual(primeira, {
    id: 'savegnago',
    nome: 'Savegnago',
    tipo: 'mercado',
    precoOnline: true,
    lojas: 2,
    distanciaKm: 0.1
  });
  assert.equal(segunda.id, 'atacadao');
  assert.equal(segunda.tipo, 'atacado');
  assert.ok(semPreco.every(rede => !rede.precoOnline && rede.id === null));
  assert.deepEqual(
    semPreco.map(rede => [rede.nome, rede.lojas]),
    [
      ['Dia', 2],
      ['Mercadinho Bom Preço', 1]
    ]
  );
  assert.ok(!corpo.redes.some(rede => rede.nome === 'Muito Longe'));

  // Resposta pequena e sem dado de ninguém: nem coordenadas nem endereço.
  assert.ok(!/"lat"|"lng"|endereco/.test(texto));
  assert.ok(texto.length < 2000);
  assert.equal(cabecalhos.get('cache-control'), 'public, max-age=3600');
  assert.match(cabecalhos.get('content-type'), /application\/json/);
});

test('o mesmo CEP de novo sai do cache, sem consultar ViaCEP, Nominatim nem o mapa', async () => {
  await pedir('13334100', '10.0.0.2');
  const antes = consultas.length;
  const { status, corpo } = await pedir('13334100', '10.0.0.2');
  assert.equal(status, 200);
  assert.equal(corpo.comPrecoOnline, 2);
  assert.equal(consultas.length, antes);
});

test('CEP com número errado dá 400 e CEP que não existe dá 404', async () => {
  const curto = await pedir('1234', '10.0.0.3');
  assert.equal(curto.status, 400);
  assert.match(curto.corpo.erro, /8 números/);
  const semCep = await pedir('', '10.0.0.3');
  assert.equal(semCep.status, 400);
  const inexistente = await pedir('99999-999', '10.0.0.3');
  assert.equal(inexistente.status, 404);
  assert.match(inexistente.corpo.erro, /Não achamos esse CEP/);
});

test('mapa fora do ar: avisa, não inventa redes e não deixa guardar a resposta', async () => {
  const { status, corpo, cabecalhos } = await pedir('69900-000', '10.0.0.4');
  assert.equal(status, 200);
  assert.equal(corpo.situacao, 'mapaFalhou');
  assert.equal(corpo.cidade, 'Rio Branco - AC');
  assert.deepEqual(corpo.redes, []);
  assert.match(corpo.mensagem, /mapa de mercados não respondeu/);
  assert.equal(cabecalhos.get('cache-control'), 'no-store');
});

test('ViaCEP fora do ar também é avisado, sem dizer que o CEP não existe', async () => {
  const { status, corpo } = await pedir('22222-222', '10.0.0.5');
  assert.equal(status, 200);
  assert.equal(corpo.situacao, 'mapaFalhou');
  assert.equal(corpo.cidade, null);
  assert.match(corpo.mensagem, /localizar este CEP/);
});

test('limite de tentativas por IP: 20 CEPs a cada 15 minutos', async () => {
  for (let i = 0; i < 20; i++) assert.equal((await pedir('13334100', '10.0.0.6')).status, 200);
  const passou = await pedir('13334100', '10.0.0.6');
  assert.equal(passou.status, 429);
  assert.ok(Number(passou.cabecalhos.get('retry-after')) > 0);
  assert.equal((await pedir('13334100', '10.0.0.7')).status, 200, 'outro IP segue livre');
});

test('pedido anônimo não grava a região do mapa no banco', async () => {
  assert.ok(consultas.includes('overpass-api.de'), 'os testes acima consultaram o mapa');
  assert.equal(await banco.ler('regioes'), null);
});

test('o Nominatim recebe no máximo um pedido por segundo, mesmo com CEPs ao mesmo tempo', async () => {
  CoberturaModel.limparCache();
  horasNoNominatim.length = 0;
  const [a, b] = await Promise.all([pedir('13334100', '10.0.2.1'), pedir('13334200', '10.0.2.2')]);
  assert.deepEqual([a.status, b.status], [200, 200]);
  assert.equal(horasNoNominatim.length, 2);
  assert.ok(horasNoNominatim[1] - horasNoNominatim[0] >= 1000, 'um pedido por vez, com 1 s entre eles');
});

test('teto do serviço inteiro: 10 CEPs novos por minuto; o que já está no cache continua saindo', async () => {
  CoberturaModel.limparCache();
  assert.equal((await pedir('13334100', '10.0.1.1')).status, 200);
  // CEPs que o ViaCEP não conhece também gastam a vaga: foi uma consulta nova.
  for (let i = 1; i <= 9; i++) assert.equal((await pedir(`5000000${i}`, `10.0.1.${i + 1}`)).status, 404);
  const cheio = await pedir('50000010', '10.0.1.20');
  assert.equal(cheio.status, 429);
  assert.match(cheio.corpo.erro, /Tente de novo/);
  const segundos = Number(cheio.cabecalhos.get('retry-after'));
  assert.ok(segundos > 0 && segundos <= 60);
  assert.equal((await pedir('13334100', '10.0.1.21')).status, 200, 'CEP do cache não gasta vaga');
  assert.equal((await pedir('50000001', '10.0.1.21')).status, 404, 'nem o que não existe');
});
