import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Modal } from '../src/components/ds/feedback.jsx';

// O jsdom não desenha nada: sem isto todo elemento pareceria invisível para o Tab do diálogo.
let original;
beforeEach(() => {
  original = HTMLElement.prototype.getClientRects;
  HTMLElement.prototype.getClientRects = () => [{ width: 1, height: 1 }];
});
afterEach(() => {
  HTMLElement.prototype.getClientRects = original;
});

function ComBotao({ autoFocus, onClose = () => {} }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir avisos
      </button>
      {aberto ? (
        <Modal
          title="Notificações"
          onClose={() => {
            onClose();
            setAberto(false);
          }}
        >
          <input aria-label="Primeiro campo" autoFocus={autoFocus} />
          <button type="button">Último botão</button>
        </Modal>
      ) : null}
    </>
  );
}

describe('Modal e o teclado', () => {
  it('ao abrir, o foco entra no diálogo', () => {
    render(<ComBotao />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir avisos' }));
    const dialogo = screen.getByRole('dialog', { name: 'Notificações' });
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it('respeita o campo com autoFocus e, ao fechar, ainda devolve o foco para quem abriu', () => {
    render(<ComBotao autoFocus />);
    const abrir = screen.getByRole('button', { name: 'Abrir avisos' });
    abrir.focus();
    fireEvent.click(abrir);
    expect(screen.getByRole('textbox', { name: 'Primeiro campo' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(abrir).toHaveFocus();
  });

  it('Tab no último volta ao primeiro; Shift+Tab no primeiro vai ao último', () => {
    render(<ComBotao />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir avisos' }));
    const fecharX = screen.getByRole('button', { name: 'Fechar' });
    const ultimo = screen.getByRole('button', { name: 'Último botão' });
    ultimo.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(fecharX).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(ultimo).toHaveFocus();
  });

  it('Esc fecha e o foco volta para quem abriu', () => {
    const onClose = vi.fn();
    render(<ComBotao onClose={onClose} />);
    const abrir = screen.getByRole('button', { name: 'Abrir avisos' });
    abrir.focus();
    fireEvent.click(abrir);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(abrir).toHaveFocus();
  });
});
