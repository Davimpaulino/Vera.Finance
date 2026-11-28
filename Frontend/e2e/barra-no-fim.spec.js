// Barra no fim das páginas pré-renderizadas. O npm run preview responde como o Render
// (scripts/como-o-render.mjs): /precos/ abre dist/precos/index.html; /precos, sem a barra, cai no
// rewrite e recebe a casca do app (dist/app.html), que leva para /precos/ antes do bundle.
import { expect, test } from './apoio.js';

// Títulos de src/lib/paginas.js (PAGINAS).
const TITULO_DOS_PRECOS = 'Planos e preços · vera.finance';
const TITULO_DE_SAO_PAULO = 'Comparar preço de supermercado em São Paulo · vera.finance';

const TITULO_DA_CASCA = 'vera.finance';

test('o servidor responde como o Render: sem a barra é a casca, com a barra é a página pronta', async ({
  request
}) => {
  const semBarra = await (await request.get('/precos')).text();
  expect(semBarra).toContain(`<title>${TITULO_DA_CASCA}</title>`);
  expect(semBarra).toContain('noindex, nofollow');
  expect(semBarra).toContain('<div id="root"></div>');

  const comBarra = await (await request.get('/precos/')).text();
  expect(comBarra).toContain(`<title>${TITULO_DOS_PRECOS}</title>`);
  expect(comBarra).toMatch(/<link rel="canonical" href="[^"]*\/precos\/" \/>/);
  expect(comBarra).toContain('index, follow');
});

test('/precos leva para /precos/, com o título da página', async ({ page }) => {
  await page.goto('/precos', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/precos\/$/);
  await expect(page).toHaveTitle(TITULO_DOS_PRECOS);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/precos\/$/);
});

test('a busca e o "#" vão junto', async ({ page }) => {
  await page.goto('/onde-funciona/sao-paulo-sp?origem=teste#redes', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/onde-funciona\/sao-paulo-sp\/\?origem=teste#redes$/);
  await expect(page).toHaveTitle(TITULO_DE_SAO_PAULO);
});

test('um artigo sem a barra também chega na página pronta', async ({ page }) => {
  await page.goto('/ajuda/ler-nota-fiscal', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/ajuda\/ler-nota-fiscal\/$/);
  await expect(page.locator('h1')).toBeVisible();
});

test('/app continua na casca, sem barra e fora da busca', async ({ page }) => {
  await page.goto('/app');
  // Sem sessão o app manda para Entrar; o que importa é não ter passado por /app/.
  await expect(page).toHaveURL(/\/entrar\/$/);
  const visitados = [];
  page.on('framenavigated', quadro => {
    if (quadro === page.mainFrame()) visitados.push(new URL(quadro.url()).pathname);
  });
  await page.goto('/app/lista');
  await expect(page).toHaveURL(/\/entrar\/$/);
  expect(visitados).not.toContain('/app/lista/');
});

test('a casca não mexe no endereço das rotas do app nem nos desconhecidos', async ({ page }) => {
  // Sem JavaScript do app (só o script da casca), o endereço fica como veio.
  await page.route(/\/assets\/.*\.js$/, rota => rota.abort());
  for (const caminho of ['/app', '/app/lista', '/cadastro/perguntas', '/nao-existe']) {
    await page.goto(caminho);
    await expect(page).toHaveTitle(TITULO_DA_CASCA);
    expect(new URL(page.url()).pathname).toBe(caminho);
  }
  await page.goto('/termos');
  await expect(page).toHaveURL(/\/termos\/$/);
});

test('os links do site saem com a barra no fim', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const links = await page
    .locator('a[href^="/"]')
    .evaluateAll(as => [...new Set(as.map(a => a.getAttribute('href')))]);
  for (const href of links) {
    const caminho = href.split(/[?#]/)[0];
    if (caminho === '/' || caminho.startsWith('/app')) continue;
    expect(caminho, href).toMatch(/\/$/);
  }
});
