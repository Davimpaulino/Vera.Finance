import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REDES } from '../src/models/RedeModel.js';
import { ARTIGOS } from '../../Frontend/src/conteudo/index.js';
import { partesDoTexto, textoPuro, dataPorExtenso } from '../../Frontend/src/conteudo/formato.js';

// Páginas de conteúdo do site (Frontend/src/conteudo): o build gera uma página por artigo, mas o
// sitemap.xml e o llms.txt são escritos à mão. Artigo novo precisa entrar nos dois, senão o Google
// e as IAs demoram a achar. O Frontend não tem testes próprios (veja serviceWorker.test.js).
const raiz = new URL('../../Frontend/', import.meta.url);
const SITE = 'https://vera-finance.onrender.com';
const FIXAS = ['/onde-funciona', '/ajuda', '/blog'];

test('sitemap.xml tem as páginas de conteúdo e todos os artigos', async () => {
  const sitemap = await readFile(new URL('public/sitemap.xml', raiz), 'utf8');
  const locs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc.trim()));
  for (const caminho of [...FIXAS, ...ARTIGOS.map(artigo => artigo.caminho)])
    assert.ok(locs.has(`${SITE}${caminho}`), `${caminho} falta no sitemap.xml`);
});

test('llms.txt cita as páginas de conteúdo e todos os artigos', async () => {
  const llms = await readFile(new URL('public/llms.txt', raiz), 'utf8');
  for (const caminho of [...FIXAS, ...ARTIGOS.map(artigo => artigo.caminho)])
    assert.ok(llms.includes(`(${SITE}${caminho})`), `${caminho} falta no llms.txt`);
});

test('cada artigo tem caminho próprio, na ajuda ou no blog', () => {
  const caminhos = ARTIGOS.map(artigo => artigo.caminho);
  assert.equal(new Set(caminhos).size, caminhos.length, 'caminho repetido');
  for (const caminho of caminhos) assert.match(caminho, /^\/(ajuda|blog)\/[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(ARTIGOS.filter(artigo => artigo.secao === 'blog').every(post => post.publicadoEm));
});

test('a lista de atacados do site é a das redes de atacado do RedeModel', async () => {
  const site = await readFile(new URL('src/lib/site.js', raiz), 'utf8');
  const bloco = site.slice(site.indexOf('REDES_DE_ATACADO'));
  const nomes = [...bloco.slice(0, bloco.indexOf('];')).matchAll(/'([^']+)'|"([^"]+)"/g)].map(
    ([, a, b]) => a || b
  );
  assert.deepEqual(
    nomes,
    REDES.filter(rede => rede.tipo === 'atacado').map(rede => rede.nome)
  );
});

test('formato dos textos: links, texto puro e data por extenso', () => {
  assert.deepEqual(partesDoTexto('Veja [a ajuda](/ajuda) ou [o e-mail](mailto:a@b.c).'), [
    { texto: 'Veja ' },
    { texto: 'a ajuda', href: '/ajuda' },
    { texto: ' ou ' },
    { texto: 'o e-mail', href: 'mailto:a@b.c' },
    { texto: '.' }
  ]);
  assert.equal(textoPuro('Veja [a ajuda](/ajuda).'), 'Veja a ajuda.');
  // Sem new Date: no fuso do Brasil, "2026-11-26" não vira dia 25.
  assert.equal(dataPorExtenso('2026-11-26'), '26 de novembro de 2026');
  assert.equal(dataPorExtenso('2026-01-01'), '1 de janeiro de 2026');
});
