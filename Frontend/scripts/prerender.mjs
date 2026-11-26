// Gera o HTML pronto das páginas públicas depois do build (npm run build)
// e a casca do app (dist/app.html), que atende as rotas sem arquivo, e carimba a versão do
// service worker (dist/sw.js).
// Robôs de busca e de IA que não rodam JavaScript passam a ler o conteúdo, não só <div id="root">.
// Não usa navegador: importa o build SSR (src/entry-server.jsx) e chama renderToString.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');
const SSR = join(RAIZ, '.ssr');

const { render, ROTAS_PUBLICAS, metaDaPagina } = await import(
  pathToFileURL(join(SSR, 'entry-server.js')).href
);

const modelo = await readFile(join(DIST, 'index.html'), 'utf8');

const escapar = texto =>
  String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

// Troca o conteúdo de uma tag do modelo e falha alto se ela sumir do index.html.
const trocar = (html, padrao, novo) => {
  if (!padrao.test(html)) throw new Error(`Não achei ${padrao} no dist/index.html.`);
  return html.replace(padrao, novo);
};

// <meta name|property="..." content="..." />, numa linha só ou quebrada como no index.html.
const padraoDaMeta = (atributo, nome) =>
  new RegExp(`<meta\\s+${atributo}="${nome}"\\s+content="[^"]*"\\s*\\/?>`);
const tagMeta = (atributo, nome, conteudo) =>
  `<meta ${atributo}="${nome}" content="${escapar(conteudo)}" />`;
const CANONICAL = /\s*<link rel="canonical" href="[^"]*" \/>/;

// Casca do app: pelo rewrite do Render, toda rota sem arquivo (/app, /app/lista,
// /cadastro/perguntas, endereço que não existe) recebe este HTML, com o #root vazio.
// Sem o conteúdo da landing, o navegador não baixa as imagens dela à toa e os robôs não veem
// uma cópia da home em cada endereço. noindex e sem canonical: nada aqui deve entrar na busca.
let casca = modelo;
casca = trocar(casca, /<title>[^<]*<\/title>/, '<title>vera.finance</title>');
casca = trocar(casca, padraoDaMeta('name', 'robots'), tagMeta('name', 'robots', 'noindex, nofollow'));
casca = trocar(casca, CANONICAL, '');
await writeFile(join(DIST, 'app.html'), casca);
console.log('casca do app: dist/app.html');

for (const rota of ROTAS_PUBLICAS) {
  const meta = metaDaPagina(rota);
  const metas = [
    ['name', 'description', meta.descricao],
    ['name', 'robots', meta.robots],
    ['property', 'og:url', meta.canonical]
  ];

  let html = trocar(modelo, /<title>[^<]*<\/title>/, `<title>${escapar(meta.titulo)}</title>`);
  for (const [atributo, nome, conteudo] of metas)
    html = trocar(html, padraoDaMeta(atributo, nome), tagMeta(atributo, nome, conteudo));
  html = trocar(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapar(meta.canonical)}" />`
  );
  html = trocar(html, /<div id="root"><\/div>/, `<div id="root">${render(rota)}</div>`);

  const destino = rota === '/' ? join(DIST, 'index.html') : join(DIST, rota.slice(1), 'index.html');
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, html);
  console.log(`pré-renderizado: ${rota} -> ${destino.slice(RAIZ.length + 1)}`);
}

// Versão nova do cache do service worker a cada build: no próximo acesso os caches antigos saem.
const arquivoSw = join(DIST, 'sw.js');
const sw = await readFile(arquivoSw, 'utf8');
await writeFile(arquivoSw, sw.replaceAll('__VERSAO_DO_BUILD__', Date.now().toString(36)));

// O build SSR só serve para gerar o HTML; não vai para o site.
await rm(SSR, { recursive: true, force: true });
