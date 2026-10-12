import { banco } from '../../src/config/banco.js';
import { CredencialModel } from '../../src/models/CredencialModel.js';
import { normalize } from '../../src/utils/text.js';
import { cycleFor, addDays, startOfDay } from '../../src/utils/dates.js';
import { round2 } from '../../src/utils/money.js';

// Cenário fixo para os testes automáticos. Só existe aqui: nunca vai para o banco de verdade.
const LOCAL_DE_TESTE = { lat: -23.0904, lng: -47.2181 };

export const CONTA_DE_TESTE = {
  email: 'demo@vera.finance',
  senha: 'vera1234',
  nome: 'Thiago Serra',
  uid: 'demo-thiago'
};

function criarGravador() {
  const caminhos = {};
  return {
    gravar(caminho, valor) {
      caminhos[caminho] = valor;
    },
    async enviar() {
      const entradas = Object.entries(caminhos);
      for (let i = 0; i < entradas.length; i += 400) {
        await banco.atualizarVarios(Object.fromEntries(entradas.slice(i, i + 400)));
      }
    }
  };
}

let semente = 42;
const aleatorio = () => {
  semente = (semente * 16807) % 2147483647;
  return (semente - 1) / 2147483646;
};

const MERCADOS = [
  {
    id: 'nagumo',
    nome: 'Nagumo',
    endereco: 'Rua Sete de Setembro',
    distanciaKm: 1.1,
    tipo: 'mercado',
    fator: 1.0
  },
  {
    id: 'dia',
    nome: 'Dia',
    endereco: 'Rua XV de Novembro',
    distanciaKm: 1.8,
    tipo: 'mercado',
    fator: 0.99
  },
  {
    id: 'covabra',
    nome: 'Covabra',
    endereco: 'Av. Conceição',
    distanciaKm: 2.6,
    tipo: 'mercado',
    fator: 1.04
  },
  {
    id: 'pao-de-acucar',
    nome: 'Pão de Açúcar',
    endereco: 'Rua Voluntários',
    distanciaKm: 3.4,
    tipo: 'mercado',
    fator: 1.18,
    velho: true
  },
  {
    id: 'atacadao',
    nome: 'Atacadão',
    endereco: 'Av. Presidente Kennedy',
    distanciaKm: 4.2,
    tipo: 'atacado',
    fator: 0.93
  },
  {
    id: 'savegnago',
    nome: 'Savegnago',
    endereco: 'Av. Francisco de Paula Leite',
    distanciaKm: 6.4,
    tipo: 'mercado',
    fator: 1.01
  },
  {
    id: 'assai',
    nome: 'Assaí',
    endereco: 'Rod. Santos Dumont',
    distanciaKm: 8.9,
    tipo: 'atacado',
    fator: 0.94,
    esparso: true
  },
  {
    id: 'tenda',
    nome: 'Tenda Atacado',
    endereco: 'Av. Visconde de Indaiatuba',
    distanciaKm: 9.6,
    tipo: 'atacado',
    fator: 0.95
  },
  {
    id: 'carrefour',
    nome: 'Carrefour',
    endereco: 'Rod. SP-75',
    distanciaKm: 11.2,
    tipo: 'mercado',
    fator: 1.02
  },
  {
    id: 'sams',
    nome: "Sam's Club",
    endereco: 'Av. John Boyd Dunlop',
    distanciaKm: 13.5,
    tipo: 'atacado',
    fator: 0.92
  }
];

const PRODUTOS = [
  ['Arroz branco 5kg', 'Comida', 24.2],
  ['Feijão carioca 1kg', 'Comida', 8.5],
  ['Leite integral 1L', 'Comida', 4.8],
  ['Café torrado 500g', 'Comida', 16.4],
  ['Açúcar refinado 1kg', 'Comida', 4.9],
  ['Óleo de soja 900ml', 'Comida', 7.2],
  ['Macarrão espaguete 500g', 'Comida', 4.6],
  ['Ovos brancos 12 unidades', 'Comida', 11.9],
  ['Banana prata kg', 'Comida', 6.5],
  ['Peito de frango kg', 'Comida', 18.9],
  ['Carne moída kg', 'Comida', 34.9],
  ['Pão de forma 500g', 'Comida', 11.5],
  ['Manteiga 200g', 'Comida', 12.9],
  ['Sabão em pó 1,6kg', 'Casa', 22.5],
  ['Papel higiênico 12 rolos', 'Casa', 19.9],
  ['Detergente 500ml', 'Casa', 2.6]
];

