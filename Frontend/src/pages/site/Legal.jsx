import { SiteLayout } from '../../components/site/SiteLayout.jsx';
import { SiteFooter } from '../../components/site/SiteFooter.jsx';
import './css/legal.css';

const TEXTOS = {
  termos: {
    titulo: 'Termos de uso',
    blocos: [
      [
        'O que a vera faz',
        'A vera organiza a sua renda em categorias, projeta até que dia o dinheiro dura e compara preços lidos de notas fiscais. Ela não movimenta dinheiro, não vende produtos e não recebe de mercados.'
      ],
      [
        'Sua conta',
        'Você é responsável pelos lançamentos que faz. No modo família, o dono do ciclo decide quem entra e quais categorias são compartilhadas.'
      ],
      [
        'Planos',
        'O plano grátis não expira. O vera+ renova automaticamente e pode ser cancelado em Configurações › Plano, sem multa; o acesso continua até o fim do período pago.'
      ]
    ]
  },
  privacidade: {
    titulo: 'Privacidade',
    blocos: [
      [
        'Sem acesso ao banco',
        'A vera nunca pede a senha da sua conta bancária. Os lançamentos são feitos por você ou a partir das notas fiscais que você lê.'
      ],
      [
        'Nota sem identidade',
        'Quando a opção “Contribuir com preços anônimos” está ligada, só o produto, o preço, o mercado e a data entram na base de preços — sem nome e sem CPF.'
      ],
      [
        'Saída a qualquer hora',
        'Lançamentos, notas e metas saem em planilha em Configurações › Dados. Apagar a conta apaga tudo em 30 dias.'
      ]
    ]
  }
};

export default function Legal({ tipo }) {
  const t = TEXTOS[tipo];
  return (
    <SiteLayout>
      <section className="legal">
        <h1 className="legal__title">{t.titulo}</h1>
        {t.blocos.map(([h, p]) => (
          <div key={h} className="legal__block">
            <h2 className="legal__h2">{h}</h2>
            <p className="legal__p">{p}</p>
          </div>
        ))}
      </section>
      <SiteFooter />
    </SiteLayout>
  );
}
