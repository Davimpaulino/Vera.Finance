import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// CEP → cidade e coordenadas (GeoModel.porCep). ViaCEP e Nominatim respondem de mentira, no estilo
// do test/redesPublicas.test.js. Nada sai para a internet.
const CEPS = {
  13334100: { logradouro: 'Rua das Flores', bairro: 'Centro', localidade: 'Indaiatuba', uf: 'SP' }
};

const consultas = [];
let viaCepFora = false;
globalThis.fetch = async endereco => {
  const url = new URL(String(endereco));
  consultas.push(url.hostname);
  // Responde um pouco depois, para os pedidos simultâneos chegarem antes da resposta.
  await new Promise(resolver => setTimeout(resolver, 20));
  const json = corpo => ({ ok: true, status: 200, json: async () => corpo });
  if (url.hostname === 'viacep.com.br') {
    if (viaCepFora) throw new Error('ViaCEP fora do ar');
    return json(CEPS[url.pathname.split('/')[2]] || { erro: true });
  }
  if (url.hostname === 'nominatim.openstreetmap.org') return json([{ lat: '-23.0904', lon: '-47.2181' }]);
  throw new Error(`fetch inesperado: ${url}`);
};

const { GeoModel } = await import('../src/models/GeoModel.js');
const vezes = host => consultas.filter(consulta => consulta === host).length;

beforeEach(() => {
  GeoModel.limparCache();
  consultas.length = 0;
  viaCepFora = false;
});

test('dois pedidos do mesmo CEP ao mesmo tempo fazem uma consulta só ao ViaCEP e ao Nominatim', async () => {
  // O cadastro guiado pede os mercados e o raio do mesmo CEP juntos.
  const [a, b] = await Promise.all([GeoModel.porCep('13334-100'), GeoModel.porCep('13334100')]);
  assert.deepEqual(a, { cidade: 'Indaiatuba - SP', lat: -23.0904, lng: -47.2181 });
  assert.deepEqual(b, a);
  assert.equal(vezes('viacep.com.br'), 1);
  assert.equal(vezes('nominatim.openstreetmap.org'), 1);

  // Depois, a resposta sai do cache.
  await GeoModel.porCep('13334-100');
  assert.equal(consultas.length, 2);
});

test('a consulta em andamento sai da fila quando termina, mesmo sem resposta para guardar', async () => {
  viaCepFora = true;
  assert.deepEqual(
    await Promise.all([GeoModel.consultarCep('13334-100'), GeoModel.consultarCep('13334-100')]),
    [{ erro: 'falhou' }, { erro: 'falhou' }]
  );
  assert.equal(vezes('viacep.com.br'), 1);

  // O ViaCEP voltou: o próximo pedido consulta de novo, em vez de reusar a consulta que falhou.
  viaCepFora = false;
  assert.equal((await GeoModel.porCep('13334-100')).cidade, 'Indaiatuba - SP');
  assert.equal(vezes('viacep.com.br'), 2);
});

test('CEPs diferentes ao mesmo tempo fazem cada um a sua consulta', async () => {
  await Promise.all([GeoModel.consultarCep('13334-100'), GeoModel.consultarCep('99999-999')]);
  assert.equal(vezes('viacep.com.br'), 2);
});
