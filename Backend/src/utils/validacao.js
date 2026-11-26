import { HttpError } from './http.js';

// Conferência do que chega de fora (URL, corpo e query). Tudo o que vira caminho do banco ou fica
// guardado no perfil passa por aqui antes, com tipo e tamanho conferidos.

// Um id vira parte de um caminho do banco ("usuarios/<uid>/lista/<id>"). Fica de fora o que mudaria
// o caminho: a barra abre outro nível, ". # $ [ ]" o Firebase recusa numa chave, caracteres de
// controle não são de id nenhum e "__proto__" leva ao protótipo do objeto no banco em memória.
const PROIBIDOS_NO_ID = /[/.#$[\]\u0000-\u001f\u007f]/;
export const TAMANHO_MAXIMO_DO_ID = 128;

export const idValido = id =>
  typeof id === 'string' &&
  id.length > 0 &&
  id.length <= TAMANHO_MAXIMO_DO_ID &&
  id !== '__proto__' &&
  !PROIBIDOS_NO_ID.test(id) &&
  id.isWellFormed();

export function exigirId(id, mensagem = 'Identificador inválido.') {
  if (!idValido(id)) throw new HttpError(400, mensagem);
  return id;
}

/**
 * Texto do corpo: aceita texto ou número, tira os espaços das pontas e limita o tamanho.
 * `rotulo` entra na mensagem de erro ("O nome pode ter até 120 caracteres.").
 */
export function texto(valor, rotulo, { max = 120, obrigatorio = false } = {}) {
  if (valor === undefined || valor === null) {
    if (obrigatorio) throw new HttpError(400, `${rotulo} é obrigatório.`);
    return '';
  }
  if (typeof valor !== 'string' && typeof valor !== 'number')
    throw new HttpError(400, `${rotulo} precisa ser um texto.`);
  const limpo = String(valor).trim();
  if (obrigatorio && !limpo) throw new HttpError(400, `${rotulo} é obrigatório.`);
  if (limpo.length > max) throw new HttpError(400, `${rotulo} pode ter até ${max} caracteres.`);
  return limpo;
}

export const TAMANHO_MAXIMO_DO_EMAIL = 254;
const FORMATO_DO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mail como fica guardado: sem espaços nas pontas e em minúsculas. Inválido dá 400. */
export function email(valor, mensagem = 'E-mail inválido.') {
  if (typeof valor !== 'string') throw new HttpError(400, mensagem);
  const limpo = valor.trim().toLowerCase();
  if (limpo.length > TAMANHO_MAXIMO_DO_EMAIL || !FORMATO_DO_EMAIL.test(limpo))
    throw new HttpError(400, mensagem);
  return limpo;
}

export function booleano(valor, rotulo) {
  if (typeof valor !== 'boolean') throw new HttpError(400, `${rotulo} precisa ser verdadeiro ou falso.`);
  return valor;
}

/** Número inteiro dentro da faixa; fora dela (ou não número) dá 400. */
export function inteiroEntre(valor, minimo, maximo, mensagem) {
  const numero = Number(valor);
  if ((typeof valor !== 'number' && typeof valor !== 'string') || !Number.isInteger(numero))
    throw new HttpError(400, mensagem);
  if (numero < minimo || numero > maximo) throw new HttpError(400, mensagem);
  return numero;
}

/** Lista do corpo com no máximo `maximo` itens. Ausente vira lista vazia. */
export function lista(valor, rotulo, maximo) {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) throw new HttpError(400, `${rotulo} precisa ser uma lista.`);
  if (valor.length > maximo) throw new HttpError(400, `${rotulo} pode ter até ${maximo} itens.`);
  return valor;
}

/** Objeto simples do corpo (nem lista, nem texto). Ausente vira objeto vazio. */
export function objeto(valor, rotulo) {
  if (valor === undefined || valor === null) return {};
  if (typeof valor !== 'object' || Array.isArray(valor))
    throw new HttpError(400, `${rotulo} precisa ser um objeto.`);
  return valor;
}

// Raio de busca dos mercados: o mapa só é consultado até 15 km, em km inteiros (um raio quebrado
// como 5,0001 seria uma região nova a cada pedido, sem aproveitar o que já foi buscado).
export const RAIO_MINIMO_KM = 1;
export const RAIO_MAXIMO_KM = 15;

export function raioKm(valor, padrao = 5) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return padrao;
  return Math.min(RAIO_MAXIMO_KM, Math.max(RAIO_MINIMO_KM, Math.round(numero)));
}

/** Coordenada de verdade: latitude entre -90 e 90, longitude entre -180 e 180. */
export function coordenadaValida(lat, lng) {
  if (lat === null || lat === undefined || lat === '' || lng === null || lng === undefined || lng === '')
    return false;
  const [a, b] = [Number(lat), Number(lng)];
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180;
}

const MAXIMO_DE_MERCADOS = 100;

/**
 * Localização vinda do corpo (perfil ou cadastro guiado). Devolve só os campos enviados, já
 * conferidos: CEP com dígitos e hífen, cidade, raio, mercados escolhidos e coordenadas válidas.
 */
export function localDoCorpo(corpo) {
  const local = objeto(corpo, 'A localização');
  const limpo = {};
  if (local.cep !== undefined) {
    const cep = texto(local.cep, 'O CEP', { max: 9 });
    if (!/^[\d-]*$/.test(cep)) throw new HttpError(400, 'CEP inválido.');
    limpo.cep = cep;
  }
  if (local.cidade !== undefined) limpo.cidade = texto(local.cidade, 'A cidade', { max: 120 });
  if (local.raioKm != null && local.raioKm !== '') limpo.raioKm = raioKm(local.raioKm);
  if (local.mercados !== undefined)
    limpo.mercados = lista(local.mercados, 'Os mercados', MAXIMO_DE_MERCADOS).map(id =>
      texto(id, 'O mercado', { max: TAMANHO_MAXIMO_DO_ID, obrigatorio: true })
    );
  if (local.mercadoHabitual !== undefined)
    limpo.mercadoHabitual =
      local.mercadoHabitual === null
        ? null
        : texto(local.mercadoHabitual, 'O mercado de sempre', { max: TAMANHO_MAXIMO_DO_ID }) || null;
  if (local.lat != null || local.lng != null) {
    if (!coordenadaValida(local.lat, local.lng)) throw new HttpError(400, 'Localização inválida.');
    limpo.lat = Number(local.lat);
    limpo.lng = Number(local.lng);
  }
  return limpo;
}
