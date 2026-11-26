import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

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
