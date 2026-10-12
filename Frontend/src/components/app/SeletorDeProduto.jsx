import { useEffect, useRef, useState } from 'react';
import { Button, Icon, Input } from '../ds/index.js';
import { api } from '../../services/api.js';
import { brlCents } from '../../lib/format.js';
import { cx } from '../../lib/cx.js';
import './css/seletor-de-produto.css';

const MINIMO = 3;
const VISIVEIS = 9;

/**
 * Busca um produto nos mercados da região e deixa escolher marca, peso e tamanho.
 * "sabão em pó" vira "Sabão em Pó Omo Lavagem Perfeita 1,6kg", não um nome vago.
 * Quem chama recebe o produto escolhido em `onEscolher` ou o texto digitado em `onGenerico`.
 */
export function SeletorDeProduto({ termoInicial = '', onEscolher, onGenerico, rotulo, autoFocus }) {
  const [termo, setTermo] = useState(termoInicial);
  const [busca, setBusca] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [todas, setTodas] = useState(false);
  const pedido = useRef(0);
  const limpo = termo.trim();

  useEffect(() => {
    if (limpo.length < MINIMO) {
      setBusca(null);
      setCarregando(false);
      return undefined;
    }
    const numero = ++pedido.current;
    setCarregando(true);
    const espera = setTimeout(async () => {
      try {
        const resposta = await api.get(`/lista/opcoes?q=${encodeURIComponent(limpo)}`);
        if (numero === pedido.current) setBusca({ termo: limpo, ...resposta });
      } catch {
        if (numero === pedido.current) setBusca({ termo: limpo, opcoes: [], falhou: true });
      } finally {
        if (numero === pedido.current) setCarregando(false);
      }
    }, 450);
    return () => clearTimeout(espera);
  }, [limpo]);

  const escolher = opcao => {
    onEscolher({
      nome: opcao.produto,
      produto: {
        chave: opcao.chave,
        ean: opcao.ean,
        marca: opcao.marca,
        tamanho: opcao.tamanho,
        termo: busca ? busca.termo : limpo
      }
    });
    setTermo('');
    setBusca(null);
    setTodas(false);
  };

  const generico = () => {
    if (!limpo || !onGenerico) return;
    onGenerico(limpo);
    setTermo('');
    setBusca(null);
  };

  const opcoes = busca ? busca.opcoes : [];
  const visiveis = todas ? opcoes : opcoes.slice(0, VISIVEIS);
  const atual = busca && busca.termo === limpo;

  return (
    <div className="seletor">
      <form
        className="seletor__busca"
        onSubmit={e => {
          e.preventDefault();
          if (atual && !opcoes.length && !carregando) generico();
        }}
      >
        <Input
          label={rotulo}
          placeholder="O que falta em casa? Ex.: sabão em pó, leite, arroz 5kg"
          icon="search"
          aria-label={rotulo ? undefined : 'Buscar produto para a lista'}
          value={termo}
          onChange={e => setTermo(e.target.value)}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </form>

      {limpo.length > 0 && limpo.length < MINIMO ? (
        <span className="seletor__aviso">Digite pelo menos {MINIMO} letras.</span>
      ) : null}
      {carregando ? (
        <span className="seletor__aviso seletor__aviso--carregando" aria-live="polite">
          <Icon name="search" size={14} />
          Procurando “{limpo}” nos mercados da sua região…
        </span>
      ) : null}

      {!carregando && atual && opcoes.length ? (
        <div className="seletor__resultado">
          <span className="seletor__titulo">
            Escolha a marca e o tamanho · {opcoes.length}{' '}
            {opcoes.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </span>
          <div className="seletor__opcoes">
            {visiveis.map(opcao => (
              <button
                key={opcao.chave}
                type="button"
                className="seletor__opcao"
                onClick={() => escolher(opcao)}
              >
                <span className="seletor__nome">{opcao.produto}</span>
                <span className="seletor__meta">
                  {[
                    opcao.marca,
                    opcao.tamanho,
                    opcao.menorPreco != null ? `a partir de ${brlCents(opcao.menorPreco)}` : null,
                    opcao.redes > 1 ? `em ${opcao.redes} redes` : null
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <span className="seletor__mais">
                  <Icon name="plus" size={15} />
                </span>
              </button>
            ))}
          </div>
          {opcoes.length > VISIVEIS ? (
            <button type="button" className="v-more" onClick={() => setTodas(v => !v)}>
              {todas ? 'Mostrar menos' : `Ver todos os ${opcoes.length}`}
              <Icon name={todas ? 'chevron-down' : 'chevron-right'} size={16} />
            </button>
          ) : null}
        </div>
      ) : null}

      {!carregando && atual && !opcoes.length ? (
        <span className={cx('seletor__aviso', busca.falhou && 'seletor__aviso--erro')}>
          {busca.falhou
            ? 'Não deu para buscar agora. Tente de novo em instantes.'
            : busca.modo === 'real'
              ? `Nenhum mercado da sua região tem “${limpo}” à venda online. Tente outro nome, como a marca.`
              : 'Informe o CEP em Configurações (ou use a sua localização em Comparar mercados) para buscar nos mercados perto de você.'}
        </span>
      ) : null}

      {onGenerico && atual && !carregando && !opcoes.length ? (
        <Button variant="ghost" size="sm" icon="plus" className="seletor__generico" onClick={generico}>
          Adicionar “{limpo}” sem escolher marca
        </Button>
      ) : null}
    </div>
  );
}
