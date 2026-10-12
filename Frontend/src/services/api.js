const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

let tokenProvider = async () => null;
export const setTokenProvider = fn => {
  tokenProvider = fn;
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const token = await tokenProvider();
  let res;
  try {
    res = await fetch(BASE + '/api' + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com a vera. Confira a internet e tente de novo.');
  }
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok)
    throw new ApiError(res.status, (data && data.erro) || 'Algo deu errado. Tente de novo.');
  return data;
}

export const api = {
  get: p => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  patch: (p, b = {}) => request('PATCH', p, b),
  del: p => request('DELETE', p),

  /** Baixa um arquivo autenticado (CSV de exportação). */
  async download(path, filename) {
    const token = await tokenProvider();
    const res = await fetch(BASE + '/api' + path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new ApiError(res.status, 'Não deu para gerar a planilha.');
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};
