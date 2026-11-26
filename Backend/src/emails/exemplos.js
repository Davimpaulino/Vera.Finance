// Dados de exemplo de cada modelo de e-mail: mostram os campos que cada um pede e servem para
// o teste (test/emails.test.js) e para ver os e-mails no navegador (scripts/ver-emails.mjs).
// Tudo aqui é fictício: pessoa, mercados e preços são só para preencher o modelo. Mercado de
// exemplo nunca leva nome de rede de verdade ao lado de um preço inventado.
// Os links de camposPadrao() (linkApp, linkConfiguracoes, linkLista...) não precisam vir aqui.
export const EXEMPLOS = {
  'boas-vindas': { nome: 'Ana' },
  'confirme-email': {
    nome: 'Ana',
    linkConfirmacao: 'https://vera-finance.onrender.com/confirmar?codigo=exemplo',
    validade: '24 horas'
  },
  'recibo-pagamento': {
    nome: 'Ana',
    plano: 'vera+ mensal',
    valor: 'R$ 12,90',
    dataDoPagamento: '26/11/2026',
    periodo: '26/11/2026 a 25/12/2026',
    formaDePagamento: 'Cartão final 0000',
    codigo: 'EXEMPLO-0001',
    proximaCobranca: '26/12/2026',
    primeiraCompra: true
  },
  'cobranca-falhou': {
    nome: 'Ana',
    plano: 'vera+ mensal',
    valor: 'R$ 12,90',
    dataDaTentativa: '26/11/2026',
    dataLimite: '03/12/2026',
    linkPagamento: 'https://vera-finance.onrender.com/app/configuracoes'
  },
  'assinatura-cancelada': { nome: 'Ana', plano: 'vera+ mensal', ativaAte: '25/12/2026' },
  'exclusao-agendada': { nome: 'Ana', dataDaExclusao: '26/12/2026' },
  'conta-apagada': { nome: 'Ana' },
  // O mesmo aviso do sino (AlertaDaListaModel.notificacoes): item ainda não comprado que está mais
  // barato em outro mercado do raio do que no mercado de sempre. Os campos de cada item seguem os
  // alertas guardados (item, mercado, preco, precoHabitual, distanciaKm), já formatados; diferenca
  // e percentual são as contas do sino. O mercado de sempre é o mesmo para todos os itens. `data` é
  // o dia da comparação, e cada item pode vir sem `distancia`.
  'alerta-preco': {
    nome: 'Ana',
    mercadoHabitual: 'Mercado Exemplo Centro',
    data: '26/11/2026',
    itens: [
      {
        item: 'Arroz tipo 1, 5 kg',
        mercado: 'Atacado Exemplo',
        preco: 'R$ 21,90',
        precoHabitual: 'R$ 24,90',
        diferenca: 'R$ 3,00',
        percentual: '12%',
        distancia: '2,4 km'
      },
      {
        item: 'Café torrado, 500 g',
        mercado: 'Mercado Exemplo Bairro',
        preco: 'R$ 17,90',
        precoHabitual: 'R$ 19,90',
        diferenca: 'R$ 2,00',
        percentual: '10%',
        distancia: '1,1 km'
      }
    ],
    linkDescadastro: 'https://vera-finance.onrender.com/app/configuracoes'
  },
  'resumo-semanal': {
    nome: 'Ana',
    periodo: '16 a 22 de novembro',
    totalGasto: 'R$ 312,40',
    livre: 'R$ 845,00',
    projecao: 'No ritmo desta semana, o dinheiro dura até o fim do ciclo, com R$ 120,00 sobrando.',
    categorias: [
      { categoria: 'Comida', gasto: 'R$ 210,40', restante: 'R$ 389,60' },
      { categoria: 'Rolê', gasto: 'R$ 102,00', restante: 'R$ 98,00' }
    ],
    linkDescadastro: 'https://vera-finance.onrender.com/app/configuracoes'
  }
};
