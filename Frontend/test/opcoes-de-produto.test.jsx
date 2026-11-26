import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import {
  CartaoDeOpcao,
  FiltrosDeOpcoes,
  useOpcoesDeProduto
} from '../src/components/app/OpcoesDeProduto.jsx';

// Opções como a API devolve em /lista/opcoes.
const opcao = (chave, campos) => ({
  chave,
  produto: `Produto ${chave}`,
  marca: null,
  tamanho: null,
  redes: 1,
  menorPreco: 10,
  maiorPreco: 10,
  precoUnidade: null,
  ...campos
});

const OPCOES = [
  opcao('a', { marca: 'Tio João', tamanho: '5kg', menorPreco: 30, redes: 3, precoUnidade: { valor: 6, unidade: 'kg' } }),
  opcao('b', { marca: 'Camil', tamanho: '1kg', menorPreco: 7, redes: 5, precoUnidade: { valor: 7, unidade: 'kg' } }),
  opcao('c', { marca: 'Tio João', tamanho: '1kg', menorPreco: 8, redes: 1, precoUnidade: { valor: 8, unidade: 'kg' } }),
  opcao('d', { marca: 'Camil', tamanho: '5kg', menorPreco: 26, redes: 2, precoUnidade: { valor: 5.2, unidade: 'kg' } }),
  opcao('e', { marca: 'Prato Fino', tamanho: '2l', menorPreco: 9, redes: 2, precoUnidade: { valor: 4.5, unidade: 'l' } }),
  opcao('f', { marca: null, tamanho: null, menorPreco: 5, redes: 1, precoUnidade: null })
];

const chaves = lista => lista.map(o => o.chave);

