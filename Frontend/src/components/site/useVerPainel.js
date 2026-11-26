import { useAuth } from '../../context/AuthContext.jsx';
import { useRouter } from '../../lib/router.jsx';
import { servicoDeLogin } from '../../services/servicoDeLogin.js';

/**
 * "Ver o painel": quem tem sessão aberta neste aparelho vai direto para o app; quem não tem cria a
 * conta (o cadastro tem o link para entrar). Nas páginas do site o login não liga e o status fica
 * em 'loading', então vale a marca que o AuthContext deixa quando a sessão abre. Se o login já
 * ligou nesta aba, o status responde. Marca que sobrou de uma sessão vencida leva ao app, que
 * manda para Entrar.
 */
export function useVerPainel() {
  const { status } = useAuth();
  const { navigate } = useRouter();
  return () => {
    const conectado = status === 'in' || (status !== 'out' && servicoDeLogin.lembraDeSessao());
    navigate(conectado ? '/app' : '/cadastro');
  };
}
