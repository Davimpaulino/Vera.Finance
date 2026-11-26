import { useSyncExternalStore } from 'react';
import { registrarPaginasDeConteudo } from '../lib/paginas.js';

// O texto da central de ajuda e do blog (ajuda.js e blog.js) e as páginas que o mostram ficam
// num pedaço separado do JavaScript (pages/site/Conteudo.jsx). Ele só é baixado quando alguém
// abre /ajuda, /blog ou um artigo: quem abre a home, os planos ou o app não baixa os artigos.
// O HTML dessas páginas continua completo: no build, o entry-server importa o pedaço direto.
// O CSS delas (css/conteudo.css) fica no pacote principal, senão o HTML pré-renderizado abriria
// sem estilo até o pedaço chegar.

// /ajuda, /blog e /ajuda/<slug> ou /blog/<slug>. Se o artigo existe, quem diz é o pedaço.
const CAMINHO_DE_CONTEUDO = /^\/(ajuda|blog)(\/[^/]+)?\/*$/;

/** O caminho é da central de ajuda ou do blog? */
export const ehCaminhoDeConteudo = caminho => CAMINHO_DE_CONTEUDO.test(caminho);

let pedaco = null;
let pedido = null;
const avisos = new Set();

function guardar(modulo) {
  pedaco = modulo;
  // Título e descrição de cada artigo, para o <head> acompanhar a navegação (lib/paginas.js).
  registrarPaginasDeConteudo(modulo.PAGINAS_DE_CONTEUDO);
  avisos.forEach(avisar => avisar());
  return modulo;
}

/**
 * Baixa o pedaço uma vez só. Se falhar (sem internet, deploy novo no meio), o próximo pedido
 * tenta de novo.
 */
export function carregarConteudo() {
  if (pedaco) return Promise.resolve(pedaco);
  pedido ||= import('../pages/site/Conteudo.jsx').then(guardar, erro => {
    pedido = null;
    throw erro;
  });
  return pedido;
}

/** Só para o build (entry-server.jsx): o pedaço já importado, sem esperar. */
export const usarConteudoJaImportado = guardar;

/** O pedaço, ou null enquanto ele não chegou. Desenha de novo quem usa quando ele chega. */
export function useConteudo() {
  return useSyncExternalStore(
    avisar => {
      avisos.add(avisar);
      return () => avisos.delete(avisar);
    },
    () => pedaco,
    () => pedaco
  );
}
