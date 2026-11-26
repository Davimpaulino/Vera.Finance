import { HttpError } from '../utils/http.js';

// Limite de tentativas por IP, em memória: segura força bruta de senha, enumeração de e-mails e
// abuso do cadastro de interessados. Atrás do proxy do Render, o IP real vem no X-Forwarded-For.
const janelas = new Map();

export const ipDe = req =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  'desconhecido';

export function limitar(nome, maximo, janelaMs) {
  return function limite(ctx) {
    const chave = `${nome}|${ipDe(ctx.req)}`;
    const agora = Date.now();
    const atual = janelas.get(chave);
    if (!atual || agora - atual.inicio > janelaMs) {
      janelas.set(chave, { inicio: agora, total: 1 });
      return undefined;
    }
    atual.total += 1;
    if (atual.total > maximo) {
      const segundos = Math.ceil((atual.inicio + janelaMs - agora) / 1000);
      ctx.res.setHeader('Retry-After', String(segundos));
      throw new HttpError(429, 'Muitas tentativas. Espere alguns minutos e tente de novo.');
    }
    return undefined;
  };
}

// Limpeza periódica para o mapa não crescer sem fim.
setInterval(() => {
  const agora = Date.now();
  for (const [chave, janela] of janelas) if (agora - janela.inicio > 60 * 60 * 1000) janelas.delete(chave);
}, 10 * 60 * 1000).unref();
