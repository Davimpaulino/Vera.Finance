// Do cadastro à comparação: o caminho de quem chega pela primeira vez, com a API de verdade
// (banco em memória) e o site do build de produção. O Firebase Auth responde como projeto sem
// login ligado, então o cadastro segue pelo login próprio da API (veja e2e/apoio.js).
import { PORTA_API } from './portas.js';
import { emailNovo, expect, test, violacoesWcag } from './apoio.js';

const API = new RegExp(`localhost:${PORTA_API}/`);

/** Cadastro com o aceite dos termos e as cinco perguntas, até o painel abrir. */
async function criarConta(page, { email = emailNovo('jornada'), axe } = {}) {
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill('Ana Teste');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-de-teste-123');

  // Sem o aceite dos termos a conta não sai.
  await page.getByRole('button', { name: 'Criar conta e continuar' }).click();
  await expect(page.getByRole('alert')).toContainText('confirme que tem 18 anos ou mais');
  await page.getByRole('checkbox', { name: /Tenho 18 anos ou mais/ }).check();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Criar conta e continuar' }).click();

  // Cadastro guiado, passo 1: renda.
  await expect(page).toHaveURL(/\/cadastro\/perguntas$/);
  await expect(page.getByRole('heading', { level: 1, name: /Quanto entra, e quando, Ana\?/ })).toBeVisible();
  if (axe) axe.push(['cadastro guiado', await violacoesWcag(page)]);
  await page.getByRole('textbox', { name: 'renda fixa do mês' }).fill('4.500,00');
  await page.getByRole('button', { name: 'Continuar' }).click();

  // 2: gastos fixos (pula).
  await expect(page.getByRole('heading', { level: 1, name: 'O que já sai sozinho?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // 3: divisão sugerida pela API.
  await expect(page.getByRole('heading', { level: 1, name: 'A vera sugere esta divisão' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Limite de / }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // 4: mercado (sem CEP, para não depender de mapa nem de rede).
  await expect(page.getByRole('heading', { level: 1, name: 'Onde você faz mercado?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // 5: plano.
  await expect(page.getByRole('heading', { level: 1, name: 'Escolha o plano' })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeVisible();
  await page.getByRole('button', { name: 'Abrir meu painel' }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible();
}

test('cadastro, aceite, cadastro guiado, lista e comparação', async ({ page }) => {
  const axe = [];
  await criarConta(page, { axe });
  axe.push(['painel', await violacoesWcag(page)]);

  // Novo gasto: o diálogo recebe o foco e o Esc devolve o foco para o botão.
  const novoGasto = page.getByRole('button', { name: 'Novo gasto' });
  await novoGasto.click();
  const dialogo = page.getByRole('dialog', { name: 'Novo gasto' });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole('textbox', { name: 'quanto foi' })).toBeFocused();
  axe.push(['novo gasto', await violacoesWcag(page)]);
  await page.keyboard.press('Escape');
  await expect(dialogo).toHaveCount(0);
  await expect(novoGasto).toBeFocused();

  await novoGasto.click();
  await dialogo.getByRole('textbox', { name: 'quanto foi' }).fill('25,90');
  await dialogo.getByRole('textbox', { name: 'Onde' }).fill('Padaria');
  await dialogo.getByRole('button', { name: 'Lançar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'R$ 25,90 lançados' })).toBeVisible();

  // Lista de compras: item sem marca (sem CEP não há mercado para buscar).
  await page.getByRole('link', { name: 'Lista de compras' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Lista de compras' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Buscar produto para a lista' }).fill('arroz');
  await page.getByRole('button', { name: 'Adicionar “arroz” sem escolher marca' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'arroz foi para a lista.' })).toBeVisible();
  await expect(page.locator('.lista-item__nome', { hasText: 'arroz' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Marcar arroz como comprado' })).toBeVisible();
  axe.push(['lista', await violacoesWcag(page)]);

  // A quantidade muda na hora.
  await page.getByRole('button', { name: 'Aumentar quantidade de arroz' }).click();
  await expect(page.locator('.lista-item__qtd')).toHaveText('2');

  // Comparar mercados abre (sem local, explica o que falta).
  await page.getByRole('link', { name: 'Comparar mercados' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Comparar mercados' })).toBeVisible();
  await expect(page.getByText('Não deu para carregar')).toHaveCount(0);
  axe.push(['comparar', await violacoesWcag(page)]);

  // Recarregar mantém a sessão e a lista.
  await page.goto('/app/lista');
  await expect(page.locator('.lista-item__nome', { hasText: 'arroz' })).toBeVisible();

  // A superfície papel também passa no axe.
  await page.getByRole('button', { name: 'Trocar superfície' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'papel');
  axe.push(['lista no papel', await violacoesWcag(page)]);
  await page.getByRole('link', { name: 'Painel' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible();
  axe.push(['painel no papel', await violacoesWcag(page)]);

  expect(axe.filter(([, violacoes]) => violacoes.length)).toEqual([]);
});

test('sem conexão com a API mostra "Sem conexão" e volta com "Tentar de novo"', async ({ page }) => {
  await criarConta(page, { email: emailNovo('offline') });

  // A API some (sem internet): a pessoa não é mandada para o login.
  await page.route(API, rota => rota.abort('internetdisconnected'));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Sem conexão' })).toBeVisible();
  await expect(page).toHaveURL(/\/app$/);
  // A tela tem saída: o logotipo leva ao site e quem tem sessão pode sair da conta.
  await expect(page.getByRole('link', { name: 'vera.finance — início' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('button', { name: 'Sair da conta' })).toBeVisible();
  expect(await violacoesWcag(page)).toEqual([]);

  // A conexão volta.
  await page.unroute(API);
  await page.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible();
});

/** Depois de sair: está na home, sem token guardado, e o app pede para entrar. */
async function saiu(page) {
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(() => localStorage.getItem('vera.token') || sessionStorage.getItem('vera.token'))
  ).toBeNull();
  await page.goto('/app');
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
}

test('quem sai da conta em Configurações volta para o site e entra de novo com a senha', async ({ page }) => {
  const email = emailNovo('entrar');
  await criarConta(page, { email });
  await page.goto('/app/configuracoes');
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await saiu(page);

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-de-teste-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible();
});

test('sair da conta funciona sem rede, em Configurações e na tela "Sem conexão"', async ({ page }) => {
  // Em Configurações, com a API caindo depois que a tela abriu.
  await criarConta(page, { email: emailNovo('sair-sem-rede') });
  await page.goto('/app/configuracoes');
  const sair = page.getByRole('button', { name: 'Sair da conta' });
  await expect(sair).toBeVisible();
  await page.route(API, rota => rota.abort('internetdisconnected'));
  await sair.click();
  await saiu(page);
  await page.unroute(API);

  // Na tela "Sem conexão", que ocupa o app inteiro quando a API não responde.
  await criarConta(page, { email: emailNovo('sair-sem-conexao') });
  await page.route(API, rota => rota.abort('internetdisconnected'));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Sem conexão' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await saiu(page);
});

test('"Ver o painel" na home leva quem já entrou direto para o app, sem passar pelo cadastro', async ({ page }) => {
  // Visitante: cria a conta.
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Ver o painel' }).click();
  await expect(page).toHaveURL(/\/cadastro$/);

  await criarConta(page, { email: emailNovo('ver-painel') });
  // Na home o login não liga; a página abre do zero, como quem volta ao site outro dia.
  await page.goto('/', { waitUntil: 'networkidle' });
  const enderecos = [];
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) enderecos.push(new URL(frame.url()).pathname);
  });
  await page.getByRole('button', { name: 'Ver o painel' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible();
  expect(enderecos).toEqual(['/app']);
});
