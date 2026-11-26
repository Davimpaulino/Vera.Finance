import { Skeleton, Callout, Button, EmptyState } from './ds/index.js';
import { Brand } from './Brand.jsx';
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

/**
 * Sem internet (ou sem resposta da API) ao abrir entrar, cadastro ou o app. A sessão não foi
 * perdida: só não deu para conferir. Volta sozinho quando o navegador avisa que a rede voltou.
 * Esta tela ocupa o lugar de todo o app, então ela mesma dá a saída: o logotipo leva ao site e,
 * para quem tem sessão neste aparelho (`onSair`), "Sair da conta" funciona sem rede.
 */
export function SemConexao({ onTentar, onSair }) {
  return (
    <main className="vera-center vera-sem-conexao">
      <Brand size="lg" to="/" />
      <EmptyState
        icon="wifi-off"
        title="Sem conexão"
        titleAs="h1"
        action={
          <span className="vera-sem-conexao__acoes">
            <Button icon="repeat" onClick={onTentar}>
              Tentar de novo
            </Button>
            {onSair ? (
              <Button variant="ghost" icon="log-out" onClick={onSair}>
                Sair da conta
              </Button>
            ) : null}
          </span>
        }
      >
        Não deu para falar com a vera agora. Confira a internet e tente de novo. Se você já tinha
        entrado, continua conectado.
      </EmptyState>
    </main>
  );
}
