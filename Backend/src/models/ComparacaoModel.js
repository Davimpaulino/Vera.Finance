import { PrecoModel } from './PrecoModel.js';
import { addDays, diffDays, startOfDay } from '../utils/dates.js';
import { round2 } from '../utils/money.js';
import { matchScore } from '../utils/text.js';

const FRESCO_DIAS = 14; // nota com até 14 dias: preço fresco
const VALIDO_DIAS = 45; // depois disso o preço não entra na comparação

function ultimoPorMercado(precos, mercados, hoje = new Date()) {
  return mercados.map(m => {
    const doMercado = precos
      .filter(p => p.mercadoId === m.id)
      .sort((a, b) => b.data.localeCompare(a.data));
    const ultimo = doMercado[0];
    const idade = ultimo ? diffDays(ultimo.data, hoje) : null;
    if (!ultimo || idade > VALIDO_DIAS) {
      return { mercado: m, preco: null, estado: 'none', idadeDias: null, leituras: 0 };
    }
    const leituras = doMercado.filter(p => diffDays(p.data, hoje) <= 30).length;
    return {
      mercado: m,
      preco: ultimo.preco,
      data: ultimo.data,
      idadeDias: idade,
      leituras,
      estado: idade <= FRESCO_DIAS ? 'fresh' : 'aged'
    };
  });
}

export const ComparacaoModel = {
  /** Menor preço por semana nos últimos 90 dias (13 pontos). */
  historico(precos, mercadoIds, mercados) {
    const hoje = startOfDay(new Date());
    const doRaio = precos.filter(
      p => mercadoIds.includes(p.mercadoId) && diffDays(p.data, hoje) <= 91
    );
    if (!doRaio.length) return null;
    const pontos = [];
    let ultimo = null;
    for (let w = 12; w >= 0; w--) {
      const ini = addDays(hoje, -(w + 1) * 7 + 1);
      const fim = addDays(hoje, -w * 7);
      const semana = doRaio.filter(p => startOfDay(p.data) >= ini && startOfDay(p.data) <= fim);
      const min = semana.length ? Math.min(...semana.map(p => p.preco)) : ultimo;
      pontos.push(min);
      if (min != null) ultimo = min;
    }
    const primeiro = pontos.find(p => p != null);
    const filled = pontos.map(p => (p == null ? primeiro : p));
    const menor = doRaio.reduce((a, b) => (b.preco < a.preco ? b : a));
    return {
      pontos: filled,
      inicio: addDays(hoje, -90).toISOString(),
      variacaoPct: primeiro
        ? Math.round(((filled[filled.length - 1] - primeiro) / primeiro) * 100)
        : 0,
      menor: {
        preco: menor.preco,
        data: menor.data,
        mercado: (mercados.find(m => m.id === menor.mercadoId) || {}).nome
      }
    };
  },

  /** Preço de cada item da lista por mercado e o total da lista em cada um. */
  async lista(itens, mercados, habitualId) {
    const todos = await PrecoModel.listar();
    const produtos = [...new Set(todos.map(p => p.produto))];
    const casar = nome => {
      const best = produtos.map(p => ({ p, s: matchScore(nome, p) })).sort((a, b) => b.s - a.s)[0];
      return best && best.s >= 0.6 ? best.p : null;
    };

    const porItem = itens.map(i => {
      const produto = casar(i.nome);
      const linhas = produto
        ? ultimoPorMercado(
            todos.filter(p => p.produto === produto),
            mercados
          )
        : [];
      const precos = Object.fromEntries(
        linhas.filter(l => l.preco != null).map(l => [l.mercado.id, l.preco])
      );
      const melhor = linhas.filter(l => l.preco != null).sort((a, b) => a.preco - b.preco)[0];
      const categoria = produto ? (todos.find(p => p.produto === produto) || {}).categoria : null;
      return {
        ...i,
        produtoDaNota: produto,
        categoria,
        precos,
        melhorPreco: melhor ? melhor.preco : null,
        melhorMercado: melhor ? melhor.mercado.nome : null
      };
    });

    const totais = mercados
      .map(m => {
        const comPreco = porItem.filter(i => i.precos[m.id] != null);
        return {
          mercadoId: m.id,
          nome: m.nome,
          distanciaKm: m.distanciaKm,
          total: round2(comPreco.reduce((t, i) => t + i.precos[m.id] * (Number(i.qtd) || 1), 0)),
          itensComPreco: comPreco.length,
          porCategoria: comPreco.reduce((acc, i) => {
            const c = i.categoria || 'Comida';
            acc[c] = round2((acc[c] || 0) + i.precos[m.id] * (Number(i.qtd) || 1));
            return acc;
          }, {})
        };
      })
      .filter(t => t.itensComPreco > 0);

    // Ranqueia por cobertura e depois pelo total: um mercado que não tem metade da lista não "ganha".
    const maxCobertura = Math.max(0, ...totais.map(t => t.itensComPreco));
    const ranking = totais
      .filter(t => t.itensComPreco >= maxCobertura - 1)
      .sort((a, b) => a.total - b.total);
    const habitual = totais.find(t => t.mercadoId === habitualId) || null;

    return {
      itens: porItem,
      totais: ranking.slice(0, 3),
      melhor: ranking[0] || null,
      habitual,
      semPreco: porItem.filter(i => i.melhorPreco == null).map(i => i.nome)
    };
  },

  /** Dica do painel: item que mais subiu no mercado de sempre e onde está mais barato. */
  async dica(mercados, habitualId) {
    if (!habitualId) return null;
    const todos = await PrecoModel.listar();
    const hoje = new Date();
    const produtos = [...new Set(todos.map(p => p.produto))];
    let best = null;
    produtos.forEach(produto => {
      const doProd = todos.filter(p => p.produto === produto);
      const hab = doProd
        .filter(p => p.mercadoId === habitualId)
        .sort((a, b) => a.data.localeCompare(b.data));
      if (hab.length < 2) return;
      const antigo = hab.find(p => diffDays(p.data, hoje) <= 60) || hab[0];
      const atual = hab[hab.length - 1];
      const alta = (atual.preco - antigo.preco) / antigo.preco;
      const linhas = ultimoPorMercado(doProd, mercados).filter(
        l => l.preco != null && l.estado === 'fresh'
      );
      const mais = linhas.sort((a, b) => a.preco - b.preco)[0];
      if (!mais || mais.mercado.id === habitualId) return;
      if (!best || alta > best.altaPct / 100) {
        best = {
          produto,
          altaPct: Math.round(alta * 100),
          desde: antigo.data,
          mercadoHabitual: (mercados.find(m => m.id === habitualId) || {}).nome,
          precoHabitual: atual.preco,
          mercadoBarato: mais.mercado.nome,
          precoBarato: mais.preco
        };
      }
    });
    return best && best.altaPct > 0 ? best : null;
  }
};
