import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

// Revisão de segurança das rotas: cada teste mostra uma falha corrigida (o que antes passava).
await import('./apoio/ambiente.js');
process.env.NODE_ENV = 'test';
const { handle } = await import('../src/app.js');
const { banco } = await import('../src/config/banco.js');
const { assinarToken } = await import('../src/middlewares/auth.js');
const { limparLimites, ipDe } = await import('../src/middlewares/limite.js');
const { UsuarioModel } = await import('../src/models/UsuarioModel.js');
const { VERSAO_DOS_TERMOS } = await import('../src/config/termos.js');
const { guardarComTeto } = await import('../src/utils/cache.js');
const { toNumber } = await import('../src/utils/http.js');
const { idValido } = await import('../src/utils/validacao.js');
const { GeoModel } = await import('../src/models/GeoModel.js');
const { MercadoModel } = await import('../src/models/MercadoModel.js');
const { PrecoRegionalModel } = await import('../src/models/PrecoRegionalModel.js');

// Nada sai para a internet: mapa, CEP e sites das redes ficam indisponíveis aqui.
const fetchDeVerdade = globalThis.fetch;
const chamadasLaFora = [];
globalThis.fetch = (endereco, opcoes) => {
  if (/^https?:\/\/localhost[:/]/.test(String(endereco))) return fetchDeVerdade(endereco, opcoes);
  chamadasLaFora.push(String(endereco));
  return Promise.reject(new Error('sem internet nos testes'));
};

let server;
let base;
before(() => {
  server = createServer(handle).listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());
beforeEach(() => limparLimites());

async function pedir(metodo, caminho, { corpo, token, cabecalhos = {}, bruto } = {}) {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...cabecalhos
    },
    body: bruto ?? (corpo ? JSON.stringify(corpo) : undefined)
  });
  const texto = await resposta.text();
  let json = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = null;
  }
  return { status: resposta.status, json, texto, cabecalhos: resposta.headers };
}

const termos = { versao: VERSAO_DOS_TERMOS, em: new Date().toISOString() };

async function criarPessoa(uid, email, nome, extra = {}) {
  await UsuarioModel.criarSeNaoExistir(uid, { nome, email, termosAceitos: termos });
  if (Object.keys(extra).length) await UsuarioModel.atualizar(uid, extra);
  return assinarToken({ uid, email, nome });
}

// Uma família: a Ana (dona, plano anual) e o Beto (membro). A categoria "Presentes" é só da Ana.
const hoje = new Date().toISOString();
let tokenDaAna;
let tokenDoBeto;
before(async () => {
  tokenDaAna = await criarPessoa('ana', 'ana@x.com', 'Ana', {
    plano: 'anual',
    familiaId: 'casa-ana',
    onboardingCompleto: true
  });
  tokenDoBeto = await criarPessoa('beto', 'beto@x.com', 'Beto', { familiaId: 'casa-ana' });
  await banco.gravar('familias/casa-ana', {
    nome: 'Casa da Ana',
    donoId: 'ana',
    membros: [
      { uid: 'ana', nome: 'Ana', papel: 'dono', divisao: 100 },
      { uid: 'beto', nome: 'Beto', papel: 'membro', divisao: 0 }
    ],
    convites: [],
    convitesEmails: []
  });
  await banco.gravar('usuarios/ana/categorias/comida', {
    nome: 'Comida',
    icon: 'shopping-basket',
    limite: 800,
    compartilhada: true,
    ordem: 0
  });
  await banco.gravar('usuarios/ana/categorias/presentes', {
    nome: 'Presentes',
    icon: 'gift',
    limite: 300,
    compartilhada: false,
    ordem: 1
  });
  await banco.gravar('usuarios/ana/lancamentos/l-comida', {
    titulo: 'Feira',
    valor: 50,
    tipo: 'saida',
    origem: 'manual',
    categoriaId: 'comida',
    categoriaNome: 'Comida',
    data: hoje,
    quemId: 'ana'
  });
  await banco.gravar('usuarios/ana/lancamentos/l-segredo', {
    titulo: 'Presente surpresa do Beto',
    valor: 250,
    tipo: 'saida',
    origem: 'manual',
    categoriaId: 'presentes',
    categoriaNome: 'Presentes',
    data: hoje,
    quemId: 'ana'
  });
});

test('id com barra codificada (%2F) na URL é recusado e não apaga a coleção inteira', async () => {
  // Antes: DELETE /lancamentos/%2F virava "usuarios/ana/lancamentos//" e apagava todos.
  const resposta = await pedir('DELETE', '/lancamentos/%2F', { token: tokenDaAna });
  assert.equal(resposta.status, 400);
  assert.ok(await banco.ler('usuarios/ana/lancamentos/l-comida'), 'os lançamentos continuam lá');
  for (const id of ['abc%2Fdef', 'a.b', 'a%23b', 'a%24b', 'a%5Bb', '__proto__'])
    assert.equal(
      (await pedir('DELETE', `/categorias/${id}`, { token: tokenDaAna })).status,
      400,
      `id ${id}`
    );
  assert.ok(await banco.ler('usuarios/ana/categorias/comida'));
});

