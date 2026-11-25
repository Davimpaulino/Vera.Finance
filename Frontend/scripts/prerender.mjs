// Gera o HTML pronto das páginas públicas depois do build (npm run build).
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

// dist/index.html também atende as rotas sem arquivo (/app, /cadastro/perguntas...).
// Nelas o conteúdo da landing é apagado antes de aparecer, e o app desenha a tela certa.
const limparSeForOutraRota = rota =>
  `<script>(function(){var r=document.getElementById('root');` +
  `var c=location.pathname.replace(/\\/+$/,'')||'/';` +
  `if(c!==${JSON.stringify(rota)})r.innerHTML='';})();</script>`;

for (const rota of ROTAS_PUBLICAS) {
  const meta = metaDaPagina(rota);
  let html = modelo;
  html = trocar(html, /<title>[^<]*<\/title>/, `<title>${escapar(meta.titulo)}</title>`);
  html = trocar(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapar(meta.descricao)}" />`
  );
  html = trocar(
    html,
    /<meta name="robots" content="[^"]*" \/>/,
    `<meta name="robots" content="${meta.robots}" />`
  );
  html = trocar(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapar(meta.canonical)}" />`
  );
  html = trocar(
    html,
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${escapar(meta.canonical)}" />`
  );
  html = trocar(
    html,
    /<div id="root"><\/div>/,
    `<div id="root">${render(rota)}</div>${limparSeForOutraRota(rota)}`
  );

  const destino = rota === '/' ? join(DIST, 'index.html') : join(DIST, rota.slice(1), 'index.html');
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, html);
  console.log(`pré-renderizado: ${rota} -> ${destino.slice(RAIZ.length + 1)}`);
}

// O build SSR só serve para gerar o HTML; não vai para o site.
await rm(SSR, { recursive: true, force: true });
