import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import Landing from '../src/pages/site/Landing.jsx';
import Perguntas from '../src/pages/site/Perguntas.jsx';
import Legal from '../src/pages/site/Legal.jsx';
import { renderComProvedores } from './auxiliares.jsx';
import { EMAIL_DE_CONTATO, INSTAGRAM, WHATSAPP } from '../src/lib/site.js';

// Dentro do <main> o <footer> deixa de ser o marco "contentinfo" e o leitor de tela perde o
// atalho para o rodapé. O jsdom não faz essa conta (o Chromium faz, veja e2e/paginas-publicas),
// então aqui a conferência é pela estrutura.
const PAGINAS = [
  ['home', <Landing key="home" />, '/'],
  ['perguntas', <Perguntas key="perguntas" />, '/perguntas'],
  ['termos', <Legal key="termos" tipo="termos" />, '/termos'],
  ['privacidade', <Legal key="privacidade" tipo="privacidade" />, '/privacidade']
];

describe('moldura do site', () => {
  for (const [nome, pagina, caminho] of PAGINAS)
    it(`${nome}: um rodapé só, depois do <main> e fora dele`, () => {
      const { container } = renderComProvedores(pagina, { caminho });
      const rodapes = container.querySelectorAll('footer');
      expect(rodapes).toHaveLength(1);
      const principal = screen.getByRole('main');
      expect(principal).not.toContainElement(rodapes[0]);
      expect(principal.nextElementSibling).toBe(rodapes[0]);
    });
});

describe('rodapé do site', () => {
  it('Instagram e WhatsApp abrem em nova aba, com nome acessível', () => {
    renderComProvedores(<Perguntas />, { caminho: '/perguntas' });
    const rodape = screen.getByRole('contentinfo');
    for (const [nome, href] of [
      [/^Instagram da vera\.group.*nova aba/, INSTAGRAM.link],
      [/^WhatsApp da vera\.group.*nova aba/, WHATSAPP.link]
    ]) {
      const link = within(rodape).getByRole('link', { name: nome });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('o contato é o e-mail de lib/site.js', () => {
    renderComProvedores(<Perguntas />, { caminho: '/perguntas' });
    const contatos = within(screen.getByRole('contentinfo')).getAllByRole('link', { name: 'Contato' });
    expect(contatos.length).toBeGreaterThan(0);
    for (const link of contatos) expect(link).toHaveAttribute('href', `mailto:${EMAIL_DE_CONTATO}`);
  });
});
