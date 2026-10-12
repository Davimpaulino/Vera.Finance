import { Icon } from './Icon.jsx';
import { cx } from '../../lib/cx.js';
import './css/data.css';

/** Tabela do desktop que vira lista no celular. */
export function DataTable({ columns = [], rows = [], dense, stack = true, onRowClick, className }) {
  return (
    <div className={cx('vera-table-wrap', className)}>
      <table
        className={cx('vera-table', dense && 'vera-table--dense', stack && 'vera-table--stack')}
      >
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} className={cx(c.align === 'right' && 'vera-table__cell--right')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr
              key={ri}
              onClick={onRowClick ? () => onRowClick(r, ri) : undefined}
              className={cx(onRowClick && 'vera-table__row--click')}
            >
              {columns.map(c => (
                <td
                  key={c.key}
                  data-primary={c.primary ? '' : undefined}
                  data-value={c.value ? '' : undefined}
                  className={cx(
                    c.align === 'right' && 'vera-table__cell--right',
                    c.muted && 'vera-table__cell--muted',
                    c.value && 'vera-table__cell--value',
                    c.nowrap && 'vera-table__cell--nowrap'
                  )}
                >
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** O número-herói: Fraunces 600, tabular, âmbar. Só um por tela. */
export function HeroNumber({ label, value, sub, size, tone = 'accent', caps, className }) {
  return (
    <div className={cx('vera-hero', className)}>
      {label ? (
        <span className={cx('vera-hero__label', caps && 'vera-hero__label--caps')}>{label}</span>
      ) : null}
      <span
        className={cx(
          'vera-hero__value',
          size && `vera-hero__value--${size}`,
          tone !== 'accent' && `vera-hero__value--${tone}`
        )}
      >
        {value}
      </span>
      {sub ? <span className="vera-hero__sub">{sub}</span> : null}
    </div>
  );
}

/** Linha de lista: ícone, título, meta, valor. A unidade do extrato. */
export function ListRow({
  icon,
  title,
  meta,
  badge,
  value,
  valueTone,
  last,
  dense,
  onClick,
  className
}) {
  const clickable = !!onClick;
  const onKey = clickable
    ? e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      }
    : undefined;
  return (
    <div
      onClick={onClick}
      onKeyDown={onKey}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={cx(
        'vera-row',
        dense && 'vera-row--dense',
        last && 'vera-row--last',
        clickable && 'vera-row--click',
        className
      )}
    >
      {icon ? (
        <span className="vera-row__icon">
          <Icon name={icon} size={15} />
        </span>
      ) : null}
      <span className="vera-row__text">
        <span className="vera-row__title">{title}</span>
        {meta ? <span className="vera-row__meta">{meta}</span> : null}
      </span>
      {badge || null}
      {value !== undefined && value !== null ? (
        <span className={cx('vera-row__value', valueTone && `vera-row__value--${valueTone}`)}>
          {value}
        </span>
      ) : null}
      {clickable ? <Icon name="chevron-right" size={16} strokeWidth={2} tone="muted" /> : null}
    </div>
  );
}

/** Barra de progresso de categoria, meta ou mês. Ardósia é o padrão: dado, não alerta. */
export function Meter({
  label,
  amount,
  value = 0,
  max = 100,
  tone = 'data',
  size,
  footnote,
  className
}) {
  const v = Math.max(0, Math.min(max, Number(value) || 0));
  return (
    <div className={cx('vera-meter', tone !== 'data' && `vera-meter--${tone}`, className)}>
      {label || amount ? (
        <div className="vera-meter__head">
          <span className="vera-meter__label">{label}</span>
          {amount ? <span className="vera-meter__amount">{amount}</span> : null}
        </div>
      ) : null}
      <progress
        className={cx('vera-meter__bar', size === 'lg' && 'vera-meter__bar--lg')}
        value={v}
        max={max}
        aria-label={label || footnote || undefined}
      />
      {footnote ? <span className="vera-meter__foot">{footnote}</span> : null}
    </div>
  );
}

/** Preço com idade do dado. Três estados: fresco, envelhecido, sem dado. */
export function PriceTag({
  value,
  state = 'fresh',
  source,
  alternative,
  size,
  emptyLabel,
  align,
  className
}) {
  const cls = cx('vera-price', align === 'end' && 'vera-price--end', className);
  if (state === 'none')
    return (
      <div className={cls}>
        <span className="vera-price__empty">{emptyLabel || 'ainda sem preço por aqui'}</span>
      </div>
    );
  const aged = state === 'aged';
  return (
    <div className={cls}>
      <span className="vera-price__row">
        <span
          className={cx(
            'vera-price__value',
            size === 'lg' && 'vera-price__value--lg',
            aged && 'vera-price__value--aged'
          )}
        >
          {value}
        </span>
        {aged ? (
          <Icon name="clock" size={11} strokeWidth={2} tone="muted" label="preço antigo" />
        ) : null}
      </span>
      {source ? <span className="vera-price__note">{source}</span> : null}
      {alternative ? <span className="vera-price__note">{alternative}</span> : null}
    </div>
  );
}

/** A linha da projeção: passado sólido, futuro pontilhado, ponto âmbar no hoje. */
export function ProjectionLine({ points = [], todayIndex, height = 120, label, className }) {
  const w = 1000;
  const h = height;
  const pad = 10;
  if (points.length < 2)
    return <svg className={cx('vera-projection', className)} width="100%" height={h} />;
  const today = Math.max(
    0,
    Math.min(points.length - 1, todayIndex ?? Math.floor(points.length / 3))
  );
  const max = Math.max(...points);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const x = i => (i / (points.length - 1)) * w;
  const y = v => pad + (1 - (v - min) / span) * (h - pad * 2);
  const seg = (from, to) => {
    let d = '';
    for (let i = from; i <= to; i++)
      d += (i === from ? 'M' : ' L') + x(i).toFixed(1) + ' ' + y(points[i]).toFixed(1);
    return d;
  };
  return (
    <svg
      className={cx('vera-projection', className)}
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label || 'Projeção do mês'}
    >
      <line className="vera-projection__today" x1={x(today)} y1={0} x2={x(today)} y2={h} />
      <path className="vera-projection__past" d={seg(0, today)} />
      {today < points.length - 1 ? (
        <path className="vera-projection__future" d={seg(today, points.length - 1)} />
      ) : null}
      <circle className="vera-projection__dot" cx={x(today)} cy={y(points[today])} r={5} />
    </svg>
  );
}

/** Cartão de indicador para o topo do dashboard e do relatório. */
export function StatCard({
  icon,
  label,
  value,
  tone = 'neutral',
  delta,
  deltaTone,
  deltaDirection,
  className
}) {
  return (
    <div className={cx('vera-stat', className)}>
      <div className="vera-stat__head">
        {icon ? (
          <span className="vera-stat__icon">
            <Icon name={icon} size={15} />
          </span>
        ) : null}
        <span className="vera-stat__label">{label}</span>
      </div>
      <span className={cx('vera-stat__value', tone !== 'neutral' && `vera-stat__value--${tone}`)}>
        {value}
      </span>
      {delta ? (
        <span className={cx('vera-stat__delta', deltaTone && `vera-stat__delta--${deltaTone}`)}>
          {deltaDirection ? (
            <Icon
              name={deltaDirection === 'down' ? 'arrow-down' : 'arrow-up'}
              size={12}
              strokeWidth={2.4}
            />
          ) : null}
          {delta}
        </span>
      ) : null}
    </div>
  );
}
