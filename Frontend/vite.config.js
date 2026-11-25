import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
      }
    ],
    server: { port: 5173 }
  };
});
