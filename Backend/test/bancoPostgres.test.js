import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { criarBancoMemoria } from '../src/config/bancoMemoria.js';
import { criarBancoPostgres, opcoesDeConexao } from '../src/config/bancoPostgres.js';

// Compara o adaptador PostgreSQL com o banco em memória (a referência de comportamento).
// Só roda com um banco de teste: DATABASE_URL_TESTE=postgres://.../vera_teste npm run test:pg
const url = process.env.DATABASE_URL_TESTE || '';
const semBanco = !/test/i.test(new URL(url || 'postgres://x/').pathname)
  ? 'sem DATABASE_URL_TESTE (veja "Testes no PostgreSQL" no README)'
  : false;

const comBanco = { skip: semBanco };

let memoria;
let postgres;
let cliente;

before(async () => {
  if (semBanco) return;
  postgres = criarBancoPostgres({ url });
  cliente = new pg.Client(opcoesDeConexao(url));
  await cliente.connect();
});
after(async () => {
  if (semBanco) return;
  await postgres.remover('');
  await postgres.fechar();
  await cliente.end();
});

const porId = lista => [...lista].sort((a, b) => (a.id < b.id ? -1 : 1));

/** Roda a mesma operação nos dois bancos, começando ambos vazios. */
async function nosDois(operacao) {
  memoria = criarBancoMemoria();
  await postgres.remover('');
  await operacao(memoria);
  await operacao(postgres);
}

async function iguais(...caminhos) {
  for (const caminho of ['', ...caminhos])
    assert.deepEqual(await postgres.ler(caminho), await memoria.ler(caminho), caminho || '(raiz)');
}

async function contar(tabela, filtro = '', parametros = []) {
  const { rows } = await cliente.query(`select count(*) from ${tabela} ${filtro}`, parametros);
  return Number(rows[0].count);
}

test('opções de conexão: sslmode da URL e PGSSL', () => {
  const exigido = opcoesDeConexao('postgres://u:s@exemplo.com/banco?sslmode=require', '');
  assert.deepEqual(exigido.ssl, { rejectUnauthorized: true });
  assert.ok(!exigido.connectionString.includes('sslmode'));
  assert.equal(opcoesDeConexao('postgres://u:s@localhost/banco', '').ssl, false);
  assert.deepEqual(opcoesDeConexao('postgres://u:s@localhost/banco', 'no-verify').ssl, {
    rejectUnauthorized: false
  });
  assert.equal(opcoesDeConexao('postgres://u:s@h/b?sslmode=require', 'disable').ssl, false);
});

test('perfil: gravar, ler subcampo, mesclar e atualizar dentro do jsonb', comBanco, async () => {
  await nosDois(async banco => {
    await banco.gravar('usuarios/ana/perfil', { nome: 'Ana', plano: 'free', vazio: {} });
    await banco.gravar('usuarios/ana/perfil/notificacoesVistas', ['a', 'b']);
    await banco.mesclar('usuarios/ana/perfil', { config: { tema: 'escuro', alerta: true } });
    await banco.mesclar('usuarios/ana/perfil', { config: { alerta: false } });
    await banco.atualizar('usuarios/ana/perfil', { plano: 'pro', 'config/tema': null });
  });
  await iguais(
    'usuarios/ana',
    'usuarios/ana/perfil',
    'usuarios/ana/perfil/notificacoesVistas',
    'usuarios/ana/perfil/config/alerta',
    'usuarios/ana/perfil/naoExiste',
    'usuarios/ninguem/perfil'
  );
  assert.deepEqual(await postgres.ler('usuarios/ana/perfil/notificacoesVistas'), ['a', 'b']);
  assert.equal(await postgres.ler('usuarios/ana/perfil/config/tema'), null);
});

test('coleções do usuário: adicionar gera id, listar traz o id, campo dentro do item', comBanco, async () => {
  const ids = { memoria: [], postgres: [] };
  await nosDois(async banco => {
    const destino = banco === memoria ? ids.memoria : ids.postgres;
    for (const produto of ['arroz', 'feijão', 'café'])
      destino.push(await banco.adicionar('usuarios/ana/lista', { produto, done: false }));
    await banco.gravar('usuarios/ana/lancamentos/l1', { valor: 10.5, tipo: 'gasto' });
    await banco.atualizar('usuarios/ana/lancamentos/l1', { valor: 12, nota: { texto: 'x' } });
    await banco.gravar('usuarios/ana/lancamentos/l1/nota/texto', 'mercado');
  });
  assert.equal(ids.postgres.length, 3);
  assert.equal(new Set(ids.postgres).size, 3);
  ids.postgres.forEach(id => assert.match(id, /^[-0-9A-Za-z_]{20}$/));
  const lista = await postgres.listar('usuarios/ana/lista');
  assert.deepEqual(lista.map(item => item.produto).sort(), ['arroz', 'café', 'feijão']);
  assert.ok(lista.every(item => ids.postgres.includes(item.id)));
  assert.deepEqual(await postgres.ler('usuarios/ana/lancamentos/l1'), {
    valor: 12,
    tipo: 'gasto',
    nota: { texto: 'mercado' }
  });
  assert.equal(await postgres.ler('usuarios/ana/lancamentos/l1/nota/texto'), 'mercado');
  assert.deepEqual(
    porId(await postgres.listar('usuarios/ana/lancamentos')),
    porId(await memoria.listar('usuarios/ana/lancamentos'))
  );
  assert.deepEqual(await postgres.listar('usuarios/ana/metas'), []);
});

