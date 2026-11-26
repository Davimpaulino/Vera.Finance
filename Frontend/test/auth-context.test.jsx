import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/context/AuthContext.jsx';
import { RouterProvider, useRouter } from '../src/lib/router.jsx';
import { UiProvider } from '../src/context/UiContext.jsx';
import { AuthContext } from '../src/context/AuthContext.jsx';
import { ApiError, api } from '../src/services/api.js';
import { servicoDeLogin } from '../src/services/servicoDeLogin.js';
import { pagina } from '../src/lib/versaoNova.js';
import App from '../src/App.jsx';
import { authDeTeste } from './auxiliares.jsx';

// O login de verdade (Firebase) fica de fora: cada teste diz o que a sessão responde.
vi.mock('../src/services/servicoDeLogin.js', () => ({
  servicoDeLogin: {
    observar: vi.fn(),
    abrirSessao: vi.fn(),
    entrar: vi.fn(),
    cadastrar: vi.fn(),
    entrarComProvedor: vi.fn(),
    sair: vi.fn(),
    redefinirSenha: vi.fn(),
    trocarSenha: vi.fn(),
    jeitoDeTrocarSenha: () => 'backend',
    firebaseHabilitado: false
  }
}));

const SEM_REDE = new ApiError(0, 'Sem conexão com a vera. Confira a internet e tente de novo.');
// O que servicoDeLogin devolve quando o SDK do Firebase não baixou e a página não recarregou.
const SEM_SDK = Object.assign(new ApiError(0, SEM_REDE.message), { recarregar: true });

function Estado() {
  const { status, user, tentarDeNovo } = useAuth();
  const { navigate } = useRouter();
  return (
    <>
      <output aria-label="status">{status}</output>
      <output aria-label="nome">{user?.nome || ''}</output>
      <button type="button" onClick={tentarDeNovo}>
        tentar
      </button>
      <button type="button" onClick={() => navigate('/entrar')}>
        ir para entrar
      </button>
    </>
  );
}

const montar = caminho => {
  window.history.replaceState({}, '', caminho);
  return render(
    <RouterProvider>
      <AuthProvider>
        <Estado />
      </AuthProvider>
    </RouterProvider>
  );
};
const status = () => screen.getByLabelText('status').textContent;

beforeEach(() => {
  // Sessão aberta: o observador avisa "logado" assim que é ligado.
  servicoDeLogin.observar.mockImplementation(aoMudar => {
    aoMudar(true);
    return () => {};
  });
  servicoDeLogin.abrirSessao.mockResolvedValue({});
  vi.spyOn(api, 'get').mockResolvedValue({ nome: 'Ana' });
  vi.spyOn(pagina, 'recarregar').mockImplementation(() => {});
});

