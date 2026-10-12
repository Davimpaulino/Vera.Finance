import { round2 } from '../utils/money.js';
import { NAVEGADOR } from './CatalogoVtexModel.js';

// Lojas na Oracle Commerce Cloud (Confiança): busca pública do próprio site (/ccstore/v1/search).
const primeiro = (atributos, nome) => (atributos[nome] || [])[0];

export const CatalogoOccModel = {
  async buscar(rede, termo) {
    const resposta = await fetch(
      `${rede.site}/ccstore/v1/search?Ntt=${encodeURIComponent(termo)}&Nrpp=40`,
      { headers: { 'User-Agent': NAVEGADOR, Accept: 'application/json' }, signal: AbortSignal.timeout(9000) }
    );
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    const produtos = (dados.resultsList?.records || [])
      .map(registro => {
        const atributos = registro.records?.[0]?.attributes || registro.attributes || {};
        const preco = Number(primeiro(atributos, 'sku.activePrice') || primeiro(atributos, 'sku.minActivePrice'));
        const cheio = Number(primeiro(atributos, 'sku.listPrice'));
        const disponivel = !/OUT/i.test(primeiro(atributos, 'sku.availabilityStatus') || '');
        const caminho = primeiro(atributos, 'sku.url') || primeiro(atributos, 'product.route') || '';
        if (!disponivel || !(preco > 0)) return null;
        return {
          produto: String(primeiro(atributos, 'sku.displayName') || primeiro(atributos, 'product.displayName') || '').trim(),
          marca: primeiro(atributos, 'product.brand') || '',
          ean: '',
          preco: round2(preco),
          precoDe: cheio > preco ? round2(cheio) : null,
          unidade: 'un',
          imagem: '',
          link: caminho ? new URL(caminho, rede.site).href : ''
        };
      })
      .filter(item => item && item.produto);
    return { situacao: 'ok', produtos };
  }
};
