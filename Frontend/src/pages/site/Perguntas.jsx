import { SiteLayout } from '../../components/site/SiteLayout.jsx';
import { Link } from '../../lib/router.jsx';
import { REDES_COM_PRECO, urlDoSite } from '../../lib/site.js';
import './css/perguntas.css';

// Respostas tiradas do que o app faz hoje (planos em Backend/src/models/PlanoModel.js,
// redes em Backend/src/models/RedeModel.js). Se o produto mudar, mude aqui também:
// o mesmo texto vai para o JSON-LD que o Google e as IAs leem.
const lista = nomes => `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;

export const PERGUNTAS = [
  {
    pergunta: 'O que é a vera.finance?',
    resposta:
      'É um app de finanças pessoais que separa a renda em categorias, projeta até que dia o dinheiro dura, guarda metas e compara o preço da sua lista de compras nos supermercados perto de você.'
  },
  {
    pergunta: 'A vera é grátis?',
    resposta:
      'Sim. O plano grátis não expira e não pede cartão. Ele inclui categorias, projeção do ciclo, lista de compras com total, comparação e histórico de preço, até 3 metas e 5 notas fiscais lidas por mês. Notas e metas sem limite e o modo família ficam no vera+.'
  },
  {
    pergunta: 'Quanto custa o vera+?',
    resposta:
      'R$ 12,90 por mês ou R$ 99,90 por ano (equivale a R$ 8,33 por mês). Os dois têm notas fiscais e metas ilimitadas. O modo família vai até 2 pessoas no mensal e até 5 no anual. Dá para cancelar quando quiser, sem multa.'
  },
  {
    pergunta: 'Quais redes de supermercado têm preço online na vera?',
    resposta: `Hoje são ${REDES_COM_PRECO.length} redes: ${lista(REDES_COM_PRECO)}. Outros mercados aparecem quando alguém lê uma nota fiscal de lá. A vera não tem vínculo com as redes citadas.`
  },
  {
    pergunta: 'De onde vêm os preços?',
    resposta:
      'De dois lugares: do site público de cada rede e das notas fiscais lidas por quem usa a vera. Na maioria das redes, o site é consultado para o seu CEP; nas outras, vale o preço da loja online. Cada preço mostra a data e a origem.'
  },
  {
    pergunta: 'O preço da vera é o mesmo da loja?',
    resposta:
      'Nem sempre. O preço do site pode mudar a qualquer momento e a loja física pode ter preços e promoções diferentes. A comparação ajuda a decidir, mas o preço que vale é sempre o do caixa.'
  },
  {
    pergunta: 'Preciso dar a senha do meu banco?',
    resposta:
      'Não. A vera nunca pede senha de banco e não se conecta à sua conta. Você lança os gastos ou lê a nota fiscal do mercado.'
  },
  {
    pergunta: 'Como leio uma nota fiscal?',
    resposta:
      'Aponte a câmera para o QR Code do cupom fiscal eletrônico (NFC-e). A vera busca a nota no portal da Secretaria da Fazenda, prepara um gasto com o valor e a loja para você escolher a categoria e guarda os preços para comparar.'
  },
  {
    pergunta: 'Como funciona o modo família?',
    resposta:
      'Quem cria a família é o dono do ciclo: convida pessoas por e-mail e escolhe quais categorias são compartilhadas. Quem entra vê as categorias compartilhadas e os próprios lançamentos. O modo família faz parte do vera+.'
  },
  {
    pergunta: 'Meus dados estão seguros?',
    resposta:
      'O acesso é por conexão criptografada (HTTPS), a senha fica guardada só como código irreversível e a vera não vende dados. A nota fiscal entra na base de preços sem nome e sem CPF. O tratamento segue a LGPD.'
  },
  {
    pergunta: 'Como apago a minha conta?',
    resposta:
      'Em Configurações › Dados. Os dados são apagados em 30 dias e, até lá, dá para desistir. Os preços da base anônima continuam, porque não identificam ninguém.'
  },
  {
    pergunta: 'A vera vende produtos?',
    resposta:
      'Não. A vera não vende produtos, não faz entregas e não recebe nada de mercados para mostrar preços.'
  },
  {
    pergunta: 'Funciona na minha cidade?',
    resposta:
      'Depende dos mercados perto de você. A vera procura a partir do seu CEP, num raio de 2 a 15 km. Se houver loja de uma rede com preço online nesse raio, a comparação já aparece; os outros mercados entram conforme as notas fiscais são lidas.'
  }
];

// Mesmas perguntas e respostas da página, no formato que os buscadores entendem.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  url: urlDoSite('/perguntas'),
  inLanguage: 'pt-BR',
  mainEntity: PERGUNTAS.map(({ pergunta, resposta }) => ({
    '@type': 'Question',
    name: pergunta,
    acceptedAnswer: { '@type': 'Answer', text: resposta }
  }))
};

export default function Perguntas() {
  return (
    <SiteLayout>
      <section className="perguntas">
        <h1 className="perguntas__title">Perguntas frequentes</h1>
        <p className="perguntas__lead">
          O que a vera faz, quanto custa e como cuida dos seus dados, em poucas linhas.
        </p>
        {PERGUNTAS.map(({ pergunta, resposta }) => (
          <div key={pergunta} className="perguntas__item">
            <h2 className="perguntas__h2">{pergunta}</h2>
            <p className="perguntas__p">{resposta}</p>
          </div>
        ))}
        <p className="perguntas__p">
          Passo a passo de cada parte do app está na <Link to="/ajuda">central de ajuda</Link>.
          Para saber se há rede com preço online perto de você, veja{' '}
          <Link to="/onde-funciona">onde a vera funciona</Link>. Dicas para economizar no mercado
          estão no <Link to="/blog">blog</Link>.
        </p>
        <p className="perguntas__p">
          Veja também: <Link to="/precos">Planos</Link>,{' '}
          <Link to="/privacidade">Política de privacidade</Link> e{' '}
          <Link to="/termos">Termos de uso</Link>. Outra dúvida? Escreva para{' '}
          <a href="mailto:ajuda@vera.finance">ajuda@vera.finance</a>.
        </p>
      </section>
      <script
        type="application/ld+json"
        // "<" escapado para o texto nunca fechar a tag script.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </SiteLayout>
  );
}
