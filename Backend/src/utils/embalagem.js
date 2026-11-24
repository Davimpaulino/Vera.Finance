import { normalize } from './text.js';
import { round2 } from './money.js';

// Quanto vem na embalagem, para comparar preço por kg, por litro ou por unidade.
// "Arroz 5kg" → 5 kg; "Leite 1l c/ 12 unid." → 12 l; "Cerveja lata 350ml com 12 unidades" → 4,2 l;
// "Papel higiênico leve 12 pague 11" → 12 un; "Ovos com 20 unid." → 20 un.
const MEDIDA = /(\d+(?:[.,]\d+)?)\s?(kg|g|gr|mg|ml|l|lt|litros?)\b/g;
const PACOTE =
  /(?:\b(\d{1,3})\s?x\s?(?=\d)|\b(?:c\s?\/\s?|com\s+|leve\s+|cx\s+(?:c\s?\/\s?)?)(\d{1,3})\s?(?:un\w*\.?|pacotes?|latas?|garrafas?|rolos?|pague|\b)|\b(\d{1,3})\s?(?:unid\w*|un|potes?|latas?|pacotes?|garrafas?|rolos?|sach\w*)\b)/;

const BASE = { kg: ['kg', 1], g: ['kg', 0.001], gr: ['kg', 0.001], mg: ['kg', 0.000001], l: ['l', 1], lt: ['l', 1], litro: ['l', 1], litros: ['l', 1], ml: ['l', 0.001] };

export function embalagem(nome) {
  const texto = normalize(nome).replace(/(\d),(\d)/g, '$1.$2');
  const medidas = [...texto.matchAll(MEDIDA)];
  const pacote = PACOTE.exec(texto);
  const vezes = pacote ? Number(pacote[1] || pacote[2] || pacote[3]) || 1 : 1;
  if (medidas.length) {
    // Com várias medidas ("2kg + 500g grátis") vale a maior: é a do produto.
    const [base] = BASE[medidas[0][2]];
    const quantidade = Math.max(
      ...medidas.filter(m => BASE[m[2]][0] === base).map(m => Number(m[1]) * BASE[m[2]][1])
    );
    if (!(quantidade > 0)) return null;
    // "1l c/ 12" multiplica; "c/ 12 unid. de 80g - 480g" já traz o total (é a maior medida).
    const total = vezes > 1 && medidas.length === 1 ? quantidade * vezes : quantidade;
    return { quantidade: total, unidade: base };
  }
  if (vezes > 1) return { quantidade: vezes, unidade: 'un' };
  return null;
}

/** Preço por kg, por litro ou por unidade; null quando a embalagem não diz quanto vem. */
export function precoPorUnidade(preco, nome, unidadeDeVenda = 'un') {
  if (!(preco > 0)) return null;
  if (unidadeDeVenda === 'kg') return { valor: round2(preco), unidade: 'kg' };
  const emb = embalagem(nome);
  // "Banana Nanica Kg", "Contra-filé granel": o preço já é do quilo.
  if (!emb) return /\b(kg|granel)\b/.test(normalize(nome)) ? { valor: round2(preco), unidade: 'kg' } : null;
  return { valor: round2(preco / emb.quantidade), unidade: emb.unidade };
}

/** Tamanho que a pessoa digitou na busca ("arroz 5kg" → "5kg"), para preferir esse tamanho. */
export function tamanhoDaBusca(termo) {
  const achado = normalize(termo).match(/\d+(?:[.,]\d+)?\s?(?:kg|g|ml|l)\b/);
  return achado ? achado[0].replace(/\s/g, '').replace(',', '.') : '';
}
