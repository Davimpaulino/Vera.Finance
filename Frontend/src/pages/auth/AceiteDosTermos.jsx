import { useState } from 'react';
import { Button } from '../../components/ds/index.js';
import { Brand } from '../../components/Brand.jsx';
import { Link } from '../../lib/router.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { VERSAO_DOS_TERMOS } from '../../lib/termos.js';
import { CaixaDeAceite, FormError } from './AuthShared.jsx';

const FALTA_ACEITE =
  'Para continuar, confirme que tem 18 anos ou mais e que leu os Termos de uso e a Política de privacidade.';

/**
 * Aparece depois do login enquanto o perfil não tem o aceite da versão em vigor dos termos:
 * conta nova pelo Google ou pela Apple na tela Entrar, conta de antes do aceite ou termos novos.
 * Nada do app (nem o cadastro guiado) abre antes; a API também recusa sem o aceite.
 */
export default function AceiteDosTermos() {
  const { user, refresh, logout } = useAuth();
  const [aceito, setAceito] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(null);
  const termosMudaram = !!user?.termosAceitos;

  const aceitar = async e => {
    e.preventDefault();
    if (!aceito) return setErro(FALTA_ACEITE);
    setErro('');
    setCarregando('aceite');
    try {
      await api.post('/auth/sessao', { aceite: { versao: VERSAO_DOS_TERMOS } });
      // Com o perfil novo, o App sai desta tela e abre a página pedida.
      await refresh();
    } catch (err) {
      setErro(err.message);
      setCarregando(null);
    }
  };

  const sair = async () => {
    setCarregando('sair');
    try {
      await logout();
    } catch (err) {
      setErro(err.message);
      setCarregando(null);
    }
  };

  return (
    <section className="vera-page auth">
      <div className="auth__side auth__side--sunken">
        <Brand size="lg" to="/" className="auth__brand" />
        <span className="auth__headline">Falta só um passo para abrir o seu painel.</span>
      </div>
      <form onSubmit={aceitar} className="auth__form">
        <h1 className="auth__title">{termosMudaram ? 'Os termos mudaram' : 'Antes de continuar'}</h1>
        <p className="auth__texto">
          {termosMudaram
            ? 'Atualizamos os Termos de uso e a Política de privacidade. Leia a versão nova e confirme para continuar usando a vera.'
            : 'Para usar a vera, confirme a sua idade e o aceite dos Termos de uso e da Política de privacidade.'}
        </p>
        <CaixaDeAceite
          checked={aceito}
          onChange={e => {
            setAceito(e.target.checked);
            if (e.target.checked && erro === FALTA_ACEITE) setErro('');
          }}
        />
        <FormError>{erro}</FormError>
        <Button
          block
          type="submit"
          iconRight="arrow-right"
          loading={carregando === 'aceite'}
          loadingLabel="Salvando"
          disabled={!!carregando}
        >
          Aceitar e continuar
        </Button>
        <Button
          block
          variant="ghost"
          onClick={sair}
          loading={carregando === 'sair'}
          loadingLabel="Saindo"
          disabled={!!carregando}
        >
          Sair da conta
        </Button>
        <span className="auth__note auth__note--top4">
          Não quer aceitar? Saia da conta. A{' '}
          <Link to="/privacidade" className="vera-link-strong">
            Política de privacidade
          </Link>{' '}
          explica como apagar a conta ou levar os seus dados.
        </span>
      </form>
    </section>
  );
}
