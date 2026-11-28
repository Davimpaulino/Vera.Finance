// Como o Static Site do Render responde, com a regra de rewrite /* -> /app.html.
// Usado pelo npm run preview (vite.config.js), pelos testes e pelo scripts/prerender.mjs.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ehArquivo = local => existsSync(local) && statSync(local).isFile();

/**
 * Arquivo de `dist` que o Render devolve para um caminho (já sem a busca), relativo a `dist` e
 * começando por "/". Arquivo que existe sai como está. Pasta só sai pelo index.html dela quando o
 * caminho termina em "/": /precos/ abre precos/index.html, mas /precos (sem a barra) cai no
 * rewrite. O resto (/app, /app/lista, endereço que não existe) recebe a casca, /app.html.
 * Devolve null para caminho inválido (com "..", ou mal codificado).
 */
export function arquivoDoRender(dist, caminho) {
  let nome;
  try {
    nome = decodeURIComponent(caminho);
  } catch {
    return null;
  }
  if (!nome.startsWith('/') || nome.split('/').includes('..')) return null;
  if (nome.endsWith('/')) {
    const indice = `${nome}index.html`;
    return ehArquivo(join(dist, indice)) ? indice : '/app.html';
  }
  return ehArquivo(join(dist, nome)) ? nome : '/app.html';
}

/**
 * Script da casca (dist/app.html) que põe a barra no fim das páginas pré-renderizadas: quem abre
 * /precos recebe a casca pelo rewrite e é levado para /precos/, com a busca e o "#". Roda antes do
 * bundle. `rotas` são as do build; a home sai da lista, e quem não está nela (/app, /app/...,
 * /cadastro/perguntas, endereço desconhecido) segue na casca.
 */
export function scriptDaBarra(rotas) {
  const lista = JSON.stringify(rotas.filter(rota => rota !== '/')).replaceAll('<', '\\u003c');
  return (
    '<script>(function(){var r=' +
    lista +
    ';var l=window.location;if(r.indexOf(l.pathname)>-1)l.replace(l.pathname+"/"+l.search+l.hash)})()</script>'
  );
}
