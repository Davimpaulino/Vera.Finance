import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  ListRow,
  Modal,
  Select,
  StatCard
} from '../../components/ds/index.js';
import { PageError, PageSkeleton } from '../../components/Loading.jsx';
import { useShell } from '../../components/app/AppShell.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useUi } from '../../context/UiContext.jsx';
import { api } from '../../services/api.js';
import { brl, brlCents, diaRelativo, mask, plural } from '../../lib/format.js';
import { iconeLancamento, metaLancamento, valorLancamento } from '../../lib/textos.js';
import './css/lancamentos.css';

const SEG = [
  ['', 'Tudo'],
  ['saida', 'Saídas'],
  ['entrada', 'Entradas']
];

function Detalhe({ l, onClose, onDeleted }) {
  const { toast } = useUi();
  const [apagando, setApagando] = useState(false);
  const apagar = async () => {
    setApagando(true);
    try {
      await api.del(`/lancamentos/${l.id}`);
      toast('Lançamento apagado.');
      onDeleted();
    } catch (e) {
      toast(e.message, 'danger');
      setApagando(false);
    }
  };
  const linhas = [
    ['Valor', valorLancamento(l)],
    ['Categoria', l.tipo === 'entrada' ? 'Entrada' : l.categoriaNome],
    ['Dia', diaRelativo(l.data)],
    ['Quem lançou', l.quemNome || 'Você'],
    [
      'Origem',
      {
        nota: 'Nota fiscal',
        manual: 'Manual',
        recorrente: 'Recorrente',
        lista: 'Lista de compras'
      }[l.origem] || 'Manual'
    ]
  ];
  if (l.economia) linhas.push(['Economia', brlCents(l.economia)]);
  return (
    <Modal
      title={l.titulo}
      subtitle={metaLancamento(l)}
      size="sm"
      onClose={onClose}
      footer={[
        <Button
          key="d"
          variant="danger"
          icon="trash-2"
          loading={apagando}
          loadingLabel="Apagando"
          onClick={apagar}
        >
          Apagar
        </Button>,
        <Button key="c" variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      ]}
    >
      <Card padding="none">
        {linhas.map(([k, v], i) => (
          <ListRow key={k} title={k} value={v} last={i === linhas.length - 1} dense />
        ))}
      </Card>
      {l.itens && l.itens.length ? (
        <span className="lanc-itens">Itens: {l.itens.join(', ')}</span>
      ) : null}
    </Modal>
  );
}

export default function Lancamentos() {
  const { versao, recarregar } = useShell();
  const { ocultar, toast } = useUi();
  const [q, setQ] = useState('');
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState(
    () => new URLSearchParams(window.location.search).get('categoria') || ''
  );
  const [tipo, setTipo] = useState('');
  const [aberto, setAberto] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setBusca(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ q: busca, categoria, tipo }).toString();
  const { data: d, error, reload } = useApi(`/lancamentos?${params}`, versao);

  if (error) return <PageError error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;
  const { stats } = d;

  const exportar = async () => {
    try {
      await api.download('/lancamentos/export', 'vera-lancamentos.csv');
    } catch (e) {
      toast(e.message, 'danger');
    }
  };

  return (
    <div className="vera-page vera-stack vera-stack--24">
      <div className="vera-grid vera-grid--3">
        <StatCard
          icon="arrow-up-right"
          label="Saídas do ciclo"
          value={mask(ocultar, brl(stats.saidas))}
          delta={plural(stats.saidasCount, 'lançamento', 'lançamentos')}
        />
        <StatCard
          icon="arrow-down-left"
          label="Entradas do ciclo"
          value={mask(ocultar, brl(stats.entradas))}
          tone="success"
          delta={
            stats.entradasDescricao.length
              ? stats.entradasDescricao.map(t => t.toLowerCase()).join(' e ')
              : 'nenhuma ainda'
          }
        />
        <StatCard
          icon="scan-line"
          label="Vindos de nota fiscal"
          value={`${stats.deNotaPct}%`}
          tone="data"
          delta={`${stats.deNota} de ${plural(stats.saidasCount, 'lançamento', 'lançamentos')}`}
        />
      </div>

      <div className="lanc-row">
        <div className="lanc-row__search">
          <Input
            icon="search"
            placeholder="Buscar por estabelecimento ou item"
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Buscar lançamentos"
          />
        </div>
        <div className="lanc-row__cat">
          <Select
            aria-label="Categoria"
            options={[
              { value: '', label: 'Todas as categorias' },
              ...d.categorias.map(c => ({ value: c.id, label: c.nome }))
            ]}
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
          />
        </div>
        <div className="lanc-seg" role="tablist">
          {SEG.map(([v, label]) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={tipo === v ? 'true' : 'false'}
              className="lanc-seg__btn"
              onClick={() => setTipo(v)}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="lanc-exportar" onClick={exportar}>
          <Icon name="download" size={17} />
          Exportar
        </button>
      </div>

      {d.dias.length ? (
        d.dias.map(g => (
          <div key={g.dia} className="vera-stack vera-stack--10">
            <div className="vera-split vera-split--base">
              <span className="lanc-dia__label">{diaRelativo(g.itens[0].data)}</span>
              <span className="lanc-dia__total">
                {mask(ocultar, g.saidas ? brlCents(g.saidas) : `+ ${brlCents(g.entradas)}`)}
              </span>
            </div>
            <Card padding="none">
              {g.itens.map((l, i) => (
                <ListRow
                  key={l.id}
                  icon={iconeLancamento(l, d.categorias)}
                  title={l.titulo}
                  meta={metaLancamento(l, { comQuem: true })}
                  value={mask(ocultar, valorLancamento(l))}
                  valueTone={l.tipo === 'entrada' ? 'success' : undefined}
                  badge={l.origem === 'nota' ? <Badge tone="data">nota</Badge> : null}
                  last={i === g.itens.length - 1}
                  onClick={() => setAberto(l)}
                />
              ))}
            </Card>
          </div>
        ))
      ) : (
        <Card>
          <EmptyState icon="search" title="Nada por aqui">
            Nenhum lançamento com esses filtros neste ciclo.
          </EmptyState>
        </Card>
      )}

      {aberto ? (
        <Detalhe
          l={aberto}
          onClose={() => setAberto(null)}
          onDeleted={() => {
            setAberto(null);
            recarregar();
          }}
        />
      ) : null}
    </div>
  );
}
