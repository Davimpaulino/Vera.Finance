import { afterEach, describe, expect, it, vi } from 'vitest';
import { REDES_COM_PRECO, SITE_URL, urlDoSite } from '../src/lib/site.js';
import { REDES } from '../../Backend/src/models/RedeModel.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('endereço do site', () => {
  it('sem VITE_SITE_URL usa o endereço do Render', async () => {
    // Quem tem VITE_SITE_URL no Frontend/.env (domínio próprio) roda este teste do mesmo jeito.
    vi.stubEnv('VITE_SITE_URL', '');
    vi.resetModules();
    const site = await import('../src/lib/site.js');
    expect(site.SITE_URL).toBe('https://vera-finance.onrender.com');
  });

  it('urlDoSite monta o link absoluto com uma barra só', () => {
    expect(urlDoSite('/precos')).toBe(`${SITE_URL}/precos`);
    expect(urlDoSite('precos')).toBe(`${SITE_URL}/precos`);
    expect(urlDoSite()).toBe(`${SITE_URL}/`);
  });

  it('VITE_SITE_URL troca o domínio e perde a barra do fim', async () => {
    vi.stubEnv('VITE_SITE_URL', 'https://vera.exemplo.com.br/');
    const site = await import('../src/lib/site.js');
    expect(site.SITE_URL).toBe('https://vera.exemplo.com.br');
    expect(site.urlDoSite('/termos')).toBe('https://vera.exemplo.com.br/termos');
  });
});

describe('redes com preço online', () => {
  it('a lista do site é a mesma da API, na mesma ordem', () => {
    // Se uma rede entrar ou sair em Backend/src/models/RedeModel.js, a landing e as perguntas
    // precisam mudar junto (elas contam e listam as redes daqui).
    expect(REDES_COM_PRECO).toEqual(REDES.map(rede => rede.nome));
  });

  it('não repete rede', () => {
    expect(new Set(REDES_COM_PRECO).size).toBe(REDES_COM_PRECO.length);
  });
});
