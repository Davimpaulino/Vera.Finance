import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { cx } from '../../lib/cx.js';
import './css/forms.css';

/** Caixa de marcar. 20px, raio 6, âmbar quando marcada. */
export function Checkbox({ checked, disabled, onChange, description, done, children, className }) {
  return (
    <label
      className={cx(
        'vera-check',
        description && 'vera-check--desc',
        disabled && 'vera-check--disabled',
        className
      )}
    >
      <input
        type="checkbox"
        className="vera-sr-input"
        checked={!!checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="vera-check__box">
        {checked ? <Icon name="check" size={13} strokeWidth={3} /> : null}
      </span>
      <span className="vera-check__text">
        <span className={cx('vera-check__label', done && 'vera-check__label--done')}>
          {children}
        </span>
        {description ? <span className="vera-check__desc">{description}</span> : null}
      </span>
    </label>
  );
}

/** Campo de texto. Fundo de campo, fio de 1px, raio 12. */
export function Input({ label, icon, suffix, hint, error, size, numeric, className, ...input }) {
  return (
    <label className={cx('vera-input', className)}>
      {label ? <span className="vera-input__label">{label}</span> : null}
      <span
        className={cx(
          'vera-input__field',
          size === 'sm' && 'vera-input__field--sm',
          error && 'vera-input__field--invalid',
          input.disabled && 'vera-input__field--disabled'
        )}
      >
        {icon ? <Icon name={icon} size={16} strokeWidth={2} className="vera-input__icon" /> : null}
        <input
          type="text"
          aria-invalid={error ? 'true' : undefined}
          {...input}
          className={cx(
            'vera-input__control',
            size === 'sm' && 'vera-input__control--sm',
            numeric && 'vera-input__control--numeric'
          )}
        />
        {suffix ? <span className="vera-input__suffix">{suffix}</span> : null}
      </span>
      {error || hint ? (
        <span className={cx('vera-input__hint', error && 'vera-input__hint--error')}>
          {error || hint}
        </span>
      ) : null}
    </label>
  );
}

/** Entrada de dinheiro: R$ fixo em cinza, número grande e tabular. */
export function MoneyInput({ label, hint, error, size, tone, className, ...input }) {
  return (
    <label className={cx('vera-money', className)}>
      {label ? <span className="vera-money__label">{label}</span> : null}
      <span
        className={cx(
          'vera-money__field',
          size === 'sm' && 'vera-money__field--sm',
          error && 'vera-money__field--error'
        )}
      >
        <span className="vera-money__prefix">R$</span>
        <input
          inputMode="decimal"
          placeholder="0,00"
          {...input}
          className={cx('vera-money__control', tone === 'danger' && 'vera-money__control--danger')}
        />
      </span>
      {error || hint ? (
        <span className={cx('vera-money__hint', error && 'vera-money__hint--error')}>
          {error || hint}
        </span>
      ) : null}
    </label>
  );
}

/** Alternador de duas a quatro opções. Pílula dentro de pílula. */
export function SegmentedControl({ options = [], value, onChange, size, className }) {
  const atual = value !== undefined ? value : options[0] && (options[0].value ?? options[0]);
  return (
    <div role="tablist" className={cx('vera-seg', size === 'sm' && 'vera-seg--sm', className)}>
      {options.map(o => {
        const val = typeof o === 'string' ? o : o.value;
        const lab = typeof o === 'string' ? o : o.label;
        return (
          <button
            key={val}
            type="button"
            role="tab"
            aria-selected={val === atual ? 'true' : 'false'}
            onClick={onChange ? () => onChange(val) : undefined}
            className="vera-seg__opt"
          >
            {lab}
          </button>
        );
      })}
    </div>
  );
}

const valorDaOpcao = opcao => (typeof opcao === 'string' ? opcao : opcao.value);
const rotuloDaOpcao = opcao => (typeof opcao === 'string' ? opcao : opcao.label);

/**
 * Lista de escolha com a moldura de campo da vera. Substitui o <select> nativo, cuja lista aberta
 * segue o sistema operacional. No celular a lista abre como folha inferior.
 * `onChange` recebe { target: { value, name } }, como um select comum.
 */
export function Select({
  label,
  options = [],
  hint,
  size,
  className,
  value,
  onChange,
  name,
  disabled,
  placeholder = 'Escolha',
  'aria-label': ariaLabel
}) {
  const id = useId();
  const raiz = useRef(null);
  const lista = useRef(null);
  const [aberto, setAberto] = useState(false);
  const [acima, setAcima] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const indiceAtual = options.findIndex(opcao => String(valorDaOpcao(opcao)) === String(value));
  const atual = indiceAtual >= 0 ? options[indiceAtual] : null;

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = e => {
      if (raiz.current && !raiz.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);

  useEffect(() => {
    if (!aberto || ativo < 0 || !lista.current) return;
    lista.current.children[ativo]?.scrollIntoView({ block: 'nearest' });
  }, [aberto, ativo]);

  const abrir = () => {
    if (disabled) return;
    const caixa = raiz.current.getBoundingClientRect();
    const painel = raiz.current.closest('.vera-modal__panel');
    const limite = painel ? painel.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    const abaixo = limite.bottom - caixa.bottom;
    setAcima(abaixo < 280 && caixa.top - limite.top > abaixo);
    setAtivo(Math.max(0, indiceAtual));
    setAberto(true);
  };

  const escolher = indice => {
    const opcao = options[indice];
    setAberto(false);
    if (!opcao) return;
    if (onChange && String(valorDaOpcao(opcao)) !== String(value))
      onChange({ target: { value: valorDaOpcao(opcao), name } });
  };

  const teclar = e => {
    if (disabled) return;
    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
      setAberto(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAtivo(i => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAtivo(i => Math.max(0, i - 1));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setAtivo(e.key === 'Home' ? 0 : options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      escolher(ativo);
    } else if (e.key.length === 1) {
      const letra = e.key.toLowerCase();
      const achado = options.findIndex(
        (opcao, i) => i > ativo && String(rotuloDaOpcao(opcao)).toLowerCase().startsWith(letra)
      );
      const primeiro = options.findIndex(opcao =>
        String(rotuloDaOpcao(opcao)).toLowerCase().startsWith(letra)
      );
      if (achado >= 0 || primeiro >= 0) setAtivo(achado >= 0 ? achado : primeiro);
    }
  };

  return (
    <div
      ref={raiz}
      className={cx('vera-select', aberto && 'vera-select--open', className)}
    >
      {label ? (
        <span className="vera-select__label" id={`${id}-rotulo`}>
          {label}
        </span>
      ) : null}
      <div className="vera-select__ancora">
        <button
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={aberto ? 'true' : 'false'}
          aria-controls={`${id}-lista`}
          aria-labelledby={label ? `${id}-rotulo ${id}-valor` : undefined}
          aria-label={label ? undefined : ariaLabel}
          aria-activedescendant={aberto && ativo >= 0 ? `${id}-op-${ativo}` : undefined}
          disabled={disabled}
          onClick={() => (aberto ? setAberto(false) : abrir())}
          onKeyDown={teclar}
          className={cx(
            'vera-select__field',
            size === 'sm' && 'vera-select__field--sm',
            disabled && 'vera-select__field--disabled'
          )}
        >
          <span
            id={`${id}-valor`}
            className={cx(
              'vera-select__control',
              size === 'sm' && 'vera-select__control--sm',
              !atual && 'vera-select__control--vazio'
            )}
          >
            {atual && typeof atual !== 'string' && atual.icon ? (
              <Icon name={atual.icon} size={16} className="vera-select__icone" />
            ) : null}
            {atual ? rotuloDaOpcao(atual) : placeholder}
          </span>
          <Icon name="chevron-down" size={15} strokeWidth={2} className="vera-select__chev" />
        </button>
        {aberto ? (
          <>
            <span className="vera-select__scrim" onClick={() => setAberto(false)} />
            <ul
              ref={lista}
              id={`${id}-lista`}
              role="listbox"
              aria-label={typeof label === 'string' ? label : ariaLabel}
              className={cx('vera-select__list', acima && 'vera-select__list--acima')}
            >
              {options.map((opcao, i) => {
                const escolhido = i === indiceAtual;
                return (
                  <li
                    key={valorDaOpcao(opcao)}
                    id={`${id}-op-${i}`}
                    role="option"
                    aria-selected={escolhido ? 'true' : 'false'}
                    className={cx(
                      'vera-select__option',
                      i === ativo && 'vera-select__option--ativa',
                      escolhido && 'vera-select__option--escolhida'
                    )}
                    onPointerEnter={() => setAtivo(i)}
                    onClick={() => escolher(i)}
                  >
                    {typeof opcao !== 'string' && opcao.icon ? (
                      <Icon name={opcao.icon} size={16} className="vera-select__icone" />
                    ) : null}
                    <span className="vera-select__option-label">{rotuloDaOpcao(opcao)}</span>
                    {escolhido ? <Icon name="check" size={14} className="vera-select__check" /> : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>
      {hint ? <span className="vera-select__hint">{hint}</span> : null}
    </div>
  );
}

/** Escolha de ícone vendo o ícone: grade de botões, o escolhido fica âmbar. */
export function SeletorDeIcone({ label = 'Ícone', icones = [], value, onChange, className }) {
  return (
    <div className={cx('vera-icones', className)}>
      {label ? <span className="vera-icones__label">{label}</span> : null}
      <div role="radiogroup" aria-label={label} className="vera-icones__grade">
        {icones.map(item => {
          const [nome, rotulo] = Array.isArray(item) ? item : [item, item];
          return (
            <button
              key={nome}
              type="button"
              role="radio"
              aria-checked={value === nome ? 'true' : 'false'}
              aria-label={rotulo}
              title={rotulo}
              onClick={() => onChange(nome)}
              className="vera-icone"
            >
              <Icon name={nome} size={18} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Interruptor 44×26. Trilho âmbar quando ligado. */
export function Switch({
  checked,
  disabled,
  onChange,
  description,
  children,
  className,
  'aria-label': ariaLabel
}) {
  return (
    <label className={cx('vera-switch', disabled && 'vera-switch--disabled', className)}>
      {children ? (
        <span className="vera-switch__text">
          <span className="vera-switch__label">{children}</span>
          {description ? <span className="vera-switch__desc">{description}</span> : null}
        </span>
      ) : null}
      <span className="vera-switch__ctl">
        <input
          type="checkbox"
          role="switch"
          aria-label={ariaLabel}
          checked={!!checked}
          disabled={disabled}
          onChange={onChange}
          className="vera-sr-input"
        />
        <span className="vera-switch__track">
          <span className="vera-switch__thumb" />
        </span>
      </span>
    </label>
  );
}

/** Abas com fio embaixo. Para trocar de visão dentro de uma página do desktop. */
export function Tabs({ items = [], value, onChange, className }) {
  const atual = value !== undefined ? value : items[0] && (items[0].value ?? items[0]);
  return (
    <div role="tablist" className={cx('vera-tabs', className)}>
      {items.map(o => {
        const val = typeof o === 'string' ? o : o.value;
        const lab = typeof o === 'string' ? o : o.label;
        return (
          <button
            key={val}
            type="button"
            role="tab"
            aria-selected={val === atual ? 'true' : 'false'}
            onClick={onChange ? () => onChange(val) : undefined}
            className="vera-tabs__tab"
          >
            {lab}
            {typeof o !== 'string' && o.count !== undefined ? (
              <span className="vera-tabs__count">{o.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
