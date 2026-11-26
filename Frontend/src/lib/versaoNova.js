// Depois de um deploy, a aba que já estava aberta ainda pede os pedaços do build antigo
// (firebase-HASH.js, AppShell-HASH.js...). Eles não existem mais e o Render (como o vite preview)
// responde 200 com o HTML da casca no lugar do .js: o import() falha mesmo com a internet
// funcionando. Pedir o mesmo arquivo de novo não adianta; recarregar traz o HTML novo, que aponta
// para os pedaços do build atual.

const CHAVE = 'vera.recarregadaEm';
// Se o pedaço falhar de novo logo depois de recarregar, não é deploy (é rede instável ou um
// bloqueador): a página não recarrega sozinha outra vez e quem decide é a pessoa, na tela
// "Sem conexão". Sem essa marca, um arquivo bloqueado deixaria a página recarregando sem parar.
const INTERVALO_MS = 60_000;

// Já mandou recarregar: os outros import() que falharem nesta página só esperam a página nova.
let recarregando = false;

// Separado para os testes trocarem (o jsdom não recarrega página).
export const pagina = { recarregar: () => window.location.reload() };

/** Recarrega agora ("Tentar de novo") e anota a hora, para a recarga automática não repetir. */
export function recarregarAPagina() {
  recarregando = true;
  try {
    sessionStorage.setItem(CHAVE, String(Date.now()));
  } catch {
    // Sem storage a recarga acontece do mesmo jeito.
  }
  pagina.recarregar();
}

/**
 * Um pedaço do build não carregou. Com a internet ligada, recarrega a página e devolve true:
 * quem chamou só espera a página nova. Sem internet, ou se já recarregou há pouco, devolve
 * false e quem chamou mostra "Sem conexão".
 */
export function recarregarParaVersaoNova() {
  if (recarregando) return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  try {
    const ultima = Number(sessionStorage.getItem(CHAVE)) || 0;
    if (Date.now() - ultima < INTERVALO_MS) return false;
  } catch {
    // Sem sessionStorage não dá para saber se já recarregou: melhor não arriscar um laço.
    return false;
  }
  recarregarAPagina();
  return true;
}

/**
 * Para o React.lazy: se o pedaço da tela não vier e a página for recarregar, a tela fica no
 * "Carregando" (a promessa não termina) em vez de quebrar até a página nova chegar.
 */
export const importarTela = importar => () =>
  importar().catch(erro => {
    if (recarregarParaVersaoNova()) return new Promise(() => {});
    throw erro;
  });
