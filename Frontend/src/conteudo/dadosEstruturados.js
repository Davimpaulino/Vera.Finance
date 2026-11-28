import { urlDoSite } from '../lib/site.js';
import { urlDaPagina } from '../lib/paginas.js';
import { textoPuro } from './formato.js';

// JSON-LD (schema.org) das páginas de conteúdo, montado a partir dos mesmos dados da página:
// o que o Google e as IAs leem é o que a pessoa vê. Não importa ajuda.js nem blog.js: a página
// Onde funciona usa a trilha daqui e está no pacote principal do JavaScript.

// Autor e publicador dos artigos.
const VERA = {
  '@type': 'Organization',
  name: 'vera.finance',
  url: urlDaPagina('/'),
  logo: { '@type': 'ImageObject', url: urlDoSite('/icons/icon-512.png') }
};

/** BreadcrumbList a partir da trilha [[rótulo, caminho]], a mesma do componente Trilha. */
export const trilhaEstruturada = itens => ({
  '@type': 'BreadcrumbList',
  itemListElement: itens.map(([rotulo, caminho], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: rotulo,
    item: urlDaPagina(caminho)
  }))
});

/** Texto corrido do artigo (resumo, passos e corpo), sem a marcação de link. */
function textoDoArtigo(artigo) {
  const blocos = [
    artigo.resumo,
    ...(artigo.passos || []).map(passo => `${passo.nome}. ${passo.texto}`),
    ...artigo.corpo.flatMap(bloco =>
      typeof bloco === 'string' ? [bloco] : bloco.lista || [bloco.titulo]
    )
  ];
  return blocos.map(textoPuro).join('\n\n');
}

/**
 * Dados do artigo: BlogPosting no blog; HowTo no passo a passo da ajuda; Article no resto.
 * Vai num @graph junto com a trilha (BreadcrumbList).
 */
export function artigoEstruturado(artigo, trilha) {
  const url = urlDaPagina(artigo.caminho);
  const comum = {
    name: artigo.titulo,
    description: artigo.descricao,
    url,
    inLanguage: 'pt-BR'
  };
  let principal;
  if (artigo.secao === 'blog')
    principal = {
      '@type': 'BlogPosting',
      ...comum,
      headline: artigo.titulo,
      datePublished: artigo.publicadoEm,
      dateModified: artigo.atualizadoEm || artigo.publicadoEm,
      author: VERA,
      publisher: VERA,
      image: urlDoSite('/og-image.png'),
      mainEntityOfPage: url,
      articleBody: textoDoArtigo(artigo)
    };
  else if (artigo.tipo === 'HowTo')
    principal = {
      '@type': 'HowTo',
      ...comum,
      datePublished: artigo.publicadoEm,
      dateModified: artigo.atualizadoEm || artigo.publicadoEm,
      step: artigo.passos.map((passo, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: passo.nome,
        text: textoPuro(passo.texto),
        url: `${url}#passo-${i + 1}`
      }))
    };
  else
    principal = {
      '@type': 'Article',
      ...comum,
      headline: artigo.titulo,
      // A data de publicação é fixa; cada revisão muda só o dateModified.
      datePublished: artigo.publicadoEm,
      dateModified: artigo.atualizadoEm || artigo.publicadoEm,
      author: VERA,
      publisher: VERA,
      image: urlDoSite('/og-image.png'),
      mainEntityOfPage: url,
      articleBody: textoDoArtigo(artigo)
    };
  return {
    '@context': 'https://schema.org',
    '@graph': [principal, trilhaEstruturada(trilha)]
  };
}

/** Página que lista os artigos de uma seção (central de ajuda ou blog). */
export function secaoEstruturada({ caminho, nome, descricao, artigos, blog }, trilha) {
  const partes = artigos.map(artigo => ({
    '@type': blog ? 'BlogPosting' : artigo.tipo,
    headline: artigo.titulo,
    name: artigo.titulo,
    url: urlDaPagina(artigo.caminho),
    ...(blog ? { datePublished: artigo.publicadoEm, author: VERA } : {})
  }));
  const pagina = {
    '@type': blog ? 'Blog' : 'CollectionPage',
    name: nome,
    description: descricao,
    url: urlDaPagina(caminho),
    inLanguage: 'pt-BR',
    publisher: VERA,
    ...(blog ? { blogPost: partes } : { hasPart: partes })
  };
  return { '@context': 'https://schema.org', '@graph': [pagina, trilhaEstruturada(trilha)] };
}
