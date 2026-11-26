import { Suspense, lazy, useEffect } from 'react';
import { Logo } from './components/ds/index.js';
import { Redirect, useRouter } from './lib/router.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useUi } from './context/UiContext.jsx';
import { metaDaPagina } from './lib/paginas.js';
import { AppShell } from './components/app/AppShell.jsx';
import { PageSkeleton } from './components/Loading.jsx';
import Landing from './pages/site/Landing.jsx';
import Precos from './pages/site/Precos.jsx';
import Legal from './pages/site/Legal.jsx';
import Perguntas from './pages/site/Perguntas.jsx';
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

/** Acha a tag no <head> ou cria uma. */
function tagNoHead(seletor, tag, atributos) {
  let el = document.head.querySelector(seletor);
  if (!el) {
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  for (const [nome, valor] of Object.entries(atributos)) el.setAttribute(nome, valor);
}

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
    // Título, descrição, canonical e robots por página. As páginas públicas já chegam com eles no
    // HTML pré-renderizado; aqui eles acompanham a navegação dentro do site.
    const meta = metaDaPagina(path);
    document.title = meta.titulo;
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.descricao);
    document.querySelector('meta[name="robots"]')?.setAttribute('content', meta.robots);
    // A casca do app (dist/app.html) vem sem canonical; ele só é criado nas páginas públicas.
    if (meta.robots.startsWith('index')) {
      tagNoHead('link[rel="canonical"]', 'link', { rel: 'canonical', href: meta.canonical });
      tagNoHead('meta[property="og:url"]', 'meta', { property: 'og:url', content: meta.canonical });
    } else document.head.querySelector('link[rel="canonical"]')?.remove();
  }, [path]);

  if (path === '/') return <Landing />;
  if (path === '/precos') return <Precos />;
  if (path === '/perguntas') return <Perguntas />;
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
