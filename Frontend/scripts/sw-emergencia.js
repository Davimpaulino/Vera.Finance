// Service worker de emergência: desliga o service worker da vera em quem já tem e apaga os caches.
// Uso (veja "App instalável (PWA)" no readme): copie este arquivo por cima de public/sw.js, tire
// o registro do service worker em src/main.jsx e publique. Na próxima visita o navegador baixa
// este sw.js, que apaga os caches e tira o próprio registro.
// O build exige o marcador abaixo (vite.config.js); aqui ele só muda os bytes a cada deploy.
const VERSAO = '__VERSAO_DO_BUILD__';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches
      .keys()
      .then(nomes =>
        Promise.all(nomes.filter(nome => nome.startsWith('vera-')).map(nome => caches.delete(nome)))
      )
      .then(() => self.registration.unregister())
  );
});

// Sem evento fetch: tudo vai direto para a rede. As abas abertas não são recarregadas de
// propósito: se o src/main.jsx ainda registrar o sw.js, isso poderia virar um laço de recarregar.
console.info(`vera: service worker desligado (${VERSAO}).`);
