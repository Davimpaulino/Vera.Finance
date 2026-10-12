import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Icon,
  Input,
  ListRow,
  Meter,
  Modal,
  Switch
} from '../../components/ds/index.js';
import { SectionHead } from '../../components/SectionHead.jsx';
import { PageError, PageSkeleton } from '../../components/Loading.jsx';
import { useShell } from '../../components/app/AppShell.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useRouter } from '../../lib/router.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { brl, diasAtras, mask, mes, plural } from '../../lib/format.js';
import { cx } from '../../lib/cx.js';
import './css/familia.css';

function Convidar({ onClose, onSaved }) {
  const { toast } = useUi();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const enviar = async e => {
    e?.preventDefault();
    try {
      await api.post('/familia/convites', { email });
      toast(`Convite enviado para ${email}.`);
      onSaved();
    } catch (err) {
      setErro(err.message);
    }
  };
  return (
    <Modal
      title="Convidar pessoa"
      subtitle="a pessoa entra no seu ciclo e lança junto"
      size="sm"
      onClose={onClose}
      footer={[
        <Button key="s" icon="mail" onClick={enviar}>
          Enviar convite
        </Button>,
        <Button key="c" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      ]}
    >
      <form onSubmit={enviar}>
        <Input
          label="E-mail"
          type="email"
          placeholder="pessoa@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus
        />
      </form>
      {erro ? (
        <div className="vera-form-error" role="alert">
          {erro}
        </div>
      ) : null}
    </Modal>
  );
}