test('id com nome de função do JavaScript (constructor, toString) dá "não encontrado", não 500', async () => {
  // Antes, no banco em memória, o id descia até a função do protótipo e o structuredClone falhava.
  for (const id of ['constructor', 'toString', 'valueOf', 'hasOwnProperty']) {
    const pedidos = [
      ['DELETE', `/lancamentos/${id}`],
      ['PATCH', `/categorias/${id}`, { limite: 1 }],
      ['PATCH', `/metas/${id}`, { alvo: 1 }],
      ['DELETE', `/metas/${id}`],
      ['POST', `/metas/${id}/aportes`, { valor: 1 }],
      ['PATCH', `/lista/${id}`, { qtd: 2 }],
      ['POST', `/familia/${id}/aceitar`],
      ['POST', `/notas/${id}/confirmar`, { categoriaId: 'comida' }]
    ];
    for (const [metodo, caminho, corpo] of pedidos) {
      const { status } = await pedir(metodo, caminho, { corpo, token: tokenDaAna });
      assert.ok([204, 404].includes(status), `${metodo} ${caminho}: ${status}`);
    }
    const lancamento = await pedir('POST', '/lancamentos', {
      corpo: { titulo: 'Teste', valor: 1, tipo: 'saida', categoriaId: id },
      token: tokenDaAna
    });
    assert.equal(lancamento.status, 400, `categoriaId ${id}`);
  }
  assert.ok(await banco.ler('usuarios/ana/lancamentos/l-comida'), 'os lançamentos continuam lá');
  assert.ok(await banco.ler('usuarios/ana/categorias/comida'), 'as categorias continuam lá');
});

test('endereço com %-codificação quebrada dá 400, não 500', async () => {
  assert.equal((await pedir('DELETE', '/lista/%E0%A4%A', { token: tokenDaAna })).status, 400);
});

test('corpo JSON que não é objeto (null, lista, texto) dá 400, não 500', async () => {
  for (const bruto of ['null', '[1,2]', '"texto"', '42'])
    assert.equal((await pedir('POST', '/auth/entrar', { bruto })).status, 400, bruto);
});

test('login com e-mail ou senha de outro tipo dá 400, não 500', async () => {
  const lista = await pedir('POST', '/auth/entrar', { corpo: { email: ['a@x.com'], senha: 'x' } });
  assert.equal(lista.status, 400);
  const numero = await pedir('POST', '/auth/entrar', { corpo: { email: 'a@x.com', senha: 12345678 } });
  assert.equal(numero.status, 400);
  const cadastro = await pedir('POST', '/auth/cadastrar', {
    corpo: { nome: 'X', email: ['x@x.com'], senha: '12345678', aceite: { versao: VERSAO_DOS_TERMOS } },
    cabecalhos: { 'X-Forwarded-For': '10.50.0.1' }
  });
  assert.equal(cadastro.status, 400);
});

test('família: a planilha do membro não leva os gastos das categorias só do dono', async () => {
  const csv = (await pedir('GET', '/lancamentos/export', { token: tokenDoBeto })).texto;
  assert.ok(csv.includes('Feira'), 'categoria compartilhada entra');
  assert.ok(!csv.includes('Presente surpresa'), 'categoria só do dono fica de fora');
  const daAna = (await pedir('GET', '/lancamentos/export', { token: tokenDaAna })).texto;
  assert.ok(daAna.includes('Presente surpresa'), 'a dona vê tudo');
});

