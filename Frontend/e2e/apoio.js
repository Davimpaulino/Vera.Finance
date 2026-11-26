// Peças comuns dos testes de ponta a ponta.
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export { expect };

// Fora daqui (Firebase, fontes do Google) nada sai da máquina: o teste não depende da internet.
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//;
const FIREBASE_AUTH = /identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/;

/**
 * `page` com a rede de teste: o Firebase Auth responde como um projeto sem o login ligado
 * (CONFIGURATION_NOT_FOUND). É o caso em que servicoDeLogin cai no login próprio da API.
 */
export const test = base.extend({
  page: async ({ page }, usar) => {
    await page.route(
      url => !LOCAL.test(url.href),
      rota =>
        FIREBASE_AUTH.test(rota.request().url())
          ? rota.fulfill({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify({ error: { code: 400, message: 'CONFIGURATION_NOT_FOUND' } })
            })
          : rota.abort('blockedbyclient')
    );
    await usar(page);
  }
});

/** Escolhe a superfície antes de a página abrir, como se a pessoa já tivesse trocado antes. */
export const usarTema = (page, tema) =>
  page.addInitScript(t => {
    try {
      localStorage.setItem('vera.tema', t);
    } catch {
      /* sem storage */
    }
  }, tema);

/** Roda o axe-core com as regras da WCAG 2.1 AA e devolve um resumo legível das violações. */
export async function violacoesWcag(page, { excluir = [] } = {}) {
  let axe = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  for (const seletor of excluir) axe = axe.exclude(seletor);
  const { violations } = await axe.analyze();
  return violations.map(v => ({
    regra: v.id,
    impacto: v.impact,
    ajuda: v.help,
    onde: v.nodes.slice(0, 5).map(n => n.target.join(' '))
  }));
}

/** E-mail que não se repete entre execuções, para cada teste criar a própria conta. */
export const emailNovo = prefixo => `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@exemplo.com`;
