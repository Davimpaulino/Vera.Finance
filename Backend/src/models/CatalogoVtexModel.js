import { round2 } from '../utils/money.js';

// Catálogo de redes na plataforma VTEX. O preço e a disponibilidade vêm da simulação de carrinho
// para o CEP da pessoa: é o que o próprio site mostra quando ela informa o CEP. Produto que a rede
// não entrega naquele CEP não entra.
export const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const CABECALHOS = { 'User-Agent': NAVEGADOR, Accept: 'application/json' };
const DIA_MS = 24 * 60 * 60 * 1000;
const regioes = new Map();

async function pedirJson(endereco, opcoes = {}) {
  const resposta = await fetch(endereco, {
    ...opcoes,
    headers: { ...CABECALHOS, ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}) },
    signal: AbortSignal.timeout(9000)
  });
  if (!resposta.ok && resposta.status !== 206) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json();
}

/** Região VTEX do CEP: as lojas (sellers) que atendem aquele endereço. */
async function regiao(rede, cep) {
  const chave = `${rede.id}|${cep}`;
  const guardada = regioes.get(chave);
  if (guardada && Date.now() - guardada.em < DIA_MS) return guardada;
  const dados = await pedirJson(
    `${rede.site}/api/checkout/pub/regions?country=BRA&postalCode=${cep}`
  ).catch(() => []);
  const achada = {
    em: Date.now(),
    id: dados[0]?.id || null,
    lojas: (dados[0]?.sellers || []).map(loja => ({ id: loja.id, nome: loja.name }))
  };
  regioes.set(chave, achada);
  return achada;
}

function candidato(produto, rede) {
  const item = (produto.items || [])[0];
  if (!item) return null;
  const vendedor = (item.sellers || [])[0];
  const oferta = vendedor?.commertialOffer || {};
  const link = String(produto.link || '');
  return {
    itemId: item.itemId,
    vendedor: vendedor?.sellerId || '1',
    produto: String(produto.productName || '').trim(),
    marca: produto.brand || '',
    ean: item.ean || '',
    preco: oferta.Price || 0,
    precoDe: oferta.ListPrice || 0,
    disponivel: (oferta.AvailableQuantity || 0) > 0,
    unidade: item.measurementUnit === 'kg' ? 'kg' : 'un',
    multiplicador: Number(item.unitMultiplier) || 1,
    imagem: (item.images || [])[0]?.imageUrl || '',
    link: link.startsWith('http') ? link : link ? `${new URL(rede.site).origin}${link}` : ''
  };
}

// Simula o carrinho no CEP. Itens de lojas diferentes no mesmo carrinho podem ser recusados
// (maxNumberOfSellersReached); esses são simulados de novo, um a um.
async function simular(rede, itens, cep) {
  const corpo = lista => ({
    items: lista.map(item => ({ id: item.itemId, quantity: 1, seller: item.vendedor })),
    postalCode: cep,
    country: 'BRA'
  });
  const resultado = new Map();
  const ler = (lista, resposta) =>
    (resposta.items || []).forEach(linha => {
      const original = lista[linha.requestIndex ?? 0];
      if (original) resultado.set(original.itemId, linha);
    });
  const lote = await pedirJson(`${rede.site}/api/checkout/pub/orderForms/simulation?sc=1`, {
    method: 'POST',
    body: JSON.stringify(corpo(itens))
  });
  ler(itens, lote);
  const repetir = itens.filter(
    item => resultado.get(item.itemId)?.availability === 'maxNumberOfSellersReached'
  );
  await Promise.all(
    repetir.map(async item => {
      const sozinho = await pedirJson(`${rede.site}/api/checkout/pub/orderForms/simulation?sc=1`, {
        method: 'POST',
        body: JSON.stringify(corpo([item]))
      }).catch(() => null);
      if (sozinho) ler([item], sozinho);
    })
  );
  return resultado;
}

export const CatalogoVtexModel = {
  /**
   * Produtos disponíveis para o CEP. Devolve { situacao, produtos }:
   * situacao 'ok', 'semEntrega' (a rede não atende o CEP) ou 'semCep' (preço do catálogo nacional).
   */
  async buscar(rede, termo, cep) {
    const regional = cep ? await regiao(rede, cep) : null;
    let candidatos;
    if (regional?.lojas.length && regional.id) {
      const dados = await pedirJson(
        `${rede.site}/api/io/_v/api/intelligent-search/product_search/?query=${encodeURIComponent(termo)}&count=40&page=1&locale=pt-BR&hideUnavailableItems=true&regionId=${encodeURIComponent(regional.id)}`
      ).catch(() => null);
      candidatos = (dados?.products || []).map(p => candidato(p, rede)).filter(Boolean);
      candidatos.forEach(item => {
        item.vendedor = regional.lojas[0].id;
      });
    }
    if (!candidatos || !candidatos.length) {
      const dados = await pedirJson(
        `${rede.site}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(termo)}&_from=0&_to=39`
      );
      candidatos = (Array.isArray(dados) ? dados : []).map(p => candidato(p, rede)).filter(Boolean);
    }
    candidatos = candidatos.filter(item => item.produto);

    if (!cep)
      return {
        situacao: 'semCep',
        produtos: candidatos
          .filter(item => item.disponivel && item.preco > 0)
          .map(({ itemId, vendedor, disponivel, multiplicador, ...item }) => ({
            ...item,
            preco: round2(item.preco),
            precoDe: item.precoDe > item.preco ? round2(item.precoDe) : null
          }))
      };

    const simulados = await simular(rede, candidatos.slice(0, 30), cep).catch(() => new Map());
    const situacoes = [...simulados.values()].map(linha => linha.availability);
    const produtos = candidatos
      .filter(item => simulados.get(item.itemId)?.availability === 'available')
      .map(item => {
        const linha = simulados.get(item.itemId);
        const multiplicador = Number(linha.unitMultiplier) || item.multiplicador || 1;
        const preco = round2(linha.sellingPrice / 100 / multiplicador);
        const de = round2((linha.listPrice || linha.price || 0) / 100 / multiplicador);
        return {
          produto: item.produto,
          marca: item.marca,
          ean: item.ean,
          preco,
          precoDe: de > preco ? de : null,
          unidade: item.unidade,
          imagem: item.imagem,
          link: item.link
        };
      })
      .filter(item => item.preco > 0);
    const naoEntrega =
      !produtos.length &&
      situacoes.length > 0 &&
      situacoes.every(s =>
        ['cannotBeDelivered', 'withoutPriceFulfillment', 'withoutStock'].includes(s)
      );
    return { situacao: naoEntrega ? 'semEntrega' : 'ok', produtos };
  }
};
