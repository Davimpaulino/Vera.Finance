// Publica as regras do Realtime Database (database.rules.json, na raiz do repositório) com as
// mesmas credenciais que a API já usa, e confere o resultado.
//
// Uso (na pasta Backend; no Render, como job do serviço da API, que já tem as variáveis):
//   node scripts/publicar-regras-firebase.mjs              mostra o que faria (padrão)
//   node scripts/publicar-regras-firebase.mjs --executar   publica de verdade
//   node scripts/publicar-regras-firebase.mjs --regras outro-arquivo.json
//
// Credencial, nesta ordem: a conta de serviço (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e
// FIREBASE_PRIVATE_KEY, ou GOOGLE_APPLICATION_CREDENTIALS) pelo Admin SDK, ou o segredo legado do
// banco (FIREBASE_SEGREDO_BANCO) pela API REST. O endereço vem de FIREBASE_URL_BANCO, sem valor
// padrão: o script nunca escolhe sozinho em qual banco gravar.
//
// Depois de publicar, lê as regras de volta e compara com o arquivo, e faz uma leitura SEM
// credencial na raiz do banco: ela precisa ser recusada (401 ou 403). Sai com código 1 se algo
// não conferir, para o job aparecer como falho no Render.
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

export const ARQUIVO_PADRAO = new URL('../../database.rules.json', import.meta.url);
const NOME_DO_APP = 'publicar-regras';
const ESPERA_MS = 20000;

/** Lê e confere o arquivo de regras: JSON válido com um objeto "rules". */
export async function lerArquivoDeRegras(caminho = ARQUIVO_PADRAO) {
  const texto = await readFile(caminho, 'utf8');
  let regras;
  try {
    regras = JSON.parse(texto);
  } catch (erro) {
    throw new Error(`O arquivo de regras não é um JSON válido: ${erro.message}`);
  }
  if (!regras || typeof regras.rules !== 'object' || Array.isArray(regras.rules))
    throw new Error('O arquivo de regras precisa ter um objeto "rules" na raiz.');
  return { texto, regras };
}

