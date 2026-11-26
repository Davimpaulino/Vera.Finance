import { HttpError } from './http.js';
import { idValido } from './validacao.js';

// Os parâmetros da URL (:id) viram parte de um caminho do banco. "%2F" decodificado é uma barra:
// sem esta conferência, DELETE /api/lista/%2F apontaria para a coleção inteira, não para um item.
function lerParametro(bruto) {
  let valor;
  try {
    valor = decodeURIComponent(bruto);
  } catch {
    throw new HttpError(400, 'Endereço inválido.');
  }
  if (!idValido(valor)) throw new HttpError(400, 'Identificador inválido.');
  return valor;
}

// Roteador mínimo sobre node:http: métodos, parâmetros (:id) e cadeia de middlewares.
export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, ...handlers) {
    const keys = [];
    const regex = new RegExp(
      '^' +
        pattern.replace(/\/:([A-Za-z_]+)/g, (_, k) => {
          keys.push(k);
          return '/([^/]+)';
        }) +
        '/?$'
    );
    this.routes.push({ method, regex, keys, handlers });
    return this;
  }
  get(p, ...h) {
    return this.add('GET', p, ...h);
  }
  post(p, ...h) {
    return this.add('POST', p, ...h);
  }
  patch(p, ...h) {
    return this.add('PATCH', p, ...h);
  }
  put(p, ...h) {
    return this.add('PUT', p, ...h);
  }
  delete(p, ...h) {
    return this.add('DELETE', p, ...h);
  }

  match(method, pathname) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = r.regex.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method) continue;
      const params = {};
      r.keys.forEach((k, i) => {
        params[k] = lerParametro(m[i + 1]);
      });
      return { route: r, params };
    }
    return { route: null, pathMatched };
  }
}
