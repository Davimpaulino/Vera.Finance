import { SiteLayout } from '../../components/site/SiteLayout.jsx';
import { SiteFooter } from '../../components/site/SiteFooter.jsx';
import { INTEGRANTES } from '../../data/integrantes.js';
import { iniciais } from '../../lib/format.js';
import { cx } from '../../lib/cx.js';
import './css/integrantes.css';

export default function Integrantes() {
  return (
    <SiteLayout>
      <section className="integrantes">
        <div className="integrantes__intro">
          <span className="integrantes__eyebrow">quem fez</span>
          <h1 className="integrantes__title">Integrantes do projeto</h1>
          <p className="integrantes__lead">
            As {INTEGRANTES.length} pessoas por trás do vera.finance e o que cada uma construiu.
          </p>
        </div>
        <div className="vera-grid vera-grid--3">
          {INTEGRANTES.map(p => (
            <article key={p.nome} className="integrante">
              {p.foto ? (
                <img className="integrante__foto" src={p.foto} alt={`Foto de ${p.nome}`} />
              ) : (
                <span className="integrante__iniciais" aria-hidden="true">
                  {iniciais(p.nome)}
                </span>
              )}
              <h2 className="integrante__nome">{p.nome}</h2>
              <p className={cx('integrante__funcao', !p.funcao && 'integrante__funcao--vazia')}>
                {p.funcao || 'função a definir'}
              </p>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </SiteLayout>
  );
}
