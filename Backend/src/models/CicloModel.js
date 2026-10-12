import { cycleFor, addDays, diffDays, startOfDay } from '../utils/dates.js';
import { round2, sum } from '../utils/money.js';
import { CategoriaModel } from './CategoriaModel.js';
import { FixoModel } from './FixoModel.js';
import { LancamentoModel } from './LancamentoModel.js';
import { podeVerCategoria } from './ContextoModel.js';

/**
 * Estado de uma categoria no ciclo: uso, ritmo, até quando dura.
 * O ritmo diário conta só o gasto variável; fixos (aluguel, assinatura) não se repetem no ciclo
 * e os que ainda vão sair entram como `fixosPendentes`.
 */
export function estadoCategoria(cat, lancs, ciclo, fixosPendentes = []) {
  const doCat = lancs.filter(l => l.tipo === 'saida' && l.categoriaId === cat.id);
  const usado = sum(doCat, l => l.valor);
  const variavel = sum(
    doCat.filter(l => l.origem !== 'recorrente'),
    l => l.valor
  );
  const pendentes = fixosPendentes.filter(f => f.categoriaId === cat.id);
  const aSair = sum(pendentes, f => f.valor);
  const limite = Number(cat.limite) || 0;
  const pct = limite ? Math.round((usado / limite) * 100) : 0;
  const ritmo = ciclo.diaAtual ? variavel / ciclo.diaAtual : 0;
  const projetado = round2(usado + ritmo * ciclo.restantes + aSair);
  let esgotaEm = null;
  if (usado < limite && projetado > limite) {
    // Simula dia a dia: ritmo variável mais os fixos no dia em que saem.
    let saldo = limite - usado;
    for (let i = 1; i <= ciclo.restantes; i++) {
      const dia = addDays(new Date(), i);
      saldo -=
        ritmo +
        sum(
          pendentes.filter(f => startOfDay(f.data).getTime() === dia.getTime()),
          f => f.valor
        );
      if (saldo < 0) {
        esgotaEm = addDays(new Date(), i - 1).toISOString();
        break;
      }
    }
  }
  let status = 'ok';
  if (limite && usado > limite) status = 'estourou';
  else if (limite && projetado > limite) status = 'vai-apertar';
  else if (limite && pct < 35 && ciclo.diaAtual / ciclo.totalDias > 0.4) status = 'folgada';

  const ultimoEstouro =
    status === 'estourou'
      ? doCat
          .slice()
          .sort((a, b) => a.data.localeCompare(b.data))
          .reduce(
            (acc, l) => {
              acc.total += l.valor;
              if (!acc.data && acc.total > limite) acc.data = l.data;
              return acc;
            },
            { total: 0, data: null }
          ).data
      : null;

  return {
    id: cat.id,
    nome: cat.nome,
    icon: cat.icon,
    limite,
    alerta80: cat.alerta80 !== false,
    compartilhada: !!cat.compartilhada,
    reserva: !!cat.reserva,
    ordem: cat.ordem,
    usado,
    livre: round2(limite - usado),
    pct,
    status,
    esgotaEm,
    estourouEm: ultimoEstouro,
    projetado,
    diasRestantes: esgotaEm ? diffDays(new Date(), esgotaEm) : null,
    lancamentos: doCat.length,
    deNota: doCat.filter(l => l.origem === 'nota').length,
    recorrentes: doCat.filter(l => l.origem === 'recorrente').length,
    aSair,
    porDiaParaFechar:
      limite > usado + aSair ? round2((limite - usado - aSair) / (ciclo.restantes + 1)) : 0
  };
}