async function popularMercadosEPrecos() {
  const hoje = startOfDay(new Date());
  const lote = criarGravador();
  // Mercados vistos em notas lidas, com coordenadas a norte do local de teste.
  MERCADOS.forEach(({ fator, velho, esparso, distanciaKm, ...m }) =>
    lote.gravar(`mercados/${m.id}`, {
      ...m,
      origem: 'nfce',
      lat: LOCAL_DE_TESTE.lat + distanciaKm / 111.2,
      lng: LOCAL_DE_TESTE.lng
    })
  );

  let n = 0;
  for (const [produto, categoria, base] of PRODUTOS) {
    for (const m of MERCADOS) {
      if (m.esparso && produto.startsWith('Arroz')) continue;
      if (m.esparso && aleatorio() < 0.5) continue;
      const passo = m.velho ? 22 : 3 + Math.floor(aleatorio() * 4);
      for (let dias = m.velho ? 22 : Math.floor(aleatorio() * 3); dias <= 90; dias += passo) {
        if (produto.startsWith('Arroz') && dias < 7) continue; // o arroz recente vem do roteiro abaixo
        const alta = 1 + 0.06 * (1 - dias / 90); // +6% em 90 dias
        const ruido = 1 + (aleatorio() - 0.5) * 0.03;
        const preco = round2(base * m.fator * alta * ruido * 0.97);
        lote.gravar(`precos/p${++n}`, {
          produto,
          produtoKey: normalize(produto),
          categoria,
          mercadoId: m.id,
          preco,
          data: addDays(hoje, -dias).toISOString()
        });
      }
    }
  }
  [
    ['atacadao', 23.4, 0],
    ['nagumo', 24.9, 3],
    ['covabra', 26.1, 6],
    ['pao-de-acucar', 29.8, 22],
    ['atacadao', 21.9, 80]
  ].forEach(([mercadoId, preco, dias]) => {
    lote.gravar(`precos/p${++n}`, {
      produto: 'Arroz branco 5kg',
      produtoKey: normalize('Arroz branco 5kg'),
      categoria: 'Comida',
      mercadoId,
      preco,
      data: addDays(hoje, -dias).toISOString()
    });
  });
  await lote.enviar();
}

