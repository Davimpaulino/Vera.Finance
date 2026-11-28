import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  EMAIL_DE_CONTATO,
  INSTAGRAM,
  REDES_COM_PRECO,
  SITE_PADRAO,
  SITE_URL,
  WHATSAPP,
  urlDoSite
} from '../src/lib/site.js';
import { REDES } from '../../Backend/src/models/RedeModel.js';
import { EMAIL_DE_CONTATO as EMAIL_DOS_EMAILS } from '../../Backend/src/emails/index.js';
import { SITE_PADRAO as SITE_PADRAO_DA_API } from '../../Backend/src/config/site.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('endereço do site', () => {
  it('sem VITE_SITE_URL usa o endereço do site no Render', async () => {
    // Quem tem VITE_SITE_URL no Frontend/.env (domínio próprio) roda este teste do mesmo jeito.
    vi.stubEnv('VITE_SITE_URL', '');
    vi.resetModules();
    const site = await import('../src/lib/site.js');
    expect(site.SITE_URL).toBe('https://vera-finance-vlto.onrender.com');
  });

  it('o padrão é o mesmo na API (SITE_URL) e nunca o endereço da API', () => {
    expect(SITE_PADRAO_DA_API).toBe(SITE_PADRAO);
    expect(SITE_PADRAO).not.toBe('https://vera-finance-api.onrender.com');
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

describe('contatos', () => {
  const ler = caminho => readFileSync(new URL(caminho, import.meta.url), 'utf8');

  it('o JSON-LD da organização (index.html) tem o e-mail, o Instagram e o telefone de lib/site.js', () => {
    const blocos = [...ler('../index.html').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    const organizacao = blocos.map(([, json]) => JSON.parse(json)).find(d => d['@type'] === 'Organization');
    expect(organizacao.email).toBe(EMAIL_DE_CONTATO);
    expect(organizacao.sameAs).toEqual([INSTAGRAM.link]);
    expect(organizacao.contactPoint).toMatchObject({
      '@type': 'ContactPoint',
      telephone: WHATSAPP.telefone,
      contactType: 'customer support',
      availableLanguage: 'pt-BR'
    });
  });

  it('o llms.txt e os modelos de e-mail usam os mesmos contatos', () => {
    const llms = ler('../public/llms.txt');
    for (const texto of [EMAIL_DE_CONTATO, WHATSAPP.numero, WHATSAPP.link, INSTAGRAM.usuario, INSTAGRAM.link])
      expect(llms).toContain(texto);
    expect(EMAIL_DOS_EMAILS).toBe(EMAIL_DE_CONTATO);
  });

  it('o link do WhatsApp é o mesmo número do telefone', () => {
    const digitos = WHATSAPP.telefone.replace(/\D/g, '');
    expect(WHATSAPP.link).toBe(`https://wa.me/${digitos}`);
    expect(`55${WHATSAPP.numero.replace(/\D/g, '')}`).toBe(digitos);
  });
});
