import { Logo } from './ds/index.js';
import { Link } from '../lib/router.jsx';
import { cx } from '../lib/cx.js';
import './css/brand.css';

/** "vera." + "finance": o logotipo do design system com a palavra do produto. */
export function Brand({ size = 'md', to, className }) {
  const cls = cx('vera-brand', `vera-brand--${size}`, className);
  const inner = (
    <>
      <Logo size={size} />
      <span className="vera-brand__word">finance</span>
    </>
  );
  if (!to) return <span className={cls}>{inner}</span>;
  return (
    <Link to={to} className={cls} aria-label="vera.finance — início">
      {inner}
    </Link>
  );
}