async function popularUsuario(uid) {
  const base = `usuarios/${uid}`;
  const lote = criarGravador();
  const hoje = startOfDay(new Date());
  const ciclo = cycleFor(5, hoje);
  const inicio = startOfDay(ciclo.inicio);

  lote.gravar(`${base}/perfil`, {
    nome: CONTA_DE_TESTE.nome,
    email: CONTA_DE_TESTE.email,
    plano: 'mensal',
    onboardingCompleto: true,
    assinatura: { plano: 'mensal', desde: addDays(hoje, -120).toISOString(), cancelada: false },
    ciclo: { diaVirada: 5, frequencia: 'Uma vez por mês', rendaFixa: 4200, rendaVariavel: 600 },
    local: {
      cep: '13330-000',
      cidade: 'Indaiatuba, SP',
      lat: LOCAL_DE_TESTE.lat,
      lng: LOCAL_DE_TESTE.lng,
      raioKm: 5,
      mercados: ['nagumo', 'covabra', 'atacadao'],
      mercadoHabitual: 'nagumo'
    },
    prefs: {
      tema: 'tinta',
      ocultarValores: false,
      zerarNaVirada: true,
      resumoAntesDeFechar: false,
      contribuirPrecos: true,
      alertaAltaPreco: true
    },
    familiaId: 'casa-serra',
    criadoEm: addDays(hoje, -200).toISOString()
  });

  const cats = [
    ['comida', 'Comida', 'shopping-basket', 850, true],
    ['transporte', 'Transporte', 'car', 200, true],
    ['role', 'Rolê', 'beer', 300, false],
    ['casa', 'Casa', 'house', 1800, true],
    ['saude', 'Saúde', 'pill', 200, false],
    ['assinaturas', 'Assinaturas', 'repeat', 125, false],
    ['educacao', 'Educação', 'graduation-cap', 280, false]
  ];
  cats.forEach(([id, nome, icon, limite, compartilhada], ordem) =>
    lote.gravar(`${base}/categorias/${id}`, {
      nome,
      icon,
      limite,
      alerta80: true,
      compartilhada,
      reserva: false,
      ordem,
      criadoEm: hoje.toISOString()
    })
  );
  lote.gravar(`${base}/categorias/guardar`, {
    nome: 'Guardar',
    icon: 'target',
    limite: 905,
    alerta80: false,
    compartilhada: false,
    reserva: true,
    ordem: 99,
    criadoEm: hoje.toISOString()
  });

  const fixos = [
    ['aluguel', 'Aluguel', 'house', 'casa', 'Casa', 25, 1400],
    ['luz', 'Luz e água', 'zap', 'casa', 'Casa', 10, 214],
    ['internet', 'Internet', 'wifi', 'casa', 'Casa', 8, 99],
    ['curso', 'Curso', 'graduation-cap', 'educacao', 'Educação', 12, 276]
  ];
  fixos.forEach(([id, nome, icon, categoriaId, categoria, dia, valor]) =>
    lote.gravar(`${base}/fixos/${id}`, {
      nome,
      icon,
      categoriaId,
      categoria,
      dia,
      valor,
      criadoEm: hoje.toISOString()
    })
  );

  let n = 0;
  const lanc = (data, titulo, categoriaId, valor, extra = {}) => {
    const cat = cats.find(c => c[0] === categoriaId);
    lote.gravar(`${base}/lancamentos/seed${++n}`, {
      titulo,
      valor,
      tipo: 'saida',
      categoriaId,
      categoriaNome: cat ? cat[1] : categoriaId,
      origem: 'manual',
      data: data.toISOString(),
      quemId: uid,
      quemNome: CONTA_DE_TESTE.nome,
      criadoEm: data.toISOString(),
      ...extra
    });
  };
  const marina = { quemId: 'marina-serra', quemNome: 'Marina Serra' };

  const metas = [2980, 3105, 3240, 2890, 3132];
  const comidaHist = [930, 905, 900, 840, 830];
  metas.forEach((total, i) => {
    const c = cycleFor(5, hoje, i - 5);
    const ini = startOfDay(c.inicio);
    lote.gravar(`${base}/lancamentos/seed${++n}`, {
      titulo: 'Salário',
      valor: 4200,
      tipo: 'entrada',
      categoriaId: null,
      categoriaNome: 'entrada',
      origem: 'recorrente',
      data: ini.toISOString(),
      quemId: uid,
      quemNome: CONTA_DE_TESTE.nome
    });
    fixos.forEach(([, nome, , categoriaId, , dia, valor]) => {
      let d = new Date(ini.getFullYear(), ini.getMonth(), dia);
      if (d < ini) d = new Date(ini.getFullYear(), ini.getMonth() + 1, dia);
      lanc(d, nome, categoriaId, valor, { origem: 'recorrente' });
    });
    const variavel = total - 1989;
    const comida = comidaHist[i];
    const resto = variavel - comida;
    [
      ['Nagumo', 0.45, 'nota'],
      ['Atacadão', 0.35, 'nota'],
      ['Padaria Real', 0.2, 'manual']
    ].forEach(([t, p, origem], k) =>
      lanc(addDays(ini, 3 + k * 8), t, 'comida', round2(comida * p), {
        origem,
        economia: i === 3 && k === 1 ? 62 : 0
      })
    );
    [
      ['transporte', '99 Pop', 0.24],
      ['role', 'Bar do Zé', 0.32],
      ['saude', 'Drogaria São Paulo', 0.14],
      ['assinaturas', 'Streaming e apps', i % 2 ? 0.3 : 0.2],
      ['transporte', 'Posto Shell', i % 2 ? 0 : 0.1]
    ].forEach(([cat, t, p], k) => {
      if (p) lanc(addDays(ini, 5 + k * 4), t, cat, round2(resto * p), k === 1 ? marina : {});
    });
  });

  const d = t =>
    addDays(
      inicio,
      Math.max(0, Math.min(ciclo.diaAtual - 1, Math.round((t / 15) * (ciclo.diaAtual - 1))))
    );
  lote.gravar(`${base}/lancamentos/seed${++n}`, {
    titulo: 'Freela de design',
    valor: 600,
    tipo: 'entrada',
    categoriaId: null,
    categoriaNome: 'entrada',
    origem: 'manual',
    data: d(6).toISOString(),
    quemId: uid,
    quemNome: CONTA_DE_TESTE.nome
  });
  [
    [15, 'Nagumo', 'comida', 143.8, { origem: 'nota' }],
    [15, '99 Pop', 'transporte', 21.4],
    [14, 'Bar do Zé', 'role', 68, { origem: 'nota', ...marina }],
    [14, 'Drogaria São Paulo', 'saude', 47.9, { origem: 'nota' }],
    [13, 'Metrô', 'transporte', 5.2, marina],
    [13, 'Streaming anual', 'assinaturas', 34.9, { origem: 'recorrente' }],
    [11, 'Atacadão', 'comida', 212.4, { origem: 'lista', economia: 18.4 }],
    [9, 'Feira do bairro', 'comida', 54.2, marina],
    [8, 'iFood', 'role', 52, { origem: 'nota' }],
    [7, 'Nagumo', 'comida', 96.3, { origem: 'nota', ...marina }],
    [6, 'Posto Shell', 'transporte', 60],
    [5, 'Padaria Real', 'comida', 67.4],
    [4, 'Cinema', 'role', 96, marina],
    [3, 'Atacadão', 'comida', 89.9, { origem: 'nota', economia: 24.6 }],
    [3, 'Spotify', 'assinaturas', 21.9, { origem: 'recorrente' }],
    [2, 'Nuvem de fotos', 'assinaturas', 9.9, { origem: 'recorrente' }],
    [1, 'Academia', 'assinaturas', 62.3, { origem: 'recorrente' }],
    [10, '99 Pop', 'transporte', 21.4],
    [12, 'Drogaria Raia', 'saude', 18.5, marina]
  ].forEach(([t, titulo, cat, valor, extra]) => lanc(d(t), titulo, cat, valor, extra));

  [
    ['n1', 'Covabra Supermercados', 189.2, 12, 1],
    ['n2', 'Drogaria São Paulo', 47.9, 3, 2],
    ['n3', 'Padaria Real', 38.1, 5, 3]
  ].forEach(([id, estabelecimento, valor, itens, dias]) =>
    lote.gravar(`${base}/notas/${id}`, {
      estabelecimento,
      valor,
      itens,
      status: 'pendente',
      lidaEm: addDays(hoje, -dias).toISOString()
    })
  );

  const aporte = (dias, valor) => ({ data: addDays(inicio, dias).toISOString(), valor });
  [
    [
      'viagem',
      'Viagem em janeiro',
      'plane',
      5000,
      400,
      [aporte(-150, 550), aporte(-120, 400), aporte(-90, 400), aporte(-60, 400), aporte(0, 400)]
    ],
    [
      'reserva',
      'Reserva de emergência',
      'shield',
      5000,
      405,
      [aporte(-200, 1780), aporte(-120, 405), aporte(-90, 405), aporte(-60, 405), aporte(0, 405)]
    ],
    ['notebook', 'Troca do notebook', 'laptop', 4000, 0, [aporte(-60, 300), aporte(-30, 180)]]
  ].forEach(([id, nome, icon, alvo, aportePorCiclo, aportes]) =>
    lote.gravar(`${base}/metas/${id}`, {
      nome,
      icon,
      alvo,
      aportePorCiclo,
      sobraNaVirada: aportePorCiclo === 0,
      aportes,
      criadoEm: aportes[0].data
    })
  );

  [
    ['Azeite extravirgem 500ml', 1, false],
    ['Sabão em pó 1,6kg', 1, false],
    ['Café torrado 500g', 1, true],
    ['Leite integral 1L', 6, false],
    ['Arroz branco 5kg', 2, false]
  ].forEach(([nome, qtd, done], i) =>
    lote.gravar(`${base}/lista/item${i}`, {
      nome,
      qtd,
      done,
      criadoEm: addDays(hoje, 0).toISOString().replace('T00', `T0${i}`)
    })
  );

  lote.gravar('familias/casa-serra', {
    nome: 'Casa Serra',
    donoId: uid,
    membros: [
      {
        uid,
        nome: CONTA_DE_TESTE.nome,
        papel: 'dono',
        divisao: 60,
        desde: addDays(hoje, -200).toISOString()
      },
      {
        uid: 'marina-serra',
        nome: 'Marina Serra',
        papel: 'membro',
        divisao: 40,
        desde: addDays(hoje, -140).toISOString()
      }
    ],
    convites: [{ email: 'lucas@email.com', enviadoEm: addDays(hoje, -2).toISOString() }],
    convitesEmails: ['lucas@email.com']
  });

  await lote.enviar();
}

export async function popularDadosDeTeste(uid = CONTA_DE_TESTE.uid) {
  await popularMercadosEPrecos();
  await popularUsuario(uid);
  await CredencialModel.cadastrar({ ...CONTA_DE_TESTE, uid });
}
