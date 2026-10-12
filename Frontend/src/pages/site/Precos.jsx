import { Badge, Button, Card, Icon } from '../../components/ds/index.js';
import { SiteLayout } from '../../components/site/SiteLayout.jsx';
import { SiteFooter } from '../../components/site/SiteFooter.jsx';
import { PageSkeleton } from '../../components/Loading.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useRouter } from '../../lib/router.jsx';
import { brlCents } from '../../lib/format.js';
import { cx } from '../../lib/cx.js';
import './css/precos.css';

const CTA = { gratis: 'Criar conta grátis', mensal: 'Assinar mensal', anual: 'Assinar anual' };

export default function Precos() {
  const { data: planos, error } = useApi('/planos');
  const { navigate } = useRouter();

  return (
    <SiteLayout>
      <section className="precos-intro">
        <h1 className="precos-intro__title">Comece de graça. Assine quando fizer sentido.</h1>
        <p className="precos-intro__lead">
          Categorias, projeção e metas não custam nada. O vera+ é para quem vive de nota fiscal e
          quer o histórico de preço.
        </p>
      </section>
      <section className="precos-grid">
        {!planos && !error ? <PageSkeleton /> : null}
        {error ? <p className="precos-erro">{error.message}</p> : null}
        {planos ? (
          <div className="vera-grid vera-grid--3 vera-grid--stretch">
            {planos.map(p => (
              <Card
                key={p.id}
                wide
                padding="lg"
                gap={18}
                className={cx(p.destaque && 'precos-card--destaque')}
              >
                <div className="precos-card__head">
                  <span className="precos-card__name">{p.nome}</span>
                  {p.destaque ? (
                    <Badge tone="accent" caps size="lg">
                      Recomendado
                    </Badge>
                  ) : null}
                </div>
                <span className="precos-card__price">{p.preco ? brlCents(p.preco) : 'R$ 0'}</span>
                <span className="precos-card__note">{p.nota}</span>
                <div className="vera-divider" />
                <div className="precos-itens">
                  {p.itens.map(([texto, on]) => (
                    <span key={texto} className={cx('precos-item', !on && 'precos-item--off')}>
                      <Icon name={on ? 'check' : 'minus'} size={15} />
                      {texto}
                    </span>
                  ))}
                </div>
                <Button
                  block
                  variant={p.destaque ? 'primary' : 'secondary'}
                  className="precos-card__cta"
                  onClick={() => navigate('/cadastro')}
                >
                  {CTA[p.id]}
                </Button>
              </Card>
            ))}
          </div>
        ) : null}
      </section>
      <p className="precos-rodape">
        Renovação automática. Cancele em Configurações › Plano, sem multa.
      </p>
      <SiteFooter />
    </SiteLayout>
  );
}
