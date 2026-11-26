import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync, execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const { usandoPostgres } = await import('./apoio/ambiente.js');
const { criarBancoMemoria } = await import('../src/config/bancoMemoria.js');
const { criarBancoPostgres } = await import('../src/config/bancoPostgres.js');
const { banco } = await import('../src/config/banco.js');
const { PrecoModel } = await import('../src/models/PrecoModel.js');
const {
  converterIdDePreco,
  prepararMigracao,
  gravarEmLotes,
  contarNoBanco,
  arredondarLocalDoPerfil
} = await import('../scripts/migrar-firebase-para-postgres.mjs');

const script = fileURLToPath(new URL('../scripts/migrar-firebase-para-postgres.mjs', import.meta.url));
const exemplo = fileURLToPath(new URL('./apoio/exportFirebase.json', import.meta.url));
const exportado = () => JSON.parse(readFileSync(exemplo, 'utf8'));
const chaveFalsa = '1'.repeat(44);
const comBanco = { skip: !usandoPostgres && 'só com npm run test:pg' };

// O tempo limite faz um laço sem fim virar falha do teste em vez de travar a suíte.
const rodarScript = (argumentos, ambiente = {}) =>
  spawnSync(process.execPath, [script, ...argumentos], {
    encoding: 'utf8',
    env: { ...process.env, ...ambiente },
    timeout: 30000
  });

// Igual ao rodarScript, mas sem travar o processo: o Firebase de mentira deste arquivo precisa
// responder enquanto o script roda.
const rodarScriptAoLado = (argumentos, ambiente = {}) =>
  new Promise(resolver =>
    execFile(
      process.execPath,
      [script, ...argumentos],
      { encoding: 'utf8', env: { ...process.env, ...ambiente }, timeout: 30000 },
      (erro, stdout, stderr) =>
        resolver({ status: erro ? (typeof erro.code === 'number' ? erro.code : 1) : 0, stdout, stderr })
    )
  );

