import { Icon } from './Icon.jsx';
import { cx } from '../../lib/cx.js';
import './css/core.css';

/** Superfície elevada: fundo --surface-card, fio de 1px, raio 16 (ou 20 em painel largo). */
export function Card({ children, onClick, flat, wide, padding = 'md', elevation, gap, className }) {
  return (
    <section
      onClick={onClick}
      className={cx(
        'vera-card',
        wide && 'vera-card--wide',
        flat && 'vera-card--flat',
        padding !== 'md' && `vera-card--pad-${padding}`,
        elevation && `vera-card--${elevation}`,
        gap !== undefined && `vera-card--gap-${gap}`,
        onClick && 'vera-card--click',
        className
      )}
    >
      {children}
    </section>
  );
}

/** Etiqueta de categoria ou estado. Nunca clicável — para isso existe o Chip. */
export function Badge({ tone = 'neutral', size, caps, icon, children, className }) {
  return (
    <span
      className={cx(
        'vera-badge',
        tone !== 'neutral' && `vera-badge--${tone}`,
        size === 'lg' && 'vera-badge--lg',
        caps && 'vera-badge--caps',
        className
      )}
    >
      {icon ? <Icon name={icon} size={11} strokeWidth={2.2} /> : null}
      {children}
    </span>
  );
}

const BTN_ICON = { sm: 15, md: 17, lg: 18 };

/** Botão. Sempre pílula. Primário só um por tela — é o mesmo âmbar do ponto do logo. */
export function Button({
  variant = 'primary',
  size = 'md',
  block,
  icon,
  iconRight,
  loading,
  loadingLabel,
  disabled,
  type = 'button',
  onClick,
  children,
  className,
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      className={cx(
        'vera-btn',
        `vera-btn--${variant}`,
        size !== 'md' && `vera-btn--${size}`,
        block && 'vera-btn--block',
        className
      )}
      {...rest}
    >
      {icon ? <Icon name={icon} size={BTN_ICON[size]} strokeWidth={2.2} /> : null}
      {loading ? loadingLabel || 'Só um instante' : children}
      {iconRight ? <Icon name={iconRight} size={BTN_ICON[size]} strokeWidth={2.2} /> : null}
    </button>
  );
}

/** Chip de filtro. Contorno quando solto, sólido quando escolhido. */
export function Chip({ selected, size, icon, dropdown, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected ? 'true' : 'false'}
      className={cx('vera-chip', size === 'sm' && 'vera-chip--sm', className)}
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
      {dropdown ? <Icon name="chevron-down" size={13} /> : null}
    </button>
  );
}

const ICO_SIZES = { sm: 32, md: 38, lg: 44, xl: 62 };

/** Botão redondo só com ícone. Sempre precisa de label. */
export function IconButton({
  icon,
  label,
  variant = 'solid',
  size = 'md',
  badge,
  disabled,
  onClick,
  className
}) {
  const d = ICO_SIZES[size];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cx(
        'vera-iconbtn',
        variant !== 'solid' && `vera-iconbtn--${variant}`,
        size !== 'md' && `vera-iconbtn--${size}`,
        className
      )}
    >
      <Icon name={icon} size={Math.round(d * 0.44)} strokeWidth={d >= 56 ? 1.9 : 1.8} />
      {badge ? <span className="vera-iconbtn__badge">{badge}</span> : null}
    </button>
  );
}

/** Logotipo da vera: a palavra em Syne e o ponto âmbar. O ponto nunca muda de cor. */
export function Logo({ size = 'md', mark, className }) {
  if (mark) return <span aria-label="vera" className={cx('vera-logo-mark', className)} />;
  return (
    <span className={cx('vera-logo', size !== 'md' && `vera-logo--${size}`, className)}>
      vera<span className="vera-logo__dot">.</span>
    </span>
  );
}
