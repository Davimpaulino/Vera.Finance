import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { servicoDeLogin } from '../services/servicoDeLogin.js';
import { api, setAoPedirAceite } from '../services/api.js';
import { useRouter } from '../lib/router.jsx';
import { precisaDeLogin } from '../lib/rotas.js';
import { recarregarAPagina } from '../lib/versaoNova.js';

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
  // O SDK do Firebase não baixou (erro com `recarregar`, veja servicoDeLogin): aí o
  // "Tentar de novo" recarrega a página em vez de pedir o mesmo arquivo outra vez.
  const recarregarAoTentar = useRef(false);

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

  // Marca para o "Ver o painel" das páginas do site, onde o login não liga (veja servicoDeLogin).
  useEffect(() => {
    if (status === 'in') servicoDeLogin.lembrarSessao(true);
    else if (status === 'out') servicoDeLogin.lembrarSessao(false);
  }, [status]);

  // Termos novos com o app aberto: o perfil recarregado leva o App para a tela de aceite.
  useEffect(() => setAoPedirAceite(() => refresh().catch(() => {})), [refresh]);

  useEffect(() => {
    if (!ligado) return undefined;
    return servicoDeLogin.observar(
      async logado => {
        recarregarAoTentar.current = false;
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
      erro => {
        recarregarAoTentar.current = !!erro?.recarregar;
        setStatus(semConexao(erro) ? 'offline' : 'out');
      }
    );
  }, [ligado, tentativa, refresh]);

  const tentarDeNovo = useCallback(() => {
    // Depois de um deploy o arquivo antigo do Firebase não existe mais; a página recarregada pede
    // o do build atual. Sem internet, recarregar mostraria a página de erro do navegador: aí só
    // liga o login de novo (e, quando a rede voltar, o evento 'online' chega aqui).
    if (recarregarAoTentar.current && navigator.onLine !== false) {
      recarregarAPagina();
      return;
    }
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
      temSessao: servicoDeLogin.temSessao,
      resetPassword: servicoDeLogin.redefinirSenha,
      trocarSenha: servicoDeLogin.trocarSenha,
      jeitoDeTrocarSenha: servicoDeLogin.jeitoDeTrocarSenha,
      emailParaConfirmar: servicoDeLogin.emailParaConfirmar,
      confirmacaoJaEnviada: servicoDeLogin.confirmacaoJaEnviada,
      conferirConfirmacao: servicoDeLogin.conferirConfirmacao,
      reenviarConfirmacao: servicoDeLogin.reenviarConfirmacao,
      firebaseHabilitado: servicoDeLogin.firebaseHabilitado
    }),
    [status, user, refresh, tentarDeNovo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
