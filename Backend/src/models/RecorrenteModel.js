import { cycleFor, addDays, startOfDay } from '../utils/dates.js';
import { FixoModel } from './FixoModel.js';
import { LancamentoModel } from './LancamentoModel.js';
import { CategoriaModel } from './CategoriaModel.js';

const ymd = d => new Date(d).toISOString().slice(0, 10).replace(/-/g, '');

/**
 * Garante que a renda fixa e os gastos fixos do ciclo atual existam como lançamentos
 * assim que o dia deles chega. Ids determinísticos evitam duplicar.
 */
export async function materializarRecorrentes(owner, ownerUid) {
  const diaVirada = owner.ciclo?.diaVirada || 5;
  const ciclo = cycleFor(diaVirada);
  const hoje = startOfDay(new Date());
  const inicio = startOfDay(ciclo.inicio);

  if (owner.ciclo?.rendaFixa > 0) {
    await LancamentoModel.gravarSeNovo(ownerUid, `renda_${ymd(inicio)}`, {
      titulo: 'Salário',
      valor: owner.ciclo.rendaFixa,
      tipo: 'entrada',
      categoriaId: null,
      categoriaNome: 'entrada',
      origem: 'recorrente',
      data: inicio.toISOString(),
      quemId: ownerUid,
      quemNome: owner.nome || 'Você'
    });
  }

  const [fixos, cats] = await Promise.all([
    FixoModel.listar(ownerUid),
    CategoriaModel.listar(ownerUid)
  ]);
  for (const f of fixos) {
    // Data do fixo dentro do ciclo: o dia `f.dia` que cai entre o início e o fim.
    let data = new Date(inicio.getFullYear(), inicio.getMonth(), f.dia);
    if (data < inicio) data = new Date(inicio.getFullYear(), inicio.getMonth() + 1, f.dia);
    if (data > hoje || data > addDays(ciclo.fim, 0)) continue;
    const cat = cats.find(c => c.id === f.categoriaId) || cats.find(c => c.nome === f.categoria);
    await LancamentoModel.gravarSeNovo(ownerUid, `fixo_${f.id}_${ymd(data)}`, {
      titulo: f.nome,
      valor: f.valor,
      tipo: 'saida',
      categoriaId: cat ? cat.id : null,
      categoriaNome: cat ? cat.nome : f.categoria,
      origem: 'recorrente',
      data: data.toISOString(),
      quemId: ownerUid,
      quemNome: owner.nome || 'Você'
    });
  }
}
