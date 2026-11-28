import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { cssDosIcones } from './scripts/icones.mjs';
import { SITE_PADRAO } from './src/lib/site.js';

// O endereço público vem de VITE_SITE_URL; sem ela, o padrão de src/lib/site.js.
const MARCADOR_SITE = '__SITE_URL__';
// Arquivos de public/ com o endereço do site: o build troca __SITE_URL__ neles, no dist/.
const COM_ENDERECO = ['sitemap.xml', 'robots.txt', 'llms.txt'];
// Marcador de public/sw.js trocado pela versão do cache em todo build do site.
const MARCADOR_VERSAO = '__VERSAO_DO_BUILD__';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const site = (env.VITE_SITE_URL || SITE_PADRAO).replace(/\/$/, '');
  return {
    plugins: [
      react(),
      {
        // Troca __SITE_URL__ no index.html (JSON-LD e imagens de compartilhamento).
        name: 'vera-site-url',
        transformIndexHtml: html => html.replaceAll(MARCADOR_SITE, site)
      },
      {
        // O mesmo nos arquivos de public/ que levam o endereço (COM_ENDERECO), já copiados para
        // o dist/. Arquivo sem o marcador para o build: ele ia sair com um endereço escrito à mão.
        name: 'vera-site-url-publico',
        apply: (_config, { command, isSsrBuild }) => command === 'build' && !isSsrBuild,
        async writeBundle(saida) {
          for (const nome of COM_ENDERECO) {
            const arquivo = join(saida.dir, nome);
            const texto = existsSync(arquivo) ? await readFile(arquivo, 'utf8') : '';
            if (!texto.includes(MARCADOR_SITE))
              throw new Error(`${arquivo} não tem ${MARCADOR_SITE}: o endereço do site não ia entrar.`);
            await writeFile(arquivo, texto.replaceAll(MARCADOR_SITE, site));
          }
        }
      },
      {
        // Versão nova do cache do service worker em todo build do site, com npm run build ou
        // vite build direto: no próximo acesso os caches antigos saem. Sem o marcador o build
        // falha, em vez de publicar um sw.js cujo cache nunca gira entre deploys.
        name: 'vera-versao-do-sw',
        apply: (_config, { command, isSsrBuild }) => command === 'build' && !isSsrBuild,
        async writeBundle(saida) {
          const arquivo = join(saida.dir, 'sw.js');
          const sw = existsSync(arquivo) ? await readFile(arquivo, 'utf8') : '';
          if (!sw.includes(MARCADOR_VERSAO))
            throw new Error(`${arquivo} não tem ${MARCADOR_VERSAO}: a versão do cache não ia mudar.`);
          await writeFile(arquivo, sw.replaceAll(MARCADOR_VERSAO, Date.now().toString(36)));
        }
      },
      {
        // Ícones: no build do site, a fonte e o CSS do Bootstrap Icons saem só com os ícones de
        // src/components/ds/icons.js (scripts/icones.mjs). No dev (npm run dev) fica o pacote
        // inteiro. Antes de vite:css, para o CSS novo passar pelo mesmo caminho do original.
        name: 'vera-icones',
        enforce: 'pre',
        apply: (_config, { command, isSsrBuild }) => command === 'build' && !isSsrBuild,
        async transform(css, id) {
          const arquivo = id.split('?')[0];
          if (!arquivo.endsWith('/bootstrap-icons/font/bootstrap-icons.min.css')) return null;
          return { code: await cssDosIcones(css, dirname(arquivo)), map: null };
        }
      },
      {
        // npm run preview igual ao Render: /precos abre dist/precos/index.html (pré-renderizado)
        // e o que não tem arquivo (/app, /app/lista, endereço que não existe, arquivo apagado)
        // recebe dist/app.html, a casca do app, como na regra de rewrite /* -> /app.html.
        name: 'vera-paginas-prerenderizadas',
        configurePreviewServer(server) {
          const dist = resolve(server.config.root, server.config.build.outDir);
          server.middlewares.use((req, _res, next) => {
            const [caminho, busca = ''] = req.url.split('?');
            const pasta = caminho.replace(/\/+$/, '');
            let nome;
            try {
              nome = decodeURIComponent(pasta);
            } catch {
              return next();
            }
            if (!nome || nome.includes('..')) return next();
            const sufixo = busca ? `?${busca}` : '';
            const local = join(dist, nome);
            if (existsSync(join(local, 'index.html'))) req.url = `${pasta}/index.html${sufixo}`;
            else if (!(existsSync(local) && statSync(local).isFile())) req.url = `/app.html${sufixo}`;
            next();
          });
        }
      }
    ],
    server: { port: 5173 },
    // Testes de unidade (npm test, Vitest): componentes no jsdom, sem servidor e sem rede.
    // Os de ponta a ponta ficam em e2e/ (npm run test:e2e, Playwright).
    test: {
      environment: 'jsdom',
      include: ['test/**/*.test.{js,jsx}'],
      setupFiles: ['./test/preparar.js'],
      restoreMocks: true
    }
  };
});
