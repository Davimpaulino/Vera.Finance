import {
  Button,
  Callout,
  Card,
  HeroNumber,
  Icon,
  ListRow,
  Meter,
  ProjectionLine,
  StatCard
} from '../../components/ds/index.js';
import { SectionHead } from '../../components/SectionHead.jsx';
import { GhostLink } from '../../components/GhostLink.jsx';
import { PageError, PageSkeleton } from '../../components/Loading.jsx';
import { useShell } from '../../components/app/AppShell.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useRouter } from '../../lib/router.jsx';
import { useUi } from '../../context/UiContext.jsx';
import './css/painel.css';
import { brl, brlCents, diaDeMes, diaMes, mask, mes, plural } from '../../lib/format.js';
import {
  acabaEm,
  iconeLancamento,
  metaLancamento,
  notaCategoria,
  previsaoMeta,
  toneCategoria,
  valorLancamento
} from '../../lib/textos.js';

function Alerta({ alerta, ciclo, livre, ocultar, navigate }) {
  if (!alerta) {
    return (
      <Callout tone="success" title="Todas as categorias fecham o ciclo">
        No ritmo atual nenhuma categoria passa do limite até {diaDeMes(ciclo.fim)}.
      </Callout>
    );
  }
  const acao = (
    <Button variant="secondary" size="sm" icon="target" onClick={() => navigate('/app/metas')}>
      Ver limite de {alerta.nome}
    </Button>
  );
  if (alerta.status === 'estourou') {
    return (
      <Callout
        tone="danger"
        title={`${alerta.nome} estourou ${brl(alerta.usado - alerta.limite)}`}
        action={acao}
      >
        O limite era {brl(alerta.limite)} e já saíram {brl(alerta.usado)}. O que passar daqui sai do
        saldo livre, que está em {mask(ocultar, brl(livre))}.
      </Callout>
    );
  }
  return (
    <Callout tone="warning" title={`${alerta.nome} ${acabaEm(alerta.diasRestantes)}`} action={acao}>
      No ritmo atual sobram {brl(alerta.livre)} para {plural(ciclo.restantes + 1, 'dia', 'dias')}.
      Para fechar o ciclo dentro do limite, o gasto precisa cair para {brl(alerta.porDiaParaFechar)}{' '}
      por dia.
    </Callout>
  );
}

