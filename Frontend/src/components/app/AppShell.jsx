import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Icon, IconButton, Logo } from '../ds/index.js';
import { Brand } from '../Brand.jsx';
import { Link, useRouter } from '../../lib/router.jsx';
import { useBreakpoint } from '../../hooks/useBreakpoint.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { api } from '../../services/api.js';
import { diaDeMes, hojeLabel, iniciais } from '../../lib/format.js';
import { GastoModal } from './GastoModal.jsx';
import { Notificacoes } from './Notificacoes.jsx';
import { LerNota } from './LerNota.jsx';
import { cx } from '../../lib/cx.js';
import './css/app-shell.css';

export const NAV = [
  ['/app', 'layout-dashboard', 'Painel'],
  ['/app/lancamentos', 'list', 'Lançamentos'],
  ['/app/relatorios', 'chart-no-axes-column', 'Relatórios'],
  ['/app/metas', 'target', 'Metas & limites'],
  ['/app/categorias', 'layout-grid', 'Categorias'],
  ['/app/comparar', 'arrow-left-right', 'Comparar mercados'],
  ['/app/lista', 'shopping-basket', 'Lista de compras'],
  ['/app/familia', 'users', 'Modo família'],
  ['/app/configuracoes', 'settings', 'Configurações']
];

const rotuloCiclo = (d = 5) =>
  d === 1 ? 'ciclo do dia 1 ao fim do mês' : `ciclo de ${d} a ${d - 1}`;

const ShellContext = createContext(null);
export const useShell = () => useContext(ShellContext);

/** Casca do app: aside 248 → 76 (tablet, recolhível) → gaveta com scrim (celular). */
export function AppShell({ children }) {
  const bp = useBreakpoint();
  const mobile = bp === 'mobile';
  const { path, navigate } = useRouter();
  const { user, setUser } = useAuth();
  const { theme, setTheme, ocultar } = useUi();
  const [collapsed, setCollapsed] = useState(bp === 'tablet');
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState(null);
  const [versao, setVersao] = useState(0);
  const [naoVistas, setNaoVistas] = useState(0);
  const [avisos, setAvisos] = useState(false);
  const [leitor, setLeitor] = useState(false);

  useEffect(() => {
    setDrawer(false);
    setCollapsed(bp === 'tablet');
  }, [bp]);
  useEffect(() => {
    setDrawer(false);
  }, [path]);
  useEffect(() => {
    api
      .get('/notificacoes')
      .then(r => setNaoVistas(r.naoVistas))
      .catch(() => {});
  }, [versao]);

  const atual = NAV.find(n => n[0] === path) || NAV[0];

  const trocarTema = () => {
    const tema = theme === 'tinta' ? 'papel' : 'tinta';
    setTheme(tema);
    api
      .patch('/me', { prefs: { tema } })
      .then(setUser)
      .catch(() => {});
  };

  const abrirGasto = useCallback(opts => setModal({ tipo: 'saida', ...opts }), []);
  const recarregar = useCallback(() => setVersao(v => v + 1), []);
  const abrirLeitor = useCallback(() => {
    setModal(null);
    setLeitor(true);
  }, []);
  const notaLida = useCallback(
    nota => {
      setLeitor(false);
      setModal({ tipo: 'saida', nota });
      recarregar();
    },
    [recarregar]
  );

  const assinatura = user?.assinatura;
  const planoNome = user?.planoInfo?.nome || 'Grátis';

  return (
    <ShellContext.Provider value={{ abrirGasto, abrirLeitor, versao, recarregar, ocultar }}>
      <div className="app">
        <div
          className={cx('app__scrim', mobile && drawer && 'app__scrim--open')}
          onClick={() => setDrawer(false)}
        />
        <aside
          aria-label="Menu do app"
          className={cx(
            'app-aside',
            collapsed && 'app-aside--collapsed',
            drawer && 'app-aside--open'
          )}
        >
          <div className="app-aside__top">
            <Brand size="md" to="/" className="app-aside__brand" />
            <Link to="/" aria-label="vera.finance — início" className="app-aside__dot">
              <Logo mark />
            </Link>
            <span className="app-aside__close">
              <IconButton
                icon="x"
                label="Fechar menu"
                variant="ghost"
                size="lg"
                onClick={() => setDrawer(false)}
              />
            </span>
          </div>
          <nav className="app-aside__nav">
            {NAV.map(([to, icon, label]) => {
              const ativo = path === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cx('app-nav', ativo && 'app-nav--on')}
                  aria-current={ativo ? 'page' : undefined}
                  title={label}
                >
                  <Icon name={icon} size={19} />
                  <span className="app-nav__label">{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="app-aside__footer">
            <Link to="/app/configuracoes" className="app-plan">
              <div className="app-plan__head">
                <Icon name="sparkles" size={15} />
                <span className="app-plan__name">{planoNome}</span>
              </div>
              <span className="app-plan__text">
                {assinatura
                  ? assinatura.cancelada
                    ? `Cancelado. O vera+ segue até ${diaDeMes(assinatura.ativaAte)}.`
                    : `Notas ilimitadas. Próxima cobrança em ${diaDeMes(assinatura.proximaCobranca)}.`
                  : '5 notas por mês e até 3 metas. Conheça o vera+.'}
              </span>
            </Link>
            <Link to="/app/configuracoes" className="app-nav app-user">
              <span className="app-user__avatar">{iniciais(user?.nome)}</span>
              <span className="app-user__text">
                <span className="app-user__name">{user?.nome || 'Você'}</span>
                <span className="app-user__cycle">{rotuloCiclo(user?.ciclo?.diaVirada)}</span>
              </span>
            </Link>
          </div>
        </aside>

        <div className="vera-shell__main">
          <header className="vera-shell__top">
            <IconButton
              icon={mobile ? 'menu' : collapsed ? 'panel-left-open' : 'panel-left-close'}
              label={mobile ? 'Abrir menu' : collapsed ? 'Expandir menu' : 'Recolher menu'}
              variant="ghost"
              size="md"
              onClick={() => (mobile ? setDrawer(d => !d) : setCollapsed(c => !c))}
            />
            <div className="app-top__title">
              <h1 className="app-top__h1">{atual[2]}</h1>
              <span className="vera-only-desktop app-top__date">{hojeLabel()}</span>
            </div>
            <div className="app-top__actions">
              <IconButton
                icon={theme === 'tinta' ? 'sun' : 'moon'}
                label="Trocar superfície"
                variant="ghost"
                size="md"
                onClick={trocarTema}
              />
              <IconButton
                icon="bell"
                label={naoVistas ? `${naoVistas} notificações novas` : 'Notificações'}
                variant="ghost"
                size="md"
                badge={naoVistas || undefined}
                onClick={() => setAvisos(true)}
              />
            </div>
          </header>
          <main className="vera-shell__body">{children}</main>
        </div>
      </div>
      {modal ? (
        <GastoModal
          {...modal}
          onLerNota={abrirLeitor}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            recarregar();
          }}
        />
      ) : null}
      {avisos ? (
        <Notificacoes
          onClose={() => setAvisos(false)}
          onMudou={setNaoVistas}
          onAbrirNota={nota => setModal({ tipo: 'saida', nota })}
          onIr={destino => navigate(destino)}
        />
      ) : null}
      {leitor ? <LerNota onClose={() => setLeitor(false)} onLida={notaLida} /> : null}
    </ShellContext.Provider>
  );
}
