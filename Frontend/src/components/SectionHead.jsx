import './css/section-head.css';

/** Cabeçalho de seção do app: rótulo, texto de apoio e ação à direita. */
export function SectionHead({ label, meta, action }) {
  return (
    <div className="vera-head">
      <span className="vera-head__label">{label}</span>
      {meta ? <span className="vera-head__meta">{meta}</span> : null}
      {action ? <span className="vera-head__a">{action}</span> : null}
    </div>
  );
}
