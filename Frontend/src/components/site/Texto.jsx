import { Fragment } from 'react';
import { Link } from '../../lib/router.jsx';
import { partesDoTexto } from '../../conteudo/formato.js';

/** Texto dos artigos com os links [rótulo](/caminho) já como links (formato em conteudo/formato.js). */
export function Texto({ children }) {
  return partesDoTexto(children).map((parte, i) => {
    if (!parte.href) return <Fragment key={i}>{parte.texto}</Fragment>;
    // Caminho interno navega sem recarregar; e-mail e site de fora viram link comum.
    if (parte.href.startsWith('/'))
      return (
        <Link key={i} to={parte.href}>
          {parte.texto}
        </Link>
      );
    const externo = parte.href.startsWith('http');
    return (
      <a key={i} href={parte.href} {...(externo ? { rel: 'noopener noreferrer' } : {})}>
        {parte.texto}
      </a>
    );
  });
}
