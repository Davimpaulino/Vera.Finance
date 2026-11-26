import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// O service worker do site (Frontend/public/sw.js) roda aqui com self, caches e fetch de mentira.
// O Frontend não tem testes próprios; o mesmo vale para redesSite.test.js.
const ORIGEM = 'https://site.teste';
const codigo = await readFile(new URL('../../Frontend/public/sw.js', import.meta.url), 'utf8');

const resposta = (tipo, corpo = '') => ({
  ok: true,
  status: 200,
  redirected: false,
  type: 'basic',
  corpo,
  headers: new Headers({ 'content-type': tipo }),
  clone() {
    return this;
  }
});

function carregarSw(rede) {
  const guardados = new Map();
  const chave = pedido => new URL(typeof pedido === 'string' ? pedido : pedido.url, ORIGEM).href;
  const cache = {
    add: async url => guardados.set(chave(url), await rede({ url: chave(url) })),
    put: async (pedido, valor) => guardados.set(chave(pedido), valor),
    match: async pedido => guardados.get(chave(pedido))
  };
  const ouvintes = {};
  const self = {
    location: new URL(ORIGEM),
    addEventListener: (tipo, fn) => (ouvintes[tipo] = fn),
    skipWaiting: async () => {},
    clients: { claim: async () => {} }
  };
  const caches = { open: async () => cache, match: cache.match, keys: async () => [], delete: async () => true };
  vm.runInNewContext(codigo, { self, caches, fetch: pedido => rede(pedido), URL, Response });

  // Dispara um fetch e devolve a resposta que o SW entregou (ou null se deixou passar direto).
  const buscar = async (caminho, { mode = 'cors', headers = {} } = {}) => {
    let entregue = null;
    ouvintes.fetch({
      request: { method: 'GET', url: ORIGEM + caminho, mode, headers: new Headers(headers) },
      respondWith: promessa => (entregue = promessa)
    });
    const final = entregue && (await entregue);
    await new Promise(pronto => setImmediate(pronto)); // guardar() não é esperado pelo SW
    return final;
  };
  const instalar = async () => {
    let espera;
    ouvintes.install({ waitUntil: promessa => (espera = promessa) });
    await espera;
  };
  return { buscar, instalar, guardados };
}

test('sw.js não guarda HTML no lugar de um arquivo de /assets/', async () => {
  // Arquivo de um build antigo: o rewrite do servidor devolve 200 com a casca do app.
  const sw = carregarSw(async () => resposta('text/html; charset=utf-8', '<!doctype html>'));
  const entregue = await sw.buscar('/assets/index-antigo.js');
  assert.equal(entregue.corpo, '<!doctype html>');
  assert.equal(sw.guardados.has(`${ORIGEM}/assets/index-antigo.js`), false);
});

test('sw.js guarda os arquivos de /assets/ e entrega do cache depois', async () => {
  let pedidos = 0;
  const sw = carregarSw(async () => {
    pedidos += 1;
    return resposta('text/javascript', 'console.log(1)');
  });
  await sw.buscar('/assets/index-abc.js');
  const segunda = await sw.buscar('/assets/index-abc.js');
  assert.equal(segunda.corpo, 'console.log(1)');
  assert.equal(pedidos, 1);
});

test('sw.js deixa a API e os pedidos com login passarem direto', async () => {
  const sw = carregarSw(async () => resposta('application/json', '{}'));
  assert.equal(await sw.buscar('/api/me'), null);
  assert.equal(await sw.buscar('/assets/x.js', { headers: { Authorization: 'Bearer t' } }), null);
  assert.equal(sw.guardados.size, 0);
});

test('sw.js sem internet abre a casca do app nas páginas que não estão guardadas', async () => {
  let online = true;
  const sw = carregarSw(async pedido => {
    if (!online) throw new TypeError('Failed to fetch');
    return resposta('text/html', `pagina ${new URL(pedido.url).pathname}`);
  });
  await sw.instalar();
  assert.ok(sw.guardados.has(`${ORIGEM}/app.html`));
  online = false;
  const entregue = await sw.buscar('/app/metas', { mode: 'navigate' });
  assert.equal(entregue.corpo, 'pagina /app.html');
});
