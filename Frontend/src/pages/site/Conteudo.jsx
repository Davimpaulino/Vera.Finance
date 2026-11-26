import { Redirect } from '../../lib/router.jsx';
import { ARTIGOS, SECOES, artigoDoCaminho } from '../../conteudo/index.js';
import Artigo from './Artigo.jsx';
import ListaDeArtigos from './ListaDeArtigos.jsx';

// Pedaço separado do JavaScript com a central de ajuda, o blog e o texto de todos os artigos.
// O pacote principal o baixa só quando precisa (veja src/conteudo/carregar.js).

/** Título e descrição de cada artigo, para o <head> (registrados em lib/paginas.js). */
export const PAGINAS_DE_CONTEUDO = ARTIGOS.map(({ caminho, titulo, descricao }) => ({
  caminho,
  titulo,
  descricao
}));

const SECAO_DO_CAMINHO = Object.fromEntries(
  Object.entries(SECOES).map(([secao, { caminho }]) => [caminho, secao])
);

/** /ajuda ou /blog (índice), um artigo ou, para artigo que não existe, a home. */
export default function Conteudo({ caminho }) {
  const secao = SECAO_DO_CAMINHO[caminho];
  if (secao) return <ListaDeArtigos secao={secao} />;
  const artigo = artigoDoCaminho(caminho);
  return artigo ? <Artigo artigo={artigo} /> : <Redirect to="/" />;
}
