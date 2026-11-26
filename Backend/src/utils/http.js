export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function sendJson(res, status, body) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

export function sendText(
  res,
  status,
  text,
  contentType = 'text/plain; charset=utf-8',
  extraHeaders = {}
) {
  res.writeHead(status, { 'Content-Type': contentType, ...extraHeaders });
  res.end(text);
}

const MAX_BODY = 1024 * 1024;

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Corpo da requisição grande demais.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      let corpo;
      try {
        corpo = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return reject(new HttpError(400, 'JSON inválido.'));
      }
      // Toda rota espera um objeto: "null", uma lista ou um texto soltos quebrariam o
      // controller (body.campo) e virariam erro 500 em vez de um 400 claro.
      if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo))
        return reject(new HttpError(400, 'O corpo da requisição precisa ser um objeto JSON.'));
      resolve(corpo);
    });
    req.on('error', reject);
  });
}

// Validação mínima de campos do corpo.
export function requireFields(body, fields) {
  const faltando = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (faltando.length) throw new HttpError(400, `Campos obrigatórios: ${faltando.join(', ')}.`);
}

// Teto dos valores em reais: bem acima de qualquer renda ou gasto real, e longe de onde a soma
// em ponto flutuante começa a perder os centavos.
export const MAXIMO_EM_REAIS = 1_000_000_000;

export function toNumber(v, campo) {
  // Só texto ou número: true, [5] e {} também viram número no Number() e não são valor nenhum.
  if (typeof v !== 'string' && typeof v !== 'number')
    throw new HttpError(400, `${campo} precisa ser um número.`);
  const n = typeof v === 'string' ? Number(v.replace(/\./g, '').replace(',', '.')) : v;
  if (!Number.isFinite(n)) throw new HttpError(400, `${campo} precisa ser um número.`);
  if (Math.abs(n) > MAXIMO_EM_REAIS) throw new HttpError(400, `${campo} está acima do limite.`);
  return Math.round(n * 100) / 100;
}
