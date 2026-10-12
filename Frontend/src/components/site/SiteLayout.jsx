import { useState } from 'react';
import { Button, IconButton, Icon } from '../ds/index.js';
import { Brand } from '../Brand.jsx';
import { Link, useRouter } from '../../lib/router.jsx';
import { useBreakpoint } from '../../hooks/useBreakpoint.js';
import { useVerPainel } from './useVerPainel.js';
import './css/site-layout.css';

function NavLink({ to, onClick, children }) {
  const bar = <span className="site-navlink__bar" />;
  if (to)
    return (
      <Link to={to} className="site-navlink">
        {children}
        {bar}
      </Link>
    );
  return (
    <button type="button" className="site-navlink" onClick={onClick}>
      {children}
      {bar}
    </button>
  );
}

/** Topo do site público (landing e preços) com menu de gaveta no celular. */
export function SiteLayout({ children }) {
  const [menu, setMenu] = useState(false);
  const bp = useBreakpoint();
  const { navigate } = useRouter();
  const verPainel = useVerPainel();
  const aberto = menu && bp === 'mobile';
  const fechar = () => setMenu(false);
  const ir = to => () => {
    fechar();
    navigate(to);
  };

  const comoFunciona = () => {
    fechar();
    navigate('/');
    setTimeout(
      () => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' }),
      50
    );
  };

  return (
    <div>
      <header className="site-header">
        <Brand size="lg" to="/" />
        <nav className="vera-only-desktop" aria-label="Principal">
          <div className="site-nav">
            <NavLink onClick={comoFunciona}>Como funciona</NavLink>
            <NavLink to="/precos">Preços</NavLink>
            <NavLink to="/integrantes">Integrantes</NavLink>
            <NavLink to="/entrar">Entrar</NavLink>
            <Button size="sm" onClick={() => navigate('/cadastro')}>
              Criar conta
            </Button>
          </div>
        </nav>
        <div className="vera-only-mobile">
          <IconButton
            icon={aberto ? 'x' : 'menu'}
            label={aberto ? 'Fechar menu' : 'Abrir menu'}
            variant="ghost"
            size="lg"
            onClick={() => setMenu(m => !m)}
          />
        </div>
      </header>
      {aberto ? (
        <div className="vera-only-mobile">
          <div className="site-menu__scrim" onClick={fechar} />
          <div className="site-menu">
            <button type="button" className="site-menu__item" onClick={comoFunciona}>
              Como funciona
              <Icon name="chevron-right" size={18} />
            </button>
            <button type="button" className="site-menu__item" onClick={ir('/precos')}>
              Preços
              <Icon name="chevron-right" size={18} />
            </button>
            <button type="button" className="site-menu__item" onClick={ir('/integrantes')}>
              Integrantes
              <Icon name="chevron-right" size={18} />
            </button>
            <button
              type="button"
              className="site-menu__item"
              onClick={() => {
                fechar();
                verPainel();
              }}
            >
              Ver o painel
              <Icon name="chevron-right" size={18} />
            </button>
            <div className="site-menu__ctas">
              <Button block size="lg" onClick={ir('/cadastro')}>
                Criar conta grátis
              </Button>
              <Button block size="lg" variant="secondary" onClick={ir('/entrar')}>
                Entrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}
