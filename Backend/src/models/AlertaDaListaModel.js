import { banco } from '../config/banco.js';
import { round2 } from '../utils/money.js';

// Alerta de preço da lista: item ainda não comprado que está mais barato em outro mercado do raio
// do que no mercado de sempre.
//
// O alerta sai da comparação que a lista já faz (PrecoRegionalModel.lista ou ComparacaoModel.lista)
// quando a pessoa abre ou mexe na lista: os itens que passam da diferença mínima ficam guardados
// no perfil do dono da lista. As notificações só leem o que ficou guardado, então abrir o sino não
// consulta site de rede nem mapa. O guardado vale por 2 dias e só é regravado quando muda (ou a
// cada 6 h, para a data do alerta continuar certa).
const DIFERENCA_MINIMA = 1; // pelo menos R$ 1 a menos por unidade...
const PERCENTUAL_MINIMO = 0.05; // ...e pelo menos 5% a menos
const MAXIMO_DE_ALERTAS = 3;
const VALIDADE_MS = 2 * 24 * 60 * 60 * 1000;
const RENOVAR_MS = 6 * 60 * 60 * 1000;
// Substituto é outro produto (outra marca): não serve para dizer que "o mesmo item" está mais barato.
const SITUACOES_DO_MESMO_ITEM = new Set(['exato', 'aproximado', 'nota']);

const caminho = uid => `usuarios/${uid}/perfil/alertasDaLista`;
const centavos = valor => Math.round(Number(valor) * 100);
const reais = valor =>
  `R$ ${Number(valor || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const km = valor => `${String(round2(valor)).replace('.', ',')} km`;

// Sem `situacao` (ComparacaoModel.lista, só notas), todo preço é do próprio item.
const mesmoItem = (item, mercadoId) =>
  !item.situacao || !item.situacao[mercadoId] || SITUACOES_DO_MESMO_ITEM.has(item.situacao[mercadoId]);

/**
 * Itens da comparação mais baratos fora do mercado habitual, por uma diferença que vale a viagem.
 * `comparacao` é o retorno de PrecoRegionalModel.lista (ou ComparacaoModel.lista) e `mercados`, os
 * mercados da região. Do que mais economiza (pela quantidade da lista) ao que menos.
 */
export function itensMaisBaratos(comparacao, mercados) {
  const habitual = comparacao?.habitual;
  if (!habitual) return [];
  const loja = id => mercados.find(mercado => mercado.id === id);
  const achados = [];
  for (const item of comparacao.itens || []) {
    if (item.done) continue;
    const precoHabitual = item.precos?.[habitual.mercadoId];
    if (precoHabitual == null || !mesmoItem(item, habitual.mercadoId)) continue;
    const melhor = Object.entries(item.precos)
      .filter(([mercadoId, preco]) => mercadoId !== habitual.mercadoId && preco < precoHabitual)
      .filter(([mercadoId]) => mesmoItem(item, mercadoId) && loja(mercadoId))
      .sort((a, b) => a[1] - b[1])[0];
    if (!melhor) continue;
    const [mercadoId, preco] = melhor;
    const diferenca = round2(precoHabitual - preco);
    if (diferenca < DIFERENCA_MINIMA || diferenca / precoHabitual < PERCENTUAL_MINIMO) continue;
    const mercado = loja(mercadoId);
    achados.push({
      itemId: item.id,
      item: item.nome,
      qtd: Number(item.qtd) || 1,
      mercadoId,
      mercado: mercado.nome,
      distanciaKm: mercado.distanciaKm ?? null,
      preco,
      precoHabitual,
      mercadoHabitual: habitual.nome
    });
  }
  return achados
    .sort((a, b) => (b.precoHabitual - b.preco) * b.qtd - (a.precoHabitual - a.preco) * a.qtd)
    .slice(0, MAXIMO_DE_ALERTAS);
}

const assinatura = (habitualId, itens) =>
  [habitualId || '', ...itens.map(a => `${a.itemId}:${a.mercadoId}:${centavos(a.preco)}:${centavos(a.precoHabitual)}`)].join('|');

export const AlertaDaListaModel = {
  itensMaisBaratos,

  /**
   * Guarda os alertas da comparação que a lista acabou de fazer. `ctx` é o contexto da pessoa
   * (o dono da lista em ctx.owner). Com o alerta desligado nas preferências, não guarda nada.
   */
  async guardar(ctx, comparacao, mercados) {
    if (ctx.owner.prefs?.alertaAltaPreco === false) return;
    const itens = itensMaisBaratos(comparacao, mercados);
    const habitualId = ctx.owner.local?.mercadoHabitual || null;
    const atual = ctx.owner.alertasDaLista;
    const marca = assinatura(habitualId, itens);
    if (!itens.length && !atual?.itens?.length) return;
    const recente = atual?.em && Date.now() - Date.parse(atual.em) < RENOVAR_MS;
    if (atual?.assinatura === marca && recente) return;
    const novo = { em: new Date().toISOString(), habitualId, assinatura: marca, itens };
    try {
      await banco.gravar(caminho(ctx.ownerUid), novo);
      ctx.owner.alertasDaLista = novo;
    } catch (erro) {
      // Alerta é bônus: falha ao gravar não pode derrubar a lista.
      console.error('[alerta da lista]', erro.message);
    }
  },

  /**
   * Notificações dos alertas guardados que ainda valem: o item segue na lista sem comprar, o
   * mercado de sempre é o mesmo e o mais barato continua dentro do raio.
   */
  notificacoes(ctx, itensDaLista) {
    const guardado = ctx.owner.alertasDaLista;
    if (ctx.owner.prefs?.alertaAltaPreco === false || !guardado?.em) return [];
    if (Date.now() - Date.parse(guardado.em) > VALIDADE_MS) return [];
    if ((guardado.habitualId || null) !== (ctx.owner.local?.mercadoHabitual || null)) return [];
    const raioKm = Number(ctx.owner.local?.raioKm) || 5;
    const abertos = new Map(itensDaLista.filter(item => !item.done).map(item => [item.id, item]));
    return (Array.isArray(guardado.itens) ? guardado.itens : Object.values(guardado.itens || {}))
      .filter(
        alerta =>
          abertos.get(alerta.itemId)?.nome === alerta.item &&
          (alerta.distanciaKm == null || alerta.distanciaKm <= raioKm)
      )
      .map(alerta => {
        const diferenca = round2(alerta.precoHabitual - alerta.preco);
        const pct = Math.round((diferenca / alerta.precoHabitual) * 100);
        return {
          // O preço entra no id: o mesmo alerta não volta como novo, mas um preço ainda menor volta.
          id: `lista-${alerta.itemId}-${alerta.mercadoId}-${centavos(alerta.preco)}`,
          tipo: 'lista',
          icone: 'trending-down',
          tom: 'success',
          titulo: `${alerta.item} está mais barato no ${alerta.mercado}`,
          texto:
            `${reais(alerta.preco)} lá e ${reais(alerta.precoHabitual)} no ${alerta.mercadoHabitual}: ` +
            `${reais(diferenca)} a menos (${pct}%)` +
            (alerta.distanciaKm != null ? `, a ${km(alerta.distanciaKm)}.` : '.'),
          data: guardado.em,
          destino: '/app/lista'
        };
      });
  }
};
