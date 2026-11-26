// Artigos da central de ajuda. Cada um vira a página /ajuda/<slug>, pré-renderizada no build
// (a lista de rotas sai daqui, por src/lib/paginas.js). Para escrever um artigo novo, copie um
// bloco e troque os textos; depois ponha a URL em public/sitemap.xml e em public/llms.txt
// (o teste Backend/test/conteudo.test.js confere).
//
// Campos:
// - slug: o fim do endereço. Não mude depois de publicado (o Google guarda o endereço).
// - titulo, descricao: o h1 e a descrição do resultado de busca (até uns 160 caracteres).
// - resumo: o parágrafo de abertura, logo abaixo do título.
// - tipo: 'HowTo' quando o artigo é um passo a passo (aí `passos` é obrigatório); senão 'Article'.
// - passos: [{ nome, texto }], mostrados em ordem antes do corpo.
// - corpo: blocos em ordem. Texto solto é um parágrafo; { titulo } é um subtítulo;
//   { lista: [...] } é uma lista; { lista: [...], numerada: true } é uma lista numerada.
// - relacionados: caminhos de outros artigos ou páginas, para o "Leia também".
// - publicadoEm: data em que o artigo saiu (AAAA-MM-DD). Não muda nas revisões.
// - atualizadoEm: data da última revisão (AAAA-MM-DD), mostrada na página.
// Nos textos, [rótulo](/caminho) vira link (veja formato.js).
//
// O funcionamento descrito aqui foi conferido no código (rotas da API, models e telas do app).
// Preços e promessas de atendimento vêm de Backend/src/models/PlanoModel.js. Se o produto mudar,
// mude o artigo junto: o mesmo texto vai para os buscadores e para as IAs.

