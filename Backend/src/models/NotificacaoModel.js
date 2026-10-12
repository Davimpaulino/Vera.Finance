import { banco } from '../config/banco.js';
import { CicloModel } from './CicloModel.js';
import { MetaModel } from './MetaModel.js';
import { NotaModel } from './NotaModel.js';
import { FamiliaModel } from './FamiliaModel.js';
import { MercadoModel } from './MercadoModel.js';
import { ComparacaoModel } from './ComparacaoModel.js';
import { sum } from '../utils/money.js';

// As notificações nascem do estado atual (notas pendentes, limites, convites, metas e preços).
// Cada uma diz para onde leva; "vistas" guarda só os ids que a pessoa já abriu.
const reais = valor =>
  `R$ ${Number(valor || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const caminhoDasVistas = uid => `usuarios/${uid}/perfil/notificacoesVistas`;

export const NotificacaoModel = {
  async montar(ctx) {
    const [notas, resumo, metas, familias, mercados, vistas] = await Promise.all([
      NotaModel.pendentes(ctx.ownerUid),
      CicloModel.resumo(ctx),
      MetaModel.listar(ctx.ownerUid),
      ctx.user.email ? FamiliaModel.listar() : [],
      MercadoModel.dentroDoRaio(ctx.owner.local?.raioKm || 5, ctx.owner.local),
      banco.ler(caminhoDasVistas(ctx.uid))
    ]);
    const lista = [];

    notas.forEach(nota =>
      lista.push({
        id: `nota-${nota.id}`,
        tipo: 'nota',
        icone: 'receipt-text',
        tom: 'accent',
        titulo: `Confirme a nota de ${nota.estabelecimento}`,
        texto: `${reais(nota.valor)} · ${nota.itens} ${nota.itens === 1 ? 'item' : 'itens'}. Escolha a categoria para lançar.`,
        data: nota.lidaEm,
        notaId: nota.id,
        nota: {
          id: nota.id,
          estabelecimento: nota.estabelecimento,
          valor: nota.valor,
          itens: nota.itens,
          lidaEm: nota.lidaEm,
          produtos: nota.produtos || []
        }
      })
    );

    resumo.categorias
      .filter(cat => !cat.reserva && cat.alerta80 && cat.limite > 0)
      .forEach(cat => {
        if (cat.status === 'estourou')
          lista.push({
            id: `estourou-${cat.id}-${resumo.ciclo.inicio.slice(0, 10)}`,
            tipo: 'limite',
            icone: 'circle-alert',
            tom: 'danger',
            titulo: `${cat.nome} estourou o limite`,
            texto: `Já saíram ${reais(cat.usado)} de ${reais(cat.limite)} neste ciclo.`,
            data: cat.estourouEm,
            destino: '/app/metas'
          });
        else if (cat.status === 'vai-apertar' || cat.pct >= 80)
          lista.push({
            id: `aperto-${cat.id}-${resumo.ciclo.inicio.slice(0, 10)}`,
            tipo: 'limite',
            icone: 'triangle-alert',
            tom: 'warning',
            titulo:
              cat.pct >= 80
                ? `${cat.nome} já usou ${cat.pct}% do limite`
                : `${cat.nome} vai passar do limite no ritmo atual`,
            texto:
              cat.diasRestantes != null
                ? `Sobram ${reais(cat.livre)} e, gastando assim, acabam em ${cat.diasRestantes} ${cat.diasRestantes === 1 ? 'dia' : 'dias'}.`
                : `Sobram ${reais(cat.livre)} até a virada do ciclo.`,
            data: null,
            destino: '/app/metas'
          });
      });

    const email = String(ctx.user.email || '').toLowerCase();
    familias
      .filter(familia => (familia.convitesEmails || []).includes(email))
      .forEach(familia =>
        lista.push({
          id: `convite-${familia.id}`,
          tipo: 'familia',
          icone: 'users',
          tom: 'info',
          titulo: `Convite para a família ${familia.nome || ''}`.trim(),
          texto: 'Aceite para lançar no mesmo ciclo e dividir as categorias.',
          data: null,
          destino: '/app/familia'
        })
      );

    metas.forEach(meta => {
      const guardado = sum(meta.aportes || [], aporte => aporte.valor);
      if (meta.alvo > 0 && guardado >= meta.alvo)
        lista.push({
          id: `meta-${meta.id}`,
          tipo: 'meta',
          icone: 'target',
          tom: 'success',
          titulo: `Meta batida: ${meta.nome}`,
          texto: `Você juntou ${reais(guardado)}. Edite o valor ou crie a próxima meta.`,
          data: null,
          destino: '/app/metas'
        });
    });

    if (ctx.owner.prefs?.alertaAltaPreco !== false) {
      const dica = await ComparacaoModel.dica(mercados, ctx.owner.local?.mercadoHabitual);
      if (dica)
        lista.push({
          id: `preco-${dica.produto}-${dica.precoHabitual}`,
          tipo: 'preco',
          icone: 'trending-up',
          tom: 'warning',
          titulo: `${dica.produto} subiu ${dica.altaPct}% no ${dica.mercadoHabitual}`,
          texto: `No ${dica.mercadoBarato} está ${reais(dica.precoBarato)}. Compare antes de comprar.`,
          data: null,
          destino: `/app/comparar?produto=${encodeURIComponent(dica.produto)}`
        });
    }

    const jaVistas = new Set(Array.isArray(vistas) ? vistas : Object.values(vistas || {}));
    const notificacoes = lista.map(item => ({ ...item, vista: jaVistas.has(item.id) }));
    return { notificacoes, naoVistas: notificacoes.filter(item => !item.vista).length };
  },

  async marcarVistas(uid, ids) {
    const atuais = (await banco.ler(caminhoDasVistas(uid))) || [];
    const juntas = [...new Set([...(Array.isArray(atuais) ? atuais : Object.values(atuais)), ...ids])];
    await banco.gravar(caminhoDasVistas(uid), juntas.slice(-200));
  }
};
