// Monta um componente com os provedores do app (rota, superfície e login), sem Firebase nem API.
import { render } from '@testing-library/react';
import { RouterProvider } from '../src/lib/router.jsx';
import { UiProvider } from '../src/context/UiContext.jsx';
import { AuthContext } from '../src/context/AuthContext.jsx';

/** Valor do login para os testes: visitante, a não ser que o teste troque algum campo. */
export const authDeTeste = (campos = {}) => ({
  status: 'out',
  user: null,
  setUser: () => {},
  refresh: async () => null,
  tentarDeNovo: () => {},
  login: async () => null,
  register: async () => null,
  social: async () => null,
  logout: async () => {},
  resetPassword: async () => {},
  trocarSenha: async () => {},
  jeitoDeTrocarSenha: () => 'backend',
  firebaseHabilitado: false,
  ...campos
});

export function renderComProvedores(ui, { caminho = '/', auth = {} } = {}) {
  window.history.replaceState({}, '', caminho);
  return render(
    <RouterProvider>
      <UiProvider>
        <AuthContext.Provider value={authDeTeste(auth)}>{ui}</AuthContext.Provider>
      </UiProvider>
    </RouterProvider>
  );
}
