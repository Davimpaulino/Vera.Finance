// Versão em vigor dos Termos de uso e da Política de privacidade. Troque junto com a data
// do texto (Frontend/src/pages/site/Legal.jsx) e com VERSAO_DOS_TERMOS do Frontend/src/lib/termos.js.
export const VERSAO_DOS_TERMOS = 'v2026-11-24';

/** Lê o aceite enviado no cadastro. Sem aceite válido devolve null (nada é gravado). */
export function lerAceite(corpo) {
  const versao = corpo?.aceite?.versao;
  if (typeof versao !== 'string' || !versao.trim() || versao.length > 40) return null;
  return { versao: versao.trim(), em: new Date().toISOString() };
}
