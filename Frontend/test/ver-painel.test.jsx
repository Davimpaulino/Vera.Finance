import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import Landing from '../src/pages/site/Landing.jsx';
import { servicoDeLogin } from '../src/services/servicoDeLogin.js';
import { renderComProvedores } from './auxiliares.jsx';

// "Ver o painel" na home. Nas páginas do site o login não liga (status 'loading'): quem decide é
// a marca de sessão que o AuthContext deixa neste aparelho.
const verPainel = (status, { marca = false } = {}) => {
  servicoDeLogin.lembrarSessao(marca);
  renderComProvedores(<Landing />, { caminho: '/', auth: { status } });
  fireEvent.click(screen.getByRole('button', { name: 'Ver o painel' }));
  return window.location.pathname;
};

describe('"Ver o painel"', () => {
  it('quem tem sessão neste aparelho vai direto para o app, sem passar pelo cadastro', () => {
    expect(verPainel('loading', { marca: true })).toBe('/app');
  });

  it('quem nunca entrou neste aparelho vai criar a conta', () => {
    expect(verPainel('loading')).toBe('/cadastro');
  });

  it('com o login já ligado nesta aba, vale o status', () => {
    expect(verPainel('in')).toBe('/app');
  });

  it('login ligado e sem sessão: cadastro, mesmo com uma marca que tenha sobrado', () => {
    expect(verPainel('out', { marca: true })).toBe('/cadastro');
  });
});

describe('marca de sessão', () => {
  it('é só um "sim" no aparelho e sai quando a sessão fecha', () => {
    servicoDeLogin.lembrarSessao(true);
    expect(localStorage.getItem('vera.sessao')).toBe('1');
    expect(servicoDeLogin.lembraDeSessao()).toBe(true);
    servicoDeLogin.lembrarSessao(false);
    expect(localStorage.getItem('vera.sessao')).toBeNull();
    expect(servicoDeLogin.lembraDeSessao()).toBe(false);
  });
});
