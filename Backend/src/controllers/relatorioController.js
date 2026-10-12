import { contexto } from '../models/ContextoModel.js';
import { CicloModel } from '../models/CicloModel.js';
import { LancamentoModel } from '../models/LancamentoModel.js';
import { round2, sum } from '../utils/money.js';

function estabelecimentos(lancs) {
  const map = new Map();
  lancs
    .filter(l => l.tipo === 'saida')
    .forEach(l => {
      const g = map.get(l.titulo) || {
        local: l.titulo,
        notas: 0,
        lancamentos: 0,
        categorias: new Set(),
        total: 0
      };
      g.lancamentos += 1;
      if (l.origem === 'nota') g.notas += 1;
      g.categorias.add(l.categoriaNome);
      g.total = round2(g.total + l.valor);
      map.set(l.titulo, g);
    });
  return [...map.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(g => ({ ...g, categorias: [...g.categorias] }));
}

export const relatorioController = {
  async get({ user }) {
    const ctx = await contexto(user.uid);
    const ciclos = await Promise.all([-5, -4, -3, -2, -1, 0].map(o => CicloModel.resumo(ctx, o)));
    const atual = ciclos[5];
    const ano = new Date().getFullYear();

    const serieCiclos = ciclos.map(c => ({ inicio: c.ciclo.inicio, total: c.saidas }));
    const doAno = ciclos.filter(
      c => new Date(c.ciclo.inicio).getFullYear() === ano && c.saidas > 0
    );
    const fechados = doAno.filter(c => c !== atual);
    const base = fechados.length ? fechados : doAno;
    const maior = base.reduce((a, b) => (!a || b.saidas > a.saidas ? b : a), null);
    const menor = base.reduce((a, b) => (!a || b.saidas < a.saidas ? b : a), null);

    const todos = await LancamentoModel.listar(ctx.ownerUid);
    const meses = Array.from({ length: new Date().getMonth() + 1 }, (_, m) => ({
      mes: new Date(ano, m, 1).toISOString(),
      total: sum(
        todos.filter(
          l =>
            l.tipo === 'saida' &&
            new Date(l.data).getFullYear() === ano &&
            new Date(l.data).getMonth() === m
        ),
        l => l.valor
      )
    }));

    const estouros = ciclos.reduce(
      (t, c) => t + c.categorias.filter(k => k.limite && k.usado > k.limite).length,
      0
    );
    const ciclosComEstouro = ciclos.filter(c =>
      c.categorias.some(k => k.limite && k.usado > k.limite)
    ).length;

    // Categoria que mais caiu: média dos 3 ciclos fechados mais recentes contra os 3 anteriores.
    let insight = null;
    atual.categorias.forEach(cat => {
      const v = ciclos.map(c => (c.categorias.find(k => k.id === cat.id) || {}).usado || 0);
      const antes = (v[0] + v[1] + v[2]) / 3;
      const depois = (v[2] + v[3] + v[4]) / 3;
      if (antes <= 0) return;
      const queda = Math.round(((antes - depois) / antes) * 100);
      if (queda > 0 && (!insight || queda > insight.quedaPct))
        insight = { categoria: cat.nome, quedaPct: queda, de: round2(antes), para: round2(depois) };
    });

    const economiaAno = sum(
      todos.filter(l => new Date(l.data).getFullYear() === ano),
      l => l.economia || 0
    );

    return {
      ciclos: serieCiclos,
      meses,
      porCategoria: atual.categorias.map(c => ({
        nome: c.nome,
        total: c.usado,
        limite: c.limite,
        pct: c.pct,
        status: c.status
      })),
      categorias: atual.categorias,
      estabelecimentos: estabelecimentos(atual.lancamentos),
      difAnterior: round2(atual.saidas - ciclos[4].saidas),
      maisSubiram: atual.categorias
        .map(c => ({
          nome: c.nome,
          dif: round2(c.usado - ((ciclos[4].categorias.find(k => k.id === c.id) || {}).usado || 0))
        }))
        .filter(c => c.dif > 0)
        .sort((a, b) => b.dif - a.dif)
        .slice(0, 2)
        .map(c => c.nome),
      resumo: {
        mediaAno: base.length ? round2(sum(base, c => c.saidas) / base.length) : 0,
        maior: maior ? { total: maior.saidas, inicio: maior.ciclo.inicio } : null,
        menor: menor ? { total: menor.saidas, inicio: menor.ciclo.inicio } : null,
        economiaAno,
        estouros,
        ciclosComEstouro,
        ciclos: ciclos.length
      },
      insight
    };
  }
};
