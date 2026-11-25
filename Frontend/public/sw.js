// Service worker da vera: deixa o app abrir mais rápido e mostrar a tela mesmo sem internet.
// Nunca guarda chamadas da API nem nada com Authorization: dados financeiros não ficam em cache.

// O build troca a versão a cada deploy (scripts/prerender.mjs); no activate os caches antigos saem.
const VERSAO = '__VERSAO_DO_BUILD__';
const CACHE = `vera-${VERSAO}`;
// Página usada quando a navegação falha sem internet (o app desenha a rota certa por cima).
const PAGINA_OFFLINE = '/';

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

  // Páginas: rede primeiro (conteúdo sempre novo); sem internet, a última cópia ou a página base.
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
            guardar(pedido, resposta);
            return resposta;
          })
      )
    );
  }
});
