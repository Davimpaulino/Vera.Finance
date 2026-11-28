import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { caminhoPublico } from './paginas.js';

// Roteador mínimo sobre a History API: caminho atual, navegar e links.
const RouterContext = createContext({ path: '/', navigate: () => {} });

// "/precos/" e "/precos" são a mesma página. Os links e a navegação usam a forma com a barra no
// fim nas páginas pré-renderizadas (caminhoPublico, em lib/paginas.js); o resto do app compara
// sempre o caminho sem ela.
const normalizar = caminho => (caminho.length > 1 ? caminho.replace(/\/+$/, '') || '/' : caminho);

/** caminhoInicial serve para a pré-renderização no build, onde não existe window. */
export function RouterProvider({ children, caminhoInicial }) {
  const [path, setPath] = useState(() => normalizar(caminhoInicial ?? window.location.pathname));

  useEffect(() => {
    const onPop = () => setPath(normalizar(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    const url = new URL(caminhoPublico(to), window.location.origin);
    // A mesma página (com ou sem a barra no fim) não cria entrada nova no histórico.
    if (
      normalizar(url.pathname) + url.search + url.hash ===
      normalizar(window.location.pathname) + window.location.search + window.location.hash
    )
      return;
    window.history[replace ? 'replaceState' : 'pushState'](
      {},
      '',
      url.pathname + url.search + url.hash
    );
    setPath(normalizar(url.pathname));
    if (!url.hash) window.scrollTo(0, 0);
  }, []);

  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

/** <a> que navega sem recarregar a página. O href sai na forma pública (caminhoPublico). */
export function Link({ to, onClick, children, ...rest }) {
  const { navigate } = useRouter();
  return (
    <a
      href={caminhoPublico(to)}
      onClick={e => {
        if (onClick) onClick(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Redirect({ to }) {
  const { navigate } = useRouter();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to, navigate]);
  return null;
}
