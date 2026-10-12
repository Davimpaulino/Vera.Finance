import { round2 } from '../utils/money.js';
import { NAVEGADOR } from './CatalogoVtexModel.js';

// Pão de Açúcar (grupo GPA): o CEP escolhe a loja que atende o endereço, e a busca traz
// o preço e o estoque daquela loja.
const API = 'https://api.vendas.gpa.digital';
const DIA_MS = 24 * 60 * 60 * 1000;
const lojas = new Map();

const cabecalhos = rede => ({
  'User-Agent': NAVEGADOR,
  Accept: 'application/json',
  Origin: rede.site,
  Referer: `${rede.site}/`
});

async function lojaDoCep(rede, cep) {
  const chave = `${rede.id}|${cep}`;
  const guardada = lojas.get(chave);
  if (guardada && Date.now() - guardada.em < DIA_MS) return guardada;
  let loja = null;
  try {
    const resposta = await fetch(`${API}/${rede.marcaGpa}/delivery/options?zipCode=${cep}`, {
      headers: cabecalhos(rede),
      signal: AbortSignal.timeout(9000)
    });
    const dados = await resposta.json();
    const opcao = (dados.content?.deliveryTypes || []).find(tipo => tipo.storeid);
    if (opcao) loja = { id: opcao.storeid, nome: String(opcao.storeName || '').replace(/^\d+\s*-\s*/, '') };
  } catch {
    loja = null;
  }
  const achada = { em: Date.now(), loja };
  lojas.set(chave, achada);
  return achada;
}

export const CatalogoGpaModel = {
  async buscar(rede, termo, cep) {
    if (!cep) return { situacao: 'semCep', produtos: [] };
    const { loja } = await lojaDoCep(rede, cep);
    if (!loja) return { situacao: 'semEntrega', produtos: [] };
    const resposta = await fetch(`${API}/${rede.marcaGpa}/search/search`, {
      method: 'POST',
      headers: { ...cabecalhos(rede), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner: 'linx',
        page: 1,
        resultsPerPage: 40,
        terms: termo,
        sortBy: 'relevance',
        storeId: loja.id,
        customerPlus: true,
        department: 'ecom'
      }),
      signal: AbortSignal.timeout(9000)
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    const produtos = (dados.products || [])
      .filter(item => item.stock && item.price > 0)
      .map(item => {
        const promocao = item.productPromotion?.unitPrice;
        const preco = round2(promocao && promocao < item.price ? promocao : item.price);
        return {
          produto: String(item.name || '').trim(),
          marca: item.brand ? item.brand.charAt(0) + item.brand.slice(1).toLowerCase() : '',
          ean: '',
          preco,
          precoDe: preco < item.price ? round2(item.price) : null,
          unidade: 'un',
          imagem: item.productImages?.[0] ? `https://static.paodeacucar.com${item.productImages[0]}` : '',
          link: item.urlDetails || ''
        };
      });
    return { situacao: 'ok', produtos, lojaOnline: loja.nome };
  }
};
