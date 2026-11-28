import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import Legal from '../src/pages/site/Legal.jsx';
import { VERSAO_DOS_TERMOS } from '../src/lib/termos.js';
import { VERSAO_DOS_TERMOS as VERSAO_NA_API } from '../../Backend/src/config/termos.js';
import { renderComProvedores } from './auxiliares.jsx';

// "v2026-11-24" → "24 de novembro de 2026", como a página escreve a data.
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataDaVersao = versao => {
  const [, ano, mes, dia] = versao.match(/^v(\d{4})-(\d{2})-(\d{2})$/);
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${ano}`;
};

describe('Legal', () => {
  it('termos de uso: título, data, seções numeradas e link para a política', () => {
    renderComProvedores(<Legal tipo="termos" />, { caminho: '/termos' });
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeInTheDocument();
    const secoes = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
    expect(secoes[0]).toMatch(/^1\. /);
    secoes.forEach((titulo, i) => expect(titulo).toMatch(new RegExp(`^${i + 1}\\. `)));
    const conteudo = screen.getByRole('main');
    expect(within(conteudo).getByRole('link', { name: 'Política de privacidade' })).toHaveAttribute(
      'href',
      '/privacidade/'
    );
  });

  it('política de privacidade aponta de volta para os termos', () => {
    renderComProvedores(<Legal tipo="privacidade" />, { caminho: '/privacidade' });
    expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeInTheDocument();
    expect(screen.getByText(/LGPD/, { selector: 'p' })).toBeInTheDocument();
    const conteudo = screen.getByRole('main');
    expect(within(conteudo).getAllByRole('link', { name: 'Termos de uso' })[0]).toHaveAttribute('href', '/termos/');
  });

  it('a data "Atualizado em" é a da versão dos termos que o cadastro aceita', () => {
    // Trocar o texto pede trocar a data e a versão juntas (Frontend e API).
    expect(VERSAO_DOS_TERMOS).toBe(VERSAO_NA_API);
    for (const tipo of ['termos', 'privacidade']) {
      const { unmount } = renderComProvedores(<Legal tipo={tipo} />);
      expect(screen.getByText(`Atualizado em ${dataDaVersao(VERSAO_DOS_TERMOS)}`)).toBeInTheDocument();
      unmount();
    }
  });

  it('fica dentro do conteúdo principal, com o link para pular o menu', () => {
    renderComProvedores(<Legal tipo="termos" />);
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute('href', '#conteudo');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo');
  });
});
