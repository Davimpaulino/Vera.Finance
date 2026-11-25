import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Mesmo padrão de src/lib/site.js: o endereço público vem de VITE_SITE_URL.
const SITE_PADRAO = 'https://vera-finance.onrender.com';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const site = (env.VITE_SITE_URL || SITE_PADRAO).replace(/\/$/, '');
  return {
    plugins: [
      react(),
      {
        // Troca __SITE_URL__ no index.html (canonical, og:url, JSON-LD, imagens de compartilhamento).
        name: 'vera-site-url',
        transformIndexHtml: html => html.replaceAll('__SITE_URL__', site)
      },
      {
        // npm run preview igual ao Render: /precos abre dist/precos/index.html (pré-renderizado)
        // em vez de cair no index.html da landing.
        name: 'vera-paginas-prerenderizadas',
        configurePreviewServer(server) {
          const dist = server.config.build.outDir;
          server.middlewares.use((req, _res, next) => {
            const [caminho, busca = ''] = req.url.split('?');
            const pasta = caminho.replace(/\/+$/, '');
            if (pasta && !pasta.includes('..') && existsSync(join(dist, pasta, 'index.html')))
              req.url = `${pasta}/index.html${busca ? `?${busca}` : ''}`;
            next();
          });
        }
      }
    ],
    server: { port: 5173 }
  };
});
