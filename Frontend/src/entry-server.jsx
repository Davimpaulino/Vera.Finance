import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { RouterProvider } from './lib/router.jsx';
import { AuthContext } from './context/AuthContext.jsx';
import { UiProvider } from './context/UiContext.jsx';
import { DadosIniciaisContext } from './hooks/useApi.js';
import App from './App.jsx';
// Os planos são estáticos no código da API; lidos daqui, a página de preços sai completa no HTML.
import { PLANOS } from '../../Backend/src/models/PlanoModel.js';

export { ROTAS_PUBLICAS, metaDaPagina } from './lib/paginas.js';

// No build ninguém está logado: as páginas saem como para um visitante.
// O login de verdade (Firebase) só começa no navegador, pelo AuthProvider de main.jsx.
const DADOS_INICIAIS = { '/planos': PLANOS };

const semLogin = async () => {
  throw new Error('Indisponível na pré-renderização.');
};
const authDoVisitante = {
  status: 'out',
  user: null,
  setUser: () => {},
  refresh: async () => null,
  login: semLogin,
  register: semLogin,
  social: semLogin,
  logout: async () => {},
  resetPassword: semLogin,
  trocarSenha: semLogin,
  jeitoDeTrocarSenha: () => 'backend',
  firebaseHabilitado: true
};

/** HTML de uma página pública, para scripts/prerender.mjs. */
export function render(caminho) {
  return renderToString(
    <StrictMode>
      <RouterProvider caminhoInicial={caminho}>
        <UiProvider>
          <AuthContext.Provider value={authDoVisitante}>
            <DadosIniciaisContext.Provider value={DADOS_INICIAIS}>
              <App />
            </DadosIniciaisContext.Provider>
          </AuthContext.Provider>
        </UiProvider>
      </RouterProvider>
    </StrictMode>
  );
}
