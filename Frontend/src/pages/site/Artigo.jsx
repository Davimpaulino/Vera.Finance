import { SiteLayout } from '../../components/site/SiteLayout.jsx';
import { Chamada } from '../../components/site/Chamada.jsx';
import { JsonLd } from '../../components/site/JsonLd.jsx';
import { Texto } from '../../components/site/Texto.jsx';
import { Trilha } from '../../components/site/Trilha.jsx';
import { Link } from '../../lib/router.jsx';
import { SECOES, tituloDoCaminho } from '../../conteudo/index.js';
import { artigoEstruturado } from '../../conteudo/dadosEstruturados.js';
import { dataPorExtenso } from '../../conteudo/formato.js';
import './css/conteudo.css';

/** Um bloco do corpo: parágrafo (texto solto), subtítulo ({ titulo }) ou lista ({ lista }). */
function Bloco({ bloco }) {
  if (typeof bloco === 'string')
    return (
      <p className="conteudo__p">
        <Texto>{bloco}</Texto>
      </p>
    );
  if (bloco.titulo) return <h2 className="conteudo__h2">{bloco.titulo}</h2>;
  const Lista = bloco.numerada ? 'ol' : 'ul';
  return (
    <Lista className="conteudo__lista">
      {bloco.lista.map(item => (
        <li key={item}>
          <Texto>{item}</Texto>
        </li>
      ))}
    </Lista>
  );
}

/** Página de um artigo da central de ajuda (/ajuda/<slug>) ou do blog (/blog/<slug>). */
export default function Artigo({ artigo }) {
  const secao = SECOES[artigo.secao];
  const blog = artigo.secao === 'blog';
  const trilha = [
    ['Início', '/'],
    [secao.nome, secao.caminho],
    [artigo.titulo, artigo.caminho]
  ];
  const data = blog ? artigo.publicadoEm : artigo.atualizadoEm;

  return (
    <SiteLayout>
      <article className="conteudo">
        <Trilha itens={trilha} />
        <header className="conteudo__cabeca">
          <h1 className="conteudo__title">{artigo.titulo}</h1>
          {data ? (
            <p className="conteudo__data">
              {blog ? (
                <>
                  <time dateTime={data}>{dataPorExtenso(data)}</time> · por vera.finance
                </>
              ) : (
                <>
                  Atualizado em <time dateTime={data}>{dataPorExtenso(data)}</time>
                </>
              )}
            </p>
          ) : null}
          <p className="conteudo__lead">
            <Texto>{artigo.resumo}</Texto>
          </p>
        </header>

        {artigo.passos ? (
          <section className="conteudo__secao" aria-labelledby="passo-a-passo">
            <h2 id="passo-a-passo" className="conteudo__h2">
              Passo a passo
            </h2>
            <ol className="conteudo__passos">
              {artigo.passos.map((passo, i) => (
                <li key={passo.nome} id={`passo-${i + 1}`} className="conteudo__passo">
                  <span className="conteudo__passo-nome">{passo.nome}</span>
                  <p className="conteudo__p">
                    <Texto>{passo.texto}</Texto>
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {artigo.corpo.map((bloco, i) => (
          <Bloco key={i} bloco={bloco} />
        ))}

        {artigo.relacionados?.length ? (
          <nav className="conteudo-relacionados" aria-label="Leia também">
            <span className="conteudo-relacionados__titulo">Leia também</span>
            <ul className="conteudo-relacionados__lista">
              {artigo.relacionados.map(caminho => (
                <li key={caminho}>
                  <Link to={caminho}>{tituloDoCaminho(caminho)}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <p className="conteudo__p conteudo__p--nota">
          {blog ? (
            <>
              Mais artigos no <Link to="/blog">blog</Link>. Dúvidas sobre o app estão na{' '}
              <Link to="/ajuda">central de ajuda</Link> e nas{' '}
              <Link to="/perguntas">perguntas frequentes</Link>.
            </>
          ) : (
            <>
              Não achou o que procurava? Veja os outros artigos da{' '}
              <Link to="/ajuda">central de ajuda</Link>, as{' '}
              <Link to="/perguntas">perguntas frequentes</Link> ou escreva para{' '}
              <a href="mailto:ajuda@vera.finance">ajuda@vera.finance</a>.
            </>
          )}
        </p>

        <Chamada />
      </article>
      <JsonLd dados={artigoEstruturado(artigo, trilha)} />
    </SiteLayout>
  );
}