export const ARTIGOS_DE_AJUDA = [
  {
    slug: 'ler-nota-fiscal',
    titulo: 'Como ler a nota fiscal pelo QR Code (NFC-e)',
    descricao:
      'Passo a passo para ler o QR Code da NFC-e na vera: pela câmera, por foto ou colando o link. A nota vira um gasto na categoria que você escolher.',
    resumo:
      'Aponte a câmera para o QR Code do rodapé do cupom. A vera busca a nota no site da Secretaria da Fazenda (Sefaz) do estado e prepara um gasto com o valor e o nome da loja para você confirmar.',
    tipo: 'HowTo',
    passos: [
      {
        nome: 'Abra o leitor',
        texto:
          'No Painel, toque em “Ler NF-e”. Também dá para abrir pelo botão “Novo gasto”, em “Ler o QR Code da nota”.'
      },
      {
        nome: 'Aponte para o QR Code',
        texto:
          'Permita o uso da câmera e aponte para o QR Code no rodapé do cupom. A leitura é automática: não precisa apertar nada.'
      },
      {
        nome: 'Sem câmera, use uma foto ou o link',
        texto:
          'Se a câmera não abrir, toque em “Tirar foto do QR Code” ou cole o link que o QR Code contém e toque em “Ler link”.'
      },
      {
        nome: 'Confira e escolha a categoria',
        texto:
          'A vera mostra o valor, o nome da loja e os itens da nota. Escolha a categoria (por exemplo, Comida) e toque em “Lançar”. A nota vira um gasto nessa categoria.'
      },
      {
        nome: 'Ou confirme depois',
        texto:
          'Se fechar sem lançar, a nota fica pendente em Painel › Notas fiscais até você confirmar a categoria.'
      }
    ],
    corpo: [
      { titulo: 'Que nota dá para ler' },
      'A vera lê a NFC-e (Nota Fiscal de Consumidor Eletrônica), o cupom com QR Code no rodapé. O QR Code abre a consulta da nota no site da Sefaz do estado, sempre num endereço terminado em .gov.br. Se ele levar a outro endereço, não é de uma NFC-e e a vera não consegue ler.',
      { titulo: 'Quando a leitura não dá certo' },
      {
        lista: [
          'Nota emitida agora: a Sefaz pode levar alguns minutos para mostrar a nota. Tente de novo mais tarde.',
          'Site da Sefaz fora do ar: tente de novo em alguns minutos ou lance o gasto à mão, em “Novo gasto”.',
          'Formato que a vera ainda não lê: algumas Sefaz mostram a nota num formato diferente. Nesse caso, lance o gasto à mão.',
          'Nota repetida: cada nota entra uma vez só. Se ela já foi lida, a vera avisa.',
          'Câmera bloqueada: libere a câmera nas permissões do navegador. O navegador só libera a câmera em sites com endereço seguro (https).'
        ]
      },
      { titulo: 'Quantas notas por mês' },
      'No plano grátis, a vera lê até 5 notas por mês. No vera+, não há limite. Veja os [planos e como cancelar](/ajuda/planos-e-cancelamento).',
      { titulo: 'O que acontece com os preços da nota' },
      'Com a opção “Contribuir com preços anônimos” ligada, em Configurações, o produto, o preço, a loja e a data de cada item entram na base de preços que todo mundo usa para [comparar](/ajuda/como-funciona-a-comparacao). O seu nome e o seu CPF não entram: a vera não guarda o CPF, mesmo quando ele aparece na nota.'
    ],
    relacionados: [
      '/blog/qr-code-da-nota-fiscal-nfc-e',
      '/ajuda/como-funciona-a-comparacao',
      '/ajuda/senha-do-banco'
    ],
    publicadoEm: '2026-11-26',
    atualizadoEm: '2026-11-26'
  },
  {
    slug: 'como-funciona-a-comparacao',
    titulo: 'Como funciona a comparação de preços',
    descricao:
      'De onde vêm os preços da vera, como ela acha o mesmo produto em mercados diferentes e como soma a lista de compras em cada mercado perto de você.',
    resumo:
      'A vera compara o mesmo produto nos mercados perto do seu CEP, com preços de duas fontes: o site de cada rede e as notas fiscais lidas por quem usa a vera.',
    tipo: 'Article',
    corpo: [
      { titulo: 'Quais mercados entram' },
      'A vera procura os mercados no mapa (OpenStreetMap) num raio de 2 a 15 km do seu CEP. O raio é escolhido em Configurações › Mercado e localização. Sem CEP ou localização, não há mercados perto para comparar.',
      { titulo: 'De onde vêm os preços' },
      {
        lista: [
          'Site da rede: nas [redes com preço online](/onde-funciona), a vera consulta o site público da rede para o seu CEP. Na maioria delas, o preço é o da loja que atende o seu CEP; em algumas, o site tem um preço só para todo lugar.',
          'Nota fiscal: quando alguém lê a NFC-e de uma loja, os preços dela entram na comparação. Vale o preço mais recente daquela loja, de até 45 dias atrás.'
        ]
      },
      'Cada preço mostra a origem e de quando ele é. O preço que vale é sempre o do caixa: veja [por que o preço pode ser diferente na loja](/ajuda/preco-diferente-na-loja).',
      { titulo: 'Como a vera acha o mesmo produto' },
      'Para dizer qual mercado é o mais barato, a vera compara o mesmo produto: o mesmo código de barras ou, sem ele, a mesma marca, o mesmo tamanho e a mesma variante (integral não é desnatado, 1 kg não é 5 kg). Produtos parecidos de outra marca ou de outro tamanho aparecem para você ver, mas o selo de mais barato fica entre os produtos iguais.',
      { titulo: 'Histórico de preço' },
      'Quando o preço de um produto já foi consultado no site das redes em dias diferentes, a vera mostra o menor preço de cada semana nos últimos 90 dias.',
      { titulo: 'Lista de compras' },
      'Na [lista de compras](/ajuda/montar-a-lista), a vera soma a lista em cada mercado do seu raio, de um jeito justo: o mercado que não tem um item não fica mais barato por isso.',
      {
        lista: [
          'Se a loja não tem o produto escolhido, mas tem um equivalente de outra marca (mesmo tipo, tamanho e variante), ele entra no total com o nome à mostra.',
          'Se não tem nem equivalente, o item entra no total com uma estimativa: o preço do meio nos outros mercados.',
          'Quando comprar em dois mercados sai mais barato (pelo menos R$ 5 e 3% a menos), a vera mostra como dividir a compra.'
        ]
      }
    ],
    relacionados: [
      '/onde-funciona',
      '/ajuda/preco-diferente-na-loja',
      '/blog/economizar-comparando-preco-por-quilo-e-por-litro'
    ],
    publicadoEm: '2026-11-26',
    atualizadoEm: '2026-11-26'
  },
  {
    slug: 'preco-diferente-na-loja',
    titulo: 'Por que o preço da vera pode ser diferente na loja',
    descricao:
      'O preço do site da rede e o da nota fiscal são boas pistas, mas o preço que vale é o do caixa. Veja por que eles podem mudar e como conferir antes de comprar.',
    resumo:
      'A comparação da vera ajuda a decidir onde comprar, mas é uma estimativa: o preço que vale é sempre o do caixa. Estes são os motivos mais comuns da diferença.',
    tipo: 'Article',
    corpo: [
      { titulo: 'Os motivos mais comuns' },
      {
        lista: [
          'O site muda a qualquer hora: a rede pode trocar o preço do site a qualquer momento, inclusive logo depois da consulta da vera.',
          'Site e loja física são diferentes: a loja pode ter preços e promoções que não estão no site da rede, e o contrário também.',
          'Preço único no site: em algumas redes, o site mostra o mesmo preço para todas as regiões, e a loja do seu bairro pode cobrar outro.',
          'Loja que atende o seu CEP: o preço do site é o da loja online que atende o seu CEP, que pode não ser a loja física onde você compra.',
          'Preço de nota é de outro dia: o preço que vem de uma nota fiscal é o do dia daquela compra, de até 45 dias atrás.',
          'Promoção com prazo: o preço de promoção do site pode acabar antes de você chegar à loja.',
          'Produto vendido por quilo: em frutas, carnes e frios, o valor final depende do peso na balança.'
        ]
      },
      { titulo: 'Como conferir' },
      {
        lista: [
          'Antes de sair, veja a origem e a data de cada preço na comparação.',
          'Na loja, confira a etiqueta da prateleira e, quando houver, o preço por quilo ou por litro.',
          'Depois da compra, [leia a nota fiscal](/ajuda/ler-nota-fiscal): o preço que você pagou entra na comparação e ajuda quem compra na mesma loja.'
        ]
      },
      'A vera não vende produtos e não recebe nada de mercados para mostrar preços. Se um preço parecer errado, escreva para [ajuda@vera.finance](mailto:ajuda@vera.finance).'
    ],
    relacionados: [
      '/ajuda/como-funciona-a-comparacao',
      '/ajuda/ler-nota-fiscal',
      '/blog/atacarejo-ou-supermercado-quando-compensa'
    ],
    publicadoEm: '2026-11-26',
    atualizadoEm: '2026-11-26'
  },
  {
    slug: 'montar-a-lista',
    titulo: 'Como montar a lista de compras e escolher a marca e o tamanho',
    descricao:
      'Monte a lista de compras na vera, escolha a marca e o tamanho de cada item e veja o total da compra em cada mercado perto de você.',
    resumo:
      'Com a marca e o tamanho escolhidos, a vera compara o produto certo em cada mercado. “Arroz” vira um pacote de uma marca e de um tamanho, e não um nome vago.',
    tipo: 'HowTo',
    passos: [
      {
        nome: 'Confira o seu CEP',
        texto:
          'A lista busca nos mercados perto de você. Confira o CEP e o raio de busca em Configurações › Mercado e localização.'
      },
      {
        nome: 'Busque o que falta',
        texto:
          'Em Lista de compras, digite o produto (pelo menos 3 letras), como “sabão em pó” ou “arroz 5kg”. A vera procura nos sites das redes da sua região.'
      },
      {
        nome: 'Escolha a marca e o tamanho',
        texto:
          'Toque no produto certo. Para achar mais rápido, filtre por marca ou por tamanho e ordene por menor preço ou por preço por kg/L. O selo “melhor custo” marca a opção mais barata por quilo ou por litro.'
      },
      {
        nome: 'Ou deixe sem marca',
        texto:
          'Se tanto faz a marca, toque em “Tanto faz a marca: adicionar só…”. Depois, dá para escolher o produto pelo aviso “Sem marca e tamanho: escolher o produto”, no próprio item.'
      },
      {
        nome: 'Ajuste as quantidades',
        texto: 'Use os botões de menos e de mais em cada item (de 1 a 99).'
      },
      {
        nome: 'Veja onde sai mais barato e finalize',
        texto:
          'Ao lado da lista aparece o total em cada mercado. Depois da compra, toque em “Finalizar lista no…”: a vera lança o gasto, uma linha por categoria, e marca como comprados os itens que têm preço nesse mercado. Os que não têm preço lá continuam na lista.'
      }
    ],
    corpo: [
      { titulo: 'Dicas' },
      {
        lista: [
          'Digite o tamanho na busca (“leite 1l”, “arroz 5kg”) para a vera mostrar esse tamanho primeiro.',
          'Quando um item não tem no mercado mais barato, a vera avisa e diz em quantos mercados ele aparece.',
          'Se comprar em dois mercados economizar o bastante, aparece o quadro “Dividir a compra”, com o que levar de cada um.',
          '“Limpar comprados” tira da lista os itens já marcados.'
        ]
      },
      'Para entender as contas por trás do total, veja [como funciona a comparação](/ajuda/como-funciona-a-comparacao). Para comparar embalagens de tamanhos diferentes, leia [como comparar preços por quilo e por litro](/blog/economizar-comparando-preco-por-quilo-e-por-litro).'
    ],
    relacionados: [
      '/ajuda/como-funciona-a-comparacao',
      '/blog/economizar-comparando-preco-por-quilo-e-por-litro',
      '/ajuda/modo-familia'
    ],
    publicadoEm: '2026-11-26',
    atualizadoEm: '2026-11-26'
  },
  {
    slug: 'modo-familia',
    titulo: 'Como funciona o modo família',
    descricao:
      'No modo família, mais de uma pessoa lança no mesmo ciclo. Veja como criar, convidar, aceitar o convite e escolher quais categorias a casa toda vê.',
    resumo:
      'No modo família, a casa divide um ciclo só: cada pessoa lança os próprios gastos e cada lançamento mostra quem gastou. O modo família faz parte do vera+: até 2 pessoas no mensal e até 5 no anual.',
    tipo: 'HowTo',
    passos: [
      {
        nome: 'Crie o modo família',
        texto:
          'Quem tem o vera+ abre Modo família e toca em “Criar modo família”. Quem cria passa a ser o dono do ciclo.'
      },
      {
        nome: 'Convide pelo e-mail',
        texto:
          'O dono do ciclo toca em “Convidar pessoa” e digita o e-mail de quem vai entrar. Só o dono do ciclo pode convidar.'
      },
      {
        nome: 'Aceite o convite',
        texto:
          'A pessoa convidada entra na vera com esse mesmo e-mail (ou cria a conta com ele). O convite aparece em Modo família e no sino de notificações: é só tocar em “Entrar no ciclo”.'
      },
      {
        nome: 'Escolha o que a casa vê',
        texto:
          'Na tela do modo família, o dono do ciclo liga ou desliga cada categoria. As ligadas ficam visíveis para todos; as outras, só o dono do ciclo vê.'
      }
    ],
    corpo: [
      { titulo: 'O que cada pessoa vê' },
      {
        lista: [
          'O dono do ciclo vê todas as categorias e todos os lançamentos.',
          'Quem entra vê as categorias compartilhadas, os lançamentos delas e os próprios lançamentos.',
          'Ao aceitar o convite, os lançamentos de quem entrou passam a cair no ciclo do dono.',
          'A tela do modo família mostra quanto cada pessoa gastou no ciclo.'
        ]
      },
      'Só convide quem concordar em participar.',
      { titulo: 'Quantas pessoas' },
      'No vera+ mensal, o modo família vai até 2 pessoas; no anual, até 5. A conta inclui o dono do ciclo e os convites ainda não aceitos. Veja os [planos e preços](/precos).',
      { titulo: 'Se o dono do ciclo apagar a conta' },
      'O modo família acaba e cada pessoa volta a ter a própria conta, separada. Os lançamentos feitos no ciclo do dono são apagados junto com a conta dele; antes disso, cada pessoa pode baixar o que lançou em Configurações › Dados. Veja [como baixar os dados e apagar a conta](/ajuda/baixar-dados-e-apagar-conta).'
    ],
    relacionados: [
      '/ajuda/planos-e-cancelamento',
      '/ajuda/baixar-dados-e-apagar-conta',
      '/blog/organizar-renda-por-categorias'
    ],
    publicadoEm: '2026-11-26',
    atualizadoEm: '2026-11-26'
  },
  {
    slug: 'baixar-dados-e-apagar-conta',
    titulo: 'Como baixar os meus dados e apagar a conta',
    descricao:
      'Baixe os lançamentos em planilha ou todos os seus dados num arquivo só, e apague a conta quando quiser. Até 30 dias depois do pedido, dá para desistir.',
    resumo:
      'Os seus dados são seus: dá para levar tudo para outro lugar e apagar a conta a qualquer momento, em Configurações › Dados.',
    tipo: 'HowTo',
    passos: [
      {
        nome: 'Baixe os lançamentos em planilha',
        texto:
          'Em Configurações › Dados, toque em “Exportar lançamentos em planilha”. Vem um arquivo CSV com todos os lançamentos, que abre no Excel e em outros programas de planilha.'
      },
      {
        nome: 'Baixe todos os seus dados',
        texto:
          'Toque em “Baixar todos os meus dados”. Vem um arquivo JSON com o perfil, as categorias, os lançamentos, as metas, a lista e as notas fiscais lidas.'
      },
      {
        nome: 'Peça para apagar a conta',
        texto:
          'Toque em “Apagar a conta” e confirme. Você sai da conta, e tudo é apagado em 30 dias.'
      },
      {
        nome: 'Mudou de ideia?',
        texto:
          'Dentro dos 30 dias, entre de novo e toque em “Desistir de apagar a conta”, em Configurações › Dados.'
      }
    ],
    corpo: [
      { titulo: 'O que é apagado' },
      'O perfil, os lançamentos, as metas, a lista, as notas, o login e a participação em família. Se você é o dono do ciclo num [modo família](/ajuda/modo-familia), ele acaba e cada pessoa volta a ter a própria conta.',
      'Ficam só os preços da base anônima, porque não identificam ninguém, e os registros de acesso, guardados por 6 meses como exige o Marco Civil da Internet. Os detalhes estão na [política de privacidade](/privacidade).',
      'Dúvidas sobre os seus dados: [privacidade@vera.finance](mailto:privacidade@vera.finance).'
    ],
    relacionados: ['/privacidade', '/ajuda/planos-e-cancelamento', '/ajuda/senha-do-banco'],
    publicadoEm: '2026-11-26',
    atualizadoEm: '2026-11-26'
  },
  {
    slug: 'planos-e-cancelamento',
    titulo: 'Planos da vera e como cancelar',
    descricao:
      'O que tem no plano grátis e no vera+, quanto custa cada um e como cancelar a assinatura em Configurações, sem multa.',
    resumo:
      'A vera tem um plano grátis que não expira e o vera+, mensal ou anual. Dá para cancelar quando quiser, sem multa.',
    tipo: 'Article',
    // Planos e preços de Backend/src/models/PlanoModel.js; limites conferidos em notaController,
    // metaController e familiaController; a volta para o grátis, em PlanoModel.emVigor.
    // Se mudarem lá, mude aqui. As regras de cobrança e de desistência ficam nos termos de uso.
    corpo: [
      { titulo: 'O que tem em cada plano' },
      {
        lista: [
          'Grátis (R$ 0, sem cartão): categorias e projeção do ciclo, lista de compras com total, comparação e histórico de preço, alerta de alta de preço, até 3 metas com simulador e 5 notas fiscais lidas por mês.',
          'vera+ mensal (R$ 12,90 por mês): tudo do grátis, com notas e metas ilimitadas e modo família com 2 pessoas.',
          'vera+ anual (R$ 99,90 por ano, o equivalente a R$ 8,33 por mês): tudo do vera+ mensal, modo família com 5 pessoas e suporte por e-mail em 24 horas.'
        ]
      },
      'Em todos os planos, dá para baixar os lançamentos em planilha e todos os seus dados num arquivo só: veja [como baixar os dados](/ajuda/baixar-dados-e-apagar-conta). A tabela completa está em [planos e preços](/precos).',
      { titulo: 'Como assinar' },
      'Em Configurações › Plano, toque em “Assinar mensal” ou em “Trocar para anual”. O plano muda na hora. Também dá para escolher o plano no cadastro.',
      { titulo: 'Como cancelar' },
      {
        numerada: true,
        lista: [
          'Abra Configurações › Plano.',
          'Toque em “Cancelar assinatura” e confirme.',
          'O vera+ continua até o fim do período que já começou. A data aparece logo abaixo do nome do plano. Depois dela, a conta volta para o grátis.'
        ]
      },
      'Mudou de ideia antes dessa data? Toque em “Reativar assinatura”, no mesmo lugar.',
      { titulo: 'O que muda quando a conta volta para o grátis' },
      {
        lista: [
          'A leitura de notas fiscais volta ao limite de 5 por mês.',
          'Nada é apagado. As metas que você já tem continuam, mas só dá para criar outra quando houver menos de 3.',
          'O modo família que já existe continua, mas não dá para criar outro nem convidar mais pessoas.'
        ]
      },
      'Não há multa para cancelar. As regras de cobrança, de renovação e de desistência estão nos [termos de uso](/termos).'
    ],
    relacionados: ['/precos', '/ajuda/modo-familia', '/ajuda/baixar-dados-e-apagar-conta'],
    publicadoEm: '2026-11-26',
    atualizadoEm: '2026-11-26'
  },
  {
    slug: 'senha-do-banco',
    titulo: 'A vera precisa da senha do meu banco?',
    descricao:
      'Não. A vera não pede senha de banco, não se conecta à sua conta e não movimenta dinheiro. Veja como os gastos entram na vera sem acesso ao banco.',
    resumo:
      'Não. A vera nunca pede a senha do seu banco, não se conecta à sua conta bancária e não movimenta dinheiro.',
    tipo: 'Article',
    corpo: [
      { titulo: 'Então como os gastos entram?' },
      {
        lista: [
          'Você lança: em “Novo gasto”, digite quanto foi, onde foi e a categoria.',
          'A nota fiscal lança: [leia o QR Code da NFC-e](/ajuda/ler-nota-fiscal) e confirme a categoria.',
          'A lista lança: ao [finalizar a lista de compras](/ajuda/montar-a-lista), a compra vira gasto.',
          'Os fixos entram sozinhos: a renda e os gastos fixos informados no cadastro (aluguel, contas, assinaturas) aparecem no ciclo no dia de cada um.'
        ]
      },
      { titulo: 'O que a vera pede' },
      'Para criar a conta: nome, e-mail e uma senha só da vera, ou o login do Google. Para comparar preços: o CEP e o raio de busca. Nada de senha de banco, nem acesso ao internet banking ou ao app do banco.',
      { titulo: 'Cuidado com golpes' },
      'Se alguém pedir a senha do seu banco em nome da vera, não passe: é golpe. A vera nunca faz esse pedido. Na dúvida, escreva para [ajuda@vera.finance](mailto:ajuda@vera.finance).'
    ],
    relacionados: ['/privacidade', '/ajuda/ler-nota-fiscal', '/perguntas'],
    publicadoEm: '2026-11-26',
    atualizadoEm: '2026-11-26'
  }
];
