// Endereço público do site, sem "/" no fim. Vem de VITE_SITE_URL no build; sem ela, vale o
// endereço atual do site no Render (o Static Site, não a API). O mesmo padrão está em
// Backend/src/config/site.js (o teste confere). Usado também pelo vite.config.js, que troca
// __SITE_URL__ no index.html e em public/ (sitemap.xml, robots.txt, llms.txt), e pelo IndexNow.
export const SITE_PADRAO = 'https://vera-finance-ckfn.onrender.com';
// O "?." deixa este arquivo rodar também no Node (testes da API e do conteúdo), sem o Vite.
export const SITE_URL = (import.meta.env?.VITE_SITE_URL || SITE_PADRAO).replace(/\/$/, '');

/** Link absoluto para um caminho do site (canonical, JSON-LD). */
export const urlDoSite = (caminho = '/') => `${SITE_URL}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;

// Contatos da vera.group. O e-mail é provisório e vale para tudo (contato, ajuda, privacidade e
// encarregado de dados) até a vera ter domínio próprio. Ao trocar, mude também o index.html
// (JSON-LD), o public/llms.txt e o Backend/src/emails/index.js (os testes conferem).
export const EMAIL_DE_CONTATO = 'veragroup.ia@gmail.com';
export const WHATSAPP = {
  numero: '(11) 94072-3507',
  // Formato do schema.org (contactPoint.telephone).
  telefone: '+55-11-94072-3507',
  link: 'https://wa.me/5511940723507'
};
export const INSTAGRAM = {
  usuario: '@veragroup.ia',
  link: 'https://www.instagram.com/veragroup.ia/'
};

// Redes com preço online, na mesma ordem de Backend/src/models/RedeModel.js.
// Ao integrar ou tirar uma rede lá, atualize aqui (a landing e as perguntas usam esta lista).
export const REDES_COM_PRECO = [
  'Atacadão',
  "Sam's Club",
  'Savegnago',
  'Covabra',
  'Giassi',
  'Angeloni',
  'Zona Sul',
  'Prezunic',
  'Mambo',
  'Bistek',
  'Hortifruti',
  'Super Nosso',
  'GBarbosa',
  'Amigão',
  'Giga Atacado',
  'Mercantil Atacado',
  'Zaffari',
  'Super Muffato',
  'Hiperideal',
  'Rissul',
  'Oba Hortifruti',
  'Coop',
  'São Vicente',
  'Tenda Atacado',
  'Confiança',
  'Pão de Açúcar',
  'Pague Menos'
];

// Das redes acima, as de atacado (atacarejo), as de `tipo: 'atacado'` no RedeModel.
// A página Onde funciona separa supermercados e atacados com esta lista; as demais são mercado.
export const REDES_DE_ATACADO = [
  'Atacadão',
  "Sam's Club",
  'Giga Atacado',
  'Mercantil Atacado',
  'Tenda Atacado'
];
