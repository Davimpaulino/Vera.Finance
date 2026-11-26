import { defineConfig, devices } from '@playwright/test';
import { PORTA_API, PORTA_SITE } from './e2e/portas.js';

// Testes de ponta a ponta (npm run test:e2e). Sobem a API com o banco em memória e o site
// pelo build de produção (vite preview), cada um numa porta só dele (e2e/portas.js): nunca usam
// um servidor que já esteja rodando, para não gravar contas de teste num banco de verdade.
// Antes da primeira vez: npx playwright install chromium

export default defineConfig({
  testDir: 'e2e',
  // A API em memória é uma só para todos os testes; cada teste cria a própria conta.
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORTA_SITE}`,
    // O service worker guardaria páginas e arquivos de um teste para o outro.
    serviceWorkers: 'block',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // Sem animação: o axe mede o contraste das cores finais, não de um elemento no meio do fade.
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node src/server.js',
      cwd: '../Backend',
      url: `http://localhost:${PORTA_API}/api/saude`,
      env: {
        BANCO: 'memoria',
        PORT: String(PORTA_API),
        CORS_ORIGIN: `http://localhost:${PORTA_SITE}`,
        NODE_ENV: 'test'
      },
      reuseExistingServer: false,
      timeout: 30_000
    },
    {
      // O build aponta o site para a API de teste (VITE_API_URL) e grava em dist/.
      command: `npm run build && npx vite preview --port ${PORTA_SITE} --strictPort`,
      url: `http://localhost:${PORTA_SITE}`,
      env: { VITE_API_URL: `http://localhost:${PORTA_API}` },
      reuseExistingServer: false,
      timeout: 180_000
    }
  ]
});
