import { describe, expect, it } from 'vitest';
import { PAGINAS, ROTAS_PUBLICAS, metaDaPagina } from '../src/lib/paginas.js';
import { SITE_URL } from '../src/lib/site.js';
import { precisaDeLogin } from '../src/lib/rotas.js';

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
      canonical: `${SITE_URL}/precos`,
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