test('planilha: descrição que começa com = + - @ não vira fórmula no Excel', async () => {
  const formula = '=HYPERLINK("https://exemplo.invalid","clique")';
  const criado = await pedir('POST', '/lancamentos', {
    corpo: { titulo: formula, valor: 1, tipo: 'saida', categoriaId: 'comida' },
    token: tokenDoBeto
  });
  assert.equal(criado.status, 201);
  const csv = (await pedir('GET', '/lancamentos/export', { token: tokenDaAna })).texto;
  const linha = csv.split('\n').find(l => l.includes('HYPERLINK'));
  assert.ok(linha.includes(`"'=HYPERLINK(""https://exemplo.invalid"",""clique"")"`), linha);
  assert.ok(!/;=HYPERLINK|;"=HYPERLINK/.test(linha), 'a célula não começa com =');
  await banco.remover(`usuarios/ana/lancamentos/${criado.json.id}`);
});

test('planilha: fórmula depois de vírgula ou tabulação também não vira célula no Excel', async () => {
  // Um programa que separa por vírgula (o Excel em inglês) ou por tabulação parte o texto ali.
  const titulos = ['Feira,=1+1', 'a,=1+1,b', 'Feira\t=1+1', 'Pão; @SOMA(1)', 'x,-2+3'];
  const ids = [];
  for (const titulo of titulos) {
    const criado = await pedir('POST', '/lancamentos', {
      corpo: { titulo, valor: 1, tipo: 'saida', categoriaId: 'comida' },
      token: tokenDoBeto
    });
    assert.equal(criado.status, 201);
    ids.push(criado.json.id);
  }
  try {
    const csv = (await pedir('GET', '/lancamentos/export', { token: tokenDaAna })).texto;
    const linhas = csv.split('\n').slice(1);
    assert.ok(linhas.some(l => l.includes(`"Feira,'=1+1"`)), 'a vírgula fica dentro da célula');
    for (const linha of linhas) {
      assert.ok(linha.startsWith('"') && linha.endsWith('"'), `toda célula entre aspas: ${linha}`);
      for (const pedaco of linha.split(/[,;\t]/))
        assert.ok(!/^\s*[=+\-@]/.test(pedaco), `pedaço começa como fórmula: ${pedaco}`);
    }
  } finally {
    for (const id of ids) await banco.remover(`usuarios/ana/lancamentos/${id}`);
  }
});

test('planilha: lançamentos do mais novo para o mais antigo', async () => {
  // O id que vem primeiro na ordem alfabética é o mais antigo: sem ordenar por data, ele sairia
  // na frente.
  await banco.gravar('usuarios/ana/lancamentos/a-antigo', {
    titulo: 'Bem antigo',
    valor: 5,
    tipo: 'saida',
    categoriaId: 'comida',
    categoriaNome: 'Comida',
    data: '2020-01-05T12:00:00.000Z',
    quemId: 'ana'
  });
  await banco.gravar('usuarios/ana/lancamentos/z-recente', {
    titulo: 'Bem recente',
    valor: 5,
    tipo: 'saida',
    categoriaId: 'comida',
    categoriaNome: 'Comida',
    data: '2099-01-05T12:00:00.000Z',
    quemId: 'ana'
  });
  try {
    const csv = (await pedir('GET', '/lancamentos/export', { token: tokenDaAna })).texto;
    const datas = csv
      .split('\n')
      .slice(1)
      .map(l => l.slice(1, 11));
    assert.deepEqual(datas, [...datas].sort().reverse());
    assert.equal(datas[0], '2099-01-05');
    assert.equal(datas.at(-1), '2020-01-05');
  } finally {
    await banco.remover('usuarios/ana/lancamentos/a-antigo');
    await banco.remover('usuarios/ana/lancamentos/z-recente');
  }
});

test('família: o relatório do ano do membro não soma os gastos das categorias só do dono', async () => {
  const relatorio = (await pedir('GET', '/relatorios', { token: tokenDoBeto })).json;
  const totalDoMes = relatorio.meses[new Date().getMonth()].total;
  assert.equal(totalDoMes, 50);
  const daAna = (await pedir('GET', '/relatorios', { token: tokenDaAna })).json;
  assert.equal(daAna.meses[new Date().getMonth()].total, 300);
});

test('família: o membro não lança gasto numa categoria que o dono não compartilhou', async () => {
  const corpo = { titulo: 'Teste', valor: 10, tipo: 'saida', categoriaId: 'presentes' };
  const resposta = await pedir('POST', '/lancamentos', { corpo, token: tokenDoBeto });
  assert.equal(resposta.status, 400);
  const compartilhada = await pedir('POST', '/lancamentos', {
    corpo: { ...corpo, categoriaId: 'comida' },
    token: tokenDoBeto
  });
  assert.equal(compartilhada.status, 201);
  await banco.remover(`usuarios/ana/lancamentos/${compartilhada.json.id}`);
});

test('família: nota pendente da dona não aparece para o membro, nem pode ser confirmada por ele', async () => {
  await banco.gravar('usuarios/ana/notas/nota-ana', {
    chave: '1'.repeat(44),
    estabelecimento: 'Farmácia da Ana',
    valor: 80,
    itens: 1,
    produtos: [{ produto: 'Remédio', quantidade: 1, preco: 80, total: 80 }],
    status: 'pendente',
    lidaEm: hoje,
    quemId: 'ana'
  });
  const doBeto = (await pedir('GET', '/notas', { token: tokenDoBeto })).json;
  assert.ok(!doBeto.some(nota => nota.id === 'nota-ana'));
  const notificacoes = (await pedir('GET', '/notificacoes', { token: tokenDoBeto })).json;
  assert.ok(!notificacoes.notificacoes.some(n => n.notaId === 'nota-ana'));
  const painel = (await pedir('GET', '/dashboard', { token: tokenDoBeto })).json;
  assert.equal(painel.pendentesTotal, 0);

  const confirmar = await pedir('POST', '/notas/nota-ana/confirmar', {
    corpo: { categoriaId: 'comida' },
    token: tokenDoBeto
  });
  assert.equal(confirmar.status, 404);
  assert.equal((await pedir('DELETE', '/notas/nota-ana', { token: tokenDoBeto })).status, 404);
  assert.equal((await banco.ler('usuarios/ana/notas/nota-ana')).status, 'pendente');

  const daAna = (await pedir('GET', '/notas', { token: tokenDaAna })).json;
  assert.ok(daAna.some(nota => nota.id === 'nota-ana'), 'a dona vê as notas da casa');
});

test('descartar nota que não existe dá 404 e não cria registro no banco', async () => {
  assert.equal((await pedir('DELETE', '/notas/nao-existe', { token: tokenDaAna })).status, 404);
  assert.equal(await banco.ler('usuarios/ana/notas/nao-existe'), null);
});

test('família: o membro guarda na meta do dono, mas não muda nem apaga a meta', async () => {
  await banco.gravar('usuarios/ana/metas/viagem', {
    nome: 'Viagem',
    icon: 'plane',
    alvo: 1000,
    aportes: [{ data: hoje, valor: 800, quemId: 'ana' }],
    quemId: 'ana'
  });
  assert.equal(
    (await pedir('PATCH', '/metas/viagem', { corpo: { alvo: 1 }, token: tokenDoBeto })).status,
    403
  );
  assert.equal((await pedir('DELETE', '/metas/viagem', { token: tokenDoBeto })).status, 403);
  assert.ok(await banco.ler('usuarios/ana/metas/viagem'), 'a meta continua lá');
  const aportar = (valor, token = tokenDoBeto) =>
    pedir('POST', '/metas/viagem/aportes', { corpo: { valor }, token });
  assert.equal((await aportar(20)).status, 200);

  // Retirar também é mudar a meta: o Beto retira só o que ele mesmo guardou.
  const zerar = await aportar(-800);
  assert.equal(zerar.status, 403, 'o membro não zera a meta da dona com um aporte negativo');
  assert.equal((await aportar(-21)).status, 403);
  const guardadoDepois = async () =>
    (await banco.ler('usuarios/ana/metas/viagem')).aportes.reduce((t, a) => t + a.valor, 0);
  assert.equal(await guardadoDepois(), 820);
  assert.equal((await aportar(-20)).status, 200, 'o que ele guardou ele retira');
  assert.equal((await aportar(-1)).status, 403);
  assert.equal(await guardadoDepois(), 800);
  assert.equal((await aportar(-100, tokenDaAna)).status, 200, 'a dona retira');

  // A meta que o próprio membro criou ele muda e apaga.
  const criada = await pedir('POST', '/metas', {
    corpo: { nome: 'Bicicleta', alvo: 500 },
    token: tokenDoBeto
  });
  assert.equal(criada.status, 201);
  assert.equal(
    (await pedir('PATCH', `/metas/${criada.json.id}`, { corpo: { alvo: 600 }, token: tokenDoBeto }))
      .status,
    200
  );
  assert.equal((await pedir('DELETE', `/metas/${criada.json.id}`, { token: tokenDoBeto })).status, 204);

  // Meta gravada antes do campo quemId: quem criou é quem fez o aporte junto com a criação.
  const antiga = (id, dataDoAporte) =>
    banco.gravar(`usuarios/ana/metas/${id}`, {
      nome: 'Antiga',
      alvo: 300,
      criadoEm: '2026-01-10T12:00:00.000Z',
      aportes: [{ data: dataDoAporte, valor: 50, quemId: 'beto' }]
    });
  await antiga('antiga-do-beto', '2026-01-10T12:00:00.001Z');
  assert.equal(
    (await pedir('PATCH', '/metas/antiga-do-beto', { corpo: { alvo: 400 }, token: tokenDoBeto }))
      .status,
    200
  );
  // Um aporte dias depois não diz quem criou: aí só a dona muda.
  await antiga('antiga-sem-dono', '2026-01-15T12:00:00.000Z');
  assert.equal(
    (await pedir('PATCH', '/metas/antiga-sem-dono', { corpo: { alvo: 400 }, token: tokenDoBeto }))
      .status,
    403
  );
  for (const id of ['viagem', 'antiga-do-beto', 'antiga-sem-dono'])
    await banco.remover(`usuarios/ana/metas/${id}`);
});

test('meta com valor negativo, ícone que não é nome de ícone ou nome enorme é recusada', async () => {
  const criar = corpo => pedir('POST', '/metas', { corpo, token: tokenDaAna });
  assert.equal((await criar({ nome: 'X', alvo: -100 })).status, 400);
  assert.equal((await criar({ nome: 'X', alvo: 100, aportePorCiclo: -5 })).status, 400);
  assert.equal((await criar({ nome: 'X', alvo: 100, icon: { a: 1 } })).status, 400);
  assert.equal((await criar({ nome: 'x'.repeat(81), alvo: 100 })).status, 400);
});

test('família: quem já está numa família não aceita outro convite (nem entra duas vezes)', async () => {
  await banco.gravar('familias/outra', {
    nome: 'Outra casa',
    donoId: 'carla',
    membros: [{ uid: 'carla', nome: 'Carla', papel: 'dono', divisao: 100 }],
    convites: [{ email: 'beto@x.com', enviadoEm: hoje }],
    convitesEmails: ['beto@x.com']
  });
  const resposta = await pedir('POST', '/familia/outra/aceitar', { token: tokenDoBeto });
  assert.equal(resposta.status, 409);
  assert.equal((await UsuarioModel.buscar('beto')).familiaId, 'casa-ana');
  assert.equal((await banco.ler('familias/outra')).membros.length, 1);
});

test('perfil: preferência, ciclo e localização só aceitam o tipo e o tamanho certos', async () => {
  const mudar = corpo => pedir('PATCH', '/me', { corpo, token: tokenDaAna });
  assert.equal((await mudar({ prefs: { tema: { muito: { fundo: 1 } } } })).status, 400);
  assert.equal((await mudar({ prefs: { ocultarValores: 'sim' } })).status, 400);
  assert.equal((await mudar({ nome: 'x'.repeat(101) })).status, 400);
  assert.equal((await mudar({ ciclo: { frequencia: { a: 1 } } })).status, 400);
  assert.equal((await mudar({ ciclo: { diaVirada: 2.5 } })).status, 400);
  // Objeto com toString próprio quebrava o Number() e virava 500.
  assert.equal((await mudar({ ciclo: { diaVirada: { toString: 1 } } })).status, 400);
  assert.equal((await mudar({ ciclo: { diaVirada: [3] } })).status, 400);
  assert.equal((await mudar({ local: { lat: 1e308, lng: 0 } })).status, 400);
  assert.equal((await mudar({ local: { mercados: 'tudo' } })).status, 400);
  assert.equal((await mudar({ local: { cep: '<script>' } })).status, 400);
  const perfil = await UsuarioModel.buscar('ana');
  assert.equal(perfil.prefs?.tema ?? 'tinta', 'tinta');

  const raio = await mudar({ local: { raioKm: 1e9 } });
  assert.equal(raio.status, 200);
  assert.equal(raio.json.local.raioKm, 15, 'o raio fica no máximo que o mapa consulta');
  assert.equal((await mudar({ prefs: { tema: 'papel' } })).json.prefs.tema, 'papel');
});

test('perfil: mandar um grupo vazio não apaga o que já estava guardado', async () => {
  await pedir('PATCH', '/me', { corpo: { local: { cidade: 'Campinas - SP' } }, token: tokenDaAna });
  await pedir('PATCH', '/me', { corpo: { local: {} }, token: tokenDaAna });
  assert.equal((await UsuarioModel.buscar('ana')).local.cidade, 'Campinas - SP');
});

test('categoria: ícone desconhecido, limite negativo e nome enorme são recusados', async () => {
  const mudar = corpo => pedir('PATCH', '/categorias/comida', { corpo, token: tokenDaAna });
  assert.equal((await mudar({ icon: { qualquer: 'coisa' } })).status, 400);
  assert.equal((await mudar({ limite: -50 })).status, 400);
  assert.equal((await mudar({ nome: 'x'.repeat(41) })).status, 400);
  assert.equal((await banco.ler('usuarios/ana/categorias/comida')).icon, 'shopping-basket');
});

test('lançamento: data inválida, descrição enorme e valor absurdo dão 400, não 500', async () => {
  const lancar = corpo =>
    pedir('POST', '/lancamentos', {
      corpo: { titulo: 'Mercado', valor: 10, categoriaId: 'comida', ...corpo },
      token: tokenDaAna
    });
  assert.equal((await lancar({ data: 'ontem à noite' })).status, 400);
  assert.equal((await lancar({ data: { dia: 1 } })).status, 400);
  assert.equal((await lancar({ titulo: 'x'.repeat(121) })).status, 400);
  assert.equal((await lancar({ valor: 1e300 })).status, 400);
  assert.equal((await lancar({ valor: true })).status, 400);
  assert.equal((await lancar({ categoriaId: 'a/b' })).status, 400);
  const ciclo = await pedir('GET', '/lancamentos?ciclo=99999999999', { token: tokenDaAna });
  assert.equal(ciclo.status, 200, 'deslocamento absurdo do ciclo não derruba a rota');
});

test('lista: tem teto de itens, para uma lista não virar milhares de buscas nos sites', async () => {
  const itens = {};
  for (let i = 0; i < 150; i++) itens[`item${i}`] = { nome: `item ${i}`, qtd: 1, done: false };
  await banco.gravar('usuarios/ana/lista', itens);
  const resposta = await pedir('POST', '/lista', { corpo: { nome: 'mais um' }, token: tokenDaAna });
  assert.equal(resposta.status, 409);
  assert.equal(Object.keys(await banco.ler('usuarios/ana/lista')).length, 150);
  await banco.remover('usuarios/ana/lista');
  assert.equal(
    (await pedir('POST', '/lista', { corpo: { nome: 'x'.repeat(151) }, token: tokenDaAna })).status,
    400
  );
});

test('comparar preços tem limite por conta (cada busca consulta os sites das redes)', async () => {
  const token = await criarPessoa('dani', 'dani@x.com', 'Dani');
  let ultima;
  for (let i = 0; i < 91; i++)
    ultima = await pedir('GET', `/mercados/comparar?produto=arroz${i}`, {
      token,
      // Trocar o IP não engana o limite por conta.
      cabecalhos: { 'X-Forwarded-For': `10.60.0.${i}` }
    });
  assert.equal(ultima.status, 429);
  assert.ok(Number(ultima.cabecalhos.get('retry-after')) > 0);
});

test('rotas públicas do mapa têm limite por IP e não aceitam raio nem coordenada absurdos', async () => {
  const raio = await pedir('GET', '/onboarding/raio?km=100000', {
    cabecalhos: { 'X-Forwarded-For': '10.70.0.1' }
  });
  assert.equal(raio.json.raioKm, 15);

  chamadasLaFora.length = 0;
  await pedir('GET', '/mercados?lat=1e308&lng=1e308', { cabecalhos: { 'X-Forwarded-For': '10.70.0.2' } });
  assert.equal(chamadasLaFora.length, 0, 'coordenada fora do planeta não vira consulta ao mapa');

  let ultima;
  for (let i = 0; i < 121; i++)
    ultima = await pedir('GET', '/onboarding/raio', { cabecalhos: { 'X-Forwarded-For': '10.70.0.3' } });
  assert.equal(ultima.status, 429);
});

test('no Render, o IP do limite vem do CF-Connecting-IP: trocar o X-Forwarded-For não escapa', async () => {
  let ultima;
  for (let i = 0; i < 11; i++)
    ultima = await pedir('POST', '/auth/entrar', {
      corpo: { email: 'ninguem@x.com', senha: 'errada123' },
      cabecalhos: { 'CF-Connecting-IP': '203.0.113.9', 'X-Forwarded-For': `198.51.100.${i}` }
    });
  assert.equal(ultima.status, 429);
  assert.equal(
    ipDe({ headers: { 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } }),
    '203.0.113.9'
  );
  assert.equal(ipDe({ headers: { 'x-forwarded-for': '1.2.3.4' } }), '1.2.3.4');
});

test('cadastro guiado: listas sem teto e campos de outro tipo são recusados', async () => {
  const token = await criarPessoa('edu', 'edu@x.com', 'Edu');
  const base = { renda: { rendaFixa: 3000 }, plano: 'gratis' };
  const concluir = corpo => pedir('POST', '/onboarding', { corpo: { ...base, ...corpo }, token });
  const muitas = Array.from({ length: 31 }, (_, i) => ({ nome: `Cat ${i}`, limite: 1 }));
  assert.equal((await concluir({ categorias: muitas })).status, 400);
  assert.equal((await concluir({ categorias: [{ nome: { a: 1 } }] })).status, 400);
  assert.equal((await concluir({ fixos: 'aluguel' })).status, 400);
  assert.equal((await concluir({ fixos: [{ nome: 'Aluguel', valor: -1 }] })).status, 400);
  assert.equal(
    (await concluir({ fixos: [{ nome: 'Aluguel', valor: 1, dia: { toString: 1 } }] })).status,
    400
  );
  assert.equal((await concluir({ plano: ['anual'] })).status, 400);

  // Nome de categoria como "__proto__" ou "constructor" é só um nome.
  const ok = await concluir({
    categorias: [{ nome: 'constructor', limite: 10 }],
    fixos: [{ nome: 'Estranho', valor: 5, categoria: '__proto__' }]
  });
  assert.equal(ok.status, 201);
  const nomes = Object.values(await banco.ler('usuarios/edu/categorias')).map(c => c.nome);
  assert.deepEqual(nomes.sort(), ['__proto__', 'constructor']);
});

test('notificações vistas: lista enorme ou ids gigantes são recusados', async () => {
  const marcar = ids => pedir('POST', '/notificacoes/vistas', { corpo: { ids }, token: tokenDaAna });
  assert.equal((await marcar(Array.from({ length: 201 }, (_, i) => `n${i}`))).status, 400);
  assert.equal((await marcar(['x'.repeat(201)])).status, 400);
  assert.equal((await marcar([{ id: 1 }])).status, 400);
  assert.equal((await marcar(['nota-1'])).status, 200);
});

test('e-mail do cadastro de interessados tem tamanho máximo', async () => {
  const longo = `${'a'.repeat(250)}@x.com`;
  const resposta = await pedir('POST', '/leads', {
    corpo: { email: longo },
    cabecalhos: { 'X-Forwarded-For': '10.80.0.1' }
  });
  assert.equal(resposta.status, 400);
});

test('valores e ids: true, listas e caminhos não passam por número nem por id', () => {
  assert.throws(() => toNumber(true, 'valor'), { status: 400 });
  assert.throws(() => toNumber([5], 'valor'), { status: 400 });
  assert.equal(toNumber('1.234,56', 'valor'), 1234.56);
  assert.ok(idValido('-Nabc_123'));
  assert.ok(idValido('fixo_abc_20261105'));
  for (const id of ['', 'a/b', 'a.b', 'a#b', 'a$b', 'a[b', 'a]b', 'a\nb', '__proto__', 'x'.repeat(129), 5])
    assert.ok(!idValido(id), JSON.stringify(id));
});

test('a configuração pública não diz qual banco a API usa', async () => {
  const configuracao = (await pedir('GET', '/auth/configuracao')).json;
  assert.equal(configuracao.versaoDosTermos, VERSAO_DOS_TERMOS);
  assert.equal(configuracao.modoBanco, undefined);
});

test('o mesmo CEP não vira uma consulta nova ao ViaCEP e ao Nominatim a cada pedido', async () => {
  const anterior = globalThis.fetch;
  const pedidos = [];
  globalThis.fetch = async endereco => {
    pedidos.push(String(endereco));
    if (String(endereco).includes('viacep'))
      return Response.json({ logradouro: 'Rua A', bairro: 'Centro', localidade: 'Itu', uf: 'SP' });
    return Response.json([{ lat: '-23.26', lon: '-47.29' }]);
  };
  try {
    const primeiro = await GeoModel.porCep('13300-000');
    const segundo = await GeoModel.porCep('13300000');
    assert.deepEqual(segundo, primeiro);
    assert.equal(primeiro.cidade, 'Itu - SP');
    assert.equal(pedidos.filter(p => p.includes('viacep')).length, 1);
    assert.equal(pedidos.length, 2, 'uma ida ao ViaCEP e uma ao Nominatim');
  } finally {
    globalThis.fetch = anterior;
  }
});

test('cache com teto: passou do limite, sai a entrada mais antiga', () => {
  const mapa = new Map();
  for (let i = 0; i < 10; i++) guardarComTeto(mapa, `k${i}`, i, 3);
  assert.deepEqual([...mapa.keys()], ['k7', 'k8', 'k9']);
  guardarComTeto(mapa, 'k7', 70, 3);
  assert.deepEqual([...mapa.keys()], ['k8', 'k9', 'k7'], 'regravar conta como recente');
});

test('mensagens de erro em português correto (aparecem no aviso do app)', async () => {
  const lancar = await pedir('POST', '/lancamentos', {
    corpo: { titulo: '   ', valor: 10, categoriaId: 'comida' },
    token: tokenDaAna
  });
  assert.equal(lancar.json.erro, 'Preencha a descrição.');
  const token = await criarPessoa('gabi', 'gabi@x.com', 'Gabi');
  const concluir = corpo =>
    pedir('POST', '/onboarding', {
      corpo: { renda: { rendaFixa: 3000 }, plano: 'gratis', ...corpo },
      token
    });
  const fixos = await concluir({ fixos: 'aluguel' });
  assert.equal(fixos.json.erro, 'Gastos fixos precisam vir numa lista.');
  const muitas = Array.from({ length: 31 }, (_, i) => ({ nome: `Cat ${i}` }));
  const categorias = await concluir({ categorias: muitas });
  assert.equal(categorias.json.erro, 'Dá para enviar até 30 categorias.');
  const mudar = corpo => pedir('PATCH', '/me', { corpo, token: tokenDaAna });
  const prefs = await mudar({ prefs: 'escuro' });
  assert.equal(prefs.json.erro, 'O grupo de preferências está num formato inválido.');
  const mercados = await mudar({ local: { mercados: 'x' } });
  assert.equal(mercados.json.erro, 'Mercados precisam vir numa lista.');
});

// Região e preços de mentira: um mercado só, e cada item custa R$ 10 na categoria pedida.
async function comPrecosFalsos(categoriaDosItens, executar) {
  const originais = {
    daRegiao: MercadoModel.daRegiao,
    lista: PrecoRegionalModel.lista,
    cepParaPrecos: GeoModel.cepParaPrecos
  };
  MercadoModel.daRegiao = async () => ({
    modo: 'real',
    mercados: [{ id: 'm-teste', nome: 'Mercado Teste' }]
  });
  GeoModel.cepParaPrecos = async () => '';
  PrecoRegionalModel.lista = async itens => {
    const comPreco = itens.map(item => ({
      ...item,
      categoria: categoriaDosItens,
      precos: { 'm-teste': 10 }
    }));
    const total = {
      mercadoId: 'm-teste',
      nome: 'Mercado Teste',
      total: 10 * comPreco.length,
      porCategoria: { [categoriaDosItens]: 10 * comPreco.length }
    };
    return { itens: comPreco, totais: [total], melhor: total, habitual: null, semPreco: [] };
  };
  try {
    return await executar();
  } finally {
    Object.assign(MercadoModel, { daRegiao: originais.daRegiao });
    Object.assign(PrecoRegionalModel, { lista: originais.lista });
    Object.assign(GeoModel, { cepParaPrecos: originais.cepParaPrecos });
  }
}

test('família: finalizar a lista não lança o gasto numa categoria que o dono não compartilhou', async () => {
  const criados = [];
  const finalizarComo = async (token, nome) => {
    assert.equal((await pedir('POST', '/lista', { corpo: { nome }, token })).status, 201);
    const resposta = await pedir('POST', '/lista/finalizar', { corpo: {}, token });
    assert.equal(resposta.status, 200, resposta.texto);
    criados.push(...resposta.json.lancamentos.map(l => l.id));
    return resposta.json.lancamentos;
  };
  try {
    await comPrecosFalsos('Presentes', async () => {
      // Os itens são da categoria Presentes, que só a Ana enxerga: o Beto lança na Comida.
      const [doBeto] = await finalizarComo(tokenDoBeto, 'vela');
      assert.equal(doBeto.categoriaId, 'comida');
      assert.equal(doBeto.quemId, 'beto');
      // A dona enxerga todas: o gasto dela vai para Presentes.
      const [daAna] = await finalizarComo(tokenDaAna, 'laço');
      assert.equal(daAna.categoriaId, 'presentes');

      // Sem nenhuma categoria compartilhada, o gasto do Beto entra sem categoria.
      await banco.atualizar('usuarios/ana/categorias/comida', { compartilhada: false });
      const [semCategoria] = await finalizarComo(tokenDoBeto, 'papel');
      assert.equal(semCategoria.categoriaId, null);
      const usados = Object.values(await banco.ler('usuarios/ana/lancamentos')).filter(
        l => l.quemId === 'beto' && l.origem === 'lista'
      );
      assert.ok(!usados.some(l => l.categoriaId === 'presentes'), 'nada do Beto em Presentes');
    });
  } finally {
    await banco.atualizar('usuarios/ana/categorias/comida', { compartilhada: true });
    for (const id of criados) await banco.remover(`usuarios/ana/lancamentos/${id}`);
    await banco.remover('usuarios/ana/lista');
  }
});

test('lista: produto, quantidade e itens de outro tipo dão 400, não 500', async () => {
  const estranho = { toString: 1 };
  for (const campo of ['chave', 'ean', 'marca', 'tamanho', 'termo'])
    assert.equal(
      (
        await pedir('POST', '/lista', {
          corpo: { nome: 'arroz', produto: { [campo]: estranho } },
          token: tokenDaAna
        })
      ).status,
      400,
      campo
    );
  const criado = await pedir('POST', '/lista', {
    corpo: { nome: 'arroz', produto: { marca: 'Tio João', ean: '789-100' } },
    token: tokenDaAna
  });
  assert.equal(criado.status, 201);
  const item = Object.entries(await banco.ler('usuarios/ana/lista')).find(
    ([, valor]) => valor.nome === 'arroz'
  );
  assert.equal(item[1].produto.ean, '789100');
  const mudar = corpo => pedir('PATCH', `/lista/${item[0]}`, { corpo, token: tokenDaAna });
  for (const qtd of [estranho, 0, 100, 2.5, 'muitos'])
    assert.equal((await mudar({ qtd })).status, 400, JSON.stringify(qtd));
  assert.equal((await mudar({ qtd: 3 })).status, 200);
  assert.equal((await banco.ler(`usuarios/ana/lista/${item[0]}`)).qtd, 3);
  await comPrecosFalsos('Comida', async () => {
    const finalizar = await pedir('POST', '/lista/finalizar', {
      corpo: { itemIds: [estranho] },
      token: tokenDaAna
    });
    assert.equal(finalizar.status, 400);
    assert.equal(finalizar.json.erro, 'O item precisa ser um texto.');
  });
  await banco.remover('usuarios/ana/lista');
});

test('cadastro guiado: o total de categorias, contando as dos gastos fixos, fica em 40', async () => {
  const token = await criarPessoa('hugo', 'hugo@x.com', 'Hugo');
  const categorias = Array.from({ length: 30 }, (_, i) => ({ nome: `Cat ${i}`, limite: 1 }));
  const fixos = quantos =>
    Array.from({ length: quantos }, (_, i) => ({ nome: `Fixo ${i}`, valor: 1, categoria: `F${i}` }));
  const concluir = corpo =>
    pedir('POST', '/onboarding', {
      corpo: { renda: { rendaFixa: 3000 }, plano: 'gratis', categorias, ...corpo },
      token
    });
  // Antes: 30 categorias e 50 fixos de categorias diferentes davam 80 categorias.
  const demais = await concluir({ fixos: fixos(11) });
  assert.equal(demais.status, 400);
  assert.match(demais.json.erro, /até 40 categorias/);
  // Fixo numa categoria que já veio na lista não conta de novo.
  const comRepetido = fixos(10).concat({ nome: 'Luz', valor: 1, categoria: 'Cat 0' });
  assert.equal((await concluir({ fixos: comRepetido })).status, 201);
  assert.equal(Object.keys(await banco.ler('usuarios/hugo/categorias')).length, 40);
});

test('sessão: nome longo é cortado em 100 caracteres, não recusa o login nem perde o aceite', async () => {
  // Nome longo no token (como o do Google).
  const doToken = assinarToken({ uid: 'iris', email: 'iris@x.com', nome: `Íris ${'a'.repeat(150)}` });
  const sessao = await pedir('POST', '/auth/sessao', { corpo: {}, token: doToken });
  assert.equal(sessao.status, 200);
  assert.equal(sessao.json.nome.length, 100);

  // Nome longo digitado no cadastro pelo Firebase, que já criou a conta lá antes da sessão.
  const token = assinarToken({ uid: 'joao', email: 'joao@x.com' });
  const resposta = await pedir('POST', '/auth/sessao', {
    corpo: { nome: `João ${'b'.repeat(150)}`, aceite: { versao: VERSAO_DOS_TERMOS } },
    token
  });
  assert.equal(resposta.status, 200);
  const perfil = await UsuarioModel.buscar('joao');
  assert.equal(perfil.nome.length, 100);
  assert.ok(perfil.nome.startsWith('João b'));
  assert.equal(perfil.termosAceitos.versao, VERSAO_DOS_TERMOS, 'o aceite ficou gravado');
  const estranho = await pedir('POST', '/auth/sessao', { corpo: { nome: { a: 1 } }, token });
  assert.equal(estranho.status, 400);
});
