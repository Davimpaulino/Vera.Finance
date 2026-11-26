import { randomBytes } from 'node:crypto';
import { HttpError } from '../utils/http.js';

// O PostgreSQL não aceita, em texto nem em jsonb, o caractere nulo (U+0000) nem metade solta de
// um par UTF-16 (sobra de um emoji cortado ao meio). Num caminho isso é um id inválido (400);
// nos valores, limparValor tira o nulo e troca a metade solta por "�".
const textoQueOBancoRecusa = texto => texto.includes('\u0000') || !texto.isWellFormed();

// "__proto__" não vira uma chave comum num objeto do JavaScript: ao descer o caminho ele leva ao
// protótipo em vez de a um filho. Por isso não serve como parte de caminho.
const parteInvalida = parte => parte === '__proto__' || textoQueOBancoRecusa(parte);

export function partesDoCaminho(caminho) {
  const partes = String(caminho).split('/').filter(Boolean);
  if (partes.some(parteInvalida)) throw new HttpError(400, 'Identificador inválido.');
  return partes;
}

const ALFABETO = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

export function gerarId() {
  let tempo = Date.now();
  let prefixo = '';
  for (let i = 0; i < 8; i++) {
    prefixo = ALFABETO[tempo % 64] + prefixo;
    tempo = Math.floor(tempo / 64);
  }
  const aleatorio = [...randomBytes(12)].map(byte => ALFABETO[byte % 64]).join('');
  return prefixo + aleatorio;
}

// No JSON, o nulo sai como \u0000 e a metade solta como \ud800 a \udfff.
const ESCAPE_A_LIMPAR = /\\u0000|\\ud[89a-f]/i;
const limparTexto = texto => texto.replaceAll('\u0000', '').toWellFormed();

function semTextoRecusado(_chave, valor) {
  if (typeof valor === 'string') return limparTexto(valor);
  if (valor && typeof valor === 'object' && !Array.isArray(valor))
    return Object.fromEntries(
      Object.entries(valor).map(([chave, filho]) => [limparTexto(chave), filho])
    );
  return valor;
}

export function limparValor(valor) {
  if (valor === undefined) return null;
  const json = JSON.stringify(valor);
  // Quase nunca há o que limpar: só percorre o valor quando o JSON tem um desses escapes.
  return JSON.parse(json, ESCAPE_A_LIMPAR.test(json) ? semTextoRecusado : undefined);
}

export function achatarEmCaminhos(objeto, prefixo = '') {
  const resultado = {};
  for (const [chave, valor] of Object.entries(objeto)) {
    const caminho = prefixo ? `${prefixo}/${chave}` : chave;
    const ehObjetoSimples = valor && typeof valor === 'object' && !Array.isArray(valor);
    if (ehObjetoSimples && Object.keys(valor).length)
      Object.assign(resultado, achatarEmCaminhos(valor, caminho));
    else resultado[caminho] = valor === undefined ? null : valor;
  }
  return resultado;
}

export function filhosComId(valor) {
  if (!valor || typeof valor !== 'object') return [];
  return Object.entries(valor)
    .filter(([, filho]) => filho && typeof filho === 'object')
    .map(([id, filho]) => ({ id, ...filho }));
}

// Vazio como no Firebase: nulo, objeto ou lista sem filhos.
export function vazio(valor) {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === 'object') return Object.keys(valor).length === 0;
  return false;
}

// Tira os nós vazios, como o Firebase faz ao gravar.
export function podar(valor) {
  if (Array.isArray(valor)) {
    const lista = valor.map(podar).filter(item => !vazio(item));
    return lista.length ? lista : null;
  }
  if (valor && typeof valor === 'object') {
    const objeto = {};
    for (const [chave, filho] of Object.entries(valor)) {
      const podado = podar(filho);
      if (!vazio(podado)) objeto[chave] = podado;
    }
    return Object.keys(objeto).length ? objeto : null;
  }
  return valor;
}
