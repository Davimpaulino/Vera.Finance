import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './css/index.css';
import { RouterProvider } from './lib/router.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UiProvider } from './context/UiContext.jsx';
import App from './App.jsx';
import { carregarConteudo, ehCaminhoDeConteudo } from './conteudo/carregar.js';

const desenhar = () =>
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

// Na ajuda e no blog, o texto vem num pedaço separado do JavaScript (conteudo/carregar.js).
// O artigo pré-renderizado já está na tela: desenhar antes do pedaço chegar trocaria o artigo
// pelo esqueleto e depois de volta. Se o pedaço falhar, desenha assim mesmo (com o aviso).
if (ehCaminhoDeConteudo(window.location.pathname))
  carregarConteudo()
    .catch(() => null)
    .then(desenhar);
else desenhar();

// Service worker só no site publicado: no dev ele guardaria arquivos que mudam a todo momento.
// Para desligar em produção, veja scripts/sw-emergencia.js (este bloco sai junto).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sem service worker o site funciona igual, só sem modo offline */
    });
  });
}
