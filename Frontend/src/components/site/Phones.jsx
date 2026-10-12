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
    alt="Painel do vera.finance no celular: R$ 1.284 livres até 31 de agosto e as categorias Comida e Rolê"
  />
);

export const PhoneComparar = () => (
  <Celular
    tinta={compararTinta}
    papel={compararPapel}
    className="phone--comparar"
    alt="Comparação do arroz branco 5kg: Atacadão R$ 23,40, Nagumo R$ 24,90, Covabra R$ 26,10"
  />
);

export function PhonesLista() {
  return (
    <div className="phones-lista">
      <Celular
        tinta={listaTinta}
        papel={listaPapel}
        className="phone--lista"
        alt="Lista da semana com 5 itens, mais barata no Atacadão por R$ 178,60"
      />
      <Celular
        tinta={impactoTinta}
        papel={impactoPapel}
        className="phone--impacto"
        alt="Impacto da compra no ciclo: Comida chega a R$ 806"
      />
    </div>
  );
}
