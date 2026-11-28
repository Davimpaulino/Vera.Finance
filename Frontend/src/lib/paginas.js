import { urlDoSite } from './site.js';
import { CIDADES, metaDaCidade } from '../conteudo/cidades.js';

// Título e descrição por página (o Google usa os dois no resultado da busca).
// Usado pelo App no navegador e pela pré-renderização no build (scripts/prerender.mjs).
// Os artigos da ajuda e do blog não estão aqui: o título e a descrição deles vêm de
// src/conteudo (ajuda.js e blog.js) e entram por registrarPaginasDeConteudo quando o pedaço
// do conteúdo carrega (src/conteudo/carregar.js). Artigo novo vira rota sozinho.
export const PAGINAS = {
  '/': [
    'vera.finance · controle de gastos e comparador de preços de supermercado',
    'Organize a renda por categorias, saiba até que dia o dinheiro dura e compare o preço da sua lista de compras nos supermercados perto de você. Grátis.'
  ],
  '/precos': [
    'Planos e preços · vera.finance',
    'Comece grátis. Compare o plano grátis e o vera+ para controle de gastos, metas, modo família e leitura de notas fiscais.'
  ],
  '/perguntas': [
    'Perguntas frequentes · vera.finance',
    'Se a vera é grátis, quanto custa o vera+, quais redes têm preço online, como ler a nota fiscal e como a vera cuida dos seus dados.'
  ],
  '/onde-funciona': [
    'Onde a vera funciona: redes com preço online pelo CEP · vera.finance',
    'Digite o seu CEP e veja quais redes de supermercado e de atacado com preço online atendem a sua região, e como a vera compara os preços.'
  ],
  // Uma página por cidade prioritária (src/conteudo/cidades.json).
  ...Object.fromEntries(CIDADES.map(cidade => [cidade.caminho, metaDaCidade(cidade)])),
  '/ajuda': [
    'Central de ajuda · vera.finance',
    'Como ler a nota fiscal, comparar preços, montar a lista de compras, usar o modo família, baixar os seus dados e cancelar o plano na vera.'
  ],
  '/blog': [
    'Blog · vera.finance',
    'Dicas práticas para gastar menos no supermercado e organizar a renda do mês: preço por quilo, nota fiscal, atacarejo e categorias.'
  ],
  '/entrar': ['Entrar · vera.finance', 'Entre na sua conta da vera.finance.'],
  '/cadastro': [
    'Criar conta grátis · vera.finance',
    'Crie a sua conta grátis e descubra até que dia o seu dinheiro dura.'
  ],
  '/termos': ['Termos de uso · vera.finance', 'Termos de uso da vera.finance.'],
  '/privacidade': [
    'Política de privacidade · vera.finance',
    'Como a vera.finance trata os seus dados pessoais, conforme a LGPD.'
  ]
};

// Páginas fixas que o build gera em HTML pronto (dist/<rota>/index.html). Os artigos entram
// junto, pelo entry-server (ROTAS_PRE_RENDERIZADAS).
export const ROTAS_PUBLICAS = Object.keys(PAGINAS);

// Artigo da ajuda ou do blog: /ajuda/<slug> ou /blog/<slug> (o slug segue a regra de
// problemasDoConteudo). Vale pela forma, não pela lista: no navegador os artigos só chegam com o
// pedaço do conteúdo, e o link tem de sair igual no HTML do build e no navegador.
const CAMINHO_DE_ARTIGO = /^\/(ajuda|blog)\/[a-z0-9]+(-[a-z0-9]+)*$/;

/** O caminho (sem barra no fim) tem HTML pronto no build, em dist/<caminho>/index.html? */
export const ehPreRenderizada = caminho =>
  caminho !== '/' && (Object.hasOwn(PAGINAS, caminho) || CAMINHO_DE_ARTIGO.test(caminho));

/**
 * Forma pública de um endereço interno: as páginas pré-renderizadas (menos a home) ganham "/" no
 * fim, com a busca e o "#" preservados. O Render só serve dist/precos/index.html para /precos/;
 * /precos cai no rewrite e devolve a casca do app (dist/app.html), que buscadores leem como
 * página vazia. Canonical, og:url, JSON-LD, links e navegação passam todos por aqui. O resto
 * (/app, /cadastro/perguntas, endereço de fora) volta como veio.
 */
export function caminhoPublico(endereco) {
  if (typeof endereco !== 'string' || !endereco.startsWith('/') || endereco.startsWith('//'))
    return endereco;
  const corte = endereco.search(/[?#]/);
  const caminho = corte === -1 ? endereco : endereco.slice(0, corte);
  const resto = corte === -1 ? '' : endereco.slice(corte);
  return ehPreRenderizada(caminho) ? `${caminho}/${resto}` : endereco;
}

/** Link absoluto de uma página do site, na forma pública (canonical, og:url, JSON-LD, sitemap). */
export const urlDaPagina = (caminho = '/') => urlDoSite(caminhoPublico(caminho));

// Artigos da ajuda e do blog: caminho → [título, descrição].
const ARTIGOS_REGISTRADOS = new Map();

/** Guarda o título e a descrição dos artigos ({ caminho, titulo, descricao }). */
export function registrarPaginasDeConteudo(artigos) {
  for (const { caminho, titulo, descricao } of artigos)
    ARTIGOS_REGISTRADOS.set(caminho, [`${titulo} · vera.finance`, descricao]);
}

/**
 * Título, descrição, canonical e robots de um caminho. Nos artigos da ajuda e do blog, também
 * `tipo: 'article'` (og:type de quem compartilha o link); nas outras páginas fica o "website"
 * do index.html.
 */
export function metaDaPagina(caminho) {
  const artigo = ARTIGOS_REGISTRADOS.get(caminho);
  const [titulo, descricao] = PAGINAS[caminho] || artigo || ['vera.finance', PAGINAS['/'][1]];
  // Área logada não entra no Google.
  const privada = caminho.startsWith('/app') || caminho.startsWith('/onboarding');
  return {
    titulo,
    descricao,
    // Canonical sempre no endereço público, mesmo abrindo por outro domínio, e com a barra no
    // fim nas páginas pré-renderizadas (caminhoPublico).
    canonical: urlDaPagina(caminho),
    robots: privada ? 'noindex, nofollow' : 'index, follow',
    ...(artigo ? { tipo: 'article' } : {})
  };
}
