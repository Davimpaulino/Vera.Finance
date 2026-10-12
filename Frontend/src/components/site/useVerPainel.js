import { useAuth } from '../../context/AuthContext.jsx';
import { useRouter } from '../../lib/router.jsx';

/** "Ver o painel": quem já entrou vai direto; quem não entrou cria a conta (ou entra). */
export function useVerPainel() {
  const { status } = useAuth();
  const { navigate } = useRouter();
  return () => navigate(status === 'in' ? '/app' : '/cadastro');
}
