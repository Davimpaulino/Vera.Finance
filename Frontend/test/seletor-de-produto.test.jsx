import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SeletorDeProduto } from '../src/components/app/SeletorDeProduto.jsx';
import { api } from '../src/services/api.js';

const OPCOES = [
  {
    chave: 'arroz-tio-joao-5kg',
    ean: '7893500020110',
    produto: 'Arroz Tio João 5kg',
    marca: 'Tio João',
    tamanho: '5kg',
    redes: 3,
    menorPreco: 29.9,
    maiorPreco: 34.9,
    precoUnidade: { valor: 5.98, unidade: 'kg' }
  },
  {
    chave: 'arroz-camil-1kg',
    ean: '7896006711117',
    produto: 'Arroz Camil 1kg',
    marca: 'Camil',
    tamanho: '1kg',
    redes: 2,
    menorPreco: 6.99,
    maiorPreco: 7.49,
    precoUnidade: { valor: 6.99, unidade: 'kg' }
  }
];

const campo = () => screen.getByRole('textbox', { name: 'Buscar produto para a lista' });
const digitar = texto => fireEvent.change(campo(), { target: { value: texto } });

beforeEach(() => {
  vi.spyOn(api, 'get').mockResolvedValue({ modo: 'real', opcoes: OPCOES });
});

describe('SeletorDeProduto', () => {
  it('com menos de 3 letras pede mais e não busca', () => {
    render(<SeletorDeProduto onEscolher={() => {}} />);
    digitar('ar');
    expect(screen.getByText('Digite pelo menos 3 letras.')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('busca nos mercados e devolve o produto escolhido com marca e tamanho', async () => {
    const onEscolher = vi.fn();
    render(<SeletorDeProduto onEscolher={onEscolher} />);
    digitar('arroz');
    expect(screen.getByText(/Procurando “arroz”/)).toBeInTheDocument();

    const cartao = await screen.findByRole('button', { name: /Arroz Camil 1kg/ });
    expect(api.get).toHaveBeenCalledWith('/lista/opcoes?q=arroz');
    expect(screen.getByText(/2 produtos encontrados/)).toBeInTheDocument();

    fireEvent.click(cartao);
    expect(onEscolher).toHaveBeenCalledWith({
      nome: 'Arroz Camil 1kg',
      produto: {
        chave: 'arroz-camil-1kg',
        ean: '7896006711117',
        marca: 'Camil',
        tamanho: '1kg',
        termo: 'arroz'
      }
    });
    // Depois de escolher, o campo limpa para o próximo item.
    expect(campo()).toHaveValue('');
  });

  it('Enter escolhe a primeira opção da ordem atual', async () => {
    const onEscolher = vi.fn();
    render(<SeletorDeProduto onEscolher={onEscolher} />);
    digitar('arroz');
    await screen.findByRole('button', { name: /Arroz Camil 1kg/ });
    fireEvent.submit(campo().closest('form'));
    expect(onEscolher.mock.calls[0][0].nome).toBe('Arroz Tio João 5kg');
  });

  it('"Tanto faz a marca" manda só o texto digitado', async () => {
    const onGenerico = vi.fn();
    render(<SeletorDeProduto onEscolher={() => {}} onGenerico={onGenerico} />);
    digitar('  arroz ');
    fireEvent.click(await screen.findByRole('button', { name: 'Tanto faz a marca: adicionar só “arroz”' }));
    expect(onGenerico).toHaveBeenCalledWith('arroz');
  });

  it('sem local cadastrado explica como buscar perto de casa e ainda deixa adicionar', async () => {
    api.get.mockResolvedValue({ modo: 'semLocal', opcoes: [] });
    const onGenerico = vi.fn();
    render(<SeletorDeProduto onEscolher={() => {}} onGenerico={onGenerico} />);
    digitar('sabão em pó');
    expect(await screen.findByText(/Informe o CEP em Configurações/)).toBeInTheDocument();
    fireEvent.submit(campo().closest('form'));
    expect(onGenerico).toHaveBeenCalledWith('sabão em pó');
  });

  it('falha na busca avisa sem travar a lista', async () => {
    api.get.mockRejectedValue(new Error('fora do ar'));
    render(<SeletorDeProduto onEscolher={() => {}} onGenerico={() => {}} />);
    digitar('leite');
    expect(await screen.findByText('Não deu para buscar agora. Tente de novo em instantes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar “leite” sem escolher marca' })).toBeInTheDocument();
  });

  it('os filtros de marca valem para o que aparece', async () => {
    const tres = [...OPCOES, { ...OPCOES[1], chave: 'arroz-camil-5kg', produto: 'Arroz Camil 5kg', tamanho: '5kg' }];
    api.get.mockResolvedValue({ modo: 'real', opcoes: tres });
    render(<SeletorDeProduto onEscolher={() => {}} />);
    digitar('arroz');
    const grupo = await screen.findByRole('group', { name: 'Filtrar por marca' });
    fireEvent.click(within(grupo).getByRole('button', { name: 'Tio João' }));
    expect(screen.queryByRole('button', { name: /Arroz Camil/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Arroz Tio João 5kg/ })).toBeInTheDocument();
  });
});
