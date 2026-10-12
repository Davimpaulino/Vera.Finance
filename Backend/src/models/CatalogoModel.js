import { banco } from '../config/banco.js';
import { matchScore, normalize } from '../utils/text.js';
import { CatalogoVtexModel } from './CatalogoVtexModel.js';
import { CatalogoGpaModel } from './CatalogoGpaModel.js';
import { CatalogoPagueMenosModel } from './CatalogoPagueMenosModel.js';
import { CatalogoTendaModel } from './CatalogoTendaModel.js';
import { CatalogoOccModel } from './CatalogoOccModel.js';

// Busca de produtos no site de cada rede, já filtrada pelo CEP de quem pergunta.
// Cada plataforma tem o seu leitor; aqui ficam a pontuação, o cache e o histórico.
const VALIDADE_MS = 30 * 60 * 1000;
const emCache = new Map();
const DE_BICHO = /\b(racao|caes|cao|gatos?|pet|petisco|filhotes?)\b/;

const LEITORES = {
  vtex: CatalogoVtexModel,
  gpa: CatalogoGpaModel,
  paguemenos: CatalogoPagueMenosModel,
  tenda: CatalogoTendaModel,
  occ: CatalogoOccModel
};

// Prefere o produto cujo nome começa pela palavra buscada ("arroz…" antes de "ração … arroz")
// e tira ração de bicho quando a busca não fala de bicho.
function pontuar(termo, item) {
  const busca = normalize(termo);
  const nome = normalize(item.produto);
  if (DE_BICHO.test(nome) && !DE_BICHO.test(busca)) return 0;
  const primeira = busca.split(' ')[0];
  return matchScore(termo, item.produto) + (nome.startsWith(primeira) ? 0.1 : 0);
}

export const chaveDeProduto = item =>
  item.ean || normalize(item.produto).replace(/[^a-z0-9]+/g, '-').slice(0, 80);

export const CatalogoModel = {
  /**
   * { situacao, produtos } da rede para o termo e o CEP. situacao: 'ok', 'semEntrega'
   * (a rede não vende online para o CEP), 'semCep' ou 'falhou'. Produtos do mais parecido ao menos.
   */
  async buscar(rede, termo, cep = '') {
    const chave = `${rede.id}|${cep}|${normalize(termo)}`;
    const guardado = emCache.get(chave);
    if (guardado && Date.now() - guardado.em < VALIDADE_MS) return guardado.resultado;
    let resultado;
    try {
      const lido = await LEITORES[rede.plataforma].buscar(rede, termo, cep);
      resultado = {
        ...lido,
        produtos: lido.produtos
          .map(item => ({ ...item, score: pontuar(termo, item) }))
          .filter(item => item.score >= 0.75)
          .sort((a, b) => b.score - a.score || a.preco - b.preco)
      };
    } catch {
      resultado = { situacao: 'falhou', produtos: [] };
    }
    emCache.set(chave, { em: Date.now(), resultado });
    if (resultado.produtos.length) this.guardarHistorico(rede, resultado.produtos.slice(0, 8));
    return resultado;
  },

  /** Um retrato por dia do preço do site, para montar o histórico de 90 dias. */
  guardarHistorico(rede, produtos) {
    const hoje = new Date().toISOString();
    const dia = hoje.slice(0, 10).replace(/-/g, '');
    const caminhos = {};
    produtos.forEach(item => {
      caminhos[`precos/site-${rede.id}-${chaveDeProduto(item)}-${dia}`] = {
        produto: item.produto,
        produtoKey: normalize(item.produto),
        categoria: 'Comida',
        ean: item.ean || '',
        chave: chaveDeProduto(item),
        mercadoId: `rede-${rede.id}`,
        preco: item.preco,
        data: hoje,
        origem: 'site'
      };
    });
    if (Object.keys(caminhos).length) banco.atualizarVarios(caminhos).catch(() => {});
  },

  limparCache() {
    emCache.clear();
  }
};
