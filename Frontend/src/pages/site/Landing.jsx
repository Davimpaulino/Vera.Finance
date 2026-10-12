import { Button, Icon } from '../../components/ds/index.js';
import { SiteLayout } from '../../components/site/SiteLayout.jsx';
import { SiteFooter } from '../../components/site/SiteFooter.jsx';
import { PhonePainel, PhoneComparar, PhonesLista } from '../../components/site/Phones.jsx';
import { useVerPainel } from '../../components/site/useVerPainel.js';
import { Link, useRouter } from '../../lib/router.jsx';
import { useBreakpoint } from '../../hooks/useBreakpoint.js';
import { cx } from '../../lib/cx.js';
import './css/landing.css';

const HERO_AVATARS = ['MS', 'JP', 'LF', 'RC', 'AT'];
const FEATURES = [
  [
    'scan-line',
    'Leitura da NF-e',
    'Aponte para o QR Code do cupom: item por item na categoria certa, com aviso do que você pagou caro.'
  ],
  [
    'arrow-left-right',
    'Comparação por bairro',
    'O mesmo produto em até sete mercados do seu raio, com a data da nota que gerou cada preço.'
  ],
  [
    'trending-up',
    'Projeção do ciclo',
    'Uma linha que atravessa o dia de hoje e diz com quanto você fecha o mês, antes do estouro.'
  ]
];
const MARCAS = ['Nagumo', 'Covabra', 'Atacadão', 'Dia', 'Assaí', 'Pão de Açúcar'];
const NUMEROS = [
  ['R$ 214', 'economizados por pessoa em 2026'],
  ['128.400', 'notas fiscais lidas este mês'],
  ['7 mercados', 'no raio de 5 km da casa média']
];
const PONTOS = [
  'Raio de busca a partir do seu CEP, de 2 a 15 km',
  'Histórico de 90 dias por produto e por mercado',
  'Aviso quando o preço do seu item sobe no mercado de sempre'
];
const PROTECOES = [
  [
    'shield',
    'Sem acesso ao banco',
    'A vera nunca pede a senha da sua conta. Você lança, ou deixa a nota fiscal lançar por você.'
  ],
  [
    'eye-off',
    'Nota sem identidade',
    'O preço entra na base sem nome e sem CPF. É o que mantém a comparação viva para todo mundo.'
  ],
  [
    'file-down',
    'Saída a qualquer hora',
    'Lançamentos, notas e metas saem em planilha. Apagar a conta apaga tudo em 30 dias.'
  ]
];
const DEPOIMENTOS = [
  [
    'Descobri que pagava R$ 6 mais caro no arroz sem sair do bairro. Em dois meses a troca de mercado pagou a assinatura do ano.',
    'Marina Serra',
    'Indaiatuba, SP · desde maio',
    'MS'
  ],
  [
    'O que me pegou foi a data. Saber que a Comida dura até dia 29 é diferente de ver um gráfico do mês passado.',
    'João Prado',
    'Campinas, SP · desde março',
    'JP'
  ],
  [
    'Uso no modo família com minha irmã. Cada lançamento mostra quem gastou e paramos de discutir no fim do mês.',
    'Letícia Farias',
    'Sorocaba, SP · desde junho',
    'LF'
  ]
];

function Check({ muted, children }) {
  return (
    <span className={cx('landing-check', muted && 'landing-check--muted')}>
      <Icon name={muted ? 'minus' : 'check'} size={15} />
      {children}
    </span>
  );
}