export default function Familia() {
  const { versao, recarregar } = useShell();
  const { ocultar, toast } = useUi();
  const { refresh } = useAuth();
  const { navigate } = useRouter();
  const { data: d, error, reload } = useApi('/familia', versao);
  const [convidar, setConvidar] = useState(false);
  const [meusConvites, setMeusConvites] = useState([]);

  useEffect(() => {
    api
      .get('/familia/convites')
      .then(setMeusConvites)
      .catch(() => {});
  }, [versao]);

  if (error) return <PageError error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;

  const criar = async () => {
    try {
      await api.post('/familia', {});
      await refresh();
      recarregar();
    } catch (e) {
      toast(e.message, 'danger');
    }
  };
  const aceitar = async id => {
    try {
      await api.post(`/familia/${id}/aceitar`, {});
      await refresh();
      recarregar();
      toast('Você entrou no modo família.');
    } catch (e) {
      toast(e.message, 'danger');
    }
  };
  const alternar = async c => {
    try {
      await api.patch(`/categorias/${c.id}`, { compartilhada: !c.compartilhada });
      recarregar();
    } catch (e) {
      toast(e.message, 'danger');
    }
  };

  if (!d.familia) {
    return (
      <div className="vera-page vera-stack vera-stack--20">
        {meusConvites.map(c => (
          <Callout
            key={c.familiaId}
            tone="accent"
            title={`Convite para ${c.nome}`}
            action={
              <Button size="sm" icon="check" onClick={() => aceitar(c.familiaId)}>
                Entrar no ciclo
              </Button>
            }
          >
            Ao aceitar, os seus lançamentos passam a cair no ciclo de {c.nome}.
          </Callout>
        ))}
        <Card wide padding="lg">
          <EmptyState
            icon="users"
            title="Um ciclo, duas pessoas lançando"
            action={
              d.limitePessoas > 1 ? (
                <Button icon="users" onClick={criar}>
                  Criar modo família
                </Button>
              ) : (
                <Button icon="sparkles" onClick={() => navigate('/app/configuracoes')}>
                  Conhecer o vera+
                </Button>
              )
            }
          >
            Cada lançamento mostra quem gastou, e as categorias combinadas ficam visíveis para todo
            mundo da casa.{' '}
            {d.limitePessoas > 1
              ? `O seu plano aceita até ${d.limitePessoas} pessoas.`
              : 'O modo família faz parte do vera+.'}
          </EmptyState>
        </Card>
      </div>
    );
  }

  const total = d.pessoas.length;
  const divisao = d.pessoas.map(p => p.divisao).join('/');

  return (
    <div className="vera-page vera-stack vera-stack--28">
      <Card wide padding="lg" gap={18}>
        <div className="fam-hero">
          <div className="fam-hero__text">
            <Badge tone="accent" caps size="lg">
              {d.plano === 'anual' ? 'vera+ anual' : 'vera+ mensal'}
            </Badge>
            <span className="fam-hero__title">
              {d.familia.nome} · {plural(total, 'pessoa', 'pessoas')}
            </span>
            <p className="fam-hero__lead">
              Um ciclo, {total === 2 ? 'duas pessoas' : `${total} pessoas`} lançando. Cada
              lançamento mostra quem gastou, e as categorias combinadas ficam visíveis para todos.
            </p>
          </div>
          {d.souDono ? (
            <Button
              icon="user-plus"
              onClick={() => setConvidar(true)}
              disabled={total + d.convites.length >= d.limitePessoas}
            >
              Convidar pessoa
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="vera-grid vera-grid--2">
        <div className="vera-stack vera-stack--12">
          <SectionHead label="Quem gastou" meta={`${mes(new Date().toISOString())} até hoje`} />
          <Card gap={18}>
            {d.pessoas.map(p => (
              <Meter
                key={p.uid}
                label={p.nome.split(' ')[0]}
                amount={mask(ocultar, brl(p.valor))}
                value={p.pct}
                footnote={`${p.pct}% do gasto do ciclo · combinado ${p.divisao}%`}
              />
            ))}
            <div className="vera-divider" />
            <span className="vera-t-note">
              A divisão combinada é {divisao}.
              {d.abaixoDaParte
                ? ` No ritmo atual, ${d.abaixoDaParte.nome.split(' ')[0]} fecha o ciclo ${brl(d.abaixoDaParte.folga)} abaixo da própria parte.`
                : ''}
            </span>
          </Card>
        </div>
        <div className="vera-stack vera-stack--12">
          <SectionHead
            label="Pessoas"
            meta={`${plural(total, 'pessoa', 'pessoas')} de ${d.limitePessoas}`}
          />
          <Card padding="none">
            {d.pessoas.map((p, i) => (
              <ListRow
                key={p.uid}
                icon="user"
                title={p.nome}
                meta={
                  p.papel === 'dono'
                    ? 'dono do ciclo'
                    : `lança e vê o combinado · entrou em ${mes(p.desde)}`
                }
                value={mask(ocultar, brl(p.valor))}
                last={i === total - 1 && !d.convites.length}
              />
            ))}
            {d.convites.map((c, i) => (
              <ListRow
                key={c.email}
                icon="mail"
                title="Convite pendente"
                meta={`${c.email} · enviado ${diasAtras(c.enviadoEm) === 0 ? 'hoje' : `há ${plural(diasAtras(c.enviadoEm), 'dia', 'dias')}`}`}
                last={i === d.convites.length - 1}
              />
            ))}
          </Card>
        </div>
      </div>

      <div className="vera-stack vera-stack--12">
        <SectionHead label="Categorias combinadas" meta="o que cada pessoa vê" />
        <Card gap={0}>
          {d.categorias.map((c, i) => (
            <div
              key={c.id}
              className={cx('fam-cat', i === d.categorias.length - 1 && 'fam-cat--last')}
            >
              <div className="vera-tile vera-tile--lg">
                <Icon name={c.icon} size={18} />
              </div>
              <div className="fam-cat__text">
                <span className="vera-t-name">{c.nome}</span>
                <span className="fam-cat__estado">
                  {c.compartilhada ? 'Compartilhada' : 'Só você vê'} · reservado {brl(c.limite)}
                </span>
              </div>
              <Switch
                checked={c.compartilhada}
                disabled={!d.souDono}
                onChange={() => alternar(c)}
                aria-label={`Compartilhar ${c.nome}`}
                className="fam-cat__switch"
              />
            </div>
          ))}
        </Card>
      </div>

      {convidar ? (
        <Convidar
          onClose={() => setConvidar(false)}
          onSaved={() => {
            setConvidar(false);
            recarregar();
          }}
        />
      ) : null}
    </div>
  );
}
