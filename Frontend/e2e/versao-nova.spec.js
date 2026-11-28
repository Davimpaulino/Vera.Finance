// Deploy com a aba aberta: o pedaço do Firebase que a página conhece sumiu e o servidor responde
// 200 com o HTML da casca (como o Render faz com um /assets/ que não existe mais). A página
// recarrega sozinha, pega o build atual e a tela Entrar abre; não fica presa em "Sem conexão".
import { expect, test } from './apoio.js';

const PEDACO_DO_FIREBASE = /\/assets\/firebase-[\w-]+\.js$/;
const CASCA = '<!doctype html><html lang="pt-BR"><title>vera</title><div id="root"></div></html>';

/** As primeiras `falhas` vezes o pedaço do Firebase volta como HTML; depois, o arquivo de verdade. */
async function pedacoSumiu(page, falhas) {
  const pedidos = { total: 0 };
  await page.route(PEDACO_DO_FIREBASE, rota => {
    pedidos.total += 1;
    if (pedidos.total <= falhas)
      return rota.fulfill({ status: 200, contentType: 'text/html', body: CASCA });
    return rota.continue();
  });
  return pedidos;
}

const entrarNoMenu = page =>
  page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Entrar' });

test('a aba aberta antes do deploy recarrega e abre a tela Entrar', async ({ page }) => {
  const pedidos = await pedacoSumiu(page, 1);
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(pedidos.total).toBe(0);

  const recarregou = page.waitForEvent('load');
  await entrarNoMenu(page).click();
  await recarregou;

  await expect(page).toHaveURL(/\/entrar\/$/);
  // O segundo pedido é o da página recarregada, que já recebeu o arquivo de verdade.
  await expect.poll(() => pedidos.total).toBe(2);
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sem conexão' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continuar com Google' })).toBeEnabled();
});

test('se falhar de novo logo depois de recarregar, para em "Sem conexão" e "Tentar de novo" recarrega', async ({ page }) => {
  const pedidos = await pedacoSumiu(page, 2);
  await page.goto('/', { waitUntil: 'networkidle' });
  await entrarNoMenu(page).click();

  // Recarregou uma vez sozinho e falhou de novo: não entra em laço.
  await expect(page.getByRole('heading', { level: 1, name: 'Sem conexão' })).toBeVisible();
  expect(pedidos.total).toBe(2);
  await page.waitForTimeout(1_000);
  expect(pedidos.total).toBe(2);

  // "Tentar de novo" recarrega a página (pedir o mesmo arquivo de novo não adiantaria).
  const recarregou = page.waitForEvent('load');
  await page.getByRole('button', { name: 'Tentar de novo' }).click();
  await recarregou;
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
  await expect.poll(() => pedidos.total).toBe(3);
  await expect(page.getByRole('heading', { name: 'Sem conexão' })).toHaveCount(0);
});
