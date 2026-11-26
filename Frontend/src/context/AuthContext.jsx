import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { servicoDeLogin } from '../services/servicoDeLogin.js';
import { api, setAoPedirAceite } from '../services/api.js';

// Exportado para a pré-renderização (src/entry-server.jsx) entregar um valor fixo, sem Firebase.
export const AuthContext = createContext(null);

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

  // Termos novos com o app aberto: o perfil recarregado leva o App para a tela de aceite.
  useEffect(() => setAoPedirAceite(() => refresh().catch(() => {})), [refresh]);

  useEffect(
    () =>
      servicoDeLogin.observar(async logado => {
        if (!logado) {
          setUser(null);
          setStatus('out');
          return;
        }
        try {
          await servicoDeLogin.abrirSessao();
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
      async register(nome, email, senha, aceite) {
        await servicoDeLogin.cadastrar(nome, email, senha, aceite);
        return refresh();
      },
      async social(provider, aceite) {
        await servicoDeLogin.entrarComProvedor(provider, aceite);
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
      emailParaConfirmar: servicoDeLogin.emailParaConfirmar,
      conferirConfirmacao: servicoDeLogin.conferirConfirmacao,
      reenviarConfirmacao: servicoDeLogin.reenviarConfirmacao,
      firebaseHabilitado: servicoDeLogin.firebaseHabilitado
    }),
    [status, user, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
