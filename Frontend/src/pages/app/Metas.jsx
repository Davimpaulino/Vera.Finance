import { useEffect, useState } from 'react';
import {
  Button,
  Callout,
  Card,
  HeroNumber,
  Icon,
  IconButton,
  Input,
  Meter,
  Modal,
  MoneyInput,
  SeletorDeIcone,
  StatCard,
  Switch
} from '../../components/ds/index.js';
import { SectionHead } from '../../components/SectionHead.jsx';
import { PageError, PageSkeleton } from '../../components/Loading.jsx';
import { useShell } from '../../components/app/AppShell.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useUi } from '../../context/UiContext.jsx';
import { api } from '../../services/api.js';
import { brl, mask, mesAno, moneyField, parseMoney, plural } from '../../lib/format.js';
import { acabaEm, aporteMeta, previsaoMeta } from '../../lib/textos.js';
import { cx } from '../../lib/cx.js';
import './css/metas.css';

const ICONES_META = [
  ['target', 'Alvo'],
  ['plane', 'Viagem'],
  ['shield', 'Reserva'],
  ['piggy-bank', 'Poupança'],
  ['laptop', 'Eletrônico'],
  ['car', 'Carro'],
  ['house', 'Casa'],
  ['graduation-cap', 'Estudo'],
  ['book-open', 'Curso'],
  ['gift', 'Presente'],
  ['heart', 'Saúde'],
  ['baby', 'Festa'],
  ['gamepad-2', 'Lazer'],
  ['shirt', 'Compras'],
  ['wallet', 'Dívida'],
  ['sparkles', 'Sonho']
];

