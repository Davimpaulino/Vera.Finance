import { HttpError } from '../utils/http.js';

// Limite de tentativas por IP, em memória: segura força bruta de senha, enumeração de e-mails,
// abuso do cadastro de interessados e do verificador público de CEP.
const janelas = new Map();

/**
 * IP de quem fez o pedido, de um jeito que o próprio cliente não consegue trocar.
 * Atrás do Render, a borda põe o IP de quem conectou em CF-Connecting-IP e True-Client-IP
 * (escrevendo por cima do que o cliente mandar). No X-Forwarded-For o Render só acrescenta o IP
 * no fim da lista: o começo vem do cliente e pode ser inventado, então vale o último valor.
 * Sem nenhum desses cabeçalhos (rodando local, sem proxy), vale o endereço da conexão.
 */
export const ipDe = req => {
  const daBorda = String(req.headers['cf-connecting-ip'] || req.headers['true-client-ip'] || '').trim();
  if (daBorda) return daBorda;
  const repassados = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map(ip => ip.trim())
    .filter(Boolean);
  return repassados.at(-1) || req.socket?.remoteAddress || 'desconhecido';
};

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
