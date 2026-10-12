import { contexto } from '../models/ContextoModel.js';
import { CicloModel } from '../models/CicloModel.js';
import { MetaModel } from '../models/MetaModel.js';
import { NotaModel } from '../models/NotaModel.js';
import { MercadoModel } from '../models/MercadoModel.js';
import { ComparacaoModel } from '../models/ComparacaoModel.js';
import { materializarRecorrentes } from '../models/RecorrenteModel.js';
import { apresentarMeta } from './metaController.js';
import { sum } from '../utils/money.js';

export const dashboardController = {
  async get({ user }) {
    const ctx = await contexto(user.uid);
    await materializarRecorrentes(ctx.owner, ctx.ownerUid);
    const [atual, anterior, metas, pendentes, mercados] = await Promise.all([
      CicloModel.resumo(ctx, 0),
      CicloModel.resumo(ctx, -1),
      MetaModel.listar(ctx.ownerUid),
      NotaModel.pendentes(ctx.ownerUid),
      MercadoModel.dentroDoRaio(ctx.owner.local?.raioKm || 5, ctx.owner.local)
    ]);
    const dica = await ComparacaoModel.dica(mercados, ctx.owner.local?.mercadoHabitual);

    // Diferença com o ciclo anterior no mesmo ponto (mesmo número de dias).
    const anteriorAteHoje = sum(
      anterior.lancamentos.filter(
        l =>
          l.tipo === 'saida' &&
          new Date(l.data) - new Date(anterior.ciclo.inicio) < atual.ciclo.diaAtual * 86400000
      ),
      l => l.valor
    );
    const alerta =
      atual.categorias.find(c => c.status === 'vai-apertar') ||
      atual.categorias.find(c => c.status === 'estourou') ||
      null;
    const metasApresentadas = metas.map(m => apresentarMeta(m, atual.ciclo));
    const lancs = atual.lancamentos;

    return {
      ciclo: atual.ciclo,
      livre: atual.livre,
      porDia: atual.porDia,
      fechaEm: atual.fechaEm,
      projecao: atual.projecao,
      hojeIndex: atual.hojeIndex,
      categorias: atual.categorias,
      metas: metasApresentadas.slice(0, 2),
      ultimos: lancs.slice(0, 6),
      pendentes: pendentes.slice(0, 3),
      pendentesTotal: pendentes.length,
      alerta,
      dica,
      reservadoEm: atual.ciclo.inicio,
      stats: {
        gastoCiclo: atual.saidas,
        difAnterior: Math.round((atual.saidas - anteriorAteHoje) * 100) / 100,
        notasLidas: lancs.filter(l => l.origem === 'nota').length,
        economia: sum(lancs, l => l.economia || 0),
        comparacoes: lancs.filter(l => l.economia > 0).length,
        guardado: sum(metasApresentadas, m => m.guardado),
        aporteCiclo: sum(metasApresentadas, m => m.aporteCiclo)
      }
    };
  }
};
