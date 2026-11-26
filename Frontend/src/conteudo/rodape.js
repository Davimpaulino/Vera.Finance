// Artigos do blog que aparecem no rodapé do site, pelo nome curto, do mais novo para o mais velho.
// Ficam aqui, fora de blog.js, porque o rodapé está em toda página: importar blog.js levaria o
// texto de todos os artigos para o pacote principal do JavaScript. O build confere que cada
// caminho é de um artigo do blog (problemasDoConteudo, em index.js).
export const BLOG_NO_RODAPE = [
  ['Preço por quilo e por litro', '/blog/economizar-comparando-preco-por-quilo-e-por-litro'],
  ['QR Code da NFC-e', '/blog/qr-code-da-nota-fiscal-nfc-e'],
  ['Atacarejo ou supermercado', '/blog/atacarejo-ou-supermercado-quando-compensa'],
  ['Renda por categorias', '/blog/organizar-renda-por-categorias']
];
