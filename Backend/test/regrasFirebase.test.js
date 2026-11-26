import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const {
  executar,
  enderecoDoBanco,
  escolherCredencial,
  lerArquivoDeRegras,
  testarLeituraSemCredencial,
  ARQUIVO_PADRAO
} = await import('../scripts/publicar-regras-firebase.mjs');

const URL_DE_TESTE = 'https://banco-de-teste.firebaseio.com';
const SEGREDO = 'segredo-de-teste';

// Banco falso que fala a API REST do Realtime Database: guarda as regras e responde à leitura
// anônima conforme o ".read" das regras guardadas.
function bancoFalso({ regrasIniciais = '{"rules":{".read":true,".write":true}}', ignorarPut = false } = {}) {
  let regras = regrasIniciais;
  const pedidos = [];
  const fetch = async (endereco, opcoes = {}) => {
    const url = new URL(endereco);
    const metodo = opcoes.method || 'GET';
    pedidos.push({ metodo, caminho: url.pathname, auth: url.searchParams.get('auth'), corpo: opcoes.body });
    if (url.pathname === '/.settings/rules.json') {
      if (url.searchParams.get('auth') !== SEGREDO) return new Response('{"error":"Unauthorized"}', { status: 401 });
      if (metodo === 'PUT') {
        if (!ignorarPut) regras = opcoes.body;
        return new Response('{"status":"ok"}');
      }
      return new Response(regras);
    }
    if (url.pathname === '/.json') {
      const aberto = JSON.parse(regras).rules['.read'] === true;
      return aberto
        ? new Response('{"usuarios":true}')
        : new Response('{"error":"Permission denied"}', { status: 401 });
    }
    return new Response('não encontrado', { status: 404 });
  };
  return { fetch, pedidos, regras: () => regras };
}

const envComSegredo = { FIREBASE_URL_BANCO: URL_DE_TESTE, FIREBASE_SEGREDO_BANCO: SEGREDO };

test('regras: o arquivo do repositório é um JSON com "rules" que fecha leitura e escrita', async () => {
  const { regras } = await lerArquivoDeRegras(ARQUIVO_PADRAO);
  assert.equal(regras.rules['.read'], false);
  assert.equal(regras.rules['.write'], false);
});

test('regras: sem --executar só mostra o que faria e não publica nada', async () => {
  const banco = bancoFalso();
  const linhas = [];
  const codigo = await executar({ argv: [], env: envComSegredo, fetch: banco.fetch, escrever: l => linhas.push(l) });
  assert.equal(codigo, 0);
  assert.ok(!banco.pedidos.some(p => p.metodo === 'PUT'), 'nada foi enviado');
  assert.match(linhas.join('\n'), /simulação/);
  assert.match(linhas.join('\n'), /Leitura sem credencial hoje: ACEITA \(200\)/);
  assert.ok(!linhas.join('\n').includes(SEGREDO), 'o segredo não aparece no relatório');
});

test('regras: com --executar publica pelo segredo, confere a leitura de volta e a leitura anônima', async () => {
  const banco = bancoFalso();
  const linhas = [];
  const codigo = await executar({
    argv: ['--executar'],
    env: envComSegredo,
    fetch: banco.fetch,
    escrever: l => linhas.push(l)
  });
  assert.equal(codigo, 0);
  const envio = banco.pedidos.find(p => p.metodo === 'PUT');
  assert.equal(envio.caminho, '/.settings/rules.json');
  assert.equal(envio.auth, SEGREDO);
  assert.equal(envio.corpo, await readFile(ARQUIVO_PADRAO, 'utf8'));
  const anonima = banco.pedidos.find(p => p.caminho === '/.json');
  assert.equal(anonima.auth, null, 'a leitura de teste vai sem credencial');
  assert.match(linhas.join('\n'), /lidas de volta são as do arquivo/);
  assert.match(linhas.join('\n'), /recusada \(401\)/);
  assert.ok(!linhas.join('\n').includes(SEGREDO));
});

test('regras: se a publicação não pegou, o script sai com erro', async () => {
  const banco = bancoFalso({ ignorarPut: true });
  const codigo = await executar({
    argv: ['--executar'],
    env: envComSegredo,
    fetch: banco.fetch,
    escrever: () => {}
  });
  assert.equal(codigo, 1);
});

test('regras: com a conta de serviço usa o Admin SDK (setRules/getRules)', async () => {
  let guardadas = '{"rules":{".read":true}}';
  const chamadas = [];
  const criarBanco = async () => ({
    getRules: async () => guardadas,
    setRules: async texto => {
      chamadas.push(texto);
      guardadas = texto;
    }
  });
  const fetchAnonimo = async () => new Response('{"error":"Permission denied"}', { status: 401 });
  const codigo = await executar({
    argv: ['--executar'],
    env: {
      FIREBASE_URL_BANCO: URL_DE_TESTE,
      FIREBASE_PROJECT_ID: 'projeto',
      FIREBASE_CLIENT_EMAIL: 'conta@projeto.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
      FIREBASE_SEGREDO_BANCO: SEGREDO
    },
    fetch: fetchAnonimo,
    criarBanco,
    escrever: () => {}
  });
  assert.equal(codigo, 0);
  assert.equal(chamadas.length, 1);
});

test('regras: sem endereço do banco ou sem credencial não faz nada', async () => {
  await assert.rejects(executar({ env: { FIREBASE_SEGREDO_BANCO: SEGREDO }, escrever: () => {} }), /FIREBASE_URL_BANCO/);
  await assert.rejects(executar({ env: { FIREBASE_URL_BANCO: URL_DE_TESTE }, escrever: () => {} }), /credencial/);
  assert.throws(() => enderecoDoBanco('http://banco.firebaseio.com'), /https/);
  assert.throws(() => enderecoDoBanco('https://exemplo.com'), /firebaseio/);
  assert.equal(enderecoDoBanco('https://a.firebaseio.com/'), 'https://a.firebaseio.com');
  assert.equal(escolherCredencial({}), null);
  assert.equal(escolherCredencial({ GOOGLE_APPLICATION_CREDENTIALS: '/x.json' }).tipo, 'contaDeServico');
});

test('regras: leitura anônima aceita (200) conta como banco aberto', async () => {
  const aberto = await testarLeituraSemCredencial({
    url: URL_DE_TESTE,
    fetch: async () => new Response('{}', { status: 200 })
  });
  assert.deepEqual(aberto, { fechado: false, status: 200 });
});
