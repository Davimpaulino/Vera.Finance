import { useState } from 'react';
import { Callout, Card, DataTable, HeroNumber, Meter, Tabs } from '../../components/ds/index.js';
import { SectionHead } from '../../components/SectionHead.jsx';
import { PageError, PageSkeleton } from '../../components/Loading.jsx';
import { useShell } from '../../components/app/AppShell.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useBreakpoint } from '../../hooks/useBreakpoint.js';
import { useUi } from '../../context/UiContext.jsx';
import { brl, brlCents, mask, mes, mesCurto, plural } from '../../lib/format.js';
import { notaCategoria, toneCategoria } from '../../lib/textos.js';
import { cx } from '../../lib/cx.js';
import './css/relatorios.css';

const TABS = [
  { value: 'ciclo', label: 'Este ciclo' },
  { value: 'ano', label: String(new Date().getFullYear()) },
  { value: 'cat', label: 'Por categoria' },
  { value: 'mercado', label: 'Por mercado' }
];
const rotulo = v => (v >= 1000 ? 'R$ ' + (v / 1000).toFixed(1).replace('.', ',') : brl(v));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function Barras({ barras, ocultar }) {
  const max = Math.max(1, ...barras.map(b => b.valor));
  return (
    <div className={cx('rel-bars', barras.length > 8 && 'rel-bars--dense')}>
      {barras.map((b, i) => (
        <div key={i} className="rel-bar" title={`${b.rotulo}: ${brlCents(b.valor)}`}>
          <div className="rel-bar__track">
            <div
              className={cx(
                'rel-bar__fill',
                `rel-bar__fill--h${Math.round((b.valor / max) * 100)}`,
                b.destaque && 'rel-bar__fill--on'
              )}
            >
              <span className="rel-bar__value">{ocultar ? '••' : rotulo(b.valor)}</span>
            </div>
          </div>
          <span className="rel-bar__label">{b.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

export default function Relatorios() {
  const { versao } = useShell();
  const { ocultar } = useUi();
  const desktop = useBreakpoint() === 'desktop';
  const [tab, setTab] = useState('ciclo');
  const { data: d, error, reload } = useApi('/relatorios', versao);

  if (error) return <PageError error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;

  const series = {
    ciclo: {
      titulo: 'Gasto por ciclo',
      meta: `últimos ${d.ciclos.length} ciclos`,
      barras: d.ciclos.map((c, i) => ({
        rotulo: mesCurto(c.inicio),
        valor: c.total,
        destaque: i === d.ciclos.length - 1
      }))
    },
    ano: {
      titulo: 'Gasto por mês',
      meta: `janeiro a ${mes(new Date().toISOString())}`,
      barras: d.meses.map((m, i) => ({
        rotulo: mesCurto(m.mes),
        valor: m.total,
        destaque: i === d.meses.length - 1
      }))
    },
    cat: {
      titulo: 'Gasto por categoria',
      meta: 'ciclo atual',
      barras: d.porCategoria.map(c => ({
        rotulo: c.nome,
        valor: c.total,
        destaque: c.status === 'estourou' || c.status === 'vai-apertar'
      }))
    },
    mercado: {
      titulo: 'Gasto por estabelecimento',
      meta: 'ciclo atual',
      barras: d.estabelecimentos
        .slice(0, 6)
        .map((e, i) => ({ rotulo: e.local, valor: e.total, destaque: i === 0 }))
    }
  }[tab];

  const atual = d.ciclos[d.ciclos.length - 1];
  const anterior = d.ciclos[d.ciclos.length - 2];
  const r = d.resumo;
  const frase =
    d.difAnterior === 0
      ? `${cap(mes(atual.inicio))} está igual a ${mes(anterior.inicio)}.`
      : `${cap(mes(atual.inicio))} está ${brl(Math.abs(d.difAnterior))} ${d.difAnterior > 0 ? 'acima' : 'abaixo'} de ${mes(anterior.inicio)}${d.difAnterior > 0 && d.maisSubiram.length ? `, puxado por ${d.maisSubiram.join(' e ')}` : ''}.`;

  const cols = [
    { key: 'local', label: 'Estabelecimento', primary: true },
    { key: 'notas', label: 'Notas', muted: true },
    { key: 'total', label: 'Total', align: 'right', value: true }
  ].filter(c => desktop || c.key !== 'notas');
  const rows = d.estabelecimentos.map(e => ({
    local: e.local,
    notas: `${e.notas ? plural(e.notas, 'nota', 'notas') : plural(e.lancamentos, 'lançamento', 'lançamentos')} · ${e.categorias.join(' e ')}`,
    total: mask(ocultar, brlCents(e.total))
  }));

  return (
    <div className="vera-page vera-stack vera-stack--24">
      <div className="vera-scroll-x">
        <Tabs items={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="vera-grid vera-grid--sidebar">
        <Card wide padding="lg" gap={18}>
          <SectionHead label={series.titulo} meta={series.meta} />
          {series.barras.length ? (
            <Barras barras={series.barras} ocultar={ocultar} />
          ) : (
            <span className="vera-t-meta">Sem gastos neste período.</span>
          )}
          <span className="vera-t-meta">{frase}</span>
        </Card>
        <div className="vera-stack vera-stack--16">
          <Card gap={18}>
            <HeroNumber
              label={`média por ciclo em ${new Date().getFullYear()}`}
              value={mask(ocultar, brl(r.mediaAno))}
              size="sm"
              tone="neutral"
            />
            <div className="vera-divider" />
            {[
              [
                'Maior ciclo',
                r.maior ? `${brl(r.maior.total)} · ${mes(r.maior.inicio)}` : '—',
                null
              ],
              [
                'Menor ciclo',
                r.menor ? `${brl(r.menor.total)} · ${mes(r.menor.inicio)}` : '—',
                null
              ],
              [
                'Economia com troca de mercado',
                `${brl(r.economiaAno)} em ${new Date().getFullYear()}`,
                'success'
              ],
              [
                'Estouros de limite',
                `${r.estouros} em ${r.ciclos} ciclos`,
                r.estouros ? 'warning' : null
              ]
            ].map(([k, v, tom]) => (
              <div key={k} className="vera-split">
                <span className="vera-t-body2">{k}</span>
                <span className={cx('rel-resumo__valor', tom && `rel-resumo__valor--${tom}`)}>
                  {mask(ocultar, v)}
                </span>
              </div>
            ))}
          </Card>
          {d.insight ? (
            <Callout
              tone="info"
              title={`${d.insight.categoria} caiu ${d.insight.quedaPct}% em três ciclos`}
            >
              Desde que você começou a comparar preço antes da compra, a média de{' '}
              {d.insight.categoria} saiu de {brl(d.insight.de)} para {brl(d.insight.para)} por
              ciclo.
            </Callout>
          ) : (
            <Callout tone="info" title="Compare antes de comprar">
              Quando você troca de mercado pela comparação, a vera mostra aqui quanto cada categoria
              caiu.
            </Callout>
          )}
        </div>
      </div>

      <div className="vera-grid vera-grid--2">
        <div className="vera-stack vera-stack--12">
          <SectionHead label="Onde o dinheiro foi" meta={`${mes(atual.inicio)} até hoje`} />
          <Card gap={18}>
            {d.categorias.map(c => (
              <Meter
                key={c.id}
                label={c.nome}
                amount={mask(ocultar, brl(c.usado))}
                value={c.pct}
                tone={toneCategoria(c)}
                footnote={notaCategoria(c)}
              />
            ))}
          </Card>
        </div>
        <div className="vera-stack vera-stack--12">
          <SectionHead
            label="Estabelecimentos"
            meta={`${Math.min(10, rows.length)} maiores do ciclo`}
          />
          <Card>
            <DataTable columns={cols} rows={rows} dense />
          </Card>
        </div>
      </div>
    </div>
  );
}
