// Planos são estáticos: vivem no código, não no banco.
// Comparação e histórico de preço valem para todos os planos (mercadoController.comparar
// não olha o plano). Se isso mudar, mude também o texto aqui, em Perguntas.jsx, no llms.txt e no
// artigo de ajuda "planos-e-cancelamento" (Frontend/src/conteudo/ajuda.js).
export const PLANOS = [
  {
    id: 'gratis',
    nome: 'Grátis',
    preco: 0,
    periodo: 'sempre',
    nota: 'para sempre, sem cartão',
    resumo: '5 notas por mês · até 3 metas',
    limites: { notasPorMes: 5, metas: 3, familia: 1 },
    itens: [
      ['Categorias e projeção do ciclo', true],
      ['Lista de compras com total', true],
      ['Comparação e histórico de preço', true],
      ['Até 3 metas', true],
      ['5 notas lidas por mês', false],
      ['Sem modo família', false]
    ]
  },
  {
    id: 'mensal',
    nome: 'vera+ mensal',
    preco: 12.9,
    periodo: 'mes',
    nota: 'por mês, cancele quando quiser',
    destaque: true,
    resumo: 'notas ilimitadas · metas ilimitadas · família',
    limites: { notasPorMes: null, metas: null, familia: 2 },
    itens: [
      ['Tudo do grátis', true],
      ['Notas ilimitadas', true],
      ['Metas ilimitadas com simulador', true],
      ['Modo família com 2 pessoas', true],
      ['Alerta de preço por produto', true]
    ]
  },
  {
    id: 'anual',
    nome: 'vera+ anual',
    preco: 99.9,
    periodo: 'ano',
    nota: 'por ano · equivale a R$ 8,33/mês',
    resumo: 'dois meses grátis · exportar o ano',
    limites: { notasPorMes: null, metas: null, familia: 5 },
    itens: [
      ['Tudo do vera+', true],
      ['Cobrança uma vez por ano', true],
      ['Exportar o ano em planilha', true],
      ['Modo família com 5 pessoas', true],
      ['Suporte por e-mail em 24h', true]
    ]
  }
];

export const PlanoModel = {
  listar: () => PLANOS,
  buscar: id => PLANOS.find(p => p.id === id) || null,

  /**
   * Plano e assinatura que valem agora para um perfil. Cancelar só marca a assinatura
   * (`cancelada` e `ativaAte`, o fim do período já começado) e nada roda nessa data para trocar o
   * plano. Por isso a troca acontece na leitura: passou de `ativaAte`, a conta é do grátis, sem
   * assinatura, e os limites do grátis voltam a valer. Nada é apagado: metas e modo família que
   * já existem continuam; só não dá para passar dos limites do grátis daí em diante.
   * Cancelada sem data de fim que dê para ler não tem período a respeitar: volta para o grátis.
   */
  emVigor(perfil, agora = new Date()) {
    const assinatura = perfil?.assinatura || null;
    const plano = perfil?.plano || 'gratis';
    if (!assinatura?.cancelada) return { plano, assinatura };
    const fim = Date.parse(assinatura.ativaAte);
    if (fim > agora.getTime()) return { plano, assinatura };
    return { plano: 'gratis', assinatura: null };
  }
};
