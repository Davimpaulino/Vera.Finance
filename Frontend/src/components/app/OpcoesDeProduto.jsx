import { useMemo, useState } from 'react';
import { Badge, Chip, Icon, SegmentedControl } from '../ds/index.js';
import { brlCents, precoUnitario } from '../../lib/format.js';
import { cx } from '../../lib/cx.js';
import './css/opcoes-de-produto.css';

const ORDENS = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'preco', label: 'Menor preço' },
  { value: 'unitario', label: 'Preço por kg/L' },
  { value: 'redes', label: 'Mais redes' }
];
const MAX_FILTROS = 8;
const unitario = o => (o.precoUnidade ? o.precoUnidade.valor : Infinity);
const ORDENAR = {
  relevancia: () => 0,
  preco: (a, b) => a.menorPreco - b.menorPreco,
  unitario: (a, b) => unitario(a) - unitario(b) || a.menorPreco - b.menorPreco,
  redes: (a, b) => b.redes - a.redes || a.menorPreco - b.menorPreco
};

// As marcas e tamanhos mais comuns entre as opções, para filtrar com um toque.
function maisComuns(opcoes, campo) {
  const conta = new Map();
  opcoes.forEach(o => o[campo] && conta.set(o[campo], (conta.get(o[campo]) || 0) + 1));
  return [...conta.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'pt-BR'))
    .slice(0, MAX_FILTROS)
    .map(([valor, total]) => ({ valor, total }));
}

/**
 * Filtro e ordem das opções de produto (marca, tamanho, preço, preço por kg/L).
 * O menor preço por kg/L entre as opções visíveis ganha o selo "melhor custo".
 */
export function useOpcoesDeProduto(opcoes = []) {
  const [ordem, setOrdem] = useState('relevancia');
  const [marca, setMarca] = useState('');
  const [tamanho, setTamanho] = useState('');
  // Nova busca, filtros zerados: a marca escolhida antes pode nem existir na busca nova.
  // Zera ainda no render (não num efeito, que roda depois da tela e desfaria um toque feito
  // logo que as opções aparecem), como a documentação do React recomenda.
  const assinatura = opcoes.map(o => o.chave).join('|');
  const [assinaturaVista, setAssinaturaVista] = useState(assinatura);
  if (assinatura !== assinaturaVista) {
    setAssinaturaVista(assinatura);
    setMarca('');
    setTamanho('');
  }
  const marcas = useMemo(() => maisComuns(opcoes, 'marca'), [opcoes]);
  const tamanhos = useMemo(() => maisComuns(opcoes, 'tamanho'), [opcoes]);
  const filtradas = useMemo(
    () =>
      opcoes
        .filter(o => (!marca || o.marca === marca) && (!tamanho || o.tamanho === tamanho))
        .map((o, i) => ({ o, i }))
        .sort((a, b) => ORDENAR[ordem](a.o, b.o) || a.i - b.i)
        .map(({ o }) => o),
    [opcoes, marca, tamanho, ordem]
  );
  // "Melhor custo" só compara a mesma unidade (kg com kg, litro com litro).
  const melhorCusto = useMemo(() => {
    const porUnidade = new Map();
    filtradas.forEach(o => {
      if (!o.precoUnidade) return;
      const atual = porUnidade.get(o.precoUnidade.unidade);
      if (!atual || o.precoUnidade.valor < atual.precoUnidade.valor)
        porUnidade.set(o.precoUnidade.unidade, o);
    });
    const contagem = u => filtradas.filter(o => o.precoUnidade?.unidade === u).length;
    return new Set(
      [...porUnidade.entries()].filter(([u]) => contagem(u) > 1).map(([, o]) => o.chave)
    );
  }, [filtradas]);
  const limpar = () => {
    setMarca('');
    setTamanho('');
  };
  return { filtradas, marcas, tamanhos, ordem, setOrdem, marca, setMarca, tamanho, setTamanho, melhorCusto, limpar };
}

