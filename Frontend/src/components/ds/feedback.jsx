import { useEffect } from 'react';
import { Icon } from './Icon.jsx';
import { IconButton } from './core.jsx';
import { cx } from '../../lib/cx.js';
import './css/feedback.css';

const CALLOUT_ICONS = {
  warning: 'triangle-alert',
  danger: 'circle-alert',
  success: 'circle-check',
  info: 'info',
  accent: 'sparkles'
};

/** Aviso dentro do fluxo. Avisa, explica a cobertura e não bloqueia. */
export function Callout({ tone = 'warning', icon, title, action, children, className }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('vera-callout', tone !== 'warning' && `vera-callout--${tone}`, className)}
    >
      <Icon name={icon || CALLOUT_ICONS[tone]} size={18} className="vera-callout__icon" />
      <div className="vera-callout__body">
        {title ? <span className="vera-callout__title">{title}</span> : null}
        {children ? <span className="vera-callout__text">{children}</span> : null}
        {action ? <span className="vera-callout__action">{action}</span> : null}
      </div>
    </div>
  );
}

/** Estado vazio: diz o que falta e oferece o primeiro passo. */
export function EmptyState({ icon, title, action, children, className }) {
  return (
    <div className={cx('vera-empty', className)}>
      {icon ? (
        <span className="vera-empty__icon">
          <Icon name={icon} size={24} />
        </span>
      ) : null}
      <span className="vera-empty__title">{title}</span>
      {children ? <p className="vera-empty__text">{children}</p> : null}
      {action ? <span className="vera-empty__action">{action}</span> : null}
    </div>
  );
}

/** Diálogo no desktop, folha inferior no celular. Fecha com Esc e clicando fora. */
export function Modal({ title, subtitle, size = 'md', onClose, footer, children }) {
  useEffect(() => {
    document.body.classList.add('vera-no-scroll');
    const onKey = e => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('vera-no-scroll');
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      className="vera-modal"
      onClick={onClose}
    >
      <div
        className={cx('vera-modal__panel', size !== 'md' && `vera-modal__panel--${size}`)}
        onClick={e => e.stopPropagation()}
      >
        <span className="vera-modal__grip" />
        {title ? (
          <div className="vera-modal__head">
            <div className="vera-modal__titles">
              <span className="vera-modal__title">{title}</span>
              {subtitle ? <span className="vera-modal__sub">{subtitle}</span> : null}
            </div>
            {onClose ? (
              <IconButton icon="x" label="Fechar" variant="ghost" size="sm" onClick={onClose} />
            ) : null}
          </div>
        ) : null}
        <div className="vera-modal__body">{children}</div>
        {footer ? <div className="vera-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

/** Bloco de carregamento. Pulsa devagar, nunca gira. O tamanho vem da classe. */
export function Skeleton({ className }) {
  return <span aria-hidden="true" className={cx('vera-skeleton', className)} />;
}
