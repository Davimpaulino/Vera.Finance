import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Icon,
  Input,
  ListRow,
  Modal,
  MoneyInput,
  SegmentedControl,
  Select,
  Switch
} from '../../components/ds/index.js';
import { SectionHead } from '../../components/SectionHead.jsx';
import { useRouter } from '../../lib/router.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { api } from '../../services/api.js';
import { brlCents, diaDeMes, moneyField, parseMoney } from '../../lib/format.js';
import './css/configuracoes.css';

const DIAS = ['1', '5', '10', '15', '20', '25', '30'];
const RAIOS = [
  { value: '2', label: '2 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
  { value: '15', label: '15 km' }
];

function TrocarSenha({ onClose }) {
  const { user, trocarSenha, resetPassword, jeitoDeTrocarSenha, firebaseHabilitado } = useAuth();
  const { toast } = useUi();
  const jeito = jeitoDeTrocarSenha();
  const [f, setF] = useState({ atual: '', nova: '', repetir: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async e => {
    e?.preventDefault();
    setErro('');
    if (f.nova !== f.repetir) {
      setErro('A nova senha e a repetição não são iguais.');
      return;
    }
    setSalvando(true);
    try {
      await trocarSenha(f.atual, f.nova);
      toast('Senha trocada.');
      onClose();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };
  const enviarLink = async () => {
    try {
      await resetPassword(user.email);
      toast(`Enviamos o link para ${user.email}.`);
      onClose();
    } catch (err) {
      setErro(err.message);
    }
  };

  if (jeito === 'provedor')
    return (
      <Modal
        title="Trocar senha"
        size="sm"
        onClose={onClose}
        footer={[
          <Button key="c" onClick={onClose}>
            Entendi
          </Button>
        ]}
      >
        <span className="vera-modal__text">
          Você entra com o Google ou a Apple, então a vera não guarda uma senha para esta conta. A
          senha é a da sua conta Google ou Apple.
        </span>
      </Modal>
    );

  return (
    <Modal
      title="Trocar senha"
      subtitle={user.email}
      size="sm"
      onClose={onClose}
      footer={[
        <Button key="s" onClick={salvar} loading={salvando} loadingLabel="Trocando">
          Trocar senha
        </Button>,
        <Button key="c" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      ]}
    >
      <form onSubmit={salvar} className="vera-form">
        <Input
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          value={f.atual}
          onChange={e => setF({ ...f, atual: e.target.value })}
          autoFocus
        />
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          hint="pelo menos 8 caracteres"
          value={f.nova}
          onChange={e => setF({ ...f, nova: e.target.value })}
        />
        <Input
          label="Repita a nova senha"
          type="password"
          autoComplete="new-password"
          value={f.repetir}
          onChange={e => setF({ ...f, repetir: e.target.value })}
        />
        {erro ? (
          <div className="vera-form-error" role="alert">
            {erro}
          </div>
        ) : null}
        <button type="submit" hidden />
      </form>
      {jeito === 'firebase' && firebaseHabilitado ? (
        <Button variant="ghost" icon="mail" onClick={enviarLink}>
          Esqueci a senha atual: mandar link por e-mail
        </Button>
      ) : null}
    </Modal>
  );
}

export default function Configuracoes() {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme, ocultar, setOcultar, toast } = useUi();
  const { navigate } = useRouter();
  const [nome, setNome] = useState(user.nome || '');
  const [renda, setRenda] = useState(moneyField(user.ciclo?.rendaFixa || 0));
  const [cep, setCep] = useState(user.local?.cep || '');
  const [confirmar, setConfirmar] = useState(null);

  useEffect(() => {
    setNome(user.nome || '');
  }, [user.nome]);

  const salvar = async (body, msg) => {
    try {
      const u = await api.patch('/me', body);
      setUser(u);
      if (msg) toast(msg);
    } catch (e) {
      toast(e.message, 'danger');
    }
  };
  const pref = (k, v) => salvar({ prefs: { [k]: v } });
  const salvarCep = async () => {
    try {
      const u = await api.patch('/me', { local: { cep } });
      setUser(u);
      toast(
        u.local?.lat != null
          ? 'CEP atualizado. A comparação agora usa os mercados perto desse endereço.'
          : 'CEP salvo, mas não achamos a localização dele. Use "Usar minha localização" em Comparar mercados.'
      );
    } catch (e) {
      toast(e.message, 'danger');
    }
  };

  const fim = new Date(user.cicloAtual.fim);
  const assinatura = user.assinatura;
  const pago = user.plano !== 'gratis';

  const trocarPlano = async plano => {
    try {
      setUser(await api.patch('/me/plano', { plano }));
      toast(plano === 'anual' ? 'Agora você está no vera+ anual.' : 'Plano atualizado.');
    } catch (e) {
      toast(e.message, 'danger');
    }
  };
  const cancelar = async () => {
    try {
      setUser(await api.post('/me/cancelar-assinatura', {}));
      setConfirmar(null);
      toast('Assinatura cancelada.');
    } catch (e) {
      toast(e.message, 'danger');
    }
  };
  const apagar = async () => {
    try {
      const r = await api.del('/me');
      setConfirmar(null);
      toast(`A conta será apagada em ${diaDeMes(r.exclusaoAgendadaPara)}.`);
      await logout();
      navigate('/');
    } catch (e) {
      toast(e.message, 'danger');
    }
  };
  const exportar = async () => {
    try {
      await api.download('/lancamentos/export', 'vera-lancamentos.csv');
    } catch (e) {
      toast(e.message, 'danger');
    }
  };
  const sair = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="vera-page vera-stack vera-stack--28 config">
      <div className="vera-stack vera-stack--12">
        <SectionHead label="Conta" />
        <Card gap={18}>
          <div className="vera-grid vera-grid--2">
            <Input
              label="Nome"
              value={nome}
              onChange={e => setNome(e.target.value)}
              onBlur={() =>
                nome.trim() && nome !== user.nome && salvar({ nome }, 'Nome atualizado.')
              }
            />
            <Input
              label="E-mail"
              type="email"
              value={user.email}
              disabled
              hint="o e-mail é o do login"
            />
          </div>
          <Button variant="secondary" size="sm" className="config-senha" onClick={() => setConfirmar('senha')}>
            Trocar senha
          </Button>
        </Card>
      </div>

      <div className="vera-stack vera-stack--12">
        <SectionHead label="Ciclo" meta="o mês da vera pode virar no dia do salário" />
        <Card gap={18}>
          <div className="vera-grid vera-grid--2">
            <Select
              label="Dia de virada"
              options={
                DIAS.includes(String(user.ciclo.diaVirada))
                  ? DIAS
                  : [...DIAS, String(user.ciclo.diaVirada)]
              }
              value={String(user.ciclo.diaVirada)}
              hint={`o ciclo atual vai de ${diaDeMes(user.cicloAtual.inicio)} a ${diaDeMes(fim.toISOString())}`}
              onChange={e =>
                salvar(
                  { ciclo: { diaVirada: Number(e.target.value) } },
                  'Dia de virada atualizado.'
                )
              }
            />
            <MoneyInput
              label="renda fixa"
              size="sm"
              value={renda}
              onChange={e => setRenda(e.target.value)}
              onBlur={() =>
                parseMoney(renda) !== user.ciclo.rendaFixa &&
                salvar({ ciclo: { rendaFixa: parseMoney(renda) } }, 'Renda atualizada.')
              }
            />
          </div>
          <Switch
            checked={user.prefs.zerarNaVirada}
            onChange={() => pref('zerarNaVirada', !user.prefs.zerarNaVirada)}
            description="No fim do ciclo, o que sobrar em cada categoria volta para o saldo livre em vez de acumular."
          >
            Zerar categorias na virada
          </Switch>
          <Switch
            checked={user.prefs.resumoAntesDeFechar}
            onChange={() => pref('resumoAntesDeFechar', !user.prefs.resumoAntesDeFechar)}
            description="A vera avisa três dias antes da virada com o resumo do ciclo."
          >
            Resumo antes de fechar o ciclo
          </Switch>
        </Card>
      </div>

      <div className="vera-stack vera-stack--12">
        <SectionHead label="Mercado e localização" />
        <Card gap={18}>
          <div className="vera-grid vera-grid--2">
            <Input
              label="CEP"
              numeric
              inputMode="numeric"
              value={cep}
              onChange={e =>
                setCep(
                  e.target.value
                    .replace(/\D/g, '')
                    .slice(0, 8)
                    .replace(/^(\d{5})(\d)/, '$1-$2')
                )
              }
              onBlur={() => cep !== user.local.cep && salvarCep()}
            />
            <Select
              label="Raio de busca"
              options={RAIOS}
              value={String(user.local.raioKm)}
              onChange={e =>
                salvar({ local: { raioKm: Number(e.target.value) } }, 'Raio atualizado.')
              }
            />
          </div>
          <Switch
            checked={user.prefs.contribuirPrecos}
            onChange={() => pref('contribuirPrecos', !user.prefs.contribuirPrecos)}
            description="Suas notas entram na base de preços sem nome e sem CPF. É o que mantém a comparação viva."
          >
            Contribuir com preços anônimos
          </Switch>
          <Switch
            checked={user.prefs.alertaAltaPreco}
            onChange={() => pref('alertaAltaPreco', !user.prefs.alertaAltaPreco)}
            description="A vera avisa quando um item que você compra sempre sobe mais de 5% no seu mercado."
          >
            Alerta de alta de preço
          </Switch>
          <span className="vera-t-caption">
            Preços de notas fiscais reais. A vera não vende produtos.
          </span>
        </Card>
      </div>

      <div className="vera-stack vera-stack--12">
        <SectionHead label="Plano" />
        <Card gap={18}>
          <div className="vera-stack vera-stack--4">
            <span className="vera-t-title">{user.planoInfo.nome}</span>
            <span className="vera-t-meta">
              {!pago
                ? '5 notas por mês e até 3 metas'
                : assinatura?.cancelada
                  ? `cancelado · o vera+ continua até ${diaDeMes(assinatura.ativaAte)}`
                  : `${brlCents(user.planoInfo.preco)} por ${user.plano === 'anual' ? 'ano' : 'mês'} · próxima cobrança em ${diaDeMes(assinatura.proximaCobranca)}`}
            </span>
          </div>
          <div className="vera-stack vera-stack--10">
            {user.plano !== 'anual' ? (
              <Button block icon="arrow-up-right" onClick={() => trocarPlano('anual')}>
                Trocar para anual · R$ 99,90
              </Button>
            ) : null}
            {user.plano === 'gratis' ? (
              <Button block variant="secondary" onClick={() => trocarPlano('mensal')}>
                Assinar mensal · R$ 12,90
              </Button>
            ) : null}
            {pago && !assinatura?.cancelada ? (
              <Button block variant="secondary" onClick={() => setConfirmar('cancelar')}>
                Cancelar assinatura
              </Button>
            ) : null}
            {pago && assinatura?.cancelada ? (
              <Button block variant="secondary" onClick={() => trocarPlano(user.plano)}>
                Reativar assinatura
              </Button>
            ) : null}
          </div>
          {pago && !assinatura?.cancelada ? (
            <span className="vera-t-caption">
              Cancelando hoje, o vera+ continua até {diaDeMes(assinatura.proximaCobranca)} e depois
              a conta volta para o grátis.
            </span>
          ) : null}
        </Card>
      </div>

      <div className="vera-stack vera-stack--12">
        <SectionHead label="Aparência" />
        <Card gap={18}>
          <div className="vera-stack vera-stack--10">
            <span className="vera-t-label">Superfície</span>
            <SegmentedControl
              options={[
                { value: 'tinta', label: 'Tinta' },
                { value: 'papel', label: 'Papel' }
              ]}
              value={theme}
              onChange={t => {
                setTheme(t);
                pref('tema', t);
              }}
              className="config-superficie"
            />
          </div>
          <Switch
            checked={ocultar}
            onChange={() => setOcultar(!ocultar)}
            description="Os valores viram pontos até você desligar. Útil quando alguém olha a tela junto."
          >
            Esconder valores
          </Switch>
        </Card>
      </div>

      <div className="vera-stack vera-stack--12">
        <SectionHead label="Dados" />
        <Card padding="none">
          <ListRow
            icon="download"
            title="Exportar lançamentos em planilha"
            meta="todos os lançamentos em CSV"
            onClick={exportar}
          />
          <ListRow
            icon="receipt-text"
            title="Notas fiscais lidas"
            meta="confirme as pendentes no painel"
            onClick={() => navigate('/app')}
          />
          <ListRow
            icon="trash-2"
            title="Apagar a conta"
            meta="apaga tudo em 30 dias, sem volta"
            last
            onClick={() => setConfirmar('apagar')}
          />
        </Card>
        <button type="button" className="config-sair" onClick={sair}>
          <Icon name="log-out" size={18} />
          Sair da conta
        </button>
      </div>

      {confirmar === 'senha' ? <TrocarSenha onClose={() => setConfirmar(null)} /> : null}
      {confirmar === 'cancelar' ? (
        <Modal
          title="Cancelar o vera+?"
          subtitle={`o acesso continua até ${diaDeMes(assinatura.proximaCobranca)}`}
          size="sm"
          onClose={() => setConfirmar(null)}
          footer={[
            <Button key="s" variant="danger" onClick={cancelar}>
              Cancelar assinatura
            </Button>,
            <Button key="c" variant="ghost" onClick={() => setConfirmar(null)}>
              Manter
            </Button>
          ]}
        >
          <span className="vera-modal__text">
            Depois disso a conta volta para o grátis: 5 notas por mês, até 3 metas e sem modo
            família. Nada é apagado.
          </span>
        </Modal>
      ) : null}
      {confirmar === 'apagar' ? (
        <Modal
          title="Apagar a conta?"
          subtitle="tudo some em 30 dias"
          size="sm"
          onClose={() => setConfirmar(null)}
          footer={[
            <Button key="s" variant="danger" icon="trash-2" onClick={apagar}>
              Apagar a conta
            </Button>,
            <Button key="c" variant="ghost" onClick={() => setConfirmar(null)}>
              Voltar
            </Button>
          ]}
        >
          <span className="vera-modal__text">
            Lançamentos, metas, lista e notas são apagados em 30 dias. Exporte a planilha antes se
            quiser guardar o histórico.
          </span>
        </Modal>
      ) : null}
    </div>
  );
}
