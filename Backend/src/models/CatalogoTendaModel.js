import { round2 } from '../utils/money.js';
import { NAVEGADOR } from './CatalogoVtexModel.js';

// Tenda Atacado: API pública de busca da loja online, com código de barras, preço e estoque.
const API = 'https://api.tendaatacado.com.br/api/public/store/search';

export const CatalogoTendaModel = {
  async buscar(rede, termo) {
    const resposta = await fetch(
      `${API}?query=${encodeURIComponent(termo)}&page=1&order=relevance&save=false&filters=false`,
      { headers: { 'User-Agent': NAVEGADOR, Accept: 'application/json' }, signal: AbortSignal.timeout(9000) }
    );
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    const produtos = (dados.products || [])
      .filter(item => item.availability === 'in_stock' && Number(item.price) > 0)
      .map(item => ({
        produto: String(item.name || '').trim(),
        marca: item.brand || '',
        ean: item.barcode || '',
        preco: round2(item.price),
        precoDe: null,
        unidade: 'un',
        imagem: item.thumbnail || '',
        link: item.url || ''
      }));
    return { situacao: 'ok', produtos };
  }
};
