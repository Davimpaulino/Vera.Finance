import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ARTIGOS, problemasDoConteudo } from '../../Frontend/src/conteudo/index.js';
import { BLOG_NO_RODAPE } from '../../Frontend/src/conteudo/rodape.js';
import {
  partesDoTexto,
  textoPuro,
  dataPorExtenso,
  dataValida
} from '../../Frontend/src/conteudo/formato.js';

// Páginas de conteúdo do site (Frontend/src/conteudo): o build gera uma página por artigo, mas o
// sitemap.xml e o llms.txt são escritos à mão. Artigo novo precisa entrar nos dois, senão o Google
// e as IAs demoram a achar. Os testes do próprio Frontend ficam em Frontend/test (Vitest) e Frontend/e2e.
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

test('data dos artigos: AAAA-MM-DD que existe no calendário', () => {
  for (const data of ['2026-11-26', '2024-02-29', '2026-12-31']) assert.ok(dataValida(data), data);
  for (const data of ['2026-13-01', '2026-00-10', '2026-11-45', '2026-04-31', '2025-02-29'])
    assert.ok(!dataValida(data), data);
  for (const data of ['26/11/2026', '2026-11-26T10:00:00Z', '', null, undefined])
    assert.ok(!dataValida(data), String(data));
  // Data errada aparece como veio, nunca como "undefined de ...".
  assert.equal(dataPorExtenso('2026-13-01'), '2026-13-01');
  for (const artigo of ARTIGOS) {
    assert.ok(dataValida(artigo.publicadoEm), `${artigo.caminho}: publicadoEm`);
    if (artigo.secao === 'ajuda' || artigo.atualizadoEm !== undefined)
      assert.ok(dataValida(artigo.atualizadoEm), `${artigo.caminho}: atualizadoEm`);
  }
});

test('a conferência do build para em data que não existe ou fora de ordem', () => {
  const artigo = {
    secao: 'ajuda',
    caminho: '/ajuda/teste',
    slug: 'teste',
    titulo: 'Título',
    descricao: 'Descrição',
    resumo: 'Resumo',
    tipo: 'Article',
    corpo: ['Texto.'],
    publicadoEm: '2026-11-26',
    atualizadoEm: '2026-11-26'
  };
  const problemas = mudancas =>
    problemasDoConteudo([], [{ ...artigo, ...mudancas }], []).join(' | ');
  assert.equal(problemas({}), '');
  assert.match(problemas({ publicadoEm: '2026-13-01' }), /publicadoEm precisa ser uma data/);
  assert.match(problemas({ publicadoEm: undefined }), /publicadoEm precisa ser uma data/);
  assert.match(problemas({ atualizadoEm: '2026-02-30' }), /atualizadoEm precisa ser uma data/);
  assert.match(problemas({ atualizadoEm: undefined }), /falta o campo "atualizadoEm"/);
  assert.match(problemas({ atualizadoEm: '2026-11-01' }), /anterior ao publicadoEm/);
  // No blog, atualizadoEm é opcional.
  assert.equal(
    problemas({ secao: 'blog', caminho: '/blog/teste', atualizadoEm: undefined }),
    ''
  );
});

test('rodapé do site: só artigos do blog que existem', () => {
  const blog = ARTIGOS.filter(artigo => artigo.secao === 'blog').map(artigo => artigo.caminho);
  for (const [rotulo, caminho] of BLOG_NO_RODAPE) {
    assert.ok(rotulo, caminho);
    assert.ok(blog.includes(caminho), `${caminho} não é um artigo do blog`);
  }
  assert.deepEqual(
    problemasDoConteudo([], ARTIGOS, [['Sumiu', '/blog/nao-existe']]).filter(p =>
      p.startsWith('rodapé')
    ),
    ['rodapé (rodape.js): /blog/nao-existe não é um artigo do blog.']
  );
});
