import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// Mesmo padrão de src/lib/site.js: o endereço público vem de VITE_SITE_URL.
const SITE_PADRAO = 'https://vera-finance.onrender.com';
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
        transformIndexHtml: html => html.replaceAll('__SITE_URL__', site)
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
    server: { port: 5173 }
  };
});
