// Service worker da vera: guarda a casca do app e os arquivos do build para abrir mais rápido.
// Sem internet abre só a casca: os dados e o login vêm da API, que nunca entra no cache, então
// quem está logado vê a tela de Entrar até a conexão voltar (o login não se perde).
// Nunca guarda chamadas da API nem nada com Authorization: dados financeiros não ficam em cache.

// Todo build troca a versão (plugin vera-versao-do-sw no vite.config.js); no activate os caches
// antigos saem. Para desligar o service worker em produção, veja scripts/sw-emergencia.js.
const VERSAO = '__VERSAO_DO_BUILD__';
const CACHE = `vera-${VERSAO}`;
// Casca do app (gerada por scripts/prerender.mjs), usada quando a navegação falha sem internet e
// a página não está guardada. O app desenha a rota certa por cima.
const PAGINA_OFFLINE = '/app.html';

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.add(PAGINA_OFFLINE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches
      .keys()
      .then(nomes =>
        Promise.all(
          nomes
            .filter(nome => nome.startsWith('vera-') && nome !== CACHE)
            .map(nome => caches.delete(nome))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Só respostas completas da própria origem (sem redirecionamento, que quebra a navegação).
const podeGuardar = resposta =>
  resposta && resposta.ok && !resposta.redirected && resposta.type === 'basic';

// No Render, um /assets/ que não existe mais (aba aberta antes de um deploy) cai no rewrite e
// volta 200 com o HTML da casca. Guardado com o nome do .js, o erro ficaria preso no cache.
const ehHtml = resposta => (resposta.headers.get('content-type') || '').includes('text/html');

const guardar = (pedido, resposta) => {
  if (!podeGuardar(resposta)) return;
  const copia = resposta.clone();
  caches.open(CACHE).then(cache => cache.put(pedido, copia));
};

self.addEventListener('fetch', evento => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  // API (outra origem ou /api) e pedidos com login passam direto, sem cache.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;
  if (pedido.headers.has('Authorization')) return;

  // Páginas: rede primeiro (conteúdo sempre novo); sem internet, a última cópia ou a casca do app.
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then(resposta => {
          guardar(pedido, resposta);
          return resposta;
        })
        .catch(() =>
          caches
            .match(pedido)
            .then(guardada => guardada || caches.match(PAGINA_OFFLINE))
            .then(guardada => guardada || Response.error())
        )
    );
    return;
  }

  // Arquivos do build têm hash no nome e nunca mudam: cache primeiro.
  if (url.pathname.startsWith('/assets/')) {
    evento.respondWith(
      caches.match(pedido).then(
        guardada =>
          guardada ||
          fetch(pedido).then(resposta => {
            if (!ehHtml(resposta)) guardar(pedido, resposta);
            return resposta;
          })
      )
    );
  }
});
