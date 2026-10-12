// Redes de supermercado com preços públicos no site, de onde vem o "preço do site".
// `nomes` reconhece a rede pelo nome ou pela marca do mercado no mapa.
// `plataforma` diz como ler o site: vtex (catálogo VTEX com regionalização por CEP),
// gpa (Pão de Açúcar, loja escolhida pelo CEP), paguemenos (página de busca), tenda (API pública
// do Tenda Atacado) ou occ (Oracle Commerce, busca pública).
// Ficaram de fora redes que não publicam preço (Carrefour, Assaí, Dia, BH, Sonda…) e redes cuja
// plataforma exige login para consultar (VipCommerce, oSuper: Comper, Fort, Condor, Koch).
export const REDES = [
  {
    id: 'atacadao',
    nome: 'Atacadão',
    site: 'https://www.atacadao.com.br',
    nomes: /atacad[aã]o/i,
    tipo: 'atacado',
    plataforma: 'vtex'
  },
  {
    id: 'samsclub',
    nome: "Sam's Club",
    site: 'https://www.samsclub.com.br',
    nomes: /sam'?s\s*club/i,
    tipo: 'atacado',
    plataforma: 'vtex'
  },
  {
    id: 'savegnago',
    nome: 'Savegnago',
    site: 'https://www.savegnago.com.br',
    nomes: /savegnago/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'covabra',
    nome: 'Covabra',
    site: 'https://www.covabra.com.br',
    nomes: /covr?abra/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'giassi',
    nome: 'Giassi',
    site: 'https://www.giassi.com.br',
    nomes: /giassi/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'angeloni',
    nome: 'Angeloni',
    site: 'https://www.angeloni.com.br/super',
    nomes: /angeloni/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'zonasul',
    nome: 'Zona Sul',
    site: 'https://www.zonasul.com.br',
    nomes: /zona\s*sul/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'prezunic',
    nome: 'Prezunic',
    site: 'https://www.prezunic.com.br',
    nomes: /prezunic/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'mambo',
    nome: 'Mambo',
    site: 'https://www.mambo.com.br',
    nomes: /mambo/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'bistek',
    nome: 'Bistek',
    site: 'https://www.bistek.com.br',
    nomes: /bistek/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'hortifruti',
    nome: 'Hortifruti',
    site: 'https://www.hortifruti.com.br',
    nomes: /^hortifruti(\s*[-–|·:]|\s*$)|natural\s+da\s+terra/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'supernosso',
    nome: 'Super Nosso',
    site: 'https://www.supernosso.com',
    nomes: /super\s*nosso/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'gbarbosa',
    nome: 'GBarbosa',
    site: 'https://www.gbarbosa.com.br',
    nomes: /g\.?\s*barbosa/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'amigao',
    nome: 'Amigão',
    site: 'https://amigao.vtexcommercestable.com.br',
    nomes: /amig[aã]o/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'giga',
    nome: 'Giga Atacado',
    site: 'https://www.giga.com.vc',
    nomes: /giga\s*atacad/i,
    tipo: 'atacado',
    plataforma: 'vtex'
  },
  {
    id: 'mercantil',
    nome: 'Mercantil Atacado',
    site: 'https://www.mercantilatacado.com.br',
    nomes: /mercantil\s*(atacad|rodrigues)/i,
    tipo: 'atacado',
    plataforma: 'vtex'
  },
  {
    id: 'zaffari',
    nome: 'Zaffari',
    site: 'https://www.zaffari.com.br',
    nomes: /zaffari/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'supermuffato',
    nome: 'Super Muffato',
    site: 'https://www.supermuffato.com.br',
    nomes: /muffato/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'hiperideal',
    nome: 'Hiperideal',
    site: 'https://www.hiperideal.com.br',
    nomes: /hiper\s*ideal/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'rissul',
    nome: 'Rissul',
    site: 'https://www.rissul.com.br',
    nomes: /rissul|unidasul/i,
    tipo: 'mercado',
    plataforma: 'vtex'
  },
  {
    id: 'tenda',
    nome: 'Tenda Atacado',
    site: 'https://www.tendaatacado.com.br',
    nomes: /tenda\s*atacad|^tenda$/i,
    tipo: 'atacado',
    plataforma: 'tenda'
  },
  {
    id: 'confianca',
    nome: 'Confiança',
    site: 'https://www.confianca.com.br',
    nomes: /confian[cç]a\s*(super|max)|super(mercados?)?\s*confian[cç]a/i,
    tipo: 'mercado',
    plataforma: 'occ'
  },
  {
    id: 'paodeacucar',
    nome: 'Pão de Açúcar',
    site: 'https://www.paodeacucar.com',
    nomes: /p[aã]o\s+de\s+a[cç][uú]car/i,
    tipo: 'mercado',
    plataforma: 'gpa',
    marcaGpa: 'pa'
  },
  {
    id: 'paguemenos',
    nome: 'Pague Menos',
    site: 'https://www.superpaguemenos.com.br',
    nomes: /pague\s*menos/i,
    tipo: 'mercado',
    plataforma: 'paguemenos'
  }
];

export const RedeModel = {
  listar: () => REDES,

  buscar: id => REDES.find(rede => rede.id === id) || null,

  /** Rede de um mercado pelo nome ou pela marca. */
  identificar(...textos) {
    const texto = textos.filter(Boolean).join(' ');
    return REDES.find(rede => rede.nomes.test(texto)) || null;
  }
};
