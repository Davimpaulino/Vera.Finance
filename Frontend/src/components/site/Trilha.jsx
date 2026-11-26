import { Link } from '../../lib/router.jsx';

/**
 * Trilha de navegação (Início › Ajuda › Artigo). `itens` é [[rótulo, caminho]], do início até a
 * página atual; a última não vira link. O mesmo caminho vai para o JSON-LD (BreadcrumbList).
 */
export function Trilha({ itens }) {
  return (
    <nav aria-label="Você está em" className="conteudo-trilha">
      <ol className="conteudo-trilha__lista">
        {itens.map(([rotulo, caminho], i) =>
          i < itens.length - 1 ? (
            <li key={caminho} className="conteudo-trilha__item">
              <Link to={caminho}>{rotulo}</Link>
            </li>
          ) : (
            <li key={caminho} className="conteudo-trilha__item" aria-current="page">
              {rotulo}
            </li>
          )
        )}
      </ol>
    </nav>
  );
}
