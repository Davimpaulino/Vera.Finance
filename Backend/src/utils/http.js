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
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

// Validação mínima de campos do corpo.
export function requireFields(body, fields) {
  const faltando = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (faltando.length) throw new HttpError(400, `Campos obrigatórios: ${faltando.join(', ')}.`);
}

export function toNumber(v, campo) {
  const n = typeof v === 'string' ? Number(v.replace(/\./g, '').replace(',', '.')) : Number(v);
  if (!Number.isFinite(n)) throw new HttpError(400, `${campo} precisa ser um número.`);
  return Math.round(n * 100) / 100;
}
