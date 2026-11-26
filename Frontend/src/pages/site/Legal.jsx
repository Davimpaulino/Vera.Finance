import { SiteLayout } from '../../components/site/SiteLayout.jsx';
import { SiteFooter } from '../../components/site/SiteFooter.jsx';
import { Link } from '../../lib/router.jsx';
import './css/legal.css';

// Textos legais. Cada bloco tem um título e parágrafos ou listas.
// Atualize ATUALIZADO_EM sempre que o texto mudar (e avise quem usa, se a mudança for relevante).
// Junto, troque VERSAO_DOS_TERMOS (Frontend/src/lib/termos.js e Backend/src/config/termos.js).
const ATUALIZADO_EM = '24 de novembro de 2026';
const CONTATO = 'privacidade@vera.finance';

const TEXTOS = {
  termos: {
    titulo: 'Termos de uso',
    blocos: [
      [
        '1. O que a vera faz',
        [
          'A vera.finance é um organizador de finanças pessoais: separa a renda em categorias, projeta até que dia o dinheiro dura, guarda metas e compara preços de mercados a partir de notas fiscais e dos sites públicos das redes.',
          'A vera não é banco, não movimenta dinheiro, não pede senha de banco, não vende produtos e não recebe nada de mercados para mostrar preços.'
        ]
      ],
      [
        '2. Quem pode usar',
        [
          'É preciso ter 18 anos ou mais (ou autorização de quem é responsável) e informar dados verdadeiros no cadastro. A conta é pessoal: guarde bem a sua senha.'
        ]
      ],
      [
        '3. Preços e comparações',
        [
          'Os preços vêm dos sites públicos das redes, para o CEP informado, e de notas fiscais lidas pelos usuários. Eles podem mudar a qualquer momento, e a loja física pode ter preços e promoções diferentes dos do site.',
          'A comparação é uma estimativa para ajudar na decisão. O preço que vale é sempre o do caixa. A vera não garante que um produto esteja disponível, nem o valor final da compra.',
          'Marcas, nomes de redes e fotos de produtos pertencem aos seus donos e aparecem só para identificar onde está cada preço. A vera não tem vínculo com as redes citadas.'
        ]
      ],
      [
        '4. Projeções e metas',
        [
          'Saldos, projeções e simulações são calculados com os dados que você informa. Eles não são recomendação de investimento nem aconselhamento financeiro.'
        ]
      ],
      [
        '5. Modo família',
        [
          'Quem cria a família é o dono do ciclo: convida pessoas e decide quais categorias são compartilhadas. Quem entra vê as categorias compartilhadas e os próprios lançamentos. Só convide quem concordar em participar.'
        ]
      ],
      [
        '6. Planos',
        [
          'O plano grátis não expira e tem os limites mostrados na página de planos. Antes de qualquer cobrança, o preço, a forma de pagamento e a renovação aparecem com clareza, e você pode cancelar quando quiser, sem multa. Quem cancela mantém o acesso até o fim do período pago.',
          'Se você contratou pelo site, pode desistir em até 7 dias e receber o valor de volta (Código de Defesa do Consumidor, art. 49).'
        ]
      ],
      [
        '7. Uso correto',
        [
          'Não é permitido usar a vera para fraude, para coletar dados de outras pessoas, para sobrecarregar o serviço ou para burlar limites e a segurança. Contas que fizerem isso podem ser suspensas.'
        ]
      ],
      [
        '8. Disponibilidade e responsabilidade',
        [
          'Trabalhamos para a vera ficar no ar e funcionar bem, mas o serviço pode ter pausas para manutenção ou falhas de serviços de terceiros (como os sites das redes). Respondemos pelos danos que causarmos, nos termos da lei. Não respondemos por decisões tomadas só com base em estimativas de preço ou em projeções.'
        ]
      ],
      [
        '9. Encerrar a conta',
        [
          'Você pode apagar a conta a qualquer momento em Configurações › Dados. Os dados são apagados em 30 dias, e até lá dá para desistir. Veja a Política de Privacidade.'
        ]
      ],
      [
        '10. Mudanças e foro',
        [
          'Se estes termos mudarem de forma relevante, avisaremos no app antes de a mudança valer. Vale a lei brasileira. Como consumidor, você pode resolver qualquer questão no foro do seu domicílio.',
          `Dúvidas: ${CONTATO}.`
        ]
      ]
    ]
  },
  privacidade: {
    titulo: 'Política de privacidade',
    blocos: [
      [
        '1. Quem cuida dos seus dados',
        [
          `A vera.finance é a controladora dos dados pessoais tratados no app, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018, a LGPD). Para qualquer assunto de privacidade, inclusive falar com o encarregado (DPO), escreva para ${CONTATO}.`
        ]
      ],
      [
        '2. Que dados usamos e para quê',
        [
          [
            'Cadastro: nome, e-mail e senha (guardada só como código irreversível) ou o login do Google ou da Apple. Servem para criar e proteger a sua conta (base legal: execução de contrato, LGPD art. 7º, V).',
            'Finanças que você informa: renda, categorias, limites, lançamentos, metas e lista de compras. Servem para mostrar o ciclo, as projeções e a lista (execução de contrato).',
            'Localização: CEP, cidade, ponto aproximado e raio de busca. Servem para achar os mercados perto de você e o preço para o seu CEP. A localização do aparelho só é usada se você tocar em “Usar minha localização” e permitir no navegador (consentimento, art. 7º, I). Você pode trocar ou apagar a localização em Configurações.',
            'Notas fiscais lidas: chave da nota, loja (nome, CNPJ e endereço), itens, preços e data. A vera não guarda o seu CPF, mesmo quando ele aparece na nota.',
            'Modo família: nome e e-mail das pessoas convidadas, para enviar e aceitar o convite.',
            'Lista de interessados: o e-mail deixado no site, para avisar sobre a vera. Você pode pedir para sair a qualquer momento.',
            'Registros técnicos: endereço IP e data e hora de acesso, para segurança e para evitar abuso (legítimo interesse, art. 7º, IX, e Marco Civil da Internet, art. 15).'
          ]
        ]
      ],
      [
        '3. Base de preços anônima',
        [
          'Com a opção “Contribuir com preços anônimos” ligada (ela vem ligada e pode ser desligada em Configurações), só o produto, o preço, a loja e a data da nota entram na base de preços que todos usam. Nada que identifique você entra nessa base.'
        ]
      ],
      [
        '4. Com quem os dados são compartilhados',
        [
          'Não vendemos dados pessoais. Para o app funcionar, alguns serviços recebem apenas o necessário:',
          [
            'Google Firebase (login e banco de dados) e Render (servidor da API), que podem guardar dados fora do Brasil, em empresas que oferecem garantias de proteção (art. 33 da LGPD).',
            'Sites das redes de supermercado: recebem o CEP (não o seu nome) para devolver o preço daquela região.',
            'OpenStreetMap e ViaCEP: recebem o CEP ou um ponto aproximado, para achar a região e os mercados.',
            'Portais da Secretaria da Fazenda: recebem o link da nota fiscal que você leu, para buscar os itens.',
            'Autoridades: quando a lei ou uma ordem judicial exigir.'
          ]
        ]
      ],
      [
        '5. Por quanto tempo guardamos',
        [
          'Enquanto a conta existir. Quando você pede para apagar a conta, tudo é apagado em até 30 dias: perfil, lançamentos, metas, lista, notas, login e participação em família. Registros de acesso ficam guardados por 6 meses, como exige o Marco Civil da Internet. Os preços da base anônima continuam, porque não identificam ninguém.'
        ]
      ],
      [
        '6. Seus direitos',
        [
          'Você pode, a qualquer momento: confirmar se tratamos seus dados e ter acesso a eles; corrigir dados; pedir anonimização, bloqueio ou eliminação; levar seus dados para outro serviço (os lançamentos saem em planilha em Configurações › Dados); saber com quem compartilhamos; retirar um consentimento; e reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
          `Para exercer esses direitos, use as opções em Configurações ou escreva para ${CONTATO}. Respondemos em até 15 dias.`
        ]
      ],
      [
        '7. Segurança',
        [
          'O acesso é feito por conexão criptografada (HTTPS). As senhas ficam guardadas só como código irreversível (scrypt), o banco de dados não é acessível ao público, e o login tem limite de tentativas. Se acontecer um incidente que traga risco para você, avisaremos você e a ANPD.'
        ]
      ],
      [
        '8. Cookies e armazenamento no navegador',
        [
          'A vera não usa cookies de propaganda nem ferramentas de rastreamento. O navegador guarda só o necessário para manter você conectado e as suas preferências de tela, como o tema.'
        ]
      ],
      [
        '9. Crianças e adolescentes',
        [
          'A vera é feita para maiores de 18 anos e não coleta, de propósito, dados de crianças.'
        ]
      ],
      [
        '10. Mudanças nesta política',
        [
          'Se esta política mudar de forma relevante, avisaremos no app. A data abaixo mostra a versão em vigor.'
        ]
      ]
    ]
  }
};

const Paragrafo = ({ texto }) =>
  Array.isArray(texto) ? (
    <ul className="legal__lista">
      {texto.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="legal__p">{texto}</p>
  );

export default function Legal({ tipo }) {
  const t = TEXTOS[tipo];
  const outro = tipo === 'termos' ? ['/privacidade', 'Política de privacidade'] : ['/termos', 'Termos de uso'];
  return (
    <SiteLayout>
      <section className="legal">
        <h1 className="legal__title">{t.titulo}</h1>
        <p className="legal__data">Atualizado em {ATUALIZADO_EM}</p>
        {t.blocos.map(([h, paragrafos]) => (
          <div key={h} className="legal__block">
            <h2 className="legal__h2">{h}</h2>
            {paragrafos.map((p, i) => (
              <Paragrafo key={i} texto={p} />
            ))}
          </div>
        ))}
        <p className="legal__p">
          Veja também: <Link to={outro[0]}>{outro[1]}</Link>.
        </p>
      </section>
      <SiteFooter />
    </SiteLayout>
  );
}
