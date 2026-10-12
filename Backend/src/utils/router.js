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
        params[k] = decodeURIComponent(m[i + 1]);
      });
      return { route: r, params };
    }
    return { route: null, pathMatched };
  }
}