describe('AuthProvider', () => {
  it('nas páginas do site o login nem liga (o Firebase não é baixado)', () => {
    montar('/precos');
    expect(servicoDeLogin.observar).not.toHaveBeenCalled();
    expect(status()).toBe('loading');
  });

  it('liga ao chegar numa rota com login e não desliga depois', async () => {
    montar('/');
    fireEvent.click(screen.getByText('ir para entrar'));
    await waitFor(() => expect(status()).toBe('in'));
    expect(servicoDeLogin.observar).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('nome')).toHaveTextContent('Ana');
  });

  it('sem conta conectada fica "out"', async () => {
    servicoDeLogin.observar.mockImplementation(aoMudar => {
      aoMudar(false);
      return () => {};
    });
    montar('/app');
    await waitFor(() => expect(status()).toBe('out'));
  });

  it('sem internet fica "offline", não "out": a pessoa não é mandada para o login', async () => {
    servicoDeLogin.abrirSessao.mockRejectedValue(SEM_REDE);
    montar('/app');
    await waitFor(() => expect(status()).toBe('offline'));
  });

  it('o perfil que não carrega por falta de rede também é "offline"', async () => {
    api.get.mockRejectedValue(SEM_REDE);
    montar('/app');
    await waitFor(() => expect(status()).toBe('offline'));
  });

  it('o Firebase que não baixou (sem rede) é "offline"', async () => {
    servicoDeLogin.observar.mockImplementation((_aoMudar, aoFalhar) => {
      aoFalhar(SEM_REDE);
      return () => {};
    });
    montar('/entrar');
    await waitFor(() => expect(status()).toBe('offline'));
  });

  it('outros erros continuam mandando para o login', async () => {
    servicoDeLogin.abrirSessao.mockRejectedValue(new ApiError(401, 'Sessão expirada.'));
    montar('/app');
    await waitFor(() => expect(status()).toBe('out'));
  });

  it('"Tentar de novo" liga o login outra vez e, com a rede de volta, entra', async () => {
    servicoDeLogin.abrirSessao.mockRejectedValueOnce(SEM_REDE);
    montar('/app');
    await waitFor(() => expect(status()).toBe('offline'));
    fireEvent.click(screen.getByText('tentar'));
    await waitFor(() => expect(status()).toBe('in'));
    expect(servicoDeLogin.observar).toHaveBeenCalledTimes(2);
    expect(pagina.recarregar).not.toHaveBeenCalled();
  });

  it('o Firebase que não baixou: "Tentar de novo" recarrega a página (o arquivo pode ter sumido num deploy)', async () => {
    servicoDeLogin.observar.mockImplementation((_aoMudar, aoFalhar) => {
      aoFalhar(SEM_SDK);
      return () => {};
    });
    montar('/entrar');
    await waitFor(() => expect(status()).toBe('offline'));
    fireEvent.click(screen.getByText('tentar'));
    expect(pagina.recarregar).toHaveBeenCalledOnce();
    expect(servicoDeLogin.observar).toHaveBeenCalledTimes(1);
  });

  it('o Firebase que não baixou sem internet: "Tentar de novo" não recarrega (daria a página de erro do navegador)', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    servicoDeLogin.observar.mockImplementation((_aoMudar, aoFalhar) => {
      aoFalhar(SEM_SDK);
      return () => {};
    });
    montar('/entrar');
    await waitFor(() => expect(status()).toBe('offline'));
    fireEvent.click(screen.getByText('tentar'));
    await waitFor(() => expect(servicoDeLogin.observar).toHaveBeenCalledTimes(2));
    expect(pagina.recarregar).not.toHaveBeenCalled();
    online.mockRestore();
  });

  it('a internet que volta tenta sozinha', async () => {
    servicoDeLogin.abrirSessao.mockRejectedValueOnce(SEM_REDE);
    montar('/app');
    await waitFor(() => expect(status()).toBe('offline'));
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(status()).toBe('in'));
  });
});

describe('App sem conexão', () => {
  it('mostra "Sem conexão" com "Tentar de novo" no lugar do login', () => {
    const tentarDeNovo = vi.fn();
    window.history.replaceState({}, '', '/app/lista');
    render(
      <RouterProvider>
        <UiProvider>
          <AuthContext.Provider value={authDeTeste({ status: 'offline', tentarDeNovo })}>
            <App />
          </AuthContext.Provider>
        </UiProvider>
      </RouterProvider>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Sem conexão' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/app/lista');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(tentarDeNovo).toHaveBeenCalledOnce();
  });

  it('as páginas do site abrem normalmente, mesmo sem conexão', () => {
    window.history.replaceState({}, '', '/termos');
    render(
      <RouterProvider>
        <UiProvider>
          <AuthContext.Provider value={authDeTeste({ status: 'offline' })}>
            <App />
          </AuthContext.Provider>
        </UiProvider>
      </RouterProvider>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeInTheDocument();
  });

  it('endereço que não existe vai para a home sem esperar o login', () => {
    window.history.replaceState({}, '', '/pagina-que-nao-existe');
    render(
      <RouterProvider>
        <UiProvider>
          <AuthContext.Provider value={authDeTeste({ status: 'loading' })}>
            <App />
          </AuthContext.Provider>
        </UiProvider>
      </RouterProvider>
    );
    expect(window.location.pathname).toBe('/');
  });
});