/** Ordem e filtros por marca e tamanho, acima da grade de opções. */
export function FiltrosDeOpcoes({ estado, total }) {
  const { marcas, tamanhos, ordem, setOrdem, marca, setMarca, tamanho, setTamanho, filtradas, limpar } =
    estado;
  if (total < 3) return null;
  return (
    <div className="opcoes-filtros">
      <SegmentedControl size="sm" options={ORDENS} value={ordem} onChange={setOrdem} className="opcoes-filtros__ordem" />
      {marcas.length > 1 ? (
        <div className="opcoes-filtros__linha" role="group" aria-label="Filtrar por marca">
          <span className="opcoes-filtros__rotulo">Marca</span>
          {marcas.map(m => (
            <Chip key={m.valor} size="sm" selected={marca === m.valor} onClick={() => setMarca(marca === m.valor ? '' : m.valor)}>
              {m.valor}
            </Chip>
          ))}
        </div>
      ) : null}
      {tamanhos.length > 1 ? (
        <div className="opcoes-filtros__linha" role="group" aria-label="Filtrar por tamanho">
          <span className="opcoes-filtros__rotulo">Tamanho</span>
          {tamanhos.map(t => (
            <Chip key={t.valor} size="sm" selected={tamanho === t.valor} onClick={() => setTamanho(tamanho === t.valor ? '' : t.valor)}>
              {t.valor}
            </Chip>
          ))}
        </div>
      ) : null}
      {marca || tamanho ? (
        <button type="button" className="opcoes-filtros__limpar" onClick={limpar}>
          <Icon name="x" size={13} />
          {filtradas.length} de {total} · limpar filtros
        </button>
      ) : null}
    </div>
  );
}

/** Um produto para escolher: foto, marca, tamanho, preço a partir de e preço por kg/L. */
export function CartaoDeOpcao({ opcao, selecionada, melhorCusto, onClick, icone = 'plus' }) {
  const [semFoto, setSemFoto] = useState(false);
  const faixa =
    opcao.maiorPreco && opcao.maiorPreco > opcao.menorPreco
      ? `${brlCents(opcao.menorPreco)} a ${brlCents(opcao.maiorPreco)}`
      : brlCents(opcao.menorPreco);
  return (
    <button
      type="button"
      className={cx('opcao-produto', selecionada && 'opcao-produto--selecionada')}
      aria-pressed={selecionada === undefined ? undefined : selecionada ? 'true' : 'false'}
      onClick={onClick}
    >
      <span className="opcao-produto__foto" aria-hidden="true">
        {opcao.imagem && !semFoto ? (
          <img src={opcao.imagem} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setSemFoto(true)} />
        ) : (
          <Icon name="shopping-basket" size={20} />
        )}
      </span>
      <span className="opcao-produto__texto">
        <span className="opcao-produto__nome">{opcao.produto}</span>
        <span className="opcao-produto__meta">
          {[opcao.marca, opcao.tamanho, opcao.redes > 1 ? `em ${opcao.redes} redes` : 'em 1 rede']
            .filter(Boolean)
            .join(' · ')}
        </span>
        <span className="opcao-produto__precos">
          <span className="opcao-produto__preco">
            {opcao.redes > 1 ? faixa : brlCents(opcao.menorPreco)}
            {opcao.unidade === 'kg' && !opcao.tamanho ? '/kg' : ''}
          </span>
          {opcao.precoUnidade && opcao.unidade !== 'kg' ? (
            <span className="opcao-produto__unitario">{precoUnitario(opcao.precoUnidade)}</span>
          ) : null}
        </span>
        {melhorCusto || opcao.emPromocao ? (
          <span className="opcao-produto__selos">
            {melhorCusto ? (
              <Badge tone="success" icon="trending-down">
                melhor custo por {opcao.precoUnidade.unidade === 'l' ? 'litro' : opcao.precoUnidade.unidade}
              </Badge>
            ) : null}
            {opcao.emPromocao ? (
              <Badge tone="accent" icon="sparkles">
                em oferta
              </Badge>
            ) : null}
          </span>
        ) : null}
      </span>
      <span className="opcao-produto__acao">
        <Icon name={selecionada ? 'check' : icone} size={15} />
      </span>
    </button>
  );
}
