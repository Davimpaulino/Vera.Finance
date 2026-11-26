// Endereço público do site. Muda com VITE_SITE_URL quando houver domínio próprio.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://vera-finance.onrender.com').replace(
  /\/$/,
  ''
);

/** Link absoluto para um caminho do site (canonical, JSON-LD). */
export const urlDoSite = (caminho = '/') => `${SITE_URL}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;

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
