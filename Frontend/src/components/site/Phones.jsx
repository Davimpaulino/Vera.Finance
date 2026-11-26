import painelTinta from '../../assets/landing/celular-painel-tinta.png';
import painelPapel from '../../assets/landing/celular-painel-papel.png';
import compararTinta from '../../assets/landing/celular-comparar-tinta.png';
import compararPapel from '../../assets/landing/celular-comparar-papel.png';
import listaTinta from '../../assets/landing/celular-lista-tinta.png';
import listaPapel from '../../assets/landing/celular-lista-papel.png';
import impactoTinta from '../../assets/landing/celular-impacto-tinta.png';
import impactoPapel from '../../assets/landing/celular-impacto-papel.png';
import { cx } from '../../lib/cx.js';
import './css/phones.css';

// As telas usam "Mercado A/B/C": preço de exemplo não pode aparecer ao lado de marca real.
// O alt descreve a tela sem repetir os valores, que são só ilustrativos.

/** Celular da landing: duas imagens (tinta e papel) e o CSS mostra a da superfície atual. */
function Celular({ tinta, papel, alt, className }) {
  return (
    <span className={cx('phone', className)}>
      <img className="phone__img phone__img--tinta" src={tinta} alt={alt} />
      <img className="phone__img phone__img--papel" src={papel} alt="" aria-hidden="true" />
    </span>
  );
}

export const PhonePainel = () => (
  <Celular
    tinta={painelTinta}
    papel={painelPapel}
    className="phone--painel"
    alt="Imagem ilustrativa do painel do vera.finance no celular, com o saldo livre do mês e as categorias Comida e Rolê"
  />
);

export const PhoneComparar = () => (
  <Celular
    tinta={compararTinta}
    papel={compararPapel}
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
        className="phone--lista"
        alt="Imagem ilustrativa da lista da semana, com o total no mercado mais barato"
      />
      <Celular
        tinta={impactoTinta}
        papel={impactoPapel}
        className="phone--impacto"
        alt="Imagem ilustrativa do impacto da compra na categoria Comida"
      />
    </div>
  );
}