export default function Painel() {
  const { abrirGasto, abrirLeitor, versao } = useShell();
  const { ocultar } = useUi();
  const { navigate } = useRouter();
  const { data: d, error, reload } = useApi('/dashboard', versao);

  if (error) return <PageError error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;

  const { ciclo, stats } = d;
  const hoje = new Date().toISOString();
  const anterior = new Date(ciclo.inicio);
  anterior.setMonth(anterior.getMonth() - 1);

  return (
    <div className="vera-page vera-stack vera-stack--28">
      <div className="vera-grid vera-grid--sidebar">
        <Card wide padding="lg" gap={18}>
          <HeroNumber
            label={`livre para gastar até ${diaDeMes(ciclo.fim)}`}
            value={mask(ocultar, brl(d.livre))}
            sub={
              ocultar
                ? 'toque em Configurações para mostrar'
                : `${brl(d.porDia)} por dia até o dia ${new Date(ciclo.fim).getDate()}`
            }
            tone={d.livre < 0 ? 'danger' : 'accent'}
          />
          <ProjectionLine points={d.projecao} todayIndex={d.hojeIndex} height={120} />
          <div className="vera-legend">
            <span>{diaMes(ciclo.inicio)}</span>
            <span className="vera-legend__now">hoje, {diaMes(hoje)}</span>
            <span>
              {diaMes(ciclo.fim)} · fecha em {mask(ocultar, brl(d.fechaEm))}
            </span>
          </div>
          <div className="vera-btn-row painel-acoes">
            <Button icon="plus" onClick={() => abrirGasto()}>
              Novo gasto
            </Button>
            <Button
              variant="secondary"
              icon="arrow-down-left"
              onClick={() => abrirGasto({ tipo: 'entrada' })}
            >
              Entrada de renda
            </Button>
            <Button
              variant="ghost"
              icon="scan-line"
              onClick={abrirLeitor}
            >
              Ler NF-e
            </Button>
          </div>
        </Card>
        <div className="vera-stack vera-stack--16">
          <Alerta
            alerta={d.alerta}
            ciclo={ciclo}
            livre={d.livre}
            ocultar={ocultar}
            navigate={navigate}
          />
          <Card padding="none">
            <div className="painel-notas__head">
              <SectionHead
                label="Notas fiscais"
                meta={
                  d.pendentesTotal
                    ? plural(d.pendentesTotal, 'pendente', 'pendentes')
                    : 'nada pendente'
                }
              />
            </div>
            {d.pendentes.length ? (
              d.pendentes.map((n, i) => (
                <ListRow
                  key={n.id}
                  icon="receipt-text"
                  title={n.estabelecimento}
                  meta={`lida em ${diaMes(n.lidaEm)} · ${plural(n.itens, 'item', 'itens')}`}
                  value={brlCents(n.valor)}
                  last={i === d.pendentes.length - 1}
                  onClick={() => abrirGasto({ nota: n })}
                />
              ))
            ) : (
              <span className="painel-notas__empty">
                As notas que você ler pelo QR Code aparecem aqui para confirmar a categoria.
              </span>
            )}
          </Card>
        </div>
      </div>

      <div className="vera-grid vera-grid--4">
        <StatCard
          icon="wallet"
          label="Gasto do ciclo"
          value={mask(ocultar, brl(stats.gastoCiclo))}
          delta={
            stats.difAnterior
              ? `${brl(Math.abs(stats.difAnterior))} ${stats.difAnterior > 0 ? 'acima' : 'abaixo'} de ${mes(anterior.toISOString())}`
              : `igual a ${mes(anterior.toISOString())}`
          }
          deltaDirection={stats.difAnterior > 0 ? 'up' : stats.difAnterior < 0 ? 'down' : undefined}
          deltaTone={stats.difAnterior > 0 ? 'danger' : 'success'}
        />
        <StatCard
          icon="receipt-text"
          label="Notas lidas"
          value={String(stats.notasLidas)}
          delta={
            d.pendentesTotal
              ? plural(d.pendentesTotal, 'pendente', 'pendentes')
              : 'nenhuma pendente'
          }
        />
        <StatCard
          icon="trending-down"
          label="Economia trocando de mercado"
          value={mask(ocultar, brl(stats.economia))}
          tone="success"
          delta={
            stats.comparacoes
              ? `em ${plural(stats.comparacoes, 'comparação', 'comparações')}`
              : 'compare antes da compra'
          }
        />
        <StatCard
          icon="target"
          label="Guardado em metas"
          value={mask(ocultar, brl(stats.guardado))}
          tone="data"
          delta={`${brl(stats.aporteCiclo)} este ciclo`}
          deltaDirection={stats.aporteCiclo ? 'up' : undefined}
          deltaTone={stats.aporteCiclo ? 'success' : undefined}
        />
      </div>

      <div className="vera-grid vera-grid--2">
        <div className="vera-stack vera-stack--12">
          <SectionHead
            label="Categorias"
            meta={`reservado em ${diaDeMes(d.reservadoEm)}`}
            action={
              <GhostLink iconRight="chevron-right" onClick={() => navigate('/app/categorias')}>
                Personalizar
              </GhostLink>
            }
          />
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
            label="Metas"
            action={
              <GhostLink iconRight="chevron-right" onClick={() => navigate('/app/metas')}>
                Ver metas
              </GhostLink>
            }
          />
          <Card gap={18}>
            {d.metas.length ? (
              d.metas.map(m => (
                <Meter
                  key={m.id}
                  label={m.nome}
                  amount={mask(ocultar, brl(m.guardado))}
                  value={m.pct}
                  tone="success"
                  footnote={`de ${brl(m.alvo)} · ${previsaoMeta(m)}`}
                />
              ))
            ) : (
              <span className="vera-t-meta">
                Nenhuma meta ainda. Crie a primeira em Metas & limites.
              </span>
            )}
          </Card>
          {d.dica ? (
            <div className="vera-tip">
              <Icon name="sparkles" size={17} className="painel-tip__icon" />
              <span className="vera-tip__text">
                O {d.dica.produto.toLowerCase()} que você compra subiu {d.dica.altaPct}% no{' '}
                {d.dica.mercadoHabitual} desde {mes(d.dica.desde)}. No {d.dica.mercadoBarato} está{' '}
                {brlCents(d.dica.precoBarato)}.
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="vera-stack vera-stack--12">
        <SectionHead
          label="Lançamentos"
          action={
            <GhostLink iconRight="chevron-right" onClick={() => navigate('/app/lancamentos')}>
              Ver ciclo completo
            </GhostLink>
          }
        />
        <Card padding="none">
          {d.ultimos.length ? (
            d.ultimos.map((l, i) => (
              <ListRow
                key={l.id}
                icon={iconeLancamento(l, d.categorias)}
                title={l.titulo}
                meta={metaLancamento(l)}
                value={mask(ocultar, valorLancamento(l))}
                valueTone={l.tipo === 'entrada' ? 'success' : undefined}
                last={i === d.ultimos.length - 1}
                onClick={() => navigate('/app/lancamentos')}
              />
            ))
          ) : (
            <span className="painel-vazio">Nenhum lançamento neste ciclo ainda.</span>
          )}
        </Card>
      </div>
    </div>
  );
}
