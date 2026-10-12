import { useEffect, useState } from 'react';
import {
  Button,
  Callout,
  Card,
  Chip,
  Icon,
  IconButton,
  Input,
  ListRow,
  Meter,
  MoneyInput,
  SegmentedControl,
  Select
} from '../../components/ds/index.js';
import { Brand } from '../../components/Brand.jsx';
import { useRouter } from '../../lib/router.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { api } from '../../services/api.js';
import { brl, brlCents, moneyField, parseMoney } from '../../lib/format.js';
import { FormError } from './AuthShared.jsx';
import { cx } from '../../lib/cx.js';
import './css/onboarding.css';

const DIAS = ['1', '5', '10', '15', '20', '25', '30'];
const FREQS = ['Uma vez por mês', 'Quinzenal', 'Semanal'];
const RAIOS = ['2 km', '5 km', '10 km', '15 km'];
const ATALHOS_FIXOS = [
  ['Aluguel', 'Casa', 'house'],
  ['Condomínio', 'Casa', 'house'],
  ['Luz e água', 'Casa', 'zap'],
  ['Internet', 'Casa', 'wifi'],
  ['Assinaturas', 'Assinaturas', 'repeat'],
  ['Curso', 'Educação', 'graduation-cap']
];
const CATS_FIXO = ['Casa', 'Assinaturas', 'Educação', 'Transporte', 'Saúde'];