/** Endereço do banco, sem barra no fim. Só aceita https num domínio do Firebase. */
export function enderecoDoBanco(bruto) {
  if (!bruto) throw new Error('Defina FIREBASE_URL_BANCO com o endereço do Realtime Database.');
  let url;
  try {
    url = new URL(String(bruto).trim());
  } catch {
    throw new Error('FIREBASE_URL_BANCO não é um endereço válido.');
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !/(\.firebaseio\.com|\.firebasedatabase\.app)$/.test(host))
    throw new Error('FIREBASE_URL_BANCO precisa ser https://<banco>.firebaseio.com (ou .firebasedatabase.app).');
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

/** Qual credencial usar, com o que a API já tem nas variáveis de ambiente. */
export function escolherCredencial(env = process.env) {
  const chavePrivada = (env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && chavePrivada)
    return {
      tipo: 'contaDeServico',
      descricao: `conta de serviço ${env.FIREBASE_CLIENT_EMAIL} (Admin SDK)`,
      contaDeServico: {
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: chavePrivada
      }
    };
  if (env.GOOGLE_APPLICATION_CREDENTIALS)
    return {
      tipo: 'contaDeServico',
      descricao: 'conta de serviço do GOOGLE_APPLICATION_CREDENTIALS (Admin SDK)',
      contaDeServico: null
    };
  if (env.FIREBASE_SEGREDO_BANCO)
    return {
      tipo: 'segredo',
      descricao: 'segredo legado do banco (FIREBASE_SEGREDO_BANCO, API REST)',
      segredo: env.FIREBASE_SEGREDO_BANCO
    };
  return null;
}

// --- Os dois jeitos de falar com o banco: mesma interface (ler e publicar as regras) ------------

/** Pela API REST com o segredo legado. O segredo nunca aparece em mensagem nem no log. */
export function canalPorSegredo({ url, segredo, fetch = globalThis.fetch }) {
  const endereco = `${url}/.settings/rules.json?auth=${encodeURIComponent(segredo)}`;
  async function pedir(metodo, corpo) {
    let resposta;
    try {
      resposta = await fetch(endereco, {
        method: metodo,
        headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: corpo,
        signal: AbortSignal.timeout(ESPERA_MS)
      });
    } catch (erro) {
      throw new Error(`Sem conexão com o banco (${erro.name}).`);
    }
    const texto = await resposta.text();
    if (!resposta.ok) {
      const motivo =
        resposta.status === 401 || resposta.status === 403
          ? 'o segredo foi recusado'
          : texto.slice(0, 200);
      throw new Error(`O banco respondeu ${resposta.status} em ${metodo} das regras: ${motivo}`);
    }
    return texto;
  }
  return {
    ler: () => pedir('GET'),
    publicar: texto => pedir('PUT', texto)
  };
}

/** Pelo Admin SDK com a conta de serviço. `criarBanco` existe para os testes. */
export async function canalPorContaDeServico({ url, contaDeServico, criarBanco }) {
  const banco = criarBanco
    ? await criarBanco()
    : await (async () => {
        const { initializeApp, cert, applicationDefault, getApps } = await import('firebase-admin/app');
        const { getDatabase } = await import('firebase-admin/database');
        const existente = getApps().find(app => app.name === NOME_DO_APP);
        const app =
          existente ||
          initializeApp(
            {
              credential: contaDeServico ? cert(contaDeServico) : applicationDefault(),
              databaseURL: url
            },
            NOME_DO_APP
          );
        return getDatabase(app);
      })();
  return {
    ler: () => banco.getRules(),
    publicar: texto => banco.setRules(texto)
  };
}

/** Regras lidas do banco, como objeto. O Firebase devolve o texto que foi publicado. */
export function interpretarRegras(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/**
 * Leitura sem credencial na raiz do banco. Com as regras fechadas, o Firebase responde 401
 * ("Permission denied"). Devolve { fechado, status }.
 */
export async function testarLeituraSemCredencial({ url, fetch = globalThis.fetch }) {
  let resposta;
  try {
    resposta = await fetch(`${url}/.json?shallow=true`, { signal: AbortSignal.timeout(ESPERA_MS) });
  } catch (erro) {
    return { fechado: false, status: null, erro: `sem conexão (${erro.name})` };
  }
  await resposta.body?.cancel().catch(() => {});
  return { fechado: resposta.status === 401 || resposta.status === 403, status: resposta.status };
}

const descreverLeitura = ({ fechado, status, erro }) =>
  erro
    ? `não deu para testar: ${erro}`
    : fechado
      ? `recusada (${status}), como deve ser`
      : `ACEITA (${status}): o banco responde a quem não tem credencial`;

/**
 * Roda o script. Devolve o código de saída (0 deu certo, 1 algo não conferiu).
 * `escrever` recebe cada linha do relatório; `criarBanco` e `fetch` existem para os testes.
 */
export async function executar({
  argv = process.argv.slice(2),
  env = process.env,
  fetch = globalThis.fetch,
  criarBanco,
  escrever = console.log
} = {}) {
  const valerDeVerdade = argv.includes('--executar');
  const indiceDoArquivo = argv.indexOf('--regras');
  const arquivo = indiceDoArquivo >= 0 ? argv[indiceDoArquivo + 1] : ARQUIVO_PADRAO;
  if (indiceDoArquivo >= 0 && !arquivo) throw new Error('Diga o arquivo depois de --regras.');

  const url = enderecoDoBanco(env.FIREBASE_URL_BANCO);
  const credencial = escolherCredencial(env);
  if (!credencial)
    throw new Error(
      'Nenhuma credencial do banco: configure a conta de serviço (FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY) ou FIREBASE_SEGREDO_BANCO.'
    );
  const { texto, regras } = await lerArquivoDeRegras(arquivo);

  escrever(`Modo: ${valerDeVerdade ? 'EXECUTAR (publica as regras)' : 'simulação (nada é publicado)'}`);
  escrever(`Banco: ${new URL(url).host}`);
  escrever(`Credencial: ${credencial.descricao}`);
  escrever(`Arquivo: ${arquivo instanceof URL ? 'database.rules.json' : arquivo}`);

  const canal =
    credencial.tipo === 'segredo'
      ? canalPorSegredo({ url, segredo: credencial.segredo, fetch })
      : await canalPorContaDeServico({ url, contaDeServico: credencial.contaDeServico, criarBanco });

  const atuais = interpretarRegras(await canal.ler());
  const iguais = isDeepStrictEqual(atuais, regras);
  escrever(
    iguais
      ? 'As regras publicadas hoje já são as do arquivo.'
      : 'As regras publicadas hoje são diferentes das do arquivo.'
  );

  if (!valerDeVerdade) {
    escrever('\nRegras que seriam publicadas:');
    escrever(texto.trim());
    const leitura = await testarLeituraSemCredencial({ url, fetch });
    escrever(`\nLeitura sem credencial hoje: ${descreverLeitura(leitura)}`);
    escrever('\nNada foi publicado. Rode de novo com --executar para publicar.');
    return 0;
  }

  await canal.publicar(texto);
  escrever('Regras enviadas.');

  const lidas = interpretarRegras(await canal.ler());
  const conferem = isDeepStrictEqual(lidas, regras);
  escrever(
    conferem
      ? 'Conferência: as regras lidas de volta são as do arquivo.'
      : 'Conferência: as regras lidas de volta NÃO são as do arquivo.'
  );

  const leitura = await testarLeituraSemCredencial({ url, fetch });
  escrever(`Leitura sem credencial: ${descreverLeitura(leitura)}`);

  // As regras do arquivo fecham a leitura? Então a leitura sem credencial tem que ser recusada.
  const esperaFechado = regras.rules['.read'] === false;
  const leituraOk = esperaFechado ? leitura.fechado : !leitura.erro;
  return conferem && leituraOk ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href)
  executar()
    .then(codigo => process.exit(codigo))
    .catch(erro => {
      console.error(`Erro: ${erro.message}`);
      process.exit(1);
    });
