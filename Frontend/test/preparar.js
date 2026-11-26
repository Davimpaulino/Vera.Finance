// Roda antes de cada arquivo de teste (vite.config.js → test.setupFiles).
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// O jsdom não rola a página; o roteador chama scrollTo a cada navegação.
window.scrollTo = () => {};

// Cada teste começa com a tela vazia, sem sessão guardada e na home.
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});