function Passo({ t, s, children }) {
  return (
    <div className="vera-page onb__passo">
      <div className="onb__intro">
        <h1 className="onb__title">{t}</h1>
        <p className="onb__sub">{s}</p>
      </div>
      {children}
    </div>
  );
}

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const { toast } = useUi();
  const { navigate } = useRouter();
  const [step, setStep] = useState(0);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [renda, setRenda] = useState({
    rendaFixa: '',
    diaVirada: '5',
    frequencia: FREQS[0],
    rendaVariavel: ''
  });
  const [fixos, setFixos] = useState([]);
  const [novoFixo, setNovoFixo] = useState(null);
  const [categorias, setCategorias] = useState(null);
  const [cep, setCep] = useState('');
  const [cidade, setCidade] = useState('');
  const [raio, setRaio] = useState('5 km');
  const [raioInfo, setRaioInfo] = useState(null);
  const [mercados, setMercados] = useState([]);
  const [selMercados, setSelMercados] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [plano, setPlano] = useState('gratis');

  const rendaTotal = parseMoney(renda.rendaFixa) + parseMoney(renda.rendaVariavel);
  const totalFixo = fixos.reduce((t, f) => t + parseMoney(f.valor), 0);

  useEffect(() => {
    api
      .get('/planos')
      .then(setPlanos)
      .catch(() => {});
  }, []);

  // Com o CEP completo, os mercados vêm do mapa da região; sem ele, a lista fica vazia.
  const cepCompleto = cep.replace(/\D/g, '').length === 8 ? cep.replace(/\D/g, '') : '';
  useEffect(() => {
    const km = parseInt(raio, 10);
    const filtro = cepCompleto ? `&cep=${cepCompleto}` : '';
    const espera = setTimeout(() => {
      api
        .get(`/mercados?raio=${km}${filtro}`)
        .then(setMercados)
        .catch(() => {});
      api
        .get(`/onboarding/raio?km=${km}${filtro}`)
        .then(setRaioInfo)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(espera);
  }, [raio, cepCompleto]);

  // Ao chegar no passo 3, pede a divisão sugerida para o que sobra depois dos fixos.
  useEffect(() => {
    if (step !== 2 || categorias) return;
    api
      .post('/onboarding/sugestao', {
        rendaFixa: parseMoney(renda.rendaFixa),
        rendaVariavel: parseMoney(renda.rendaVariavel),
        fixos: fixos.map(f => ({ valor: parseMoney(f.valor) }))
      })
      .then(r => setCategorias(r.categorias.map(c => ({ ...c, valor: moneyField(c.limite) }))))
      .catch(e => setErro(e.message));
  }, [step, categorias, renda, fixos]);

  const disponivel = rendaTotal - totalFixo;
  const reservado = (categorias || []).reduce((t, c) => t + parseMoney(c.valor), 0);

  const validar = () => {
    if (step === 0 && parseMoney(renda.rendaFixa) <= 0)
      return 'Informe a renda fixa do mês para a vera montar o ciclo.';
    if (step === 2 && reservado > disponivel)
      return `A divisão passa ${brl(reservado - disponivel)} do que sobra depois dos fixos. Ajuste os valores.`;
    return '';
  };

  const concluir = async () => {
    setSalvando(true);
    try {
      await api.post('/onboarding', {
        renda: {
          rendaFixa: parseMoney(renda.rendaFixa),
          rendaVariavel: parseMoney(renda.rendaVariavel),
          diaVirada: Number(renda.diaVirada),
          frequencia: renda.frequencia
        },
        fixos: fixos.map(f => ({
          nome: f.nome,
          categoria: f.categoria,
          icon: f.icon,
          dia: Number(f.dia) || 1,
          valor: parseMoney(f.valor)
        })),
        categorias: (categorias || []).map(c => ({
          nome: c.nome,
          icon: c.icon,
          limite: parseMoney(c.valor),
          reserva: !!c.reserva
        })),
        local: { cep, cidade, raioKm: parseInt(raio, 10), mercados: selMercados },
        plano
      });
      await refresh();
      toast('Pronto: o seu ciclo já está reservado.');
      navigate('/app');
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const next = () => {
    const msg = validar();
    setErro(msg);
    if (msg) return;
    window.scrollTo(0, 0);
    if (step === 4) concluir();
    else setStep(step + 1);
  };
  const prev = () => {
    setErro('');
    window.scrollTo(0, 0);
    if (step === 0) navigate('/');
    else setStep(step - 1);
  };

  const salvarFixo = e => {
    e.preventDefault();
    if (!novoFixo.nome.trim() || parseMoney(novoFixo.valor) <= 0) return;
    setFixos(f => [...f, { ...novoFixo, id: Date.now() }]);
    setNovoFixo(null);
    setCategorias(null);
  };

  const planoSel = planos.find(p => p.id === plano);
  const resumoPlano = {
    gratis: [
      'Você começa no grátis',
      'Dá para rodar o ciclo inteiro. Quando as 5 notas do mês acabarem, a vera avisa e você decide.'
    ],
    mensal: [
      'vera+ mensal, R$ 12,90',
      'A primeira cobrança é daqui a um mês. Cancele em Configurações › Plano, sem multa.'
    ],
    anual: ['vera+ anual, R$ 99,90', 'Equivale a R$ 8,33 por mês. Cobrança uma vez por ano.']
  }[plano];

  return (
    <section className="onb">
      <header className="onb__top">
        <Brand size="md" />
        <span className="onb__step">passo {step + 1} de 5</span>
      </header>
      <div className="onb__wrap">
        <Meter value={(step + 1) * 20} size="lg" tone="accent" />

        {step === 0 ? (
          <Passo
            t={`Quanto entra, e quando${user?.nome ? `, ${user.nome.split(' ')[0]}` : ''}?`}
            s="A vera usa a data da entrada para virar o seu ciclo. Se o salário cai dia 5, o mês da vera começa dia 5."
          >
            <Card wide gap={18}>
              <MoneyInput
                label="renda fixa do mês"
                hint="salário líquido, o que cai na conta"
                value={renda.rendaFixa}
                onChange={e => setRenda({ ...renda, rendaFixa: e.target.value })}
                autoFocus
              />
              <div className="vera-grid vera-grid--2">
                <Select
                  label="Dia da entrada"
                  options={DIAS}
                  value={renda.diaVirada}
                  onChange={e => setRenda({ ...renda, diaVirada: e.target.value })}
                />
                <Select
                  label="Frequência"
                  options={FREQS}
                  value={renda.frequencia}
                  onChange={e => setRenda({ ...renda, frequencia: e.target.value })}
                />
              </div>
              <MoneyInput
                label="renda variável média"
                size="sm"
                hint="freelas, comissão, aluguel recebido"
                value={renda.rendaVariavel}
                onChange={e => setRenda({ ...renda, rendaVariavel: e.target.value })}
              />
            </Card>
          </Passo>
        ) : null}

        {step === 1 ? (
          <Passo
            t="O que já sai sozinho?"
            s="Gasto fixo sai da projeção antes de tudo. O que ficar depois dele é o que a vera divide em categorias."
          >
            {fixos.length ? (
              <Card padding="none">
                {fixos.map((f, i) => (
                  <ListRow
                    key={f.id}
                    icon={f.icon}
                    title={f.nome}
                    meta={`${f.categoria} · sai dia ${f.dia}`}
                    value={brl(parseMoney(f.valor))}
                    last={i === fixos.length - 1}
                    badge={
                      <IconButton
                        icon="trash-2"
                        label={`Remover ${f.nome}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFixos(x => x.filter(y => y.id !== f.id));
                          setCategorias(null);
                        }}
                      />
                    }
                  />
                ))}
              </Card>
            ) : null}
            {novoFixo ? (
              <Card wide gap={14}>
                <form onSubmit={salvarFixo} className="onb__fixo-form">
                  <div className="vera-grid vera-grid--2">
                    <Input
                      label="Nome"
                      value={novoFixo.nome}
                      onChange={e => setNovoFixo({ ...novoFixo, nome: e.target.value })}
                      autoFocus
                      required
                    />
                    <Select
                      label="Categoria"
                      options={CATS_FIXO}
                      value={novoFixo.categoria}
                      onChange={e => setNovoFixo({ ...novoFixo, categoria: e.target.value })}
                    />
                  </div>
                  <div className="vera-grid vera-grid--2">
                    <MoneyInput
                      label="valor"
                      size="sm"
                      value={novoFixo.valor}
                      onChange={e => setNovoFixo({ ...novoFixo, valor: e.target.value })}
                    />
                    <Select
                      label="Sai no dia"
                      options={Array.from({ length: 31 }, (_, i) => String(i + 1))}
                      value={String(novoFixo.dia)}
                      onChange={e => setNovoFixo({ ...novoFixo, dia: e.target.value })}
                    />
                  </div>
                  <div className="vera-wrap">
                    <Button type="submit" size="sm" icon="check">
                      Adicionar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setNovoFixo(null)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <div className="vera-wrap">
                {ATALHOS_FIXOS.filter(([n]) => !fixos.some(f => f.nome === n)).map(
                  ([nome, categoria, icon]) => (
                    <Chip
                      key={nome}
                      icon={icon}
                      onClick={() => setNovoFixo({ nome, categoria, icon, valor: '', dia: '10' })}
                    >
                      {nome}
                    </Chip>
                  )
                )}
              </div>
            )}
            <div className="vera-split vera-split--wrap">
              <Button
                variant="secondary"
                size="sm"
                icon="plus"
                onClick={() =>
                  setNovoFixo({ nome: '', categoria: 'Casa', icon: 'repeat', valor: '', dia: '10' })
                }
              >
                Adicionar gasto fixo
              </Button>
              <span className="onb__total">
                Total fixo: <strong>{brl(totalFixo)}</strong> · sobram {brl(disponivel)}
              </span>
            </div>
          </Passo>
        ) : null}

        {step === 2 ? (
          <Passo
            t="A vera sugere esta divisão"
            s="Ajuste o que não fecha. Os limites podem ser revistos em qualquer dia do ciclo."
          >
            <Card wide gap={18}>
              {(categorias || []).map((c, i) => (
                <div key={c.nome} className="vera-row-form">
                  <div className="vera-tile">
                    <Icon name={c.icon} size={16} />
                  </div>
                  <span className="onb__cat-name">{c.nome}</span>
                  <MoneyInput
                    size="sm"
                    aria-label={`Limite de ${c.nome}`}
                    value={c.valor}
                    onChange={e =>
                      setCategorias(cs =>
                        cs.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x))
                      )
                    }
                    className="onb__cat-money"
                  />
                </div>
              ))}
              <div className="vera-divider" />
              <div className="vera-split vera-split--wrap">
                <span className="vera-t-body2">Reservado de {brl(disponivel)}</span>
                <span className={cx('onb__soma', reservado > disponivel && 'onb__soma--over')}>
                  {brl(reservado)} · sobram {brl(disponivel - reservado)}
                </span>
              </div>
            </Card>
          </Passo>
        ) : null}

        {step === 3 ? (
          <Passo
            t="Onde você faz mercado?"
            s="Com o CEP, a vera acha os mercados de verdade perto de você e compara os preços dos sites das redes e das notas fiscais lidas. Quanto maior o raio, mais mercados entram."
          >
            <Card wide gap={18}>
              <div className="vera-grid vera-grid--2">
                <Input
                  label="CEP"
                  numeric
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={cep}
                  onChange={e =>
                    setCep(
                      e.target.value
                        .replace(/\D/g, '')
                        .slice(0, 8)
                        .replace(/^(\d{5})(\d)/, '$1-$2')
                    )
                  }
                />
                <Input
                  label="Cidade"
                  placeholder="Indaiatuba, SP"
                  value={cidade}
                  onChange={e => setCidade(e.target.value)}
                />
              </div>
              <div className="vera-stack vera-stack--10">
                <span className="vera-t-label">Raio de busca</span>
                <SegmentedControl options={RAIOS} value={raio} onChange={setRaio} />
                <span className="vera-t-meta">
                  {raioInfo
                    ? `${raioInfo.mercados} ${raioInfo.mercados === 1 ? 'mercado' : 'mercados'} no raio${raioInfo.atacados ? `, incluindo ${raioInfo.atacados} ${raioInfo.atacados === 1 ? 'atacado' : 'atacados'}` : ''}${raioInfo.comPrecoOnline ? `. ${raioInfo.comPrecoOnline} com preço no site da rede` : ''}.`
                    : ' '}
                </span>
              </div>
              <div className="vera-divider" />
              <div className="vera-stack vera-stack--12">
                <span className="vera-t-label">Mercados que você costuma usar</span>
                <div className="vera-wrap">
                  {mercados.map(m => {
                    const on = selMercados.includes(m.id);
                    return (
                      <Chip
                        key={m.id}
                        icon={m.tipo === 'atacado' ? 'warehouse' : 'store'}
                        selected={on}
                        onClick={() =>
                          setSelMercados(sel => (on ? sel.filter(x => x !== m.id) : [...sel, m.id]))
                        }
                      >
                        {m.nome}
                      </Chip>
                    );
                  })}
                </div>
                <span className="vera-t-caption">
                  O primeiro que você marcar vira o seu mercado de sempre. Os preços vêm dos sites
                  das redes e das notas fiscais lidas. A vera não vende produtos.
                </span>
              </div>
            </Card>
          </Passo>
        ) : null}

        {step === 4 ? (
          <Passo
            t="Escolha o plano"
            s="Com o que você respondeu, a leitura de nota vira o centro do seu ciclo — são 14 notas por mês na média de quem faz mercado semanal."
          >
            <div role="radiogroup" className="vera-stack vera-stack--12">
              {planos.map(p => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={plano === p.id ? 'true' : 'false'}
                  className="onb-pick"
                  onClick={() => setPlano(p.id)}
                >
                  <span className="onb__radio" />
                  <span className="onb__plano-text">
                    <span className="vera-t-title">{p.nome}</span>
                    <span className="vera-t-meta">{p.resumo}</span>
                  </span>
                  <span className="onb__plano-price">{p.preco ? brlCents(p.preco) : 'R$ 0'}</span>
                </button>
              ))}
            </div>
            {planoSel ? (
              <Callout tone="info" title={resumoPlano[0]}>
                {resumoPlano[1]}
              </Callout>
            ) : null}
          </Passo>
        ) : null}

        <FormError>{erro}</FormError>
        <div className="onb__nav">
          <Button
            onClick={next}
            iconRight="arrow-right"
            loading={salvando}
            loadingLabel="Abrindo o painel"
          >
            {step === 4 ? 'Abrir meu painel' : 'Continuar'}
          </Button>
          <Button variant="ghost" onClick={prev}>
            {step === 0 ? 'Voltar ao início' : 'Voltar'}
          </Button>
        </div>
      </div>
    </section>
  );
}
