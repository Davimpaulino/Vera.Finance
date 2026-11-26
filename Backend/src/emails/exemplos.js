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
  'alerta-preco': {
    nome: 'Ana',
    itens: [
      {
        produto: 'Arroz tipo 1, 5 kg',
        mercado: 'Mercado Exemplo Centro',
        origem: 'site da rede',
        data: '26/11',
        precoAntes: 'R$ 24,90',
        precoAgora: 'R$ 26,90',
        variacao: '+8%'
      },
      {
        produto: 'Café torrado, 500 g',
        mercado: 'Atacado Exemplo',
        origem: 'nota fiscal',
        data: '25/11',
        precoAntes: 'R$ 19,90',
        precoAgora: 'R$ 17,90',
        variacao: '-10%'
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