test('poda de nós vazios: item e perfil que ficam vazios somem', comBanco, async () => {
  await nosDois(async banco => {
    await banco.gravar('usuarios/ana/metas/m1', { nome: 'Viagem' });
    await banco.atualizar('usuarios/ana/metas/m1', { nome: null });
    await banco.gravar('usuarios/ana/notas/n1', { itens: {} });
    await banco.gravar('usuarios/bia/perfil', { nome: 'Bia' });
    await banco.gravar('usuarios/bia/perfil/nome', null);
    await banco.gravar('contas/c1', { uid: 'x', vazio: { a: {} } });
    await banco.gravar('contas/c2', {});
  });
  await iguais('usuarios', 'usuarios/ana', 'usuarios/ana/metas', 'usuarios/bia', 'contas');
  assert.equal(await postgres.ler('usuarios/ana/metas/m1'), null);
  assert.equal(await postgres.ler('usuarios/bia'), null);
  assert.deepEqual(await postgres.ler('contas'), { c1: { uid: 'x' } });
  assert.equal(await contar('itens_usuario'), 0);
});

test('coleções da raiz: tabelas próprias e precos com colunas para consulta', comBanco, async () => {
  await nosDois(async banco => {
    await banco.gravar('contas/ana@x', { uid: 'ana' });
    await banco.gravar('credenciais/ana@x', { uid: 'ana', sal: 's', hash: 'h' });
    await banco.atualizar('credenciais/ana@x', { hash: 'h2' });
    const familia = 'f1';
    await banco.gravar(`familias/${familia}`, { nome: 'Casa', membros: { ana: true } });
    await banco.atualizar(`familias/${familia}`, { 'membros/bia': true });
    await banco.mesclar('mercados/m1', { nome: 'Mercado A', local: { lat: -23.5, lon: -46.6 } });
    await banco.gravar('regioes/sp', { em: '2026-01-01', lista: [{ id: 1 }, { id: 2 }] });
    await banco.gravar('interessados/i1', { email: 'a@b.c' });
    await banco.gravar('exclusoes/ana', { quando: '2026-02-01' });
    await banco.atualizarVarios({
      'precos/p1': {
        produto: 'Arroz',
        produtoKey: 'arroz',
        ean: '789',
        mercadoId: 'm1',
        data: '2026-01-02',
        origem: 'nfce',
        preco: 5.9
      },
      'precos/p2': {
        produto: 'Feijão',
        produtoKey: 'feijao',
        ean: '',
        mercadoId: 'm1',
        data: '2026-01-03',
        origem: 'site',
        preco: 8
      }
    });
  });
  const tabelas = ['contas', 'credenciais', 'familias', 'mercados', 'regioes', 'interessados'];
  await iguais(...tabelas, 'exclusoes', 'precos');
  assert.deepEqual(porId(await postgres.listar('precos')), porId(await memoria.listar('precos')));
  assert.deepEqual(await postgres.listar('exclusoes'), [{ id: 'ana', quando: '2026-02-01' }]);
  const { rows } = await cliente.query(
    'select id, produto_key, ean, mercado_id, data, origem from precos order by id'
  );
  const comum = { mercado_id: 'm1' };
  assert.deepEqual(rows, [
    { id: 'p1', produto_key: 'arroz', ean: '789', ...comum, data: '2026-01-02', origem: 'nfce' },
    { id: 'p2', produto_key: 'feijao', ean: null, ...comum, data: '2026-01-03', origem: 'site' }
  ]);
  for (const tabela of [...tabelas, 'exclusoes']) assert.equal(await contar(tabela), 1, tabela);
});

