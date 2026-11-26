import { HttpError } from '../utils/http.js';

// Limite de tentativas em memória: segura força bruta de senha, enumeração de e-mails, abuso do
// cadastro de interessados e rajadas nas rotas que consultam o mapa e os sites das redes.
const janelas = new Map();
// Teto de janelas guardadas: muitos endereços diferentes numa hora não podem esgotar a memória.
const MAXIMO_DE_JANELAS = 50_000;

// IP de quem pediu. No Render o pedido chega pela borda da Cloudflare, que grava o IP de quem
// conectou em CF-Connecting-IP (e troca o valor que o cliente mandar). O X-Forwarded-For não
// serve para isso lá: o Render só acrescenta o IP no fim, e o começo da lista vem do cliente.
// Fora do Render (máquina local, testes), vale o primeiro IP do X-Forwarded-For ou o da conexão.
export const ipDe = req =>
  String(req.headers['cf-connecting-ip'] || '').trim() ||
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  'desconhecido';

/** Chave por IP (rotas públicas). */
export const porIp = ctx => `ip:${ipDe(ctx.req)}`;

/** Chave por conta (rotas com login; rode depois do exigirLogin). Sem login, cai no IP. */
export const porConta = ctx => (ctx.user?.uid ? `conta:${ctx.user.uid}` : porIp(ctx));

function guardar(chave, janela) {
  if (janelas.size >= MAXIMO_DE_JANELAS) {
    // O Map guarda na ordem de criação: as primeiras são as mais antigas.
    const sobra = janelas.size - MAXIMO_DE_JANELAS + 1;
    let apagadas = 0;
    for (const antiga of janelas.keys()) {
      if (apagadas++ >= sobra) break;
      janelas.delete(antiga);
    }
  }
  janelas.set(chave, janela);
}

export function limitar(nome, maximo, janelaMs, chaveDe = porIp) {
  return function limite(ctx) {
    const chave = `${nome}|${chaveDe(ctx)}`;
    const agora = Date.now();
    const atual = janelas.get(chave);
    if (!atual || agora - atual.inicio > janelaMs) {
      janelas.delete(chave);
      guardar(chave, { inicio: agora, total: 1, janelaMs });
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

/** Só para os testes: esquece todas as janelas. */
export function limparLimites() {
  janelas.clear();
}

// Limpeza periódica para o mapa não crescer sem fim.
setInterval(() => {
  const agora = Date.now();
  for (const [chave, janela] of janelas)
    if (agora - janela.inicio > Math.max(janela.janelaMs, 60 * 60 * 1000)) janelas.delete(chave);
}, 10 * 60 * 1000).unref();
