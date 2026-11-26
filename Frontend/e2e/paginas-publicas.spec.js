// Páginas do site: não baixam o Firebase, a home só baixa as imagens do tema, e passam no axe.
import { expect, test, usarTema, violacoesWcag } from './apoio.js';

const DO_SITE = ['/', '/precos', '/perguntas', '/termos', '/privacidade'];
const PUBLICAS = [...DO_SITE, '/entrar', '/cadastro'];
const PEDACO_DO_FIREBASE = /\/assets\/firebase-[\w-]+\.js$/;

/** Abre a página e devolve os endereços pedidos e quantos bytes chegaram do próprio site. */
async function abrir(page, caminho) {
  const pedidos = [];
  let bytes = 0;
  page.on('requestfinished', async pedido => {
    pedidos.push(pedido.url());
    if (!pedido.url().startsWith('http://localhost')) return;
    const tamanhos = await pedido.sizes().catch(() => null);
    if (tamanhos) bytes += tamanhos.responseBodySize + tamanhos.responseHeadersSize;
  });
  await page.goto(caminho, { waitUntil: 'networkidle' });
  return { pedidos, bytes: () => bytes };
}

test.describe('desempenho', () => {
  for (const caminho of DO_SITE)
    test(`${caminho} não baixa o Firebase`, async ({ page }) => {
      const { pedidos } = await abrir(page, caminho);
      expect(pedidos.filter(url => PEDACO_DO_FIREBASE.test(url))).toEqual([]);
      await expect(page.locator('h1').first()).toBeVisible();
    });

  test('a tela Entrar baixa o Firebase (o login precisa dele)', async ({ page }) => {
    const { pedidos } = await abrir(page, '/entrar');
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
    await expect.poll(() => pedidos.some(url => PEDACO_DO_FIREBASE.test(url))).toBe(true);
  });

  test('a home baixa só as imagens dos celulares do tema atual', async ({ page }) => {
    const { pedidos, bytes } = await abrir(page, '/');
    await page.mouse.wheel(0, 20_000);
    await page.waitForLoadState('networkidle');
    const celulares = pedidos.filter(url => url.includes('/assets/celular-'));
    expect(celulares.length).toBeGreaterThan(0);
    expect(celulares.filter(url => url.includes('-papel-'))).toEqual([]);
    console.log(`home (tinta, 1280 px): ${(bytes() / 1024).toFixed(1)} KB baixados do site`);
  });

  test('no celular, a imagem escondida pelo CSS não é baixada', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { pedidos, bytes } = await abrir(page, '/');
    expect(pedidos.filter(url => url.includes('/assets/celular-comparar-'))).toEqual([]);
    console.log(`home (tinta, 390 px, sem rolar): ${(bytes() / 1024).toFixed(1)} KB baixados do site`);
  });

  test('no papel, as imagens do papel aparecem', async ({ page }) => {
    await usarTema(page, 'papel');
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('.phone--painel img')).toHaveAttribute('src', /-papel-/);
  });
});

test.describe('acessibilidade (WCAG 2.1 AA)', () => {
  for (const tema of ['tinta', 'papel'])
    for (const caminho of PUBLICAS)
      test(`${caminho} no ${tema}`, async ({ page }) => {
        await usarTema(page, tema);
        await page.goto(caminho, { waitUntil: 'networkidle' });
        expect(await violacoesWcag(page)).toEqual([]);
      });

  test('menu do celular aberto', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeVisible();
    expect(await violacoesWcag(page)).toEqual([]);
  });

  test('o primeiro Tab mostra "Pular para o conteúdo" e leva ao conteúdo', async ({ page }) => {
    await page.goto('/precos', { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    const pular = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(pular).toBeFocused();
    await expect(pular).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#conteudo')).toBeFocused();
  });

  test('o foco do teclado aparece no link e no botão', async ({ page }) => {
    await page.goto('/entrar', { waitUntil: 'networkidle' });
    const contorno = () =>
      page.evaluate(() => {
        const estilo = getComputedStyle(document.activeElement);
        return `${estilo.outlineStyle} ${estilo.outlineWidth}`;
      });
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'vera.finance — início' })).toBeFocused();
    expect(await contorno()).toBe('solid 2px');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Continuar com Google' })).toBeFocused();
    expect(await contorno()).toBe('solid 2px');
  });
});
