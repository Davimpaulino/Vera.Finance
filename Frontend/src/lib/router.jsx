import { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Roteador mínimo sobre a History API: caminho atual, navegar e links.
const RouterContext = createContext({ path: '/', navigate: () => {} });

// "/precos/" e "/precos" são a mesma página (o servidor estático pode pôr a barra no fim).
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
    const url = new URL(to, window.location.origin);
    if (
      url.pathname + url.search + url.hash ===
      window.location.pathname + window.location.search + window.location.hash
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

/** <a> que navega sem recarregar a página. */
export function Link({ to, onClick, children, ...rest }) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
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
