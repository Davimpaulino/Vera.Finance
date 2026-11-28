import LEVANTAMENTO from './cidades.json';

// Páginas das cidades prioritárias (/onde-funciona/<slug>). O cidades.json sai do script
// Backend/scripts/cobertura-das-cidades.mjs (npm run cobertura:cidades, na pasta Backend), que
// também guarda a lista das cidades. Cidade com `redes: null` ainda não tem levantamento: a página
// mostra o texto geral e o verificador de CEP, sem lista de redes.
// O arquivo é pequeno e vai no pacote principal, junto com a página Onde funciona.

// Cidades cujo nome leva artigo: "no Rio de Janeiro", "do Rio de Janeiro".
const COM_ARTIGO = new Set(['rio-de-janeiro-rj']);

export const CIDADES = LEVANTAMENTO.map(cidade => {
  const artigo = COM_ARTIGO.has(cidade.slug);
  return {
    ...cidade,
    caminho: `/onde-funciona/${cidade.slug}`,
    // "em São Paulo" / "no Rio de Janeiro" e "de São Paulo" / "do Rio de Janeiro".
    em: `${artigo ? 'no' : 'em'} ${cidade.nome}`,
    de: `${artigo ? 'do' : 'de'} ${cidade.nome}`
  };
});

const PELO_CAMINHO = new Map(CIDADES.map(cidade => [cidade.caminho, cidade]));

/** A cidade de um caminho (/onde-funciona/<slug>) ou null. */
export const cidadeDoCaminho = caminho => PELO_CAMINHO.get(caminho) || null;

/** Tem a lista das redes perto do centro? */
export const temLevantamento = cidade => Array.isArray(cidade.redes) && !!cidade.levantadoEm;

/** [título, descrição] da página da cidade, para src/lib/paginas.js. */
export function metaDaCidade(cidade) {
  const titulo = `Comparar preço de supermercado ${cidade.em} · vera.finance`;
  const quantas = temLevantamento(cidade) ? cidade.redes.length : 0;
  const descricao = quantas
    ? `${quantas} ${quantas === 1 ? 'rede' : 'redes'} com preço online têm loja a até ${cidade.raioKm} km do centro ${cidade.de} (${cidade.uf}). Veja quais e compare o preço da sua lista de compras.`
    : `Como a vera compara o preço da lista de compras ${cidade.em} (${cidade.uf}): digite o seu CEP e veja quais redes com preço online têm loja perto de você.`;
  return [titulo, descricao];
}
