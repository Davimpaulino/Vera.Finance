import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import AceiteDosTermos from '../src/pages/auth/AceiteDosTermos.jsx';
import Cadastro from '../src/pages/auth/Cadastro.jsx';
import { VERSAO_DOS_TERMOS, aceitouTermos } from '../src/lib/termos.js';
import { api } from '../src/services/api.js';
import { renderComProvedores } from './auxiliares.jsx';

const FALTA_ACEITE = /confirme que tem 18 anos ou mais/;
const caixa = () => screen.getByRole('checkbox', { name: /Tenho 18 anos ou mais/ });

describe('aceitouTermos', () => {
  it('vale só o aceite da versão em vigor', () => {
    expect(aceitouTermos(null)).toBe(false);
    expect(aceitouTermos({})).toBe(false);
    expect(aceitouTermos({ termosAceitos: { versao: VERSAO_DOS_TERMOS } })).toBe(true);
    expect(aceitouTermos({ termosAceitos: { versao: 'v2020-01-01' } })).toBe(false);
  });

  it('a versão em vigor que vem da API ganha da versão do site', () => {
    const user = { termosAceitos: { versao: 'v2030-01-01' }, versaoDosTermos: 'v2030-01-01' };
    expect(aceitouTermos(user)).toBe(true);
    expect(aceitouTermos({ ...user, versaoDosTermos: 'v2031-01-01' })).toBe(false);
  });
});

describe('AceiteDosTermos', () => {
  beforeEach(() => {
    vi.spyOn(api, 'post').mockResolvedValue({});
  });

  it('sem marcar a caixa não grava e explica o que falta', () => {
    renderComProvedores(<AceiteDosTermos />, { auth: { status: 'in', user: { nome: 'Ana' } } });
    expect(screen.getByRole('heading', { level: 1, name: 'Antes de continuar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    expect(screen.getByRole('alert')).toHaveTextContent(FALTA_ACEITE);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('marcar a caixa tira o aviso; aceitar grava a versão em vigor e recarrega o perfil', async () => {
    const refresh = vi.fn().mockResolvedValue({});
    renderComProvedores(<AceiteDosTermos />, { auth: { status: 'in', user: {}, refresh } });
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    fireEvent.click(caixa());
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith('/auth/sessao', { aceite: { versao: VERSAO_DOS_TERMOS } });
  });

  it('quem aceitou uma versão antiga vê que os termos mudaram', () => {
    renderComProvedores(<AceiteDosTermos />, {
      auth: { status: 'in', user: { termosAceitos: { versao: 'v2020-01-01' } } }
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Os termos mudaram' })).toBeInTheDocument();
  });

  it('a recusa da API aparece na tela', async () => {
    api.post.mockRejectedValue(new Error('Os Termos de uso e a Política de privacidade mudaram.'));
    renderComProvedores(<AceiteDosTermos />, { auth: { status: 'in', user: {} } });
    fireEvent.click(caixa());
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('mudaram');
  });

  it('"Sair da conta" sai sem aceitar', async () => {
    const logout = vi.fn().mockResolvedValue();
    renderComProvedores(<AceiteDosTermos />, { auth: { status: 'in', user: {}, logout } });
    fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(api.post).not.toHaveBeenCalled();
  });

  it('os links dos textos abrem em outra aba, sem perder o aceite', () => {
    renderComProvedores(<AceiteDosTermos />, { auth: { status: 'in', user: {} } });
    const termos = screen.getAllByRole('link', { name: 'Termos de uso' })[0];
    expect(termos).toHaveAttribute('href', '/termos');
    expect(termos).toHaveAttribute('target', '_blank');
  });
});

describe('aceite no cadastro', () => {
  const preencher = () => {
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-123' } });
  };

  it('sem a caixa marcada a conta não é criada (nem pelo Google)', () => {
    const register = vi.fn();
    const social = vi.fn();
    renderComProvedores(<Cadastro />, { caminho: '/cadastro', auth: { register, social } });
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta e continuar' }));
    expect(screen.getByRole('alert')).toHaveTextContent(FALTA_ACEITE);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar com Google' }));
    expect(register).not.toHaveBeenCalled();
    expect(social).not.toHaveBeenCalled();
  });

  it('com a caixa marcada o aceite vai junto com o cadastro', async () => {
    const register = vi.fn().mockResolvedValue({});
    renderComProvedores(<Cadastro />, { caminho: '/cadastro', auth: { register } });
    preencher();
    fireEvent.click(caixa());
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta e continuar' }));
    await waitFor(() =>
      expect(register).toHaveBeenCalledWith('Ana', 'ana@exemplo.com', 'senha-forte-123', {
        versao: VERSAO_DOS_TERMOS
      })
    );
    await waitFor(() => expect(window.location.pathname).toBe('/cadastro/perguntas'));
  });
});
