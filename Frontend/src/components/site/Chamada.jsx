import { Link } from '../../lib/router.jsx';

/**
 * Convite para criar a conta, no fim das páginas de conteúdo. Os botões são links de verdade
 * (<a href>), para buscadores e robôs de IA seguirem até o cadastro.
 */
export function Chamada({
  titulo = 'Experimente a vera de graça',
  texto = 'Categorias, projeção do ciclo, lista de compras e comparação de preços no plano grátis, que não expira e não pede cartão.',
  secundario = ['Ver os planos', '/precos']
}) {
  return (
    <aside className="conteudo-chamada" aria-label="Criar conta">
      <span className="conteudo-chamada__titulo">{titulo}</span>
      <p className="conteudo-chamada__texto">{texto}</p>
      <div className="vera-cta-stack conteudo-acoes">
        <Link to="/cadastro" className="vera-btn vera-btn--primary">
          Criar conta grátis
        </Link>
        {secundario ? (
          <Link to={secundario[1]} className="vera-btn vera-btn--secondary">
            {secundario[0]}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