export const CicloModel = {
  /** Resumo do ciclo atual (ou deslocado) para o contexto do usuário. */
  async resumo(ctx, offset = 0) {
    const ciclo = cycleFor(ctx.owner.ciclo?.diaVirada || 5, new Date(), offset);
    const [cats, todos, fixos] = await Promise.all([
      CategoriaModel.listarOrdenado(ctx.ownerUid),
      LancamentoModel.entreDatas(ctx.ownerUid, ciclo.inicio, ciclo.fim),
      FixoModel.listar(ctx.ownerUid)
    ]);
    const categorias = cats.filter(c => podeVerCategoria(ctx, c));
    const visiveisIds = new Set(categorias.map(c => c.id));
    const lancs = todos.filter(
      l => l.tipo === 'entrada' || visiveisIds.has(l.categoriaId) || l.quemId === ctx.uid
    );

    const entradasLanc = sum(
      lancs.filter(l => l.tipo === 'entrada'),
      l => l.valor
    );
    const rendaPrevista = round2(
      (ctx.owner.ciclo?.rendaFixa || 0) + (ctx.owner.ciclo?.rendaVariavel || 0)
    );
    const entradas = entradasLanc || rendaPrevista;
    const saidas = sum(
      lancs.filter(l => l.tipo === 'saida'),
      l => l.valor
    );
    const livre = round2(entradas - saidas);
    const variavel = sum(
      lancs.filter(l => l.tipo === 'saida' && l.origem !== 'recorrente'),
      l => l.valor
    );
    const ritmo = ciclo.diaAtual ? variavel / ciclo.diaAtual : 0;

    // Fixos que ainda caem neste ciclo (o dia deles está depois de hoje).
    const hoje = startOfDay(new Date());
    const inicio = startOfDay(ciclo.inicio);
    const fixosPendentes =
      offset !== 0
        ? []
        : fixos
            .map(f => {
              let d = new Date(inicio.getFullYear(), inicio.getMonth(), f.dia);
              if (d < inicio) d = new Date(inicio.getFullYear(), inicio.getMonth() + 1, f.dia);
              return { ...f, data: d.toISOString() };
            })
            .filter(
              f =>
                startOfDay(f.data) > hoje &&
                startOfDay(f.data) <= startOfDay(ciclo.fim) &&
                categorias.some(c => c.id === f.categoriaId)
            );
    const aSair = sum(fixosPendentes, f => f.valor);
    const fechaEm = round2(livre - ritmo * ciclo.restantes - aSair);
    const porDia = round2(Math.max(0, livre - aSair) / (ciclo.restantes + 1));

    // Saldo dia a dia: real até hoje, projetado no ritmo atual depois.
    const projecao = [];
    for (let i = 0; i < ciclo.totalDias; i++) {
      const dia = addDays(ciclo.inicio, i);
      if (i < ciclo.diaAtual) {
        const ate = lancs.filter(l => startOfDay(l.data) <= dia);
        const e =
          sum(
            ate.filter(l => l.tipo === 'entrada'),
            l => l.valor
          ) || entradas;
        projecao.push(
          round2(
            e -
              sum(
                ate.filter(l => l.tipo === 'saida'),
                l => l.valor
              )
          )
        );
      } else {
        const fixosAte = sum(
          fixosPendentes.filter(f => startOfDay(f.data) <= dia),
          f => f.valor
        );
        projecao.push(round2(livre - ritmo * (i - ciclo.diaAtual + 1) - fixosAte));
      }
    }

    const estados = categorias.map(c => estadoCategoria(c, lancs, ciclo, fixosPendentes));
    const gasto = estados.filter(c => !c.reserva);
    const reservado = sum(estados, c => c.limite);

    return {
      ciclo,
      entradas,
      saidas,
      livre,
      porDia,
      fechaEm,
      ritmoDiario: round2(ritmo),
      fixosPendentes: aSair,
      projecao,
      hojeIndex: ciclo.diaAtual - 1,
      categorias: gasto,
      reservas: estados.filter(c => c.reserva),
      reservado,
      semDestino: round2(entradas - reservado),
      consumidoPct: entradas ? Math.round((saidas / entradas) * 100) : 0,
      lancamentos: lancs
    };
  }
};
