const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

let tokenProvider = async () => null;
export const setTokenProvider = fn => {
  tokenProvider = fn;
};

// A API recusa o app sem o aceite dos termos em vigor (403, motivo "termos"), por exemplo
// quando os termos mudam com o app aberto. O AuthContext recarrega o perfil e o App pede o aceite.
let aoPedirAceite = () => {};
export const setAoPedirAceite = fn => {
  aoPedirAceite = fn;
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Erro de rede (status 0): o AuthContext mostra "Sem conexão" em vez de mandar para o login. */
export const SEM_CONEXAO = 'Sem conexão com a vera. Confira a internet e tente de novo.';

/** Token da sessão. Sem internet, renovar o token do Firebase também falha: vira erro de rede. */
async function tokenDaSessao() {
  try {
    return await tokenProvider();
  } catch (erro) {
    if (erro?.code === 'auth/network-request-failed') throw new ApiError(0, SEM_CONEXAO);
    throw erro;
  }
}

async function request(method, path, body) {
  const token = await tokenDaSessao();
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
    throw new ApiError(0, SEM_CONEXAO);
  }
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    if (res.status === 403 && data?.detalhes?.motivo === 'termos') aoPedirAceite();
    throw new ApiError(res.status, (data && data.erro) || 'Algo deu errado. Tente de novo.');
  }
  return data;
}

export const api = {
  get: p => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  patch: (p, b = {}) => request('PATCH', p, b),
  del: p => request('DELETE', p),

  /** Baixa um arquivo autenticado (CSV dos lançamentos, JSON com todos os dados). */
  async download(path, filename, erro = 'Não deu para gerar a planilha.') {
    const token = await tokenDaSessao();
    const res = await fetch(BASE + '/api' + path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new ApiError(res.status, erro);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};
