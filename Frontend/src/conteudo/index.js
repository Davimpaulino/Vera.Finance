import { ARTIGOS_DE_AJUDA } from './ajuda.js';
import { POSTS_DO_BLOG } from './blog.js';
import { dataValida, linksInternos } from './formato.js';
import { BLOG_NO_RODAPE } from './rodape.js';

// As duas seções de conteúdo do site. As rotas, o título e a descrição de cada artigo saem daqui
// para src/lib/paginas.js (e de lá para o App e para a pré-renderização do build).
export const SECOES = {
  ajuda: {
    caminho: '/ajuda',
    nome: 'Central de ajuda',
    artigos: ARTIGOS_DE_AJUDA
  },
  blog: {
    caminho: '/blog',
    nome: 'Blog',
    artigos: POSTS_DO_BLOG
  }
};

/** Todos os artigos, cada um com a seção e o caminho (/ajuda/<slug> ou /blog/<slug>). */
export const ARTIGOS = Object.entries(SECOES).flatMap(([secao, { caminho, artigos }]) =>
  artigos.map(artigo => ({ ...artigo, secao, caminho: `${caminho}/${artigo.slug}` }))
);

const PELO_CAMINHO = new Map(ARTIGOS.map(artigo => [artigo.caminho, artigo]));

/** O artigo de um caminho ou null. */
export const artigoDoCaminho = caminho => PELO_CAMINHO.get(caminho) || null;

// Páginas fixas que os artigos podem citar no "Leia também".
const PAGINAS_FIXAS = {
  '/onde-funciona': 'Onde a vera funciona: redes com preço online',
  '/perguntas': 'Perguntas frequentes',
  '/precos': 'Planos e preços',
  '/privacidade': 'Política de privacidade',
  '/termos': 'Termos de uso',
  '/ajuda': 'Central de ajuda',
  '/blog': 'Blog da vera'
};

/** Título para um link do "Leia também": o do artigo ou o da página fixa. */
export const tituloDoCaminho = caminho =>
  artigoDoCaminho(caminho)?.titulo || PAGINAS_FIXAS[caminho] || null;

// Todos os textos de um artigo, para conferir os links.
const textosDoArtigo = artigo => [
  artigo.resumo,
  ...(artigo.passos || []).map(passo => passo.texto),
  ...(artigo.corpo || []).flatMap(bloco =>
    typeof bloco === 'string' ? [bloco] : bloco.lista || [bloco.titulo]
  )
];

/**
 * Erros de escrita que quebrariam a página ou o JSON-LD: slug repetido ou com caractere
 * estranho, campo faltando, passo a passo sem passos, data que não existe, link interno ou
 * "Leia também" para uma página que não existe, rodapé com artigo do blog que não existe.
 * O build (scripts/prerender.mjs) para se a lista não vier vazia. `artigos` e `rodape` são só
 * para os testes; o build confere os de verdade.
 */
export function problemasDoConteudo(
  rotasExistentes,
  artigos = ARTIGOS,
  rodape = BLOG_NO_RODAPE
) {
  const rotas = new Set(rotasExistentes);
  const problemas = [];
  const vistos = new Set();
  for (const artigo of artigos) {
    const nome = artigo.caminho;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(artigo.slug))
      problemas.push(`${nome}: o slug só pode ter letras minúsculas, números e hífens.`);
    if (vistos.has(nome)) problemas.push(`${nome}: slug repetido.`);
    vistos.add(nome);
    for (const campo of ['titulo', 'descricao', 'resumo'])
      if (!artigo[campo]) problemas.push(`${nome}: falta o campo "${campo}".`);
    if (!Array.isArray(artigo.corpo) || !artigo.corpo.length)
      problemas.push(`${nome}: falta o corpo do artigo.`);
    if (artigo.secao === 'ajuda' && !['Article', 'HowTo'].includes(artigo.tipo))
      problemas.push(`${nome}: tipo precisa ser "Article" ou "HowTo".`);
    if (artigo.tipo === 'HowTo' && !(artigo.passos || []).length)
      problemas.push(`${nome}: passo a passo (HowTo) sem passos.`);
    // publicadoEm vai para o datePublished do JSON-LD e não muda nas revisões; atualizadoEm é o
    // "Atualizado em" da página de ajuda (no blog é opcional) e o dateModified.
    if (!dataValida(artigo.publicadoEm))
      problemas.push(`${nome}: publicadoEm precisa ser uma data que existe, no formato AAAA-MM-DD.`);
    if (artigo.atualizadoEm === undefined) {
      if (artigo.secao === 'ajuda') problemas.push(`${nome}: falta o campo "atualizadoEm".`);
    } else if (!dataValida(artigo.atualizadoEm))
      problemas.push(`${nome}: atualizadoEm precisa ser uma data que existe, no formato AAAA-MM-DD.`);
    else if (dataValida(artigo.publicadoEm) && artigo.atualizadoEm < artigo.publicadoEm)
      problemas.push(`${nome}: atualizadoEm é anterior ao publicadoEm.`);
    for (const link of textosDoArtigo(artigo).flatMap(linksInternos))
      if (!rotas.has(link)) problemas.push(`${nome}: link para ${link}, que não existe.`);
    for (const caminho of artigo.relacionados || [])
      if (!rotas.has(caminho) || !tituloDoCaminho(caminho))
        problemas.push(`${nome}: "Leia também" aponta para ${caminho}, que não existe ou não tem título.`);
  }
  for (const [rotulo, caminho] of rodape)
    if (!rotulo || !artigos.some(artigo => artigo.secao === 'blog' && artigo.caminho === caminho))
      problemas.push(`rodapé (rodape.js): ${caminho} não é um artigo do blog.`);
  return problemas;
}
