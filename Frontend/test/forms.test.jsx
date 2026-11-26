import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input, MoneyInput } from '../src/components/ds/forms.jsx';

describe('nomes acessíveis dos campos', () => {
  it('o nome do campo é o rótulo; a dica vira descrição', () => {
    render(<Input label="Senha" type="password" hint="Mínimo de 8 caracteres." />);
    const campo = screen.getByLabelText('Senha');
    expect(campo).toHaveAccessibleName('Senha');
    expect(campo).toHaveAccessibleDescription('Mínimo de 8 caracteres.');
    expect(campo).not.toHaveAttribute('aria-invalid');
  });

  it('com erro, o erro é a descrição e o campo fica marcado como inválido', () => {
    render(<Input label="E-mail" hint="voce@email.com" error="E-mail inválido." />);
    const campo = screen.getByRole('textbox', { name: 'E-mail' });
    expect(campo).toHaveAccessibleDescription('E-mail inválido.');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
  });

  it('sem rótulo visível vale o aria-label de quem chama', () => {
    render(<Input aria-label="Seu e-mail" placeholder="seu e-mail" />);
    expect(screen.getByRole('textbox')).toHaveAccessibleName('Seu e-mail');
  });

  it('campo de dinheiro segue a mesma regra', () => {
    render(<MoneyInput label="renda fixa do mês" hint="salário líquido" />);
    const campo = screen.getByRole('textbox', { name: 'renda fixa do mês' });
    expect(campo).toHaveAccessibleDescription('salário líquido');
  });
});
