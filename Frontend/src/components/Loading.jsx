import { Skeleton, Callout, Button } from './ds/index.js';
import './css/loading.css';

/** Esqueleto de página enquanto a API responde. */
export function PageSkeleton() {
  return (
    <div className="vera-page-skeleton" aria-busy="true">
      <div className="vera-grid vera-grid--3">
        <Skeleton className="vera-page-skeleton__stat" />
        <Skeleton className="vera-page-skeleton__stat" />
        <Skeleton className="vera-page-skeleton__stat" />
      </div>
      <Skeleton className="vera-page-skeleton__panel" />
      <Skeleton className="vera-page-skeleton__card" />
    </div>
  );
}

export function PageError({ error, onRetry }) {
  return (
    <Callout
      tone="danger"
      title="Não deu para carregar"
      action={
        onRetry ? (
          <Button variant="secondary" size="sm" icon="repeat" onClick={onRetry}>
            Tentar de novo
          </Button>
        ) : null
      }
    >
      {error?.message || 'Tente de novo em instantes.'}
    </Callout>
  );
}
