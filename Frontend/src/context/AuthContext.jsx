import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { servicoDeLogin } from '../services/servicoDeLogin.js';
import { api, setAoPedirAceite } from '../services/api.js';
import { useRouter } from '../lib/router.jsx';
import { precisaDeLogin } from '../lib/rotas.js';

// Exportado para a pré-renderização (src/entry-server.jsx) entregar um valor fixo, sem Firebase.
export const AuthContext = createContext(null);

// Falha de rede (sem internet, API fora do ar): a pessoa não saiu da conta, só não deu para
// conferir. Mandar para o login nessa hora faria parecer que a sessão se perdeu.
const semConexao = erro => erro?.status === 0;

export function AuthProvider({ children }) {
  const { path } = useRouter();
  // loading | out | in | offline. Nas páginas do site o login nem liga e fica em loading.
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  // O login (e o download do Firebase) só liga na primeira rota que precisa dele: entrar,
  // cadastro ou app. Depois de ligado não desliga, para a volta ao app ser imediata.
  const [ligado, setLigado] = useState(() => precisaDeLogin(path));
  if (!ligado && precisaDeLogin(path)) setLigado(true);
  // Cada "Tentar de novo" refaz a inscrição no login, que baixa o Firebase se ele tiver faltado.
  const [tentativa, setTentativa] = useState(0);

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

  useEffect(() => {
    if (!ligado) return undefined;
    return servicoDeLogin.observar(
      async logado => {
        if (!logado) {
          setUser(null);
          setStatus('out');
          return;
        }
        try {
          await servicoDeLogin.abrirSessao();
          await refresh();
        } catch (erro) {
          setStatus(semConexao(erro) ? 'offline' : 'out');
        }
      },
      erro => setStatus(semConexao(erro) ? 'offline' : 'out')
    );
  }, [ligado, tentativa, refresh]);

  const tentarDeNovo = useCallback(() => {
    setStatus('loading');
    setTentativa(t => t + 1);
  }, []);

  // A internet voltou com a tela "Sem conexão" aberta: tenta de novo sem esperar o clique.
  useEffect(() => {
    if (status !== 'offline') return undefined;
    window.addEventListener('online', tentarDeNovo);
    return () => window.removeEventListener('online', tentarDeNovo);
  }, [status, tentarDeNovo]);

  const value = useMemo(
    () => ({
      status,
      user,
      setUser,
      refresh,
      tentarDeNovo,
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
      firebaseHabilitado: servicoDeLogin.firebaseHabilitado
    }),
    [status, user, refresh, tentarDeNovo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