test('remover usuarios/<uid> apaga tudo da pessoa (cascata) e deixa as outras', comBanco, async () => {
  await nosDois(async banco => {
    for (const uid of ['ana', 'bia']) {
      await banco.gravar(`usuarios/${uid}/perfil`, { nome: uid });
      for (const colecao of ['categorias', 'lancamentos', 'lista', 'metas', 'notas', 'fixos'])
        await banco.gravar(`usuarios/${uid}/${colecao}/i1`, { de: uid });
      // Coleção sem tabela própria: cai na reserva "documentos", mas também é da pessoa.
      await banco.gravar(`usuarios/${uid}/coisaNova/x`, { de: uid });
    }
    await banco.remover('usuarios/ana');
  });
  await iguais('usuarios', 'usuarios/ana', 'usuarios/bia');
  assert.equal(await contar('usuarios', 'where uid = $1', ['ana']), 0);
  assert.equal(await contar('itens_usuario', 'where usuario_id = $1', ['ana']), 0);
  assert.equal(await contar('itens_usuario', 'where usuario_id = $1', ['bia']), 6);
  assert.equal(await contar('documentos', "where caminho like 'usuarios/ana/%'"), 0);
  assert.equal(await contar('documentos', "where caminho like 'usuarios/bia/%'"), 1);
  // Apagar direto a linha da pessoa também leva os itens (on delete cascade).
  await cliente.query("delete from usuarios where uid = 'bia'");
  assert.equal(await contar('itens_usuario'), 0);
});

test('remover uma coleção inteira e gravar num galho substitui o que havia', comBanco, async () => {
  await nosDois(async banco => {
    await banco.gravar('usuarios/ana/perfil', { nome: 'Ana' });
    await banco.gravar('usuarios/ana/categorias/c1', { nome: 'Comida' });
    await banco.gravar('usuarios/ana/fixos/f1', { nome: 'Aluguel' });
    await banco.remover('usuarios/ana/categorias');
    await banco.gravar('usuarios/ana/lista', {
      a: { produto: 'arroz' },
      b: { produto: 'café' },
      c: {}
    });
    await banco.gravar('usuarios/ana/lista', { b: { produto: 'leite' } });
    await banco.gravar('usuarios/bia', {
      perfil: { nome: 'Bia' },
      metas: { m1: { nome: 'Carro' } }
    });
    await banco.gravar('mercados', { m1: { nome: 'A' }, m2: { nome: 'B' } });
    await banco.gravar('mercados', { m3: { nome: 'C' } });
  });
  await iguais('usuarios/ana', 'usuarios/bia', 'mercados');
  assert.deepEqual(await postgres.ler('usuarios/ana/lista'), { b: { produto: 'leite' } });
});

test('atualizarVarios: aplica tudo junto e null remove', comBanco, async () => {
  await nosDois(async banco => {
    await banco.gravar('usuarios/ana/lista/a', { produto: 'arroz', done: true });
    await banco.gravar('usuarios/ana/lista/b', { produto: 'café', done: false });
    await banco.gravar('usuarios/ana/lista/c', { produto: 'leite', done: true });
    await banco.gravar('precos/p1', { produto: 'Arroz', preco: 5 });
    await banco.atualizarVarios({
      'usuarios/ana/lista/a': null,
      'usuarios/ana/lista/c': null,
      'usuarios/ana/lista/b/done': true,
      'usuarios/ana/perfil/notificacoesVistas': ['n1'],
      'precos/p1': null,
      'precos/p2': { produto: 'Café', preco: 20 },
      'mercados/m1/nome': 'Mercado A'
    });
  });
  await iguais('usuarios/ana', 'precos', 'mercados');
  assert.deepEqual(await postgres.listar('usuarios/ana/lista'), [
    { id: 'b', produto: 'café', done: true }
  ]);
});

test('atualizarVarios é uma transação: se uma parte falha, nada é gravado', comBanco, async () => {
  await postgres.remover('');
  await postgres.gravar('precos/p1', { produto: 'Arroz' });
  await assert.rejects(
    postgres.atualizarVarios({
      'precos/p1': null,
      'precos/p2': { produto: 'Café' },
      'usuarios/ana/lista': 'texto'
    }),
    /valor simples/
  );
  assert.deepEqual(await postgres.ler('precos'), { p1: { produto: 'Arroz' } });
});

test('atualizarVarios: erro do banco no meio da transação desfaz o que já foi escrito', comBanco, async () => {
  await postgres.remover('');
  await postgres.gravar('precos/p1', { produto: 'Arroz' });
  // Gatilho só deste teste: recusa o mercado, que é escrito depois dos preços.
  await cliente.query(`create function recusar_mercado() returns trigger language plpgsql as $$
    begin raise exception 'mercado recusado'; end $$`);
  await cliente.query(`create trigger recusar_mercado before insert on mercados
    for each row execute function recusar_mercado()`);
  try {
    await assert.rejects(
      postgres.atualizarVarios({
        'precos/p1': null,
        'precos/p2': { produto: 'Café' },
        'mercados/m1': { nome: 'Mercado A' }
      }),
      /mercado recusado/
    );
  } finally {
    await cliente.query('drop trigger recusar_mercado on mercados');
    await cliente.query('drop function recusar_mercado()');
  }
  assert.deepEqual(await postgres.ler('precos'), { p1: { produto: 'Arroz' } });
  assert.equal(await postgres.ler('mercados'), null);
});