// Firebase Realtime Database de mentira (a API REST: GET /.json devolve a árvore inteira).
async function firebaseFalso(arvore) {
  const pedidos = [];
  const servidor = createServer((req, res) => {
    pedidos.push(req.url);
    res.writeHead(req.url === '/.json' ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(req.url === '/.json' ? JSON.stringify(arvore) : 'null');
  });
  await new Promise(resolver => servidor.listen(0, resolver));
  return {
    pedidos,
    // Sem conta de serviço: o script lê pela API REST.
    ambiente: {
      FIREBASE_URL_BANCO: `http://localhost:${servidor.address().port}`,
      FIREBASE_SEGREDO_BANCO: '',
      FIREBASE_PROJECT_ID: '',
      FIREBASE_CLIENT_EMAIL: '',
      FIREBASE_PRIVATE_KEY: '',
      GOOGLE_APPLICATION_CREDENTIALS: '',
      NODE_ENV: 'test'
    },
    fechar: () => new Promise(resolver => servidor.close(resolver))
  };
}

const LOCAL_EXATO = { cep: '13334-100', lat: -23.0904567, lng: -47.2181234, raioKm: 5 };
const exportadoComLocal = () => {
  const arvore = exportado();
  arvore.usuarios['uid-ana'].perfil.local = { ...LOCAL_EXATO };
  return arvore;
};

test('id antigo de preço vira o mesmo id que o PrecoModel grava hoje', async () => {
  await banco.remover('precos');
  PrecoModel.limparCache();
  await PrecoModel.gravarDaNota({ chave: chaveFalsa, itens: [{ produto: 'Arroz', preco: 5 }] }, 'm1');
  const [gravado] = await banco.listar('precos');
  assert.equal(converterIdDePreco(`${chaveFalsa}-1`), gravado.id);
  assert.match(gravado.id, /^n[0-9a-f]{24}-1$/);
  assert.equal(converterIdDePreco(gravado.id), null);
  assert.equal(converterIdDePreco('site-rede-x-20260101'), null);
  await banco.remover('precos');
});

test('prepara a migração: contagem por coleção e ids de preço convertidos', () => {
  const plano = prepararMigracao(exportado());
  assert.deepEqual(plano.problemas, []);
  assert.equal(plano.convertidos, 2);
  assert.equal(plano.duplicados, 1);
  assert.deepEqual(plano.contagem, {
    'usuarios/perfil': 2,
    'usuarios/categorias': 2,
    'usuarios/lancamentos': 1,
    'usuarios/lista': 2,
    'usuarios/metas': 1,
    'usuarios/notas': 1,
    'usuarios/fixos': 1,
    contas: 1,
    credenciais: 1,
    familias: 1,
    mercados: 1,
    precos: 4,
    regioes: 1,
    interessados: 1,
    exclusoes: 1,
    'documentos (reserva)': 1
  });
  // Nenhuma chave de acesso de nota sobra nos caminhos.
  assert.ok(plano.entradas.every(([caminho]) => !/\d{44}/.test(caminho)));
});

test('grava em lotes e o resultado é o export com os ids novos', async () => {
  const arvore = exportado();
  const plano = prepararMigracao(arvore);
  const destino = criarBancoMemoria();
  const lotes = [];
  await gravarEmLotes(destino, plano.entradas, { lote: 4, aoGravar: feitos => lotes.push(feitos) });
  assert.equal(lotes.at(-1), plano.entradas.length);
  assert.ok(lotes.length > 1);

  const esperado = structuredClone(arvore);
  for (const id of Object.keys(esperado.precos)) {
    const novo = converterIdDePreco(id);
    if (!novo) continue;
    if (!esperado.precos[novo]) esperado.precos[novo] = esperado.precos[id];
    delete esperado.precos[id];
  }
  assert.deepEqual(await destino.ler(''), esperado);
  assert.deepEqual(await contarNoBanco(destino), plano.contagem);
});

test('script em modo --simular mostra o relatório e não grava', () => {
  const saida = rodarScript([exemplo, '--simular'], { DATABASE_URL: '' });
  assert.equal(saida.status, 0, saida.stderr);
  assert.match(saida.stdout, /usuarios\/lancamentos\s+1/);
  assert.match(saida.stdout, /precos\s+4/);
  assert.match(saida.stdout, /convertidos para o formato novo: 2/);
  assert.match(saida.stdout, /Simulação: nada foi gravado/);
});

test('--lote só aceita inteiro maior que zero', async () => {
  for (const lote of ['-1', '0', '1.5', 'abc', '']) {
    const saida = rodarScript([exemplo, `--lote=${lote}`, '--simular'], { DATABASE_URL: '' });
    assert.equal(saida.status, 2, `--lote=${lote}`);
    assert.match(saida.stderr, /--lote precisa ser um número inteiro maior que zero/);
  }
  const entradas = prepararMigracao(exportado()).entradas;
  for (const lote of [-1, 0, 2.5, Number.NaN])
    await assert.rejects(gravarEmLotes(criarBancoMemoria(), entradas, { lote }), /Lote inválido/);
});

test('script grava no PostgreSQL, confere e não grava por cima sem --continuar', comBanco, async () => {
  const pg = criarBancoPostgres({ url: process.env.DATABASE_URL });
  await pg.remover('');
  const primeira = rodarScript([exemplo, '--lote=5']);
  assert.equal(primeira.status, 0, primeira.stderr);
  assert.match(primeira.stdout, /as contagens batem/);

  const memoria = criarBancoMemoria();
  await gravarEmLotes(memoria, prepararMigracao(exportado()).entradas);
  assert.deepEqual(await pg.ler(''), await memoria.ler(''));

  const segunda = rodarScript([exemplo]);
  assert.equal(segunda.status, 1);
  assert.match(segunda.stderr, /--continuar/);
  assert.equal(rodarScript([exemplo, '--continuar']).status, 0);
  await pg.remover('');
  await pg.fechar();
});

test('arredonda a localização dos perfis para 3 casas (~100 m) sem mexer no export', () => {
  const arvore = {
    usuarios: {
      u1: { perfil: { nome: 'A', local: { ...LOCAL_EXATO } } },
      u2: { perfil: { nome: 'B', local: { cep: '', raioKm: 5 } } },
      u3: { perfil: { nome: 'C', local: { lat: -23.09, lng: -47.218 } } }
    },
    // Loja não é dado pessoal: fica com a posição que o mapa deu.
    mercados: { m1: { nome: 'Loja', lat: -23.0904567, lng: -47.2181234 } }
  };
  const copia = structuredClone(arvore);
  const plano = prepararMigracao(arvore);
  const valor = caminho => plano.entradas.find(([c]) => c === caminho)[1];
  assert.deepEqual(valor('usuarios/u1/perfil').local, {
    cep: '13334-100',
    lat: -23.09,
    lng: -47.218,
    raioKm: 5
  });
  assert.deepEqual(valor('usuarios/u2/perfil'), copia.usuarios.u2.perfil);
  assert.deepEqual(valor('usuarios/u3/perfil'), copia.usuarios.u3.perfil);
  assert.equal(plano.arredondados, 1, 'só o perfil que tinha posição exata');
  assert.equal(valor('mercados/m1').lat, -23.0904567);
  assert.deepEqual(arvore, copia);

  // Coordenada vazia não vira 0.
  const semPosicao = { local: { lat: null, lng: '' } };
  assert.equal(arredondarLocalDoPerfil(semPosicao), semPosicao);
  assert.deepEqual(arredondarLocalDoPerfil({ local: { lat: '-23.0904567', lng: '-47.2181234' } }).local, {
    lat: -23.09,
    lng: -47.218
  });
});

test('--origem-firebase lê a árvore direto do Firebase do ambiente (simulação)', async () => {
  const firebase = await firebaseFalso(exportadoComLocal());
  try {
    const saida = await rodarScriptAoLado(['--origem-firebase', '--simular'], {
      ...firebase.ambiente,
      DATABASE_URL: ''
    });
    assert.equal(saida.status, 0, saida.stderr);
    assert.match(saida.stdout, /Origem: Firebase \(REST\) em http:\/\/localhost:\d+/);
    assert.match(saida.stdout, /usuarios\/lancamentos\s+1/);
    assert.match(saida.stdout, /precos\s+4/);
    assert.match(saida.stdout, /convertidos para o formato novo: 2/);
    assert.match(saida.stdout, /Perfis com a localização arredondada \(~100 m\): 1/);
    assert.match(saida.stdout, /Simulação: nada foi gravado/);
    assert.deepEqual(firebase.pedidos, ['/.json'], 'uma leitura só, da árvore inteira');
  } finally {
    await firebase.fechar();
  }
});

test('--origem-firebase: não aceita arquivo junto e avisa quando falta o endereço', async () => {
  const comArquivo = rodarScript([exemplo, '--origem-firebase', '--simular'], { DATABASE_URL: '' });
  assert.equal(comArquivo.status, 2);
  assert.match(comArquivo.stderr, /não os dois/);
  const semEndereco = await rodarScriptAoLado(['--origem-firebase', '--simular'], {
    FIREBASE_URL_BANCO: '',
    NODE_ENV: 'test',
    DATABASE_URL: ''
  });
  assert.equal(semEndereco.status, 1);
  assert.match(semEndereco.stderr, /Defina FIREBASE_URL_BANCO/);
  const semNada = rodarScript([], { DATABASE_URL: '' });
  assert.equal(semNada.status, 2);
  assert.match(semNada.stderr, /--origem-firebase/);
});

test('--origem-firebase grava no PostgreSQL com a localização arredondada', comBanco, async () => {
  const firebase = await firebaseFalso(exportadoComLocal());
  const pg = criarBancoPostgres({ url: process.env.DATABASE_URL });
  try {
    await pg.remover('');
    const saida = await rodarScriptAoLado(['--origem-firebase', '--lote=5'], firebase.ambiente);
    assert.equal(saida.status, 0, saida.stderr);
    assert.match(saida.stdout, /no Firebase/);
    assert.match(saida.stdout, /as contagens batem/);
    const perfil = await pg.ler('usuarios/uid-ana/perfil');
    assert.deepEqual(perfil.local, { cep: '13334-100', lat: -23.09, lng: -47.218, raioKm: 5 });
    await pg.remover('');
  } finally {
    await pg.fechar();
    await firebase.fechar();
  }
});
