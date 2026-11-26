// Artigos do blog. Cada um vira a página /blog/<slug>, pré-renderizada no build (a lista de
// rotas sai daqui, por src/lib/paginas.js). Mesmo formato dos artigos de ajuda (veja ajuda.js),
// com dois campos a mais:
// - publicadoEm: data de publicação (AAAA-MM-DD), que vai para o JSON-LD (BlogPosting).
// - curto: nome curto para o rodapé do site.
// Depois de escrever, ponha a URL em public/sitemap.xml e em public/llms.txt
// (o teste Backend/test/conteudo.test.js confere). O artigo mais novo vai primeiro.
//
// Regras: conselho prático e verdadeiro. Nada de número inventado: conta de exemplo diz que é
// exemplo, e dado de fora só com a fonte e o link.

export const AUTOR_DO_BLOG = 'vera.finance';

export const POSTS_DO_BLOG = [
  {
    slug: 'economizar-comparando-preco-por-quilo-e-por-litro',
    titulo: 'Como economizar no supermercado comparando preços por quilo e por litro',
    curto: 'Preço por quilo e por litro',
    descricao:
      'Embalagens de tamanhos diferentes enganam. Aprenda a fazer a conta do preço por quilo e por litro e veja os cuidados com pacotes, promoções e concentrados.',
    resumo:
      'O preço da etiqueta diz quanto custa a embalagem, não quanto custa o produto. Para saber o que sai mais barato, compare o preço por quilo, por litro ou por unidade.',
    publicadoEm: '2026-11-26',
    corpo: [
      { titulo: 'A conta' },
      'Divida o preço pela quantidade que vem na embalagem, sempre na mesma unidade:',
      {
        lista: [
          'Preço por quilo = preço ÷ peso em quilos (500 g = 0,5 kg).',
          'Preço por litro = preço ÷ volume em litros (350 ml = 0,35 l).',
          'Preço por unidade = preço ÷ número de unidades (rolos, ovos, sachês).'
        ]
      },
      'Um exemplo com números redondos, só para mostrar a conta: um pacote de 1 kg por R$ 6,00 sai a R$ 6,00 o quilo. Um pacote de 5 kg por R$ 25,00 sai a R$ 5,00 o quilo. Aqui o pacote maior é mais barato por quilo, mas nem sempre é assim. Faça a conta antes de escolher.',
      { titulo: 'Onde a conta engana' },
      {
        lista: [
          'Unidades diferentes: compare grama com grama e mililitro com mililitro. Um pacote de 900 g e um de 1 kg podem parecer iguais na prateleira.',
          'Embalagem com várias unidades: 12 latas de 350 ml são 4,2 litros. Multiplique antes de dividir.',
          '“Leve 3, pague 2”: divida o preço que você paga por tudo o que leva para casa.',
          'Produto concentrado: amaciante e detergente concentrados rendem mais por litro. Compare pelo número de lavagens ou de usos escrito na embalagem, não só pelo volume.',
          'Enlatados: compare o peso drenado, que é o que sobra sem o líquido. Ele costuma vir escrito na lata, junto do peso líquido.',
          'Pacote grande demais: se o produto estraga antes de você usar, o desconto vira desperdício.'
        ]
      },
      { titulo: 'Na prática' },
      {
        lista: [
          'Olhe a etiqueta da prateleira: quando ela traz o preço por quilo ou por litro, em letras menores, use esse número.',
          'Quando a etiqueta não traz, use a calculadora do celular.',
          'Compare a mesma coisa: marca, variante (integral, desnatado) e tamanho mudam o produto.',
          'Anote o que você paga nos itens de sempre: com o tempo, você sabe o que é preço bom no seu bairro.'
        ]
      },
      { titulo: 'Como a vera ajuda' },
      'Ao [montar a lista de compras](/ajuda/montar-a-lista), a vera mostra o preço por quilo ou por litro de cada opção, calculado a partir do tamanho da embalagem, e marca com o selo “melhor custo” a mais barata por quilo ou por litro. Dá para ordenar as opções por “Preço por kg/L”. E a [comparação de preços](/ajuda/como-funciona-a-comparacao) mostra o mesmo produto em cada mercado perto de você.'
    ],
    relacionados: [
      '/ajuda/montar-a-lista',
      '/blog/atacarejo-ou-supermercado-quando-compensa',
      '/ajuda/como-funciona-a-comparacao'
    ]
  },
  {
    slug: 'qr-code-da-nota-fiscal-nfc-e',
    titulo: 'Como ler o QR Code da nota fiscal (NFC-e) e o que ela mostra',
    curto: 'QR Code da NFC-e',
    descricao:
      'O QR Code do cupom abre a nota fiscal no site da Secretaria da Fazenda. Veja como ler, o que a NFC-e mostra e os cuidados para não expor os seus dados.',
    resumo:
      'O QR Code no rodapé do cupom fiscal eletrônico (NFC-e) é um link para a nota no site da Secretaria da Fazenda (Sefaz) do estado. Lendo o código, você vê a compra inteira, item por item.',
    publicadoEm: '2026-11-26',
    corpo: [
      { titulo: 'O que é a NFC-e' },
      'NFC-e é a Nota Fiscal de Consumidor Eletrônica, o cupom emitido em compras no varejo, como no supermercado e na farmácia. O papel que você recebe é um resumo; a nota completa fica na Sefaz e pode ser consultada pelo QR Code ou pela chave de acesso, um número de 44 dígitos impresso no cupom.',
      { titulo: 'Como ler' },
      {
        lista: [
          'Com a câmera do celular: muitos celulares reconhecem QR Code direto na câmera. Toque no link que aparece e a nota abre no navegador.',
          'Com a vera: o leitor do app lê o QR Code e já prepara o gasto com o valor e o nome da loja. Veja o [passo a passo](/ajuda/ler-nota-fiscal).',
          'Sem QR Code legível: a nota também pode ser consultada pela chave de acesso, no site da Sefaz do estado onde a compra foi feita.'
        ]
      },
      'Antes de abrir, confira o endereço: o link da nota é de um site do governo, terminado em .gov.br.',
      { titulo: 'O que a nota mostra' },
      {
        lista: [
          'A loja: nome, CNPJ e endereço.',
          'Cada item: descrição, código, quantidade, unidade, preço unitário e total.',
          'O total da compra, os descontos e a forma de pagamento.',
          'O valor aproximado dos tributos.',
          'A data e a hora da emissão, o número, a série e a chave de acesso.',
          'O CPF, se você informou no caixa.'
        ]
      },
      { titulo: 'Para que serve no dia a dia' },
      {
        lista: [
          'Conferir se o caixa cobrou o preço da etiqueta e a quantidade certa.',
          'Saber quanto você gastou em cada mercado, sem digitar nada.',
          'Comparar o preço que você pagou com o de outros mercados.'
        ]
      },
      { titulo: 'Cuidado com o QR Code' },
      'O QR Code e a chave de acesso abrem a nota inteira para qualquer pessoa. Evite postar foto do cupom em rede social, principalmente se você informou o CPF. Na vera, os preços entram na base de comparação sem a chave da nota, sem nome e sem CPF.'
    ],
    relacionados: [
      '/ajuda/ler-nota-fiscal',
      '/ajuda/como-funciona-a-comparacao',
      '/blog/economizar-comparando-preco-por-quilo-e-por-litro'
    ]
  },
  {
    slug: 'atacarejo-ou-supermercado-quando-compensa',
    titulo: 'Atacarejo ou supermercado: quando compensa',
    curto: 'Atacarejo ou supermercado',
    descricao:
      'O atacarejo pode sair mais barato, mas nem sempre compensa. Veja para quais compras ele faz sentido, quando o supermercado ganha e como fazer a conta.',
    resumo:
      'Atacarejo é a loja que vende no atacado e no varejo ao mesmo tempo: dá para levar uma unidade ou a caixa. O preço costuma cair na compra maior, mas a economia depende do que você compra e de como você compra.',
    publicadoEm: '2026-11-26',
    corpo: [
      { titulo: 'Como o preço funciona no atacarejo' },
      'Muitos atacarejos mostram dois preços na etiqueta: um para quem leva poucas unidades e outro, menor, a partir de uma quantidade mínima. Antes de encher o carrinho, veja a partir de quantas unidades vale o preço menor e faça a [conta do preço por quilo ou por litro](/blog/economizar-comparando-preco-por-quilo-e-por-litro).',
      { titulo: 'Quando o atacarejo costuma compensar' },
      {
        lista: [
          'Itens que não estragam e que a casa usa muito: arroz, feijão, óleo, café, papel higiênico, produtos de limpeza.',
          'Compra do mês, quando dá para pagar tudo de uma vez e há espaço para guardar.',
          'Quando a loja fica no caminho, sem gastar muito tempo ou combustível a mais.',
          'Quando dá para dividir a caixa com alguém da família ou com vizinhos.'
        ]
      },
      { titulo: 'Quando o supermercado costuma ganhar' },
      {
        lista: [
          'Compras pequenas, de reposição, em que a quantidade mínima do atacado não faz sentido.',
          'Frutas, verduras, carnes e outros perecíveis, que estragam se sobrarem.',
          'Quando o atacarejo fica longe: o deslocamento come a economia.',
          'Promoções: às vezes um item específico sai mais barato no mercado do bairro.'
        ]
      },
      { titulo: 'Clubes de compra' },
      'Alguns clubes de compra, como o Sam’s Club, funcionam com cadastro de sócio. Antes de ir, confira as regras e se o cadastro tem custo.',
      { titulo: 'Uma conta simples' },
      'Some o preço da mesma lista nos dois lugares e desconte o que você gasta a mais para chegar à loja mais longe. Se a diferença for pequena, a compra perto de casa pode valer mais pelo tempo que economiza.',
      { titulo: 'Como a vera ajuda' },
      'A vera compara mercados e atacados lado a lado, com a distância de cada loja. Na [lista de compras](/ajuda/montar-a-lista), ela soma a compra em cada mercado do seu raio e, quando vale a pena, mostra como dividir a compra em dois lugares. Veja [quais atacados e supermercados têm preço online](/onde-funciona) perto do seu CEP.'
    ],
    relacionados: [
      '/onde-funciona',
      '/blog/economizar-comparando-preco-por-quilo-e-por-litro',
      '/ajuda/montar-a-lista'
    ]
  },
  {
    slug: 'organizar-renda-por-categorias',
    titulo: 'Como organizar a renda por categorias e saber até que dia o dinheiro dura',
    curto: 'Renda por categorias',
    descricao:
      'Separe a renda do mês em categorias com limite, acompanhe o ritmo de gasto e descubra até que dia o dinheiro de cada categoria dura. Passo a passo e a conta.',
    resumo:
      'Saber o saldo não basta. O que ajuda é saber se o dinheiro chega ao fim do mês no ritmo em que você está gastando. Para isso, separe a renda em categorias e acompanhe cada uma.',
    publicadoEm: '2026-11-26',
    corpo: [
      { titulo: '1. Comece pelo dia em que o dinheiro entra' },
      'O seu mês financeiro não precisa começar no dia 1. Se o salário cai no dia 5, conte o ciclo do dia 5 ao dia 4 do mês seguinte. Assim, cada ciclo começa com a renda já na conta.',
      { titulo: '2. Separe primeiro os gastos fixos' },
      'Liste o que sai todo ciclo, com valor e dia certos: aluguel, condomínio, luz, água, internet, escola, assinaturas. Esse dinheiro já tem destino.',
      { titulo: '3. Divida o resto em categorias com limite' },
      'O que sobra vai para as categorias do dia a dia, cada uma com um limite: Comida, Transporte, Saúde, Lazer. Se quiser guardar para uma meta, crie uma reserva e separe esse valor no começo do ciclo, não no fim.',
      'Some os limites: o total não pode passar da renda do ciclo. Se passar, corte em alguma categoria antes de começar, e não depois.',
      { titulo: '4. Acompanhe o ritmo, não só o saldo' },
      'Para saber até que dia uma categoria dura, veja quanto você gasta por dia:',
      {
        lista: [
          'Ritmo = o que você já gastou na categoria ÷ dias que já passaram do ciclo.',
          'Projeção para o fim do ciclo = o que já gastou + ritmo × dias que faltam.',
          'Até que dia dura = o dia em que, nesse ritmo, o limite acaba.'
        ]
      },
      'Um exemplo com números redondos, só para mostrar a conta: a categoria Comida tem limite de R$ 900 num ciclo de 30 dias. No dia 10, você já gastou R$ 400. O ritmo é de R$ 40 por dia (R$ 400 ÷ 10). Nesse ritmo, os R$ 500 que sobram duram 12 dias e meio: o dinheiro de Comida acaba por volta do dia 22, uma semana antes do fim do ciclo. A projeção para o fim do ciclo é de R$ 1.200 (R$ 400 + R$ 40 × 20 dias), R$ 300 acima do limite. Para fechar dentro dele, o ritmo precisa cair para R$ 25 por dia nos 20 dias que faltam (R$ 500 ÷ 20).',
      { titulo: '5. Ajuste cedo' },
      'Quando a projeção passa do limite, ainda dá tempo de mudar o ritmo ou de tirar dinheiro de uma categoria que está folgada. No fim do ciclo, compare o que planejou com o que gastou e ajuste os limites do próximo.',
      { titulo: 'Como a vera faz essa conta' },
      'No cadastro, a vera pergunta a renda, o dia em que o ciclo vira e os gastos fixos, e sugere as categorias. Depois, calcula o ritmo de cada categoria só com os gastos do dia a dia (os fixos não entram no ritmo, porque não se repetem no ciclo) e soma os fixos que ainda vão sair. Ela avisa quando uma categoria passa de 80% do limite ou vai apertar antes do fim do ciclo. Você não precisa dar a [senha do banco](/ajuda/senha-do-banco): lança o gasto ou lê a nota fiscal. [Crie a conta grátis](/cadastro) para ver o seu mês assim.'
    ],
    relacionados: ['/ajuda/modo-familia', '/ajuda/senha-do-banco', '/precos']
  }
];