test('escritas parciais ao mesmo tempo no mesmo documento não se perdem', comBanco, async () => {
  await postgres.remover('');
  // Documentos que ainda não existem: não há linha para o FOR UPDATE travar.
  const caminhos = [
    'usuarios/ana/perfil',
    'usuarios/ana/lista/novo',
    'familias/nova',
    'configuracoes/geral'
  ];
  const campos = Array.from({ length: 20 }, (_, i) => `c${i}`);
  await Promise.all(
    caminhos.flatMap(caminho =>
      campos.map((campo, i) =>
        i % 2
          ? postgres.atualizar(caminho, { [campo]: i })
          : postgres.mesclar(caminho, { [campo]: i })
      )
    )
  );
  const esperado = Object.fromEntries(campos.map((campo, i) => [campo, i]));
  for (const caminho of caminhos) assert.deepEqual(await postgres.ler(caminho), esperado, caminho);

  // Várias transações com os mesmos documentos em ordens diferentes terminam todas.
  await Promise.all(
    campos.map((campo, i) =>
      postgres.atualizarVarios(
        i % 2
          ? { [`mercados/a/${campo}`]: i, [`mercados/b/${campo}`]: i }
          : { [`mercados/b/${campo}`]: i, [`mercados/a/${campo}`]: i }
      )
    )
  );
  assert.deepEqual(await postgres.ler('mercados'), { a: esperado, b: esperado });
});

test('texto com caractere nulo ou metade de emoji é limpo; id assim é recusado', comBanco, async () => {
  await nosDois(async banco => {
    await banco.gravar('usuarios/ana/lista/a', { produto: 'arr\u0000oz', ['obs\u0000']: 'x' });
    await banco.atualizar('usuarios/ana/lista/b', { produto: 'caf\ud83d' });
    // Um item ruim da nota não derruba o lote inteiro.
    await banco.atualizarVarios({
      'precos/p1': { produto: 'Leite\u0000', preco: 5 },
      'precos/p2': { produto: 'Pão', preco: 1 }
    });
  });
  await iguais('usuarios/ana/lista', 'precos');
  assert.deepEqual(await postgres.ler('usuarios/ana/lista/a'), { produto: 'arroz', obs: 'x' });
  assert.equal(await postgres.ler('usuarios/ana/lista/b/produto'), 'caf�');
  assert.equal(await postgres.ler('precos/p1/produto'), 'Leite');
  for (const banco of [memoria, postgres]) {
    await assert.rejects(banco.gravar('usuarios/ana/lista/a\u0000b', { x: 1 }), { status: 400 });
    await assert.rejects(banco.ler('usuarios/a\u0000b/perfil'), { status: 400 });
    await assert.rejects(banco.atualizar('usuarios/ana/lista/a', { 'x\ud800': 1 }), { status: 400 });
  }
  await iguais('usuarios/ana/lista');
});

test('caminho sem tabela própria vai para a reserva sem perder dado', comBanco, async () => {
  await nosDois(async banco => {
    await banco.gravar('configuracoes/geral', { versao: 3, ligado: true });
    await banco.gravar('configuracoes/outra/funda', 'sim');
    await banco.gravar('contador', 7);
    await banco.atualizar('configuracoes', { 'geral/versao': 4 });
  });
  await iguais('configuracoes', 'configuracoes/geral/versao', 'contador');
  assert.equal(await postgres.ler('contador'), 7);
  assert.equal(await contar('documentos'), 2);
});

test('ler e gravar a raiz inteira, como o export do Firebase', comBanco, async () => {
  const arvore = {
    usuarios: {
      ana: { perfil: { nome: 'Ana' }, lista: { a: { produto: 'arroz' } }, extra: { x: 1 } }
    },
    contas: { 'ana@x': { uid: 'ana' } },
    precos: { p1: { produto: 'Arroz', preco: 5 } },
    solto: { a: 1 }
  };
  await nosDois(banco => banco.gravar('', arvore));
  await iguais('usuarios/ana');
  assert.deepEqual(await postgres.ler(''), arvore);
  await postgres.remover('');
  assert.deepEqual(await postgres.ler(''), await criarBancoMemoria().ler(''));
});
