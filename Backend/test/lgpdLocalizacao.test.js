import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

await import('./apoio/ambiente.js');

// A Política de Privacidade diz que dá para apagar a localização em Configurações: o CEP em
// branco apaga o CEP, o ponto aproximado e a cidade do perfil. Apagar não consulta nenhum mapa.
const externos = [];
const fetchDeVerdade = globalThis.fetch;
globalThis.fetch = async (endereco, opcoes = {}) => {
  const url = new URL(String(endereco));
  if (url.hostname === 'localhost') return fetchDeVerdade(endereco, opcoes);
  externos.push(url.href);
  throw new Error(`fetch inesperado: ${url}`);
};

const { handle } = await import('../src/app.js');
const { banco } = await import('../src/config/banco.js');
const { CredencialModel } = await import('../src/models/CredencialModel.js');
const { UsuarioModel } = await import('../src/models/UsuarioModel.js');
const { GeoModel } = await import('../src/models/GeoModel.js');
const { MercadoModel } = await import('../src/models/MercadoModel.js');
const { VERSAO_DOS_TERMOS } = await import('../src/config/termos.js');

const UID = 'local-lia';
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

before(async () => {
  await CredencialModel.cadastrar({ email: 'lia@local.teste', senha: 'senha1234', nome: 'Lia', uid: UID });
  server = createServer(handle).listen(0);
  base = `http://localhost:${server.address().port}/api`;
  const entrada = await fetch(`${base}/auth/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'lia@local.teste', senha: 'senha1234' })
  });
  token = (await entrada.json()).token;
});
after(() => server.close());

test('PATCH /api/me com o CEP em branco apaga o CEP, o ponto e a cidade do perfil', async () => {
  await banco.gravar(`usuarios/${UID}/perfil`, {
    nome: 'Lia',
    email: 'lia@local.teste',
    plano: 'gratis',
    onboardingCompleto: true,
    termosAceitos: { versao: VERSAO_DOS_TERMOS, em: new Date().toISOString() },
    local: {
      cep: '13334-100',
      cidade: 'Indaiatuba - SP',
      lat: -23.09,
      lng: -47.218,
      raioKm: 10,
      mercados: ['osm-n1'],
      mercadoHabitual: 'osm-n1'
    }
  });

  const resposta = await chamar('PATCH', '/me', { local: { cep: '' } });
  assert.equal(resposta.status, 200);
  assert.equal(resposta.body.local.cep, '');
  for (const campo of ['lat', 'lng', 'cidade'])
    assert.equal(Object.hasOwn(resposta.body.local, campo), false, `${campo} sai da resposta`);

  // No banco a chave some (null na mescla), em vez de ficar gravada como nula: lat e lng nulos
  // virariam o ponto 0,0 para quem lê com Number().
  const gravado = await banco.ler(`usuarios/${UID}/perfil/local`);
  assert.deepEqual(gravado, { cep: '', raioKm: 10, mercados: ['osm-n1'], mercadoHabitual: 'osm-n1' });
  assert.equal(GeoModel.temCoordenadas((await UsuarioModel.buscar(UID)).local), false);
  assert.deepEqual(externos, [], 'apagar não consulta ViaCEP nem Nominatim');

  // Sem o ponto, não há mercados perto, e a lista não consulta o mapa (nem em volta do 0,0).
  const { local } = await UsuarioModel.buscar(UID);
  assert.deepEqual(await MercadoModel.daRegiao(local.raioKm, local), { modo: 'semLocal', mercados: [] });
  assert.equal((await chamar('GET', '/lista')).status, 200);
  assert.deepEqual(externos, []);
});

test('CEP em branco junto com a localização do aparelho guarda o ponto do aparelho', async () => {
  const resposta = await chamar('PATCH', '/me', { local: { cep: '', lat: -23.0904567, lng: -47.2181234 } });
  assert.equal(resposta.status, 200);
  assert.deepEqual([resposta.body.local.lat, resposta.body.local.lng], [-23.09, -47.218]);
});
