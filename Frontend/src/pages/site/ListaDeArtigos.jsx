import { SiteLayout } from '../../components/site/SiteLayout.jsx';
import { Chamada } from '../../components/site/Chamada.jsx';
import { JsonLd } from '../../components/site/JsonLd.jsx';
import { Trilha } from '../../components/site/Trilha.jsx';
import { Link } from '../../lib/router.jsx';
import { metaDaPagina } from '../../lib/paginas.js';
import { EMAIL_DE_CONTATO } from '../../lib/site.js';
import { ARTIGOS, SECOES } from '../../conteudo/index.js';
import { secaoEstruturada } from '../../conteudo/dadosEstruturados.js';
import { dataPorExtenso, textoPuro } from '../../conteudo/formato.js';
import './css/conteudo.css';

const TEXTOS = {
  ajuda: {
    titulo: 'Central de ajuda',
    lead: 'Respostas curtas e passo a passo para usar a vera: nota fiscal, comparação de preços, lista de compras, modo família, dados e planos.'
  },
  blog: {
    titulo: 'Blog da vera',
    lead: 'Conselhos práticos para gastar menos no supermercado e organizar a renda do mês.'
  }
};

/** Índice de uma seção de conteúdo: /ajuda (central de ajuda) ou /blog. */
export default function ListaDeArtigos({ secao }) {
  const { caminho, nome } = SECOES[secao];
  const blog = secao === 'blog';
  const artigos = ARTIGOS.filter(artigo => artigo.secao === secao);
  const trilha = [
    ['Início', '/'],
    [nome, caminho]
  ];
  const dados = secaoEstruturada(
    { caminho, nome, descricao: metaDaPagina(caminho).descricao, artigos, blog },
    trilha
  );

  return (
    <SiteLayout>
      <section className="conteudo">
        <Trilha itens={trilha} />
        <header className="conteudo__cabeca">
          <h1 className="conteudo__title">{TEXTOS[secao].titulo}</h1>
          <p className="conteudo__lead">{TEXTOS[secao].lead}</p>
        </header>

        <ul className="conteudo-indice">
          {artigos.map(artigo => (
            <li key={artigo.caminho} className="conteudo-indice__item">
              <h2 className="conteudo-indice__titulo">
                <Link to={artigo.caminho}>{artigo.titulo}</Link>
              </h2>
              {blog ? (
                <time className="conteudo__data" dateTime={artigo.publicadoEm}>
                  {dataPorExtenso(artigo.publicadoEm)}
                </time>
              ) : artigo.tipo === 'HowTo' ? (
                <span className="conteudo__data">Passo a passo</span>
              ) : null}
              <p className="conteudo__p">{textoPuro(artigo.resumo)}</p>
            </li>
          ))}
        </ul>

        <p className="conteudo__p conteudo__p--nota">
          {blog ? (
            <>
              Como usar o app está na <Link to="/ajuda">central de ajuda</Link>. Quer saber se a vera
              tem preço online perto de você? Veja <Link to="/onde-funciona">onde a vera funciona</Link>.
            </>
          ) : (
            <>
              Respostas rápidas estão nas <Link to="/perguntas">perguntas frequentes</Link>, e dicas
              para economizar no mercado, no <Link to="/blog">blog</Link>. Outra dúvida? Escreva para{' '}
              <a href={`mailto:${EMAIL_DE_CONTATO}`}>{EMAIL_DE_CONTATO}</a>.
            </>
          )}
        </p>

        <Chamada />
      </section>
      <JsonLd dados={dados} />
    </SiteLayout>
  );
}
