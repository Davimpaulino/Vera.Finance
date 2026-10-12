import { configuracao } from './config/env.js';
import router from './routes/index.js';
import { HttpError, readJsonBody, sendJson, sendText } from './utils/http.js';

function cors(req, res) {
  const origin = req.headers.origin;
  if (
    origin &&
    (configuracao.origensPermitidas.includes('*') ||
      configuracao.origensPermitidas.includes(origin))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }
}

/**
 * Handler de node:http. Cada rota é uma cadeia de funções (ctx) => resultado.
 * O resultado pode ser: dado (200 JSON), { status, body }, ou { raw, contentType, headers }.
 */
export async function handle(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  try {
    const { route, params, pathMatched } = router.match(req.method, url.pathname);
    if (!route)
      throw new HttpError(
        pathMatched ? 405 : 404,
        pathMatched ? 'Método não permitido.' : 'Rota não encontrada.'
      );

    const ctx = { req, res, params, query: url.searchParams, body: {}, user: null };
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) ctx.body = await readJsonBody(req);

    let result;
    for (const fn of route.handlers) result = await fn(ctx);

    if (result && result.raw !== undefined)
      return sendText(res, 200, result.raw, result.contentType, result.headers);
    if (
      result &&
      typeof result.status === 'number' &&
      Object.keys(result).every(k => k === 'status' || k === 'body')
    ) {
      if (result.status === 204) {
        res.writeHead(204);
        res.end();
        return;
      }
      return sendJson(res, result.status, result.body);
    }
    return sendJson(res, 200, result ?? null);
  } catch (err) {
    if (err instanceof HttpError)
      return sendJson(res, err.status, { erro: err.message, detalhes: err.details });
    console.error(`[${req.method} ${url.pathname}]`, err);
    return sendJson(res, 500, { erro: 'Algo deu errado do nosso lado. Tente de novo.' });
  }
}
