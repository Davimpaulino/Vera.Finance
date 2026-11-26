import painelTinta from '../../assets/landing/celular-painel-tinta.webp';
import painelPapel from '../../assets/landing/celular-painel-papel.webp';
import compararTinta from '../../assets/landing/celular-comparar-tinta.webp';
import compararPapel from '../../assets/landing/celular-comparar-papel.webp';
import listaTinta from '../../assets/landing/celular-lista-tinta.webp';
import listaPapel from '../../assets/landing/celular-lista-papel.webp';
import impactoTinta from '../../assets/landing/celular-impacto-tinta.webp';
import impactoPapel from '../../assets/landing/celular-impacto-papel.webp';
import { useUi } from '../../context/UiContext.jsx';
import { cx } from '../../lib/cx.js';
import './css/phones.css';

// As telas usam "Mercado A/B/C": preço de exemplo não pode aparecer ao lado de marca real.
// O alt descreve a tela sem repetir os valores, que são só ilustrativos.
// As imagens são WebP sem perda (os mesmos pixels dos PNGs de antes, com cerca de 40% do peso).

/**
 * Celular da landing: só a imagem da superfície atual (tinta ou papel) vai para a página, para o
 * navegador não baixar as duas. A pré-renderização sai com a de tinta, que é a superfície padrão.
 * `prioridade` vale para a imagem principal do topo; as de baixo da dobra carregam só ao chegar
 * perto da tela (`loading="lazy"`, que também evita baixar a que o CSS esconde no celular).
 */
function Celular({ tinta, papel, largura, altura, alt, className, prioridade }) {
  const tema = useUi()?.theme || 'tinta';
  return (
    <span className={cx('phone', className)}>
      <img
        className="phone__img"
        src={tema === 'papel' ? papel : tinta}
        alt={alt}
        width={largura}
        height={altura}
        decoding="async"
        loading={prioridade ? undefined : 'lazy'}
        fetchPriority={prioridade ? 'high' : undefined}
      />
    </span>
  );
}

export const PhonePainel = () => (
  <Celular
    tinta={painelTinta}
    papel={painelPapel}
    largura={600}
    altura={1284}
    prioridade
    className="phone--painel"
    alt="Imagem ilustrativa do painel do vera.finance no celular, com o saldo livre do mês e as categorias Comida e Rolê"
  />
);

export const PhoneComparar = () => (
  <Celular
    tinta={compararTinta}
    papel={compararPapel}
    largura={504}
    altura={1080}
    className="phone--comparar"
    alt="Imagem ilustrativa da tela de comparação de preços, com mercados de exemplo"
  />
);

export function PhonesLista() {
  return (
    <div className="phones-lista">
      <Celular
        tinta={listaTinta}
        papel={listaPapel}
        largura={392}
        altura={488}
        className="phone--lista"
        alt="Imagem ilustrativa da lista da semana, com o total no mercado mais barato"
      />
      <Celular
        tinta={impactoTinta}
        papel={impactoPapel}
        largura={344}
        altura={432}
        className="phone--impacto"
        alt="Imagem ilustrativa do impacto da compra na categoria Comida"
      />
    </div>
  );
}
