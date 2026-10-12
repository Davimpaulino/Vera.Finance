import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  HeroNumber,
  Icon,
  Input,
  Meter,
  Modal,
  MoneyInput,
  SeletorDeIcone
} from '../../components/ds/index.js';
import { PageError, PageSkeleton } from '../../components/Loading.jsx';
import { useShell } from '../../components/app/AppShell.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useBreakpoint } from '../../hooks/useBreakpoint.js';
import { useRouter } from '../../lib/router.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { api } from '../../services/api.js';
import { brl, mask, parseMoney, plural } from '../../lib/format.js';
import { badgeCategoria, notaCategoria, origemCategoria, toneCategoria } from '../../lib/textos.js';
import { cx } from '../../lib/cx.js';
import './css/categorias.css';

function NovaCategoria({ icones, livre, onClose, onSaved }) {
  const { toast } = useUi();
  const [nome, setNome] = useState('');
  const [icon, setIcon] = useState('wallet');
  const [limite, setLimite] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const salvar = async e => {
    e?.preventDefault();
    if (!nome.trim()) {
      setErro('Dê um nome para a categoria.');
      return;
    }
    setSalvando(true);
    try {
      await api.post('/categorias', { nome, icon, limite: parseMoney(limite) });
      toast(`${nome} criada.`);
      onSaved();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };
  return (
    <Modal
      title="Nova categoria"
      subtitle={`${brl(livre)} da renda ainda sem destino`}
      size="sm"
      onClose={onClose}
      footer={[
        <Button key="s" onClick={salvar} loading={salvando} loadingLabel="Criando">
          Criar categoria
        </Button>,
        <Button key="c" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      ]}
    >
      <form onSubmit={salvar} className="vera-form">
        <Input
          label="Nome"
          placeholder="Pet, Presentes, Academia"
          value={nome}
          onChange={e => setNome(e.target.value)}
          autoFocus
        />
        <SeletorDeIcone icones={icones} value={icon} onChange={setIcon} />
        <MoneyInput
          label="limite do ciclo"
          value={limite}
          onChange={e => setLimite(e.target.value)}
        />
        {erro ? (
          <div className="vera-form-error" role="alert">
            {erro}
          </div>
        ) : null}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Categorias() {
  const { versao, recarregar } = useShell();
  const { ocultar } = useUi();
  const { navigate } = useRouter();
  const mobile = useBreakpoint() === 'mobile';
  const { data: d, error, reload } = useApi('/categorias', versao);
  const [nova, setNova] = useState(false);

  if (error) return <PageError error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;

  return (
    <div className="vera-page vera-stack vera-stack--24">
      <Card wide gap={18}>
        <div className="cat-hero">
          <HeroNumber
            label="reservado em categorias neste ciclo"
            value={mask(ocultar, brl(d.reservado))}
            size="sm"
            tone="neutral"
            sub={
              d.semDestino >= 0
                ? `de ${brl(d.entradas)} · ${brl(d.semDestino)} ainda sem destino`
                : `de ${brl(d.entradas)} · ${brl(-d.semDestino)} acima da renda`
            }
          />
          <div className="vera-cta-stack">
            <Button variant="secondary" icon="plus" block={mobile} onClick={() => setNova(true)}>
              Nova categoria
            </Button>
          </div>
        </div>
        <Meter
          value={d.consumidoPct}
          size="lg"
          footnote={`${d.consumidoPct}% do ciclo consumido · ${d.ciclo.restantes ? `faltam ${plural(d.ciclo.restantes, 'dia', 'dias')}` : 'vira amanhã'}`}
        />
      </Card>

      <div className="vera-grid vera-grid--3">
        {d.categorias.concat(d.reservas).map(c => {
          const [badge, badgeTone] = c.reserva ? ['reserva', 'accent'] : badgeCategoria(c);
          const tom =
            c.status === 'estourou' ? 'danger' : c.status === 'vai-apertar' ? 'warning' : null;
          return (
            <Card key={c.id} gap={18}>
              <div className="vera-inline">
                <div className="vera-tile">
                  <Icon name={c.icon} size={16} />
                </div>
                <span className="cat-card__name">{c.nome}</span>
                <Badge tone={badgeTone}>{badge}</Badge>
              </div>
              <div className="cat-card__livre">
                <span
                  className={cx(
                    'vera-serif-32',
                    'cat-card__valor',
                    tom && `cat-card__valor--${tom}`
                  )}
                >
                  {mask(ocultar, brl(c.livre))}
                </span>
                <span className="vera-t-meta">livres de {brl(c.limite)}</span>
              </div>
              <Meter
                value={c.pct}
                tone={c.reserva ? 'accent' : toneCategoria(c)}
                footnote={c.reserva ? 'separado para metas na virada' : notaCategoria(c)}
              />
              <div className="vera-divider" />
              <div className="vera-split">
                <span className="vera-t-meta">{origemCategoria(c)}</span>
                <button
                  type="button"
                  className="v-more"
                  onClick={() => navigate(`/app/lancamentos?categoria=${c.id}`)}
                >
                  Ver
                  <Icon name="chevron-right" size={16} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {nova ? (
        <NovaCategoria
          icones={d.icones}
          livre={d.semDestino}
          onClose={() => setNova(false)}
          onSaved={() => {
            setNova(false);
            recarregar();
          }}
        />
      ) : null}
    </div>
  );
}
