import { round2 } from '../utils/money.js';
import { pedirNaRede } from './ColetaModel.js';

// Redes na Salesforce Commerce Cloud (São Vicente). A grade de busca da loja (Search-UpdateGrid)
// responde em JSON com nome, marca, preço de venda, preço "de" e disponibilidade.
// O código de barras não vem em campo próprio, mas faz parte do nome da imagem
// ("/Produtos/31313-7896290300011-arroz...jpg").
const EAN_DA_IMAGEM = /\/Produtos\/\d+-(\d{8,14})-/;

export function lerGradeSfcc(dados, site) {
  return (dados?.productsSearchResult || [])
    .map(item => {
      const venda = Number(item.price?.sales?.value);
      const cheio = Number(item.price?.list?.value);
      if (!item.available || !(venda > 0)) return null;
      const imagem = item.images?.small?.[0] || item.images?.medium?.[0] || item.images?.large?.[0];
      const caminho = imagem?.url || imagem?.absURL || '';
      const porKg = item.weighable || /^(kg|kilo)/i.test(item.productMeasureValue || '');
      return {
        produto: String(item.productName || '').trim(),
        marca: item.brand || '',
        ean: (EAN_DA_IMAGEM.exec(decodeURI(caminho)) || [])[1] || '',
        preco: round2(venda),
        precoDe: cheio > venda ? round2(cheio) : null,
        unidade: porKg ? 'kg' : 'un',
        imagem: imagem?.absURL || (caminho ? new URL(caminho, site).href : ''),
        link: item.productShowFullUrl || ''
      };
    })
    .filter(item => item && item.produto);
}

export const CatalogoSfccModel = {
  async buscar(rede, termo) {
    const endereco = `${rede.site}/on/demandware.store/${rede.siteSfcc}/pt_BR/Search-UpdateGrid?q=${encodeURIComponent(termo)}&start=0&sz=40`;
    const resposta = await pedirNaRede(endereco, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(9000)
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return { situacao: 'ok', produtos: lerGradeSfcc(await resposta.json(), rede.site) };
  }
};