export default function Landing() {
  const { navigate } = useRouter();
  const verPainel = useVerPainel();
  const mobile = useBreakpoint() === 'mobile';
  const cadastro = () => navigate('/cadastro');

  return (
    <SiteLayout>
      <div className="landing">
        <section className="landing-hero">
          <div className="landing-hero__glow" />
          <div className="landing-hero__inner">
            <div className="landing-hero__copy">
              <span className="landing-eyebrow landing-eyebrow--accent">
                seu dinheiro com data marcada
              </span>
              <h1 className="landing-hero__title">
                <span className="landing-c-muted">O melhor jeito de saber</span>
                <br />
                <span className="landing-c-accent">quanto ainda dá</span>
                <br />
                <span className="landing-c-1">para gastar.</span>
              </h1>
              <div className="landing-proof">
                <div className="landing-avatars">
                  {HERO_AVATARS.map((ini, i) => (
                    <span key={ini} className={`landing-avatar landing-avatar--${i + 1}`}>
                      {ini}
                    </span>
                  ))}
                </div>
                <div className="landing-proof__num">
                  <span className="landing-proof__value">128 mil +</span>
                  <span className="landing-proof__label">notas fiscais lidas este mês</span>
                </div>
              </div>
              <div className="landing-hero__lead">
                <Link to="/cadastro" aria-label="Criar conta grátis" className="landing-go">
                  <Icon name="arrow-up-right" size={26} strokeWidth={2.4} />
                </Link>
                <p>
                  Você reserva a renda em categorias, lê a nota do mercado pelo QR Code e a vera diz
                  onde a sua lista sai mais barato hoje — e até que dia o dinheiro dura.
                </p>
              </div>
              <div className="vera-cta-stack">
                <Button size="lg" block={mobile} onClick={cadastro}>
                  Criar conta grátis
                </Button>
                <Button size="lg" block={mobile} variant="secondary" onClick={verPainel}>
                  Ver o painel
                </Button>
              </div>
            </div>

            <div className="landing-hero__art">
              <span aria-hidden="true" className="landing-hero__word">
                vera
              </span>
              <div className="landing-hero__ring" />
              <div className="landing-hero__phones">
                <PhonePainel />
                <PhoneComparar />
              </div>
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="landing-section landing-section--76 landing-section--bb"
        >
          <div className="landing-wrap landing-col landing-gap-44">
            <div className="landing-center landing-gap-12">
              <h2 className="landing-h2 landing-h2--42 landing-h2--tight">
                Preço lido de nota fiscal, não de vitrine
              </h2>
              <p className="landing-lead landing-max-560">
                Cada valor que a vera mostra saiu do cupom de alguém que comprou perto de você, nos
                últimos dias.
              </p>
            </div>
            <div className="vera-grid vera-grid--3 landing-feats">
              {FEATURES.map(([icon, titulo, texto]) => (
                <div key={titulo} className="landing-feat">
                  <div className="landing-feat__icon">
                    <Icon name={icon} size={22} />
                  </div>
                  <span className="landing-feat__title">{titulo}</span>
                  <p className="landing-text">{texto}</p>
                </div>
              ))}
            </div>
            <div className="landing-brands">
              <span className="landing-eyebrow landing-eyebrow--faint">
                notas lidas em mercados como
              </span>
              <div className="landing-pills">
                {MARCAS.map(m => (
                  <span key={m} className="landing-pill">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--sunken">
          <div className="landing-wrap landing-col landing-gap-40">
            <div className="vera-grid vera-grid--2 vera-grid--top">
              <h2 className="landing-h2">
                <span className="landing-c-1">O seu parceiro de </span>
                <span className="landing-c-accent">mercado</span>
                <span className="landing-c-muted"> e de fim de mês.</span>
              </h2>
              <p className="landing-lead">
                A vera não vende produto, não recebe de mercado e não pede a senha do seu banco. O
                que ela faz é juntar a sua renda, os seus gastos e o preço real do seu bairro no
                mesmo lugar.
              </p>
            </div>
            <div className="vera-grid vera-grid--3 vera-grid--stretch">
              <div className="landing-card landing-card--lift">
                <span className="landing-card__num">01.</span>
                <span className="landing-card__title">
                  Serve para quem
                  <br />
                  nunca controlou nada.
                </span>
                <p className="landing-text">
                  Cinco perguntas no cadastro e o mês já abre reservado. Sem planilha, sem categoria
                  vazia esperando você preencher.
                </p>
              </div>
              <div className="landing-card landing-card--accent">
                <span className="landing-card__num">02.</span>
                <span className="landing-card__title">
                  O aviso chega antes
                  <br />
                  do estouro.
                </span>
                <p className="landing-text">
                  A projeção atravessa o dia de hoje e diz com quanto você fecha. Quando uma
                  categoria vai apertar, a vera avisa com dias de sobra.
                </p>
                <Link to="/cadastro" className="landing-accent-link">
                  Ver como funciona
                  <Icon name="arrow-right" size={16} />
                </Link>
              </div>
              <div className="landing-card landing-card--lift">
                <span className="landing-card__num">03.</span>
                <span className="landing-card__title">
                  Seus dados saem
                  <br />
                  quando você quiser.
                </span>
                <p className="landing-text">
                  Sua nota entra na base de preços sem nome e sem CPF. O histórico inteiro sai em
                  planilha com um toque.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--bt landing-section--bb">
          <div className="landing-wrap landing-split">
            <div className="landing-split__copy">
              <h2 className="landing-h2">“Dá para gastar sem susto”</h2>
              <p className="landing-lead landing-max-480">
                É o que a vera devolve todo dia: um número com data. Ela lê a nota, separa item por
                item na categoria certa e compara com o que o seu bairro pagou na semana.
              </p>
              <Button variant="secondary" size="lg" onClick={() => navigate('/precos')}>
                Ver planos
              </Button>
            </div>
            <div className="landing-stats">
              <div className="landing-stats__ring" />
              {NUMEROS.map(([n, t], i) => (
                <div key={n} className={`landing-tilt landing-tilt--${i + 1}`}>
                  <span className="landing-tilt__value">{n}</span>
                  <span className="landing-tilt__label">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--sunken">
          <div className="landing-wrap landing-wrap--narrow landing-col landing-gap-40">
            <div className="landing-center landing-gap-10">
              <span className="landing-eyebrow landing-eyebrow--accent">planos</span>
              <h2 className="landing-h2 landing-h2--42 landing-h2--tight">Comece de graça</h2>
              <p className="landing-lead landing-max-520">
                Categorias, projeção e metas não custam nada. O vera+ é para quem vive de nota
                fiscal e quer o histórico de preço.
              </p>
            </div>
            <div className="vera-grid vera-grid--3 vera-grid--stretch">
              <div className="landing-card landing-card--18 landing-card--lift">
                <span className="landing-eyebrow landing-eyebrow--muted">para sempre</span>
                <span className="landing-plan__price">R$ 0</span>
                <span className="landing-plan__note">sem cartão</span>
                <div className="landing-plan__rule" />
                <div className="landing-checks">
                  <Check>Categorias e projeção do ciclo</Check>
                  <Check>Lista de compras com total</Check>
                  <Check>Até 3 metas</Check>
                  <Check muted>5 notas lidas por mês</Check>
                </div>
                <Button block variant="secondary" onClick={cadastro} className="landing-plan__cta">
                  Criar conta grátis
                </Button>
              </div>
              <div className="landing-card landing-card--18 landing-card--accent landing-card--shadow">
                <span className="landing-eyebrow">recomendado · por mês</span>
                <span className="landing-plan__price">R$ 12,90</span>
                <span className="landing-plan__note">cancele quando quiser</span>
                <div className="landing-plan__rule" />
                <div className="landing-checks">
                  {[
                    'Notas fiscais ilimitadas',
                    'Histórico e comparação de preços',
                    'Metas ilimitadas com simulador',
                    'Modo família com 2 pessoas'
                  ].map(t => (
                    <Check key={t}>{t}</Check>
                  ))}
                </div>
                <button type="button" className="landing-plan__onaccent" onClick={cadastro}>
                  Assinar mensal
                </button>
              </div>
              <div className="landing-card landing-card--18 landing-card--lift">
                <span className="landing-eyebrow landing-eyebrow--muted">por ano</span>
                <span className="landing-plan__price">R$ 99,90</span>
                <span className="landing-plan__note">equivale a R$ 8,33/mês</span>
                <div className="landing-plan__rule" />
                <div className="landing-checks">
                  {[
                    'Tudo do vera+',
                    'Dois meses grátis',
                    'Exportar o ano em planilha',
                    'Modo família com 5 pessoas'
                  ].map(t => (
                    <Check key={t}>{t}</Check>
                  ))}
                </div>
                <Button block variant="secondary" onClick={cadastro} className="landing-plan__cta">
                  Assinar anual
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--bt">
          <div className="landing-wrap landing-split">
            <div className="landing-split__copy">
              <h2 className="landing-h2 landing-h2--42">
                <span className="landing-c-1">Monte a lista, veja </span>
                <span className="landing-c-accent">onde sai mais barato</span>
              </h2>
              <p className="landing-lead landing-max-460">
                A vera soma a sua lista em cada mercado do seu raio e mostra o total dos três mais
                baratos, com a distância de cada um. Depois diz o que a compra faz com a sua
                categoria de Comida.
              </p>
              <div className="landing-points">
                {PONTOS.map(p => (
                  <span key={p} className="landing-point">
                    <Icon name="check" size={15} strokeWidth={2.4} />
                    {p}
                  </span>
                ))}
              </div>
              <Button size="lg" onClick={verPainel}>
                Abrir a lista de compras
              </Button>
            </div>
            <PhonesLista />
          </div>
        </section>

        <section className="landing-section landing-section--sunken">
          <div className="landing-wrap landing-col landing-gap-36">
            <div className="landing-row-end">
              <div className="landing-col landing-gap-10 landing-max-560">
                <h2 className="landing-h2 landing-h2--40">Privacidade sem letra miúda</h2>
                <p className="landing-lead">
                  Você lança, a vera projeta. Nenhum acesso bancário, nenhum dado vendido.
                </p>
              </div>
              <Button
                variant="ghost"
                iconRight="arrow-right"
                onClick={() => navigate('/privacidade')}
              >
                Ler a política
              </Button>
            </div>
            <div className="vera-grid vera-grid--3">
              {PROTECOES.map(([icon, titulo, texto]) => (
                <div key={titulo} className="landing-card landing-card--12 landing-card--lift">
                  <Icon name={icon} size={26} className="landing-card__icon" />
                  <span className="landing-card__title">{titulo}</span>
                  <p className="landing-text">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--bt">
          <div className="landing-wrap landing-col landing-gap-36">
            <div className="landing-col landing-gap-10 landing-max-560">
              <h2 className="landing-h2 landing-h2--40">Quem usa, conta</h2>
              <p className="landing-lead">
                Três pessoas que fecharam o ciclo no azul depois de trocar de mercado.
              </p>
            </div>
            <div className="vera-grid vera-grid--3">
              {DEPOIMENTOS.map(([texto, nome, meta, ini]) => (
                <div key={nome} className="landing-card landing-card--16 landing-card--lift">
                  <span aria-label="5 estrelas" className="landing-stars">
                    ★★★★★
                  </span>
                  <p className="landing-quote">{texto}</p>
                  <div className="landing-person">
                    <span className="landing-person__ini">{ini}</span>
                    <span className="landing-col">
                      <span className="landing-person__name">{nome}</span>
                      <span className="landing-person__meta">{meta}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--cta">
          <div className="landing-wrap">
            <div className="landing-final">
              <div className="landing-final__glow" />
              <h2 className="landing-h2 landing-h2--42 landing-h2--tight landing-max-620">
                Comece o próximo ciclo sabendo até que dia o dinheiro dura
              </h2>
              <p className="landing-lead landing-max-520">
                Cinco perguntas, dois minutos, nenhum cartão. O painel abre com o seu mês já
                reservado.
              </p>
              <div className="vera-cta-stack">
                <Button size="lg" block={mobile} onClick={cadastro}>
                  Criar conta grátis
                </Button>
                <Button
                  size="lg"
                  block={mobile}
                  variant="secondary"
                  onClick={() => navigate('/entrar')}
                >
                  Já tenho conta
                </Button>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </SiteLayout>
  );
}
