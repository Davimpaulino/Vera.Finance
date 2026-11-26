import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './css/index.css';
import { RouterProvider } from './lib/router.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UiProvider } from './context/UiContext.jsx';
import App from './App.jsx';
import { recarregarParaVersaoNova } from './lib/versaoNova.js';

// Um pedaço do build que não carregou (o Vite avisa por este evento em todo import() do build):
// com a aba aberta antes de um deploy, o arquivo antigo sumiu e a página recarrega uma vez para
// pegar o build novo. Vale para as telas do app e para o Firebase (src/lib/versaoNova.js).
window.addEventListener('vite:preloadError', () => {
  recarregarParaVersaoNova();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider>
      <UiProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </UiProvider>
    </RouterProvider>
  </StrictMode>
);

// Service worker só no site publicado: no dev ele guardaria arquivos que mudam a todo momento.
// Para desligar em produção, veja scripts/sw-emergencia.js (este bloco sai junto).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sem service worker o site funciona igual, só sem modo offline */
    });
  });
}
