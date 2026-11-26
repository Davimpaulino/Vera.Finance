import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Link, Redirect, RouterProvider, useRouter } from '../src/lib/router.jsx';

function Caminho() {
  const { path } = useRouter();
  return <output aria-label="caminho">{path}</output>;
}

function Navegar({ para, opcoes }) {
  const { navigate } = useRouter();
  return (
    <button type="button" onClick={() => navigate(para, opcoes)}>
      ir para {para}
    </button>
  );
}

const caminho = () => screen.getByLabelText('caminho').textContent;

describe('RouterProvider', () => {
  it('começa no endereço do navegador e ignora a barra do fim', () => {
    window.history.replaceState({}, '', '/precos/');
    render(
      <RouterProvider>
        <Caminho />
      </RouterProvider>
    );
    expect(caminho()).toBe('/precos');
  });

  it('caminhoInicial vale na pré-renderização, sem olhar o navegador', () => {
    window.history.replaceState({}, '', '/app');
    render(
      <RouterProvider caminhoInicial="/termos">
        <Caminho />
      </RouterProvider>
    );
    expect(caminho()).toBe('/termos');
  });

  it('a home continua "/"', () => {
    render(
      <RouterProvider caminhoInicial="/">
        <Caminho />
      </RouterProvider>
    );
    expect(caminho()).toBe('/');
  });

  it('navigate empilha no histórico; replace troca a entrada atual', () => {
    render(
      <RouterProvider>
        <Caminho />
        <Navegar para="/precos" />
        <Navegar para="/termos" opcoes={{ replace: true }} />
      </RouterProvider>
    );
    const antes = window.history.length;
    fireEvent.click(screen.getByText('ir para /precos'));
    expect(caminho()).toBe('/precos');
    expect(window.location.pathname).toBe('/precos');
    expect(window.history.length).toBe(antes + 1);

    fireEvent.click(screen.getByText('ir para /termos'));
    expect(caminho()).toBe('/termos');
    expect(window.history.length).toBe(antes + 1);
  });

  it('navegar para o mesmo endereço não cria entrada nova', () => {
    window.history.replaceState({}, '', '/precos');
    render(
      <RouterProvider>
        <Navegar para="/precos" />
      </RouterProvider>
    );
    const antes = window.history.length;
    fireEvent.click(screen.getByText('ir para /precos'));
    expect(window.history.length).toBe(antes);
  });

  it('voltar no navegador (popstate) atualiza a página', () => {
    render(
      <RouterProvider>
        <Caminho />
      </RouterProvider>
    );
    act(() => {
      window.history.pushState({}, '', '/perguntas');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(caminho()).toBe('/perguntas');
  });
});

describe('Link', () => {
  it('navega sem recarregar a página', () => {
    render(
      <RouterProvider>
        <Caminho />
        <Link to="/cadastro">Criar conta</Link>
      </RouterProvider>
    );
    const link = screen.getByRole('link', { name: 'Criar conta' });
    expect(link).toHaveAttribute('href', '/cadastro');
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    act(() => {
      link.dispatchEvent(evento);
    });
    expect(evento.defaultPrevented).toBe(true);
    expect(caminho()).toBe('/cadastro');
  });

  it('Ctrl/Cmd + clique deixa o navegador abrir em outra aba', () => {
    render(
      <RouterProvider>
        <Caminho />
        <Link to="/cadastro">Criar conta</Link>
      </RouterProvider>
    );
    // O document ouve depois do React: guarda se o Link deixou o clique seguir e então o segura,
    // porque o jsdom não abre outra aba.
    let seguiu = null;
    document.addEventListener(
      'click',
      e => {
        seguiu = !e.defaultPrevented;
        e.preventDefault();
      },
      { once: true }
    );
    act(() => {
      screen
        .getByRole('link')
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
    });
    expect(seguiu).toBe(true);
    expect(caminho()).toBe('/');
  });

  it('o onClick de quem usa o Link roda antes e pode cancelar a navegação', () => {
    render(
      <RouterProvider>
        <Caminho />
        <Link to="/cadastro" onClick={e => e.preventDefault()}>
          Criar conta
        </Link>
      </RouterProvider>
    );
    fireEvent.click(screen.getByRole('link'));
    expect(caminho()).toBe('/');
  });
});

describe('Redirect', () => {
  it('troca o endereço sem deixar a página antiga no histórico', () => {
    window.history.replaceState({}, '', '/app');
    const antes = window.history.length;
    render(
      <RouterProvider>
        <Caminho />
        <Redirect to="/entrar" />
      </RouterProvider>
    );
    expect(caminho()).toBe('/entrar');
    expect(window.location.pathname).toBe('/entrar');
    expect(window.history.length).toBe(antes);
  });
});
