// Gera o HTML pronto das páginas públicas depois do build (npm run build)
// e a casca do app (dist/app.html), que atende as rotas sem arquivo.
// Robôs de busca e de IA que não rodam JavaScript passam a ler o conteúdo, não só <div id="root">.
// Não usa navegador: importa o build SSR (src/entry-server.jsx) e chama renderToString.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scriptDaBarra } from './como-o-render.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');
const SSR = join(RAIZ, '.ssr');

const { render, ROTAS_PRE_RENDERIZADAS, metaDaPagina, problemasDoConteudo } = await import(
  pathToFileURL(join(SSR, 'entry-server.js')).href
);

// Artigos de src/conteudo (ajuda e blog) com slug repetido, campo faltando ou link para página
// que não existe param o build aqui, antes de publicar uma página quebrada.
const problemas = problemasDoConteudo(ROTAS_PRE_RENDERIZADAS);
if (problemas.length)
  throw new Error(`Conteúdo com problema:\n- ${problemas.join('\n- ')}`);

const modelo = await readFile(join(DIST, 'index.html'), 'utf8');

const escapar = texto =>
  String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

// Troca o conteúdo de uma tag do modelo e falha alto se ela sumir do index.html.
// O novo texto entra por função: assim um "$&" ou "$1" no texto de uma página (preço em R$,
// por exemplo) não vira padrão especial do replace.
const trocar = (html, padrao, novo) => {
  if (!padrao.test(html)) throw new Error(`Não achei ${padrao} no dist/index.html.`);
  return html.replace(padrao, () => novo);
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
// O Render só serve dist/precos/index.html para /precos/ (com a barra); /precos cai no rewrite e
// recebe esta casca. O script da barra (scripts/como-o-render.mjs), antes do bundle, leva quem
// chegou sem a barra para a página pronta. A lista são as rotas pré-renderizadas deste build.
let casca = modelo;
casca = trocar(
  casca,
  /<title>[^<]*<\/title>/,
  `<title>vera.finance</title>\n    ${scriptDaBarra(ROTAS_PRE_RENDERIZADAS)}`
);
casca = trocar(casca, padraoDaMeta('name', 'robots'), tagMeta('name', 'robots', 'noindex, nofollow'));
casca = trocar(casca, CANONICAL, '');
await writeFile(join(DIST, 'app.html'), casca);
console.log('casca do app: dist/app.html');

for (const rota of ROTAS_PRE_RENDERIZADAS) {
  const meta = metaDaPagina(rota);
  const metas = [
    ['name', 'description', meta.descricao],
    ['name', 'robots', meta.robots],
    ['property', 'og:url', meta.canonical],
    ['property', 'og:type', meta.tipo || 'website']
  ];
  // A home fica com os textos de compartilhamento do index.html, escritos para WhatsApp e redes.
  // As outras páginas mostram o próprio título e descrição quando o link é compartilhado.
  if (rota !== '/')
    metas.push(
      ['property', 'og:title', meta.titulo],
      ['property', 'og:description', meta.descricao],
      ['name', 'twitter:title', meta.titulo],
      ['name', 'twitter:description', meta.descricao]
    );

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

// O build SSR só serve para gerar o HTML; não vai para o site.
await rm(SSR, { recursive: true, force: true });

// Nenhum __SITE_URL__ pode sobrar no dist/: o vite.config.js troca o marcador no index.html e
// nos arquivos de public/ com o endereço. Um que escapou sairia no ar como link quebrado.
const MARCADOR_SITE = '__SITE_URL__';
const DE_TEXTO = /\.(html|xml|txt|json|webmanifest|js|css)$/;
const comMarcador = [];
for (const entrada of await readdir(DIST, { recursive: true, withFileTypes: true })) {
  if (!entrada.isFile() || !DE_TEXTO.test(entrada.name)) continue;
  const arquivo = join(entrada.parentPath ?? entrada.path, entrada.name);
  if ((await readFile(arquivo, 'utf8')).includes(MARCADOR_SITE)) comMarcador.push(arquivo.slice(RAIZ.length + 1));
}
if (comMarcador.length)
  throw new Error(`${MARCADOR_SITE} ficou sem trocar em:\n- ${comMarcador.join('\n- ')}`);
