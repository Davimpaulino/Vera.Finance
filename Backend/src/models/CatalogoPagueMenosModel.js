import { round2 } from '../utils/money.js';
import { NAVEGADOR } from './CatalogoVtexModel.js';

// Supermercados Pague Menos (interior de SP): a página de busca já vem com os produtos.
// Cada produto tem um bloco data-json (nome, marca, preço cheio) e o preço de venda num campo escondido.
const ENTIDADES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
const decodificar = texto =>
  String(texto || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-z]+);/gi, (tudo, nome) => ENTIDADES[nome.toLowerCase()] ?? tudo);

export function lerPaginaPagueMenos(html, site) {
  return html
    .split('class="item-product"')
    .slice(1)
    .map(bloco => {
      const json = /data-json='([^']*)'/.exec(bloco);
      if (!json) return null;
      let dados;
      try {
        dados = JSON.parse(decodificar(json[1]));
      } catch {
        return null;
      }
      const venda = Number((/value="([\d.]+)"\s+name="price"/.exec(bloco) || [])[1]);
      const cheio = Number(dados.price) || 0;
      const preco = round2(venda > 0 ? venda : cheio);
      const link = (/<a href="([^"]+\/p)"/.exec(bloco) || [])[1] || '';
      const imagem = (/data-src="([^"]+)"/.exec(bloco) || [])[1] || '';
      if (!preco || /indispon/i.test(bloco)) return null;
      return {
        produto: String(dados.item_name || '').trim(),
        marca: dados.item_brand || '',
        ean: '',
        preco,
        precoDe: cheio > preco ? round2(cheio) : null,
        unidade: 'un',
        imagem: imagem.startsWith('//') ? `https:${imagem}` : imagem,
        link: link ? `${site}${link}` : ''
      };
    })
    .filter(Boolean);
}

export const CatalogoPagueMenosModel = {
  async buscar(rede, termo) {
    const resposta = await fetch(`${rede.site}/busca/?q=${encodeURIComponent(termo)}`, {
      headers: { 'User-Agent': NAVEGADOR, Accept: 'text/html' },
      signal: AbortSignal.timeout(9000)
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return { situacao: 'ok', produtos: lerPaginaPagueMenos(await resposta.text(), rede.site) };
  }
};
