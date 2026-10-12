import 'bootstrap-icons/font/bootstrap-icons.min.css';
import { ICONS } from './icons.js';
import { cx } from '../../lib/cx.js';
import './css/icon.css';

/**
 * Ícone do Bootstrap Icons. A cor vem do texto ao redor ou de `tone`; o tamanho, de uma classe por pixel.
 * `strokeWidth` é aceito por compatibilidade, mas a fonte de ícones tem um único peso.
 */
// eslint-disable-next-line no-unused-vars
export function Icon({ name, size = 18, strokeWidth, tone, label, className }) {
  const px = Math.max(8, Math.min(40, Math.round(size)));
  return (
    <i
      className={cx(
        'bi',
        `bi-${ICONS[name] || 'question-circle'}`,
        'vera-icon',
        `vera-icon--s${px}`,
        tone && `vera-icon--${tone}`,
        className
      )}
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
      title={label}
    />
  );
}
