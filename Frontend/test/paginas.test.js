import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PAGINAS,
  ROTAS_PUBLICAS,
  caminhoPublico,
  ehPreRenderizada,
  metaDaPagina,
  urlDaPagina
} from '../src/lib/paginas.js';
import { SITE_URL } from '../src/lib/site.js';
import { precisaDeLogin } from '../src/lib/rotas.js';
import { ARTIGOS } from '../src/conteudo/index.js';

describe('páginas públicas', () => {
  it('toda rota pré-renderizada tem título e descrição próprios', () => {
    expect(ROTAS_PUBLICAS).toEqual(Object.keys(PAGINAS));
    expect(ROTAS_PUBLICAS).toContain('/');
    for (const rota of ROTAS_PUBLICAS) {
      const [titulo, descricao] = PAGINAS[rota];
      expect(titulo, rota).toMatch(/\S/);
      expect(descricao, rota).toMatch(/\S/);
    }
    const titulos = ROTAS_PUBLICAS.map(rota => PAGINAS[rota][0]);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it('metaDaPagina devolve título, descrição, canonical no endereço público e robots', () => {
    expect(metaDaPagina('/precos')).toEqual({
      titulo: PAGINAS['/precos'][0],
      descricao: PAGINAS['/precos'][1],
      canonical: `${SITE_URL}/precos/`,
      robots: 'index, follow'
    });
    expect(metaDaPagina('/').canonical).toBe(`${SITE_URL}/`);
  });

  it('a área logada fica fora da busca', () => {
    expect(metaDaPagina('/app').robots).toBe('noindex, nofollow');
    expect(metaDaPagina('/app/lista').robots).toBe('noindex, nofollow');
    expect(metaDaPagina('/onboarding').robots).toBe('noindex, nofollow');
  });

  it('caminho desconhecido usa o título da marca e a descrição da home', () => {
    const meta = metaDaPagina('/nao-existe');
    expect(meta.titulo).toBe('vera.finance');
    expect(meta.descricao).toBe(PAGINAS['/'][1]);
  });
});

describe('rotas com login', () => {
  it('só entrar, cadastro e o app ligam o login (e baixam o Firebase)', () => {
    for (const rota of ['/entrar', '/cadastro', '/cadastro/perguntas', '/app', '/app/lista'])
      expect(precisaDeLogin(rota), rota).toBe(true);
    for (const rota of ['/', '/precos', '/perguntas', '/termos', '/privacidade', '/aplicativo', '/entrarx'])
      expect(precisaDeLogin(rota), rota).toBe(false);
  });

  it('nenhuma página pública só de conteúdo liga o login', () => {
    const doSite = ROTAS_PUBLICAS.filter(rota => !['/entrar', '/cadastro'].includes(rota));
    for (const rota of doSite) expect(precisaDeLogin(rota), rota).toBe(false);
  });
});

describe('barra no fim das páginas pré-renderizadas', () => {
  const PRE_RENDERIZADAS = [...ROTAS_PUBLICAS, ...ARTIGOS.map(artigo => artigo.caminho)];

  it('toda rota do build, menos a home, conta como pré-renderizada', () => {
    for (const rota of PRE_RENDERIZADAS) expect(ehPreRenderizada(rota), rota).toBe(rota !== '/');
  });

  it('caminhoPublico põe a barra nelas e guarda a busca e o "#"', () => {
    expect(caminhoPublico('/precos')).toBe('/precos/');
    expect(caminhoPublico('/precos/')).toBe('/precos/');
    expect(caminhoPublico('/precos?plano=anual#tabela')).toBe('/precos/?plano=anual#tabela');
    expect(caminhoPublico('/precos#tabela')).toBe('/precos/#tabela');
    expect(caminhoPublico('/onde-funciona/sao-paulo-sp')).toBe('/onde-funciona/sao-paulo-sp/');
    expect(caminhoPublico('/ajuda/ler-nota-fiscal')).toBe('/ajuda/ler-nota-fiscal/');
    expect(caminhoPublico('/cadastro')).toBe('/cadastro/');
    for (const rota of PRE_RENDERIZADAS.filter(rota => rota !== '/'))
      expect(caminhoPublico(rota)).toBe(`${rota}/`);
  });

  it('a home, o app, as perguntas do cadastro e o que é de fora ficam como vieram', () => {
    for (const endereco of [
      '/',
      '/app',
      '/app/lista',
      '/app/comparar?produto=Arroz',
      '/cadastro/perguntas',
      '/onboarding',
      '/nao-existe',
      '/onde-funciona/cidade-que-nao-existe',
      '/ajuda/Com_Maiuscula',
      '#conteudo',
      'mailto:a@b.c',
      'https://exemplo.com/precos',
      '//exemplo.com/precos'
    ])
      expect(caminhoPublico(endereco), endereco).toBe(endereco);
  });

  it('canonical e urlDaPagina usam a forma com a barra', () => {
    expect(urlDaPagina('/')).toBe(`${SITE_URL}/`);
    expect(urlDaPagina('/blog')).toBe(`${SITE_URL}/blog/`);
    expect(metaDaPagina('/ajuda').canonical).toBe(`${SITE_URL}/ajuda/`);
    expect(metaDaPagina('/app').canonical).toBe(`${SITE_URL}/app`);
  });

  it('o sitemap.xml e o llms.txt, escritos à mão, estão na forma pública', () => {
    // Pelo caminho no disco: o Vite trata um new URL('../public/...') como arquivo servido em "/".
    const publico = nome => readFileSync(join(process.cwd(), 'public', nome), 'utf8');
    const doMarcador = link => link.replace('__SITE_URL__', '');
    const locs = [...publico('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) =>
      doMarcador(loc.trim())
    );
    const llms = [...publico('llms.txt').matchAll(/\((__SITE_URL__[^)]*)\)/g)].map(([, link]) =>
      doMarcador(link)
    );
    expect(locs.length).toBeGreaterThan(10);
    for (const caminho of [...locs, ...llms]) {
      expect(caminho, caminho).toBe(caminhoPublico(caminho.replace(/(.)\/$/, '$1')));
      expect(PRE_RENDERIZADAS, caminho).toContain(caminho.replace(/(.)\/$/, '$1'));
    }
  });
});
