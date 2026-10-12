import { Suspense, lazy, useEffect } from 'react';
import { Logo } from './components/ds/index.js';
import { Redirect, useRouter } from './lib/router.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useUi } from './context/UiContext.jsx';
import { AppShell } from './components/app/AppShell.jsx';
import { PageSkeleton } from './components/Loading.jsx';
import Landing from './pages/site/Landing.jsx';
import Precos from './pages/site/Precos.jsx';
import Legal from './pages/site/Legal.jsx';
import Integrantes from './pages/site/Integrantes.jsx';
import Login from './pages/auth/Login.jsx';
import Cadastro from './pages/auth/Cadastro.jsx';
const Onboarding = lazy(() => import('./pages/auth/Onboarding.jsx'));
const Painel = lazy(() => import('./pages/app/Painel.jsx'));
const Lancamentos = lazy(() => import('./pages/app/Lancamentos.jsx'));
const Relatorios = lazy(() => import('./pages/app/Relatorios.jsx'));
const Metas = lazy(() => import('./pages/app/Metas.jsx'));
const Categorias = lazy(() => import('./pages/app/Categorias.jsx'));
const Comparar = lazy(() => import('./pages/app/Comparar.jsx'));
const Lista = lazy(() => import('./pages/app/Lista.jsx'));
const Familia = lazy(() => import('./pages/app/Familia.jsx'));
const Configuracoes = lazy(() => import('./pages/app/Configuracoes.jsx'));

const APP_PAGES = {
  '/app': Painel,
  '/app/lancamentos': Lancamentos,
  '/app/relatorios': Relatorios,
  '/app/metas': Metas,
  '/app/categorias': Categorias,
  '/app/comparar': Comparar,
  '/app/lista': Lista,
  '/app/familia': Familia,
  '/app/configuracoes': Configuracoes
};

function Carregando() {
  return (
    <div className="vera-center" aria-busy="true">
      <Logo size="xl" className="vera-logo--pulse" />
    </div>
  );
}

export default function App() {
  const { path } = useRouter();
  const { status, user } = useAuth();
  const { setTheme } = useUi();

  // A superfície escolhida em Configurações vem junto com o perfil.
  // Aplica só quando a pessoa entra, para não brigar com a troca feita no topo da tela.
  useEffect(() => {
    if (user?.prefs?.tema) setTheme(user.prefs.tema);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const titulos = {
      '/': 'vera.finance',
      '/precos': 'Preços · vera.finance',
      '/entrar': 'Entrar · vera.finance',
      '/cadastro': 'Criar conta · vera.finance',
      '/integrantes': 'Integrantes · vera.finance'
    };
    document.title = titulos[path] || 'vera.finance';
  }, [path]);

  if (path === '/') return <Landing />;
  if (path === '/precos') return <Precos />;
  if (path === '/integrantes') return <Integrantes />;
  if (path === '/termos') return <Legal tipo="termos" />;
  if (path === '/privacidade') return <Legal tipo="privacidade" />;

  if (status === 'loading') return <Carregando />;
  const logado = status === 'in';
  const pronto = logado && user?.onboardingCompleto;

  if (path === '/entrar') return pronto ? <Redirect to="/app" /> : <Login />;
  if (path === '/cadastro')
    return pronto ? (
      <Redirect to="/app" />
    ) : logado ? (
      <Redirect to="/cadastro/perguntas" />
    ) : (
      <Cadastro />
    );
  if (path === '/cadastro/perguntas')
    return !logado ? (
      <Redirect to="/cadastro" />
    ) : pronto ? (
      <Redirect to="/app" />
    ) : (
      <Suspense fallback={<Carregando />}>
        <Onboarding />
      </Suspense>
    );

  const Page = APP_PAGES[path];
  if (Page) {
    if (!logado) return <Redirect to="/entrar" />;
    if (!pronto) return <Redirect to="/cadastro/perguntas" />;
    return (
      <AppShell>
        <Suspense fallback={<PageSkeleton />}>
          <Page key={path} />
        </Suspense>
      </AppShell>
    );
  }
  return <Redirect to="/" />;
}
