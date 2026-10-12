import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { servicoDeLogin } from '../services/servicoDeLogin.js';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | out | in
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get('/me');
      setUser(me);
      setStatus('in');
      return me;
    } catch (e) {
      if (e.status === 401 || e.status === 404) {
        setUser(null);
        setStatus('out');
        return null;
      }
      throw e;
    }
  }, []);

  useEffect(
    () =>
      servicoDeLogin.observar(async logado => {
        if (!logado) {
          setUser(null);
          setStatus('out');
          return;
        }
        try {
          await api.post('/auth/sessao', {});
          await refresh();
        } catch {
          setStatus('out');
        }
      }),
    [refresh]
  );

  const value = useMemo(
    () => ({
      status,
      user,
      setUser,
      refresh,
      async login(email, senha, lembrar) {
        await servicoDeLogin.entrar(email, senha, lembrar);
        return refresh();
      },
      async register(nome, email, senha) {
        await servicoDeLogin.cadastrar(nome, email, senha);
        return refresh();
      },
      async social(provider) {
        await servicoDeLogin.entrarComProvedor(provider);
        return refresh();
      },
      async logout() {
        await servicoDeLogin.sair();
        setUser(null);
        setStatus('out');
      },
      resetPassword: servicoDeLogin.redefinirSenha,
      trocarSenha: servicoDeLogin.trocarSenha,
      jeitoDeTrocarSenha: servicoDeLogin.jeitoDeTrocarSenha,
      firebaseHabilitado: servicoDeLogin.firebaseHabilitado
    }),
    [status, user, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
