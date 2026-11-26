import { useEffect, useRef, useState } from 'react';
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

/** Estado vazio: diz o que falta e oferece o primeiro passo.
 * `titleAs="h1"` quando ele é o assunto da página inteira (leitor de tela acha pelo título). */
export function EmptyState({ icon, title, titleAs: Titulo = 'span', action, children, className }) {
  return (
    <div className={cx('vera-empty', className)}>
      {icon ? (
        <span className="vera-empty__icon">
          <Icon name={icon} size={24} />
        </span>
      ) : null}
      <Titulo className="vera-empty__title">{title}</Titulo>
      {children ? <p className="vera-empty__text">{children}</p> : null}
      {action ? <span className="vera-empty__action">{action}</span> : null}
    </div>
  );
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo no desktop, folha inferior no celular. Fecha com Esc e clicando fora.
 * Teclado (WCAG 2.4.3): ao abrir, o foco entra no diálogo (no campo com autoFocus ou no painel);
 * o Tab circula só dentro dele; ao fechar, o foco volta para quem abriu.
 */
export function Modal({ title, subtitle, size = 'md', onClose, footer, children }) {
  const painel = useRef(null);
  // Quem chama costuma passar uma função nova a cada render; o Esc usa sempre a mais recente.
  const fechar = useRef(onClose);
  fechar.current = onClose;
  // Quem tinha o foco antes de abrir, lido no primeiro render: um campo com autoFocus dentro do
  // diálogo já pega o foco antes dos efeitos rodarem.
  const [quemAbriu] = useState(() => (typeof document === 'undefined' ? null : document.activeElement));

  useEffect(() => {
    if (painel.current && !painel.current.contains(document.activeElement)) painel.current.focus();
    document.body.classList.add('vera-no-scroll');
    const onKey = e => {
      if (e.key === 'Escape' && fechar.current) fechar.current();
      if (e.key !== 'Tab' || !painel.current) return;
      const lista = [...painel.current.querySelectorAll(FOCAVEIS)].filter(
        el => !el.closest('[hidden]') && el.getClientRects().length
      );
      if (!lista.length) {
        e.preventDefault();
        return;
      }
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      const atual = document.activeElement;
      if (e.shiftKey && (atual === primeiro || !painel.current.contains(atual))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (atual === ultimo || !painel.current.contains(atual))) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('vera-no-scroll');
      if (quemAbriu && quemAbriu.isConnected && typeof quemAbriu.focus === 'function')
        quemAbriu.focus();
    };
  }, [quemAbriu]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      className="vera-modal"
      onClick={onClose}
    >
      <div
        ref={painel}
        tabIndex={-1}
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
