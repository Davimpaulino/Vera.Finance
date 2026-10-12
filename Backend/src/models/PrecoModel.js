import { banco } from '../config/banco.js';
import { matchScore, normalize } from '../utils/text.js';

const VALIDADE_DO_CACHE_MS = 60000;
let precosEmCache = null;
let lidoEm = 0;

export const PrecoModel = {
  async listar() {
    if (precosEmCache && Date.now() - lidoEm < VALIDADE_DO_CACHE_MS) return precosEmCache;
    precosEmCache = await banco.listar('precos');
    lidoEm = Date.now();
    return precosEmCache;
  },

  limparCache() {
    precosEmCache = null;
  },

  async adicionar(dados) {
    const id = await banco.adicionar('precos', { ...dados, produtoKey: normalize(dados.produto) });
    this.limparCache();
    return id;
  },

  /** Grava os preços de uma nota lida. A chave da nota no id evita contar a mesma nota duas vezes. */
  async gravarDaNota(nota, mercadoId) {
    const data = nota.compradoEm || new Date().toISOString();
    const caminhos = {};
    nota.itens.forEach((item, i) => {
      caminhos[`precos/${nota.chave}-${i + 1}`] = {
        produto: item.produto,
        produtoKey: normalize(item.produto),
        categoria: item.categoria,
        codigo: item.codigo || '',
        mercadoId,
        preco: item.preco,
        data,
        origem: 'nfce'
      };
    });
    await banco.atualizarVarios(caminhos);
    this.limparCache();
  },

  async buscarProdutos(busca) {
    const precos = await this.listar();
    const porProduto = new Map();
    precos.forEach(preco => {
      const atual = porProduto.get(preco.produto) || {
        produto: preco.produto,
        categoria: preco.categoria,
        leituras: 0
      };
      atual.leituras += 1;
      porProduto.set(preco.produto, atual);
    });
    return [...porProduto.values()]
      .map(produto => ({ ...produto, score: matchScore(busca, produto.produto) }))
      .filter(produto => produto.score > 0)
      .sort((a, b) => b.score - a.score || b.leituras - a.leituras);
  },

  async doProduto(produto) {
    const precos = await this.listar();
    return precos.filter(preco => preco.produto === produto);
  }
};
