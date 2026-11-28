// Avisa Bing, Yandex e outros buscadores do IndexNow que as páginas do site mudaram.
// Rode depois do deploy:  node scripts/indexnow.mjs [https://endereco-do-site]
// Sem argumento, usa VITE_SITE_URL ou o endereço padrão. Com --teste, só mostra o que enviaria.
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_PADRAO } from '../src/lib/site.js';

const PUBLICO = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const teste = args.includes('--teste');
const site = new URL(
  args.find(a => !a.startsWith('--')) ||
    process.env.VITE_SITE_URL ||
    SITE_PADRAO
);

// A chave é o arquivo <32 hex>.txt em public/ (o IndexNow confere se ele está no ar).
const arquivoChave = (await readdir(PUBLICO)).find(nome => /^[0-9a-f]{32}\.txt$/.test(nome));
if (!arquivoChave) throw new Error('Não achei o arquivo da chave do IndexNow em public/.');
const chave = (await readFile(join(PUBLICO, arquivoChave), 'utf8')).trim();

// URLs do sitemap de public/, com o marcador __SITE_URL__ trocado pelo endereço do site informado
// (o build faz a mesma troca no dist/).
const sitemap = (await readFile(join(PUBLICO, 'sitemap.xml'), 'utf8')).replaceAll(
  '__SITE_URL__',
  site.origin
);
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => {
  const url = new URL(loc.trim());
  return new URL(url.pathname + url.search, site.origin).href;
});

const corpo = {
  host: site.host,
  key: chave,
  keyLocation: new URL(`/${arquivoChave}`, site.origin).href,
  urlList: urls
};

if (teste) {
  console.log(JSON.stringify(corpo, null, 2));
} else {
  const resposta = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(corpo)
  });
  // 200 e 202 são sucesso; 403 costuma ser a chave fora do ar, 422 URL de outro host.
  console.log(`IndexNow respondeu ${resposta.status} para ${urls.length} URLs.`);
  if (!resposta.ok) process.exitCode = 1;
}
