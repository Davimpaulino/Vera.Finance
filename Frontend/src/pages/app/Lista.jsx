import { useState } from 'react';
import {
  Button,
  Callout,
  Card,
  EmptyState,
  HeroNumber,
  Icon,
  IconButton,
  Meter,
  Modal
} from '../../components/ds/index.js';
import { SeletorDeProduto } from '../../components/app/SeletorDeProduto.jsx';
import { SectionHead } from '../../components/SectionHead.jsx';
import { GhostLink } from '../../components/GhostLink.jsx';
import { PageError, PageSkeleton } from '../../components/Loading.jsx';
import { useShell } from '../../components/app/AppShell.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useUi } from '../../context/UiContext.jsx';
import { api } from '../../services/api.js';
import { brl, brlCents, km, mask, plural } from '../../lib/format.js';
import { cx } from '../../lib/cx.js';
import './css/lista.css';

/** Linha de um mercado no resumo: total comparável e o que tem de real, trocado ou estimado. */
function TotalDoMercado({ t, posicao, ultimo, ocultar }) {
  const [aberto, setAberto] = useState(false);
  const faltando = t.faltando || [];
  const substitutos = t.substitutos || [];
  const detalhes = [
    `${t.itensComPreco} de ${t.itensNaLista ?? t.itensComPreco} itens`,
    substitutos.length ? plural(substitutos.length, 'substituto', 'substitutos') : null,
    faltando.length ? `falta ${faltando.length} (~${brlCents(t.estimado)})` : null
  ].filter(Boolean);
  return (
    <div className="lista-total">
      <div className="vera-inline">
        <div className="vera-stack vera-stack--2 vera-grow">
          <span className="vera-t-body2">{t.nome}</span>
          <span className="vera-t-caption">
            {km(t.distanciaKm)} · {detalhes.join(' · ')}
          </span>
        </div>
        <span
          className={cx(
            'lista-total__valor',
            posicao === 0 && 'lista-total__valor--melhor',
            ultimo && 'lista-total__valor--pior'
          )}
        >
          {mask(ocultar, brlCents(t.totalComparavel ?? t.total))}
        </span>
      </div>
      {faltando.length || substitutos.length ? (
        <>
          <button
            type="button"
            className="lista-total__abrir"
            aria-expanded={aberto ? 'true' : 'false'}
            onClick={() => setAberto(v => !v)}
          >
            {aberto ? 'Esconder detalhes' : 'Ver detalhes'}
            <Icon name={aberto ? 'chevron-down' : 'chevron-right'} size={14} />
          </button>
          {aberto ? (
            <ul className="lista-total__detalhes">
              <li>
                {mask(ocultar, brlCents(t.total))} em preços deste mercado
                {faltando.length
                  ? ` + ~${mask(ocultar, brlCents(t.estimado))} estimados do que falta`
                  : ''}
              </li>
              {substitutos.map(x => (
                <li key={x.item}>
                  <Icon name="repeat" size={12} /> {x.item} → {x.por}
                </li>
              ))}
              {faltando.map(x => (
                <li key={x.item}>
                  <Icon name="circle-alert" size={12} /> {x.item}: não tem aqui; estimado em{' '}
                  {brlCents(x.estimativa)} (preço do meio nos outros mercados)
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function descricaoDoItem(i) {
  const detalhes = i.produto ? [i.produto.marca, i.produto.tamanho].filter(Boolean).join(' · ') : '';
  const preco =
    i.melhorPreco != null
      ? `${brlCents(i.melhorPreco)} un. · ${i.melhorMercado}`
      : 'sem preço no seu raio';
  return [detalhes, preco].filter(Boolean).join(' · ');
}

/** Como o item fica no mercado recomendado: tem, foi trocado por equivalente ou falta lá. */
function situacaoNoMelhor(i, melhor, totalDeMercados) {
  if (!melhor || i.done || i.melhorPreco == null) return null;
  const situacao = (i.situacao || {})[melhor.mercadoId];
  if (situacao === 'substituto')
    return ['troca', `no ${melhor.nome}: ${i.substitutos[melhor.mercadoId]}`];
  if (i.precos[melhor.mercadoId] == null)
    return ['falta', `não tem no ${melhor.nome} · em ${i.disponivelEm} de ${totalDeMercados} mercados`];
  return null;
}

function Item({ i, last, onUpdate, onEscolherProduto, melhor, totalDeMercados }) {
  const aviso = situacaoNoMelhor(i, melhor, totalDeMercados);
  const unit = i.melhorPreco;
  const patch = body => onUpdate(api.patch(`/lista/${i.id}`, body));
  return (
    <div className={cx('lista-item', last && 'lista-item--last', i.done && 'lista-item--done')}>
      <button
        type="button"
        className="lista-item__chk"
        role="checkbox"
        aria-checked={i.done ? 'true' : 'false'}
        aria-label={`Marcar ${i.nome} como comprado`}
        onClick={() => patch({ done: !i.done })}
      >
        <span className="lista-item__box">
          {i.done ? <Icon name="check" size={14} strokeWidth={2.4} /> : null}
        </span>
      </button>
      <div className="lista-item__main">
        <span className="lista-item__nome">{i.nome}</span>
        <span className="lista-item__desc">{descricaoDoItem(i)}</span>
        {aviso ? (
          <span className={cx('lista-item__aviso', `lista-item__aviso--${aviso[0]}`)}>
            <Icon name={aviso[0] === 'falta' ? 'circle-alert' : 'repeat'} size={13} />
            {aviso[1]}
          </span>
        ) : null}
        {!i.produto && !i.done ? (
          <button type="button" className="lista-item__escolher" onClick={() => onEscolherProduto(i)}>
            <Icon name="search" size={13} />
            Sem marca e tamanho: escolher o produto
          </button>
        ) : null}
      </div>
      <div className="lista-item__qty">
        <button
          type="button"
          className="lista-item__qbtn"
          aria-label={`Diminuir quantidade de ${i.nome}`}
          disabled={i.qtd <= 1}
          onClick={() => patch({ qtd: i.qtd - 1 })}
        >
          <Icon name="minus" size={15} />
        </button>
        <span aria-live="polite" className="lista-item__qtd">
          {i.qtd}
        </span>
        <button
          type="button"
          className="lista-item__qbtn"
          aria-label={`Aumentar quantidade de ${i.nome}`}
          disabled={i.qtd >= 99}
          onClick={() => patch({ qtd: i.qtd + 1 })}
        >
          <Icon name="plus" size={15} />
        </button>
      </div>
      <span className={cx('lista-item__tot', unit == null && 'lista-item__tot--sem')}>
        {unit != null ? brlCents(unit * i.qtd) : '—'}
      </span>
      <div className="lista-item__del">
        <IconButton
          icon="trash-2"
          label={`Remover ${i.nome}`}
          variant="ghost"
          size="md"
          onClick={() => onUpdate(api.del(`/lista/${i.id}`))}
        />
      </div>
    </div>
  );
}

export default function Lista() {
  const { versao, recarregar } = useShell();
  const { ocultar, toast } = useUi();
  const { data: d, error, reload, setData } = useApi('/lista', versao);
  const [finalizando, setFinalizando] = useState(false);
  const [semProduto, setSemProduto] = useState(null);

  if (error) return <PageError error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;

  // Toda ação devolve a lista recalculada; trocamos o dado local sem recarregar a página.
  const aplicar = async promessa => {
    try {
      const r = await promessa;
      if (r) setData(r.lista || r);
    } catch (e) {
      toast(e.message, 'danger');
    }
  };

  const adicionar = async item => {
    await aplicar(api.post('/lista', item));
    toast(`${item.nome} foi para a lista.`);
  };
  const definirProduto = async item => {
    const alvo = semProduto;
    setSemProduto(null);
    await aplicar(api.patch(`/lista/${alvo.id}`, item));
    toast(`${alvo.nome} agora é ${item.nome}.`);
  };

  const finalizar = async (mercadoId = d.melhor.mercadoId, itemIds) => {
    setFinalizando(itemIds ? mercadoId : true);
    try {
      const r = await api.post('/lista/finalizar', { mercadoId, itemIds });
      setData(r.lista);
      toast(
        `${brlCents(r.lancamentos.reduce((t, l) => t + l.valor, 0))} lançados em ${r.lancamentos.map(l => l.categoriaNome).join(' e ')}.`
      );
      recarregar();
    } catch (e) {
      toast(e.message, 'danger');
    } finally {
      setFinalizando(false);
    }
  };

  const comprados = d.itens.filter(i => i.done).length;
  const im = d.impacto;
  const semPreco = d.semPreco;

  return (
    <div className="vera-page vera-grid vera-grid--sidebar">
      <div className="vera-stack vera-stack--14">
        <SectionHead
          label="Lista da semana"
          meta={`${plural(d.itens.length, 'item', 'itens')} · ${plural(comprados, 'comprado', 'comprados')}`}
          action={
            comprados ? (
              <GhostLink icon="eraser" onClick={() => aplicar(api.del('/lista/comprados'))}>
                Limpar comprados
              </GhostLink>
            ) : null
          }
        />
        <Card gap={0}>
          <div className={cx('lista-add', !d.itens.length && 'lista-add--vazia')}>
            <SeletorDeProduto
              onEscolher={adicionar}
              onGenerico={nome => adicionar({ nome })}
            />
          </div>
          {d.itens.length ? (
            d.itens.map((i, idx) => (
              <Item
                key={i.id}
                i={i}
                last={idx === d.itens.length - 1}
                onUpdate={aplicar}
                onEscolherProduto={setSemProduto}
                melhor={d.melhor}
                totalDeMercados={(d.todosTotais || d.totais).length}
              />
            ))
          ) : (
            <EmptyState icon="shopping-basket" title="Lista vazia">
              Busque o que falta em casa e escolha a marca e o tamanho. A vera soma a lista em
            cada mercado do seu raio com o preço daquele produto.
            </EmptyState>
          )}
        </Card>
        {semPreco.length ? (
          <Callout
            tone="info"
            title={
              semPreco.length === 1
                ? 'Um item ainda sem preço'
                : `${semPreco.length} itens ainda sem preço`
            }
          >
            {semPreco.join(', ')} não {semPreco.length === 1 ? 'aparece' : 'aparecem'} nos sites
            das redes nem nas notas lidas no seu raio. O total estimado não inclui{' '}
            {semPreco.length === 1 ? 'esse item' : 'esses itens'}.
          </Callout>
        ) : null}
      </div>

      <div className="vera-stack vera-stack--16">
        {d.melhor ? (
          <Card wide padding="lg" elevation="e1" gap={18}>
            <HeroNumber
              size="sm"
              label={`mais barato no ${d.melhor.nome.toLowerCase()}`}
              value={mask(ocultar, brlCents(d.melhor.totalComparavel ?? d.melhor.total))}
              sub={
                d.economia > 0 && d.habitual
                  ? `${brlCents(d.economia)} abaixo do ${d.habitual.nome}, o seu mercado de sempre`
                  : d.habitual && d.habitual.mercadoId === d.melhor.mercadoId
                    ? 'e é o seu mercado de sempre'
                    : `a ${km(d.melhor.distanciaKm)} de casa`
              }
            />
            <div className="vera-divider" />
            {d.totais.map((t, i) => (
              <TotalDoMercado
                key={t.mercadoId}
                t={t}
                posicao={i}
                ultimo={i > 0 && i === d.totais.length - 1}
                ocultar={ocultar}
              />
            ))}
            <Button
              block
              icon="check"
              className="lista-finalizar"
              onClick={() => finalizar()}
              loading={finalizando === true}
              loadingLabel="Lançando a compra"
            >
              Finalizar lista no {d.melhor.nome}
            </Button>
            <span className="vera-t-caption vera-t-pretty">
              Ao finalizar, a vera lança {brlCents(d.melhor.total)} em{' '}
              {Object.keys(d.melhor.porCategoria).join(' e ')} e marca os itens como comprados.
              {d.melhor.faltando && d.melhor.faltando.length
                ? ` ${d.melhor.faltando.map(f => f.item).join(', ')} não ${d.melhor.faltando.length === 1 ? 'tem' : 'têm'} lá e ${d.melhor.faltando.length === 1 ? 'fica' : 'ficam'} na lista.`
                : ''}
            </span>
          </Card>
        ) : null}
        {d.divisao ? (
          <Card gap={16} className="lista-divisao">
            <SectionHead
              label="Dividir a compra"
              meta={`economiza ${brlCents(d.divisao.economia)}`}
            />
            <span className="vera-t-note">
              Comprando cada item onde ele é mais barato, em dois mercados, a lista sai por{' '}
              {mask(ocultar, brlCents(d.divisao.total))} em vez de{' '}
              {mask(ocultar, brlCents(d.melhor.totalComparavel ?? d.melhor.total))}.
            </span>
            {d.divisao.mercados.map(m => (
              <div key={m.mercadoId} className="lista-divisao__parte">
                <div className="vera-split">
                  <span className="vera-t-body2">
                    {m.nome} <span className="vera-t-caption">· {km(m.distanciaKm)}</span>
                  </span>
                  <span className="lista-divisao__total">{mask(ocultar, brlCents(m.total))}</span>
                </div>
                <span className="vera-t-caption">
                  {m.itens.map(x => (x.qtd > 1 ? `${x.qtd}× ${x.item}` : x.item)).join(', ')}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="check"
                  loading={finalizando === m.mercadoId}
                  loadingLabel="Lançando"
                  onClick={() =>
                    finalizar(
                      m.mercadoId,
                      d.itens.filter(x => m.itens.some(p => p.item === x.nome)).map(x => x.id)
                    )
                  }
                >
                  Comprei esta parte
                </Button>
              </div>
            ))}
          </Card>
        ) : null}
        {!d.melhor ? (
          <Card wide padding="lg">
            <EmptyState icon="arrow-left-right" title="Sem comparação ainda">
              Quando a lista tiver itens com preço no seu raio, o total de cada mercado aparece
              aqui.
            </EmptyState>
          </Card>
        ) : null}
        {im ? (
          <Card gap={18}>
            <SectionHead label="Impacto no ciclo" />
            <Meter
              label={`${im.categoria} depois da compra`}
              amount={mask(ocultar, brl(im.usadoDepois))}
              value={im.limite ? Math.round((im.usadoDepois / im.limite) * 100) : 0}
              tone={im.sobra < 0 ? 'danger' : im.usadoDepois / im.limite > 0.9 ? 'warning' : 'data'}
              footnote={`de ${brl(im.limite)} · ${im.sobra >= 0 ? `sobram ${brl(im.sobra)} para ${plural(im.restantes + 1, 'dia', 'dias')}` : `passa ${brl(-im.sobra)} do limite`}`}
            />
            <span className="vera-t-note">
              {im.sobra >= 0
                ? `Comprando no ${d.melhor.nome}, ${im.categoria} ainda fecha o ciclo.`
                : `Mesmo no ${d.melhor.nome}, ${im.categoria} passa do limite.`}
              {im.noHabitual
                ? im.noHabitual.sobra < 0
                  ? ` No ${im.noHabitual.nome}, passaria ${brl(-im.noHabitual.sobra)} do limite.`
                  : ` No ${im.noHabitual.nome}, sobrariam ${brl(im.noHabitual.sobra)}.`
                : ''}
            </span>
          </Card>
        ) : null}
      </div>
      {semProduto ? (
        <Modal
          title="Escolher o produto"
          subtitle={`“${semProduto.nome}” sem marca e tamanho deixa a comparação vaga`}
          onClose={() => setSemProduto(null)}
        >
          <SeletorDeProduto termoInicial={semProduto.nome} onEscolher={definirProduto} autoFocus />
        </Modal>
      ) : null}
    </div>
  );
}
