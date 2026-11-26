import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REDES } from '../src/models/RedeModel.js';
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

// Regra de docs/marca.md: rede citada vem junto de "A vera não tem vínculo com as redes citadas."
// Alguns nomes de rede também são cidade, bairro ou palavra comum (São Vicente, Zona Sul,
// Confiança, Coop, Pão de Açúcar). Se o artigo usa o nome nesse outro sentido, ponha aqui o
// caminho do artigo e o nome, e o teste deixa de pedir o aviso por ele.
const NAO_E_A_REDE = {
  // '/blog/exemplo': ['São Vicente'] (a cidade, não a rede)
};

const escapar = nome => nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cita = (texto, nome) => new RegExp(`(?<!\\p{L})${escapar(nome)}(?!\\p{L})`, 'u').test(texto);

/** Redes que o artigo cita sem o aviso de vínculo, fora as de outroSentido[caminho]. */
function redesSemAviso(artigo, outroSentido) {
  const texto = JSON.stringify(artigo).replace(/’/g, "'");
  if (/(Sem|não tem) vínculo com as redes citadas/.test(texto)) return [];
  const excecoes = outroSentido[artigo.caminho] || [];
  return REDES.map(rede => rede.nome).filter(nome => !excecoes.includes(nome) && cita(texto, nome));
}

test('artigo que cita uma rede traz o aviso de que a vera não tem vínculo com ela', () => {
  for (const artigo of ARTIGOS) {
    const citadas = redesSemAviso(artigo, NAO_E_A_REDE);
    assert.deepEqual(
      citadas,
      [],
      `${artigo.caminho} cita ${citadas.join(', ')} sem o aviso "A vera não tem vínculo com as ` +
        'redes citadas.". Se ali o nome é a cidade, o bairro ou uma palavra comum, e não a rede, ' +
        'ponha o caminho e o nome em NAO_E_A_REDE (Backend/test/conteudo.test.js).'
    );
  }
  // Exceção só de artigo que existe e de nome que é de rede: senão ela não vale para nada.
  const caminhos = ARTIGOS.map(artigo => artigo.caminho);
  const nomes = REDES.map(rede => rede.nome);
  for (const [caminho, excecoes] of Object.entries(NAO_E_A_REDE)) {
    assert.ok(caminhos.includes(caminho), `NAO_E_A_REDE: ${caminho} não é um artigo`);
    for (const nome of excecoes)
      assert.ok(nomes.includes(nome), `NAO_E_A_REDE: ${nome} não é nome de rede`);
  }
});

test('aviso de vínculo: a cidade de São Vicente passa só com a exceção do artigo', () => {
  const artigo = { caminho: '/blog/teste', corpo: ['Em São Vicente, a feira é no domingo.'] };
  assert.deepEqual(redesSemAviso(artigo, {}), ['São Vicente']);
  assert.deepEqual(redesSemAviso(artigo, { '/blog/teste': ['São Vicente'] }), []);
  // A exceção vale só para o nome listado: a rede citada no mesmo artigo ainda pede o aviso.
  const comRede = { ...artigo, corpo: [...artigo.corpo, "O Sam's Club fica perto."] };
  assert.deepEqual(redesSemAviso(comRede, { '/blog/teste': ['São Vicente'] }), ["Sam's Club"]);
  const aviso = 'A vera não tem vínculo com as redes citadas.';
  assert.deepEqual(redesSemAviso({ ...comRede, corpo: [...comRede.corpo, aviso] }, {}), []);
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