describe('useOpcoesDeProduto: ordem', () => {
  it('relevância mantém a ordem da API', () => {
    const { result } = renderHook(() => useOpcoesDeProduto(OPCOES));
    expect(chaves(result.current.filtradas)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('menor preço, preço por kg/L (sem preço unitário vai para o fim) e mais redes', () => {
    const { result } = renderHook(() => useOpcoesDeProduto(OPCOES));
    act(() => result.current.setOrdem('preco'));
    expect(chaves(result.current.filtradas)).toEqual(['f', 'b', 'c', 'e', 'd', 'a']);

    act(() => result.current.setOrdem('unitario'));
    expect(chaves(result.current.filtradas)).toEqual(['e', 'd', 'a', 'b', 'c', 'f']);

    act(() => result.current.setOrdem('redes'));
    // Empate em redes desempata pelo menor preço.
    expect(chaves(result.current.filtradas)).toEqual(['b', 'a', 'e', 'd', 'f', 'c']);
  });

  it('empate total segue a ordem da API', () => {
    const iguais = [opcao('x', {}), opcao('y', {}), opcao('z', {})];
    const { result } = renderHook(() => useOpcoesDeProduto(iguais));
    act(() => result.current.setOrdem('preco'));
    expect(chaves(result.current.filtradas)).toEqual(['x', 'y', 'z']);
  });
});

describe('useOpcoesDeProduto: filtros', () => {
  it('marcas e tamanhos mais comuns primeiro, sem os vazios', () => {
    const { result } = renderHook(() => useOpcoesDeProduto(OPCOES));
    expect(result.current.marcas).toEqual([
      { valor: 'Camil', total: 2 },
      { valor: 'Tio João', total: 2 },
      { valor: 'Prato Fino', total: 1 }
    ]);
    expect(result.current.tamanhos.map(t => t.valor)).toEqual(['1kg', '5kg', '2l']);
  });

  it('marca e tamanho juntos; limpar volta tudo', () => {
    const { result } = renderHook(() => useOpcoesDeProduto(OPCOES));
    act(() => result.current.setMarca('Tio João'));
    expect(chaves(result.current.filtradas)).toEqual(['a', 'c']);
    act(() => result.current.setTamanho('5kg'));
    expect(chaves(result.current.filtradas)).toEqual(['a']);
    act(() => result.current.limpar());
    expect(result.current.filtradas).toHaveLength(OPCOES.length);
  });

  it('uma busca nova zera os filtros da anterior', () => {
    const { result, rerender } = renderHook(({ opcoes }) => useOpcoesDeProduto(opcoes), {
      initialProps: { opcoes: OPCOES }
    });
    act(() => result.current.setMarca('Camil'));
    expect(result.current.filtradas).toHaveLength(2);
    const outraBusca = [opcao('g', { marca: 'Omo' }), opcao('h', { marca: 'Brilhante' })];
    rerender({ opcoes: outraBusca });
    expect(result.current.marca).toBe('');
    expect(chaves(result.current.filtradas)).toEqual(['g', 'h']);
  });

  it('"melhor custo" é o menor preço por unidade, só entre opções da mesma unidade', () => {
    const { result } = renderHook(() => useOpcoesDeProduto(OPCOES));
    // kg: d (5,20/kg) ganha de a, b, c. Litro: só "e" tem, então não há com quem comparar.
    expect([...result.current.melhorCusto]).toEqual(['d']);
    act(() => result.current.setMarca('Tio João'));
    expect([...result.current.melhorCusto]).toEqual(['a']);
  });
});

function Filtros({ opcoes }) {
  const estado = useOpcoesDeProduto(opcoes);
  return (
    <>
      <FiltrosDeOpcoes estado={estado} total={opcoes.length} />
      <ul aria-label="resultado">
        {estado.filtradas.map(o => (
          <li key={o.chave}>{o.produto}</li>
        ))}
      </ul>
    </>
  );
}

describe('FiltrosDeOpcoes', () => {
  it('com menos de 3 opções não mostra filtros', () => {
    const { container } = render(<Filtros opcoes={OPCOES.slice(0, 2)} />);
    expect(container.querySelector('.opcoes-filtros')).toBeNull();
  });

  it('chip de marca filtra, marca aria-pressed e mostra "limpar filtros"', () => {
    render(<Filtros opcoes={OPCOES} />);
    const grupo = screen.getByRole('group', { name: 'Filtrar por marca' });
    const camil = within(grupo).getByRole('button', { name: 'Camil' });
    expect(camil).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(camil);
    expect(camil).toHaveAttribute('aria-pressed', 'true');
    const resultado = screen.getByRole('list', { name: 'resultado' });
    expect(within(resultado).getAllByRole('listitem').map(li => li.textContent)).toEqual([
      'Produto b',
      'Produto d'
    ]);

    fireEvent.click(screen.getByRole('button', { name: /2 de 6 · limpar filtros/ }));
    expect(within(resultado).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.queryByRole('button', { name: /limpar filtros/ })).toBeNull();
  });

  it('tocar de novo no chip escolhido tira o filtro', () => {
    render(<Filtros opcoes={OPCOES} />);
    const grupo = screen.getByRole('group', { name: 'Filtrar por tamanho' });
    fireEvent.click(within(grupo).getByRole('button', { name: '5kg' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(within(grupo).getByRole('button', { name: '5kg' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  it('a ordem escolhida aparece marcada', () => {
    render(<Filtros opcoes={OPCOES} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Menor preço' }));
    expect(screen.getByRole('tab', { name: 'Menor preço' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Produto f');
  });
});

describe('CartaoDeOpcao', () => {
  it('mostra a faixa de preço quando há mais de uma rede, e os selos', () => {
    const onClick = vi.fn();
    render(
      <CartaoDeOpcao
        opcao={opcao('a', {
          marca: 'Tio João',
          tamanho: '5kg',
          redes: 3,
          menorPreco: 28.9,
          maiorPreco: 34.5,
          precoUnidade: { valor: 5.78, unidade: 'kg' },
          emPromocao: true
        })}
        melhorCusto
        onClick={onClick}
      />
    );
    const botao = screen.getByRole('button');
    expect(botao).toHaveTextContent('Tio João · 5kg · em 3 redes');
    expect(botao).toHaveTextContent('R$ 28,90 a R$ 34,50');
    expect(botao).toHaveTextContent('melhor custo por kg');
    expect(botao).toHaveTextContent('em oferta');
    // Sem `selecionada`, não é um botão de alternar.
    expect(botao).not.toHaveAttribute('aria-pressed');
    fireEvent.click(botao);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('em uma rede só mostra um preço; o preço por litro aparece ao lado', () => {
    render(
      <CartaoDeOpcao
        opcao={opcao('e', {
          redes: 1,
          menorPreco: 9,
          maiorPreco: 12,
          unidade: 'l',
          precoUnidade: { valor: 4.5, unidade: 'l' }
        })}
        selecionada
      />
    );
    const botao = screen.getByRole('button');
    expect(botao).toHaveTextContent('em 1 rede');
    expect(botao).toHaveTextContent('R$ 9,00');
    expect(botao).not.toHaveTextContent('R$ 12,00');
    expect(botao).toHaveTextContent('R$ 4,50/L');
    expect(botao).toHaveAttribute('aria-pressed', 'true');
  });

  it('foto que não carrega vira o ícone da cesta', () => {
    const { container } = render(
      <CartaoDeOpcao opcao={opcao('a', { imagem: 'https://exemplo.invalid/foto.png' })} />
    );
    const foto = container.querySelector('img');
    expect(foto).toHaveAttribute('alt', '');
    fireEvent.error(foto);
    expect(container.querySelector('img')).toBeNull();
  });
});
