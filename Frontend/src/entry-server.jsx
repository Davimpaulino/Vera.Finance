import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { RouterProvider } from './lib/router.jsx';
import { AuthContext } from './context/AuthContext.jsx';
import { UiProvider } from './context/UiContext.jsx';
import { DadosIniciaisContext } from './hooks/useApi.js';
import App from './App.jsx';
import { ROTAS_PUBLICAS } from './lib/paginas.js';
// Os planos são estáticos no código da API; lidos daqui, a página de preços sai completa no HTML.
import { PLANOS } from '../../Backend/src/models/PlanoModel.js';
// No navegador, a ajuda e o blog vêm num pedaço baixado depois (conteudo/carregar.js). Aqui ele
// entra direto, para o renderToString desenhar o artigo inteiro, sem esperar import().
import * as conteudo from './pages/site/Conteudo.jsx';
import { usarConteudoJaImportado } from './conteudo/carregar.js';
import { ARTIGOS } from './conteudo/index.js';

usarConteudoJaImportado(conteudo);

export { metaDaPagina } from './lib/paginas.js';
export { problemasDoConteudo } from './conteudo/index.js';
// Páginas fixas (lib/paginas.js) e um artigo por caminho de src/conteudo.
export const ROTAS_PRE_RENDERIZADAS = [
  ...ROTAS_PUBLICAS,
  ...ARTIGOS.map(artigo => artigo.caminho)
];

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
  emailParaConfirmar: () => null,
  confirmacaoJaEnviada: () => false,
  conferirConfirmacao: async () => null,
  reenviarConfirmacao: semLogin,
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