/** Criar ou editar uma meta. Com `meta`, o formulário vem preenchido e salva com PATCH. */
function FormularioMeta({ meta, onClose, onSaved }) {
  const { toast } = useUi();
  const editando = !!meta;
  const [f, setF] = useState({
    nome: meta?.nome || '',
    icon: meta?.icon || 'target',
    alvo: meta ? moneyField(meta.alvo) : '',
    aportePorCiclo: meta?.aportePorCiclo ? moneyField(meta.aportePorCiclo) : '',
    guardado: ''
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const salvar = async e => {
    e?.preventDefault();
    setErro('');
    if (!f.nome.trim() || parseMoney(f.alvo) <= 0) {
      setErro('Dê um nome e um valor para a meta.');
      return;
    }
    setSalvando(true);
    const corpo = {
      nome: f.nome,
      icon: f.icon,
      alvo: parseMoney(f.alvo),
      aportePorCiclo: parseMoney(f.aportePorCiclo),
      sobraNaVirada: !parseMoney(f.aportePorCiclo)
    };
    try {
      if (editando) await api.patch(`/metas/${meta.id}`, corpo);
      else await api.post('/metas', { ...corpo, guardado: parseMoney(f.guardado) });
      toast(editando ? 'Meta atualizada.' : 'Meta criada.');
      onSaved();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };
  return (
    <Modal
      title={editando ? `Editar ${meta.nome}` : 'Nova meta'}
      subtitle={
        editando
          ? `${brl(meta.guardado)} guardados até agora`
          : 'o aporte sai do ciclo junto com as categorias'
      }
      size="sm"
      onClose={onClose}
      footer={[
        <Button
          key="s"
          onClick={salvar}
          loading={salvando}
          loadingLabel={editando ? 'Salvando' : 'Criando'}
        >
          {editando ? 'Salvar' : 'Criar meta'}
        </Button>,
        <Button key="c" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      ]}
    >
      <form onSubmit={salvar} className="vera-form">
        <Input
          label="Nome"
          placeholder="Viagem em janeiro"
          value={f.nome}
          onChange={e => setF({ ...f, nome: e.target.value })}
          autoFocus
        />
        <SeletorDeIcone
          icones={ICONES_META}
          value={f.icon}
          onChange={icon => setF({ ...f, icon })}
        />
        <MoneyInput
          label="quanto quer juntar"
          value={f.alvo}
          onChange={e => setF({ ...f, alvo: e.target.value })}
        />
        <div className={editando ? undefined : 'vera-grid vera-grid--2'}>
          <MoneyInput
            label="aporte por ciclo"
            size="sm"
            hint="vazio: entra o que sobrar"
            value={f.aportePorCiclo}
            onChange={e => setF({ ...f, aportePorCiclo: e.target.value })}
          />
          {editando ? null : (
            <MoneyInput
              label="já guardado"
              size="sm"
              value={f.guardado}
              onChange={e => setF({ ...f, guardado: e.target.value })}
            />
          )}
        </div>
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

function ExcluirMeta({ meta, onClose, onSaved }) {
  const { toast } = useUi();
  const [excluindo, setExcluindo] = useState(false);
  const excluir = async () => {
    setExcluindo(true);
    try {
      await api.del(`/metas/${meta.id}`);
      toast(`${meta.nome} foi excluída.`);
      onSaved();
    } catch (e) {
      toast(e.message, 'danger');
      setExcluindo(false);
    }
  };
  return (
    <Modal
      title={`Excluir ${meta.nome}?`}
      subtitle="não dá para desfazer"
      size="sm"
      onClose={onClose}
      footer={[
        <Button
          key="e"
          variant="danger"
          icon="trash-2"
          onClick={excluir}
          loading={excluindo}
          loadingLabel="Excluindo"
        >
          Excluir meta
        </Button>,
        <Button key="c" variant="ghost" onClick={onClose}>
          Manter
        </Button>
      ]}
    >
      <p className="vera-modal__text">
        {meta.guardado > 0
          ? `Os ${brl(meta.guardado)} guardados nela deixam de contar como meta e o histórico de aportes é apagado. O dinheiro continua onde você guardou.`
          : 'A meta e o histórico de aportes serão apagados.'}
      </p>
    </Modal>
  );
}

function Simular({ meta, onClose, onSaved }) {
  const { toast } = useUi();
  const [aporte, setAporte] = useState(moneyField(meta.aportePorCiclo || 0));
  const [sim, setSim] = useState(null);
  const [agora, setAgora] = useState('');
  const v = parseMoney(aporte);

  useEffect(() => {
    const t = setTimeout(
      () =>
        api
          .get(`/metas/${meta.id}/simular?aporte=${v}`)
          .then(setSim)
          .catch(() => {}),
      200
    );
    return () => clearTimeout(t);
  }, [v, meta.id]);

  const usar = async () => {
    try {
      await api.patch(`/metas/${meta.id}`, { aportePorCiclo: v });
      toast(`Aporte de ${meta.nome} agora é ${brl(v)} por ciclo.`);
      onSaved();
    } catch (e) {
      toast(e.message, 'danger');
    }
  };
  const movimentar = async sinal => {
    const x = parseMoney(agora);
    if (x <= 0) return;
    try {
      await api.post(`/metas/${meta.id}/aportes`, { valor: x * sinal });
      toast(
        sinal > 0 ? `${brl(x)} guardados em ${meta.nome}.` : `${brl(x)} retirados de ${meta.nome}.`
      );
      onSaved();
    } catch (e) {
      toast(e.message, 'danger');
    }
  };

  return (
    <Modal
      title={`Simular ${meta.nome}`}
      subtitle={`faltam ${brl(meta.falta)} de ${brl(meta.alvo)}`}
      size="sm"
      onClose={onClose}
      footer={[
        <Button key="u" onClick={usar}>
          Usar este aporte
        </Button>,
        <Button key="c" variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      ]}
    >
      <MoneyInput
        label="aporte por ciclo"
        value={aporte}
        onChange={e => setAporte(e.target.value)}
        autoFocus
      />
      <Callout
        tone="accent"
        title={
          sim
            ? sim.ciclos == null
              ? 'Sem aporte, sem data'
              : sim.ciclos === 0
                ? 'Meta batida'
                : `Pronta em ${plural(sim.ciclos, 'ciclo', 'ciclos')}`
            : 'Calculando…'
        }
      >
        {sim && sim.previsao
          ? `Guardando ${brl(v)} por ciclo, ${meta.nome} fecha em ${mesAno(sim.previsao)}.`
          : 'Com aporte zero, a meta recebe só o que sobrar na virada.'}
      </Callout>
      <div className="vera-divider" />
      <MoneyInput
        label="guardar ou retirar agora"
        size="sm"
        value={agora}
        onChange={e => setAgora(e.target.value)}
      />
      <div className="vera-btn-row">
        <Button variant="secondary" icon="plus" onClick={() => movimentar(1)}>
          Guardar
        </Button>
        <Button
          variant="ghost"
          icon="minus"
          onClick={() => movimentar(-1)}
          disabled={meta.guardado <= 0}
        >
          Retirar
        </Button>
      </div>
    </Modal>
  );
}

function LimiteRow({ l, last, onChange }) {
  const { toast } = useUi();
  const [valor, setValor] = useState(moneyField(l.limite));
  useEffect(() => {
    setValor(moneyField(l.limite));
  }, [l.limite]);

  const salvar = async () => {
    const v = parseMoney(valor);
    if (v === l.limite) return;
    try {
      await api.patch(`/categorias/${l.id}`, { limite: v });
      toast(`Limite de ${l.nome}: ${brl(v)}.`);
      onChange();
    } catch (e) {
      toast(e.message, 'danger');
      setValor(moneyField(l.limite));
    }
  };
  const alternar = async () => {
    try {
      await api.patch(`/categorias/${l.id}`, { alerta80: !l.alerta80 });
      onChange();
    } catch (e) {
      toast(e.message, 'danger');
    }
  };

  const nota =
    l.status === 'estourou'
      ? `estourou ${brl(l.usado - l.limite)}`
      : `${l.pct}% usado${l.status === 'vai-apertar' ? ` · ${acabaEm(l.diasRestantes)} no ritmo atual` : l.status === 'folgada' ? ' · sobra folgada' : ''}`;
  const tom = l.status === 'estourou' ? 'danger' : l.status === 'vai-apertar' ? 'warning' : null;

  return (
    <div className={cx('metas-limite', last && 'metas-limite--last')}>
      <div className="metas-limite__info">
        <div className="vera-tile vera-tile--lg">
          <Icon name={l.icon} size={18} />
        </div>
        <div className="vera-stack vera-stack--2">
          <span className="vera-t-name">{l.nome}</span>
          <span className={cx('metas-limite__nota', tom && `metas-limite__nota--${tom}`)}>
            {nota}
          </span>
        </div>
      </div>
      <div className="metas-limite__ctl">
        <div className="metas-limite__money">
          <MoneyInput
            label="limite"
            size="sm"
            value={valor}
            onChange={e => setValor(e.target.value)}
            onBlur={salvar}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
        </div>
        <div className="metas-limite__alert">
          <span className="metas-limite__alert-label">Avisar em 80%</span>
          <Switch
            checked={l.alerta80}
            onChange={alternar}
            aria-label={`Avisar quando ${l.nome} chegar a 80%`}
          />
        </div>
      </div>
    </div>
  );
}

export default function Metas() {
  const { versao, recarregar } = useShell();
  const { ocultar } = useUi();
  const { data: d, error, reload } = useApi('/metas', versao);
  const [nova, setNova] = useState(false);
  const [simular, setSimular] = useState(null);
  const [editar, setEditar] = useState(null);
  const [excluir, setExcluir] = useState(null);
  const fecharESalvar = fechar => () => {
    fechar(null);
    recarregar();
  };

  if (error) return <PageError error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;
  const { stats } = d;
  const est = stats.estouradas;

  return (
    <div className="vera-page vera-stack vera-stack--28">
      <div className="vera-grid vera-grid--3">
        <StatCard
          icon="target"
          label="Guardado no total"
          value={mask(ocultar, brl(stats.guardado))}
          tone="data"
          delta={`em ${plural(stats.ativas, 'meta ativa', 'metas ativas')}`}
        />
        <StatCard
          icon="calendar-check"
          label="Reservado neste ciclo"
          value={mask(ocultar, brl(stats.aporteCiclo))}
          tone="success"
          delta="aportes do ciclo atual"
        />
        <StatCard
          icon="triangle-alert"
          label="Limites estourados"
          value={String(est.length)}
          tone={est.length ? 'danger' : 'success'}
          delta={
            est.length
              ? est.map(e => `${e.nome}, ${brl(e.acima)} acima`).join(' · ')
              : 'todos dentro do limite'
          }
        />
      </div>

      <div className="vera-stack vera-stack--12">
        <SectionHead
          label="Metas"
          meta={plural(stats.ativas, 'ativa', 'ativas')}
          action={
            <Button variant="secondary" size="sm" icon="plus" onClick={() => setNova(true)}>
              Nova meta
            </Button>
          }
        />
        {d.metas.length ? (
          <div className="vera-grid vera-grid--3">
            {d.metas.map(m => (
              <Card key={m.id} gap={18}>
                <div className="vera-inline">
                  <div className="vera-tile vera-tile--success">
                    <Icon name={m.icon} size={16} />
                  </div>
                  <span className="metas-card__name">{m.nome}</span>
                  <span className="metas-card__acoes">
                    <IconButton
                      icon="pencil"
                      label={`Editar ${m.nome}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditar(m)}
                    />
                    <IconButton
                      icon="trash-2"
                      label={`Excluir ${m.nome}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => setExcluir(m)}
                    />
                  </span>
                </div>
                <HeroNumber
                  label="guardado"
                  value={mask(ocultar, brl(m.guardado))}
                  size="sm"
                  tone="success"
                />
                <Meter
                  value={m.pct}
                  tone="success"
                  footnote={`de ${brl(m.alvo)} · ${previsaoMeta(m)}`}
                />
                <div className="vera-divider" />
                <div className="vera-split">
                  <span className="vera-t-meta">{aporteMeta(m)}</span>
                  <button type="button" className="v-more" onClick={() => setSimular(m)}>
                    Guardar e simular
                    <Icon name="chevron-right" size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Callout
            tone="info"
            title="Nenhuma meta ainda"
            action={
              <Button size="sm" icon="plus" onClick={() => setNova(true)}>
                Criar a primeira
              </Button>
            }
          >
            Uma meta separa um pedaço do ciclo para algo que vem depois: viagem, reserva, troca de
            celular.
          </Callout>
        )}
      </div>

      <div className="vera-stack vera-stack--12">
        <SectionHead label="Limites por categoria" meta="o aviso chega antes do estouro" />
        <Card gap={0}>
          {d.limites.map((l, i) => (
            <LimiteRow key={l.id} l={l} last={i === d.limites.length - 1} onChange={recarregar} />
          ))}
        </Card>
      </div>

      {nova ? (
        <FormularioMeta
          onClose={() => setNova(false)}
          onSaved={() => {
            setNova(false);
            recarregar();
          }}
        />
      ) : null}
      {editar ? (
        <FormularioMeta
          meta={editar}
          onClose={() => setEditar(null)}
          onSaved={fecharESalvar(setEditar)}
        />
      ) : null}
      {excluir ? (
        <ExcluirMeta
          meta={excluir}
          onClose={() => setExcluir(null)}
          onSaved={fecharESalvar(setExcluir)}
        />
      ) : null}
      {simular ? (
        <Simular
          meta={simular}
          onClose={() => setSimular(null)}
          onSaved={() => {
            setSimular(null);
            recarregar();
          }}
        />
      ) : null}
    </div>
  );
}
