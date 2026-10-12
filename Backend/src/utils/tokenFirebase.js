import { createPublicKey, verify } from 'node:crypto';

// Confere o token de login do Firebase Auth sem conta de serviço: assinatura RS256 com as
// chaves públicas do Google, mais emissor, público e validade.
const ENDERECO_DAS_CHAVES =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let chavesEmCache = null;
let validoAte = 0;

async function chavesPublicas() {
  if (chavesEmCache && Date.now() < validoAte) return chavesEmCache;
  const resposta = await fetch(ENDERECO_DAS_CHAVES);
  if (!resposta.ok) throw new Error('Não deu para buscar as chaves do Firebase.');
  const idade = /max-age=(\d+)/.exec(resposta.headers.get('cache-control') || '');
  chavesEmCache = await resposta.json();
  validoAte = Date.now() + (idade ? Number(idade[1]) * 1000 : 3600000);
  return chavesEmCache;
}

const lerParte = parte => JSON.parse(Buffer.from(parte, 'base64url').toString('utf8'));

export const pareceTokenFirebase = token => String(token).split('.').length === 3;

export async function verificarTokenFirebase(token, idProjeto) {
  const [cabecalhoBruto, corpoBruto, assinatura] = String(token).split('.');
  const cabecalho = lerParte(cabecalhoBruto);
  const corpo = lerParte(corpoBruto);
  if (cabecalho.alg !== 'RS256') throw new Error('Algoritmo inesperado.');
  const chaves = await chavesPublicas();
  const certificado = chaves[cabecalho.kid];
  if (!certificado) throw new Error('Chave desconhecida.');
  const valido = verify(
    'RSA-SHA256',
    Buffer.from(`${cabecalhoBruto}.${corpoBruto}`),
    createPublicKey(certificado),
    Buffer.from(assinatura, 'base64url')
  );
  const agora = Math.floor(Date.now() / 1000);
  if (
    !valido ||
    corpo.aud !== idProjeto ||
    corpo.iss !== `https://securetoken.google.com/${idProjeto}` ||
    !corpo.sub ||
    corpo.exp <= agora ||
    corpo.iat > agora + 300
  )
    throw new Error('Token inválido.');
  return {
    uid: corpo.sub,
    email: corpo.email,
    name: corpo.name,
    verificado: corpo.email_verified === true
  };
}
