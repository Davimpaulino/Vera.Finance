import { urlDoSite } from './site.js';
import { ARTIGOS, artigoDoCaminho } from '../conteudo/index.js';

// Título e descrição por página (o Google usa os dois no resultado da busca).
// Usado pelo App no navegador e pela pré-renderização no build (scripts/prerender.mjs).
export const PAGINAS = {
  '/': [
    'vera.finance · controle de gastos e comparador de preços de supermercado',
    'Organize a renda por categorias, saiba até que dia o dinheiro dura e compare o preço da sua lista de compras nos supermercados perto de você. Grátis.'
  ],
  '/precos': [
    'Planos e preços · vera.finance',
    'Comece grátis. Compare o plano grátis e o vera+ para controle de gastos, metas, modo família e leitura de notas fiscais.'
  ],
  '/perguntas': [
    'Perguntas frequentes · vera.finance',
    'Se a vera é grátis, quanto custa o vera+, quais redes têm preço online, como ler a nota fiscal e como a vera cuida dos seus dados.'
  ],
  '/onde-funciona': [
    'Onde a vera funciona: redes com preço online pelo CEP · vera.finance',
    'Digite o seu CEP e veja quais redes de supermercado e de atacado com preço online atendem a sua região, e como a vera compara os preços.'
  ],
  '/ajuda': [
    'Central de ajuda · vera.finance',
    'Como ler a nota fiscal, comparar preços, montar a lista de compras, usar o modo família, baixar os seus dados e cancelar o plano na vera.'
  ],
  '/blog': [
    'Blog · vera.finance',
    'Dicas práticas para gastar menos no supermercado e organizar a renda do mês: preço por quilo, nota fiscal, atacarejo e categorias.'
  ],
  '/entrar': ['Entrar · vera.finance', 'Entre na sua conta da vera.finance.'],
  '/cadastro': [
    'Criar conta grátis · vera.finance',
    'Crie a sua conta grátis e descubra até que dia o seu dinheiro dura.'
  ],
  '/termos': ['Termos de uso · vera.finance', 'Termos de uso da vera.finance.'],
  '/privacidade': [
    'Política de privacidade · vera.finance',
    'Como a vera.finance trata os seus dados pessoais, conforme a LGPD.'
  ],
  // Um por artigo de src/conteudo (ajuda.js e blog.js): artigo novo vira rota sozinho.
  ...Object.fromEntries(
    ARTIGOS.map(artigo => [artigo.caminho, [`${artigo.titulo} · vera.finance`, artigo.descricao]])
  )
};

// Páginas públicas que o build gera em HTML pronto (dist/<rota>/index.html).
export const ROTAS_PUBLICAS = Object.keys(PAGINAS);

/** Título, descrição, canonical, robots e tipo (og:type) de um caminho. */
export function metaDaPagina(caminho) {
  const [titulo, descricao] = PAGINAS[caminho] || ['vera.finance', PAGINAS['/'][1]];
  // Área logada não entra no Google.
  const privada = caminho.startsWith('/app') || caminho.startsWith('/onboarding');
  return {
    titulo,
    descricao,
    // Canonical sempre no endereço público, mesmo abrindo por outro domínio.
    canonical: urlDoSite(caminho),
    robots: privada ? 'noindex, nofollow' : 'index, follow',
    // Artigos de ajuda e do blog são "article" para quem compartilha o link; o resto, "website".
    tipo: artigoDoCaminho(caminho) ? 'article' : 'website'
  };
}
