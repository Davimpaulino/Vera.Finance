import { useEffect, useState } from 'react';
import { SiteLayout } from '../../components/site/SiteLayout.jsx';
import { PageError, PageSkeleton } from '../../components/Loading.jsx';
import { carregarConteudo, useConteudo } from '../../conteudo/carregar.js';
import './css/conteudo.css';

/**
 * Central de ajuda, blog e artigos. O texto vem num pedaço separado do JavaScript
 * (conteudo/carregar.js): enquanto ele chega, o esqueleto da página; se não chegar, um aviso com
 * "Tentar de novo". Quem abre a página pelo endereço não vê nenhum dos dois: main.jsx espera o
 * pedaço antes de desenhar, e o HTML pré-renderizado fica na tela até lá.
 */
export function PaginaDeConteudo({ caminho }) {
  const conteudo = useConteudo();
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (conteudo) return undefined;
    let valendo = true;
    setFalhou(false);
    carregarConteudo().catch(() => {
      if (valendo) setFalhou(true);
    });
    return () => {
      valendo = false;
    };
  }, [conteudo, tentativa]);

  if (conteudo) {
    const Pagina = conteudo.default;
    return <Pagina caminho={caminho} />;
  }
  return (
    <SiteLayout>
      <section className="conteudo">
        {falhou ? (
          <PageError
            error={{ message: 'Confira a conexão e tente de novo.' }}
            onRetry={() => setTentativa(t => t + 1)}
          />
        ) : (
          <PageSkeleton />
        )}
      </section>
    </SiteLayout>
  );
}
