import { HttpError } from '../utils/http.js';

// Versão em vigor dos Termos de uso e da Política de privacidade. Troque junto com a data
// do texto (Frontend/src/pages/site/Legal.jsx) e com VERSAO_DOS_TERMOS do Frontend/src/lib/termos.js.
// Trocar a versão pede o aceite de novo a todas as contas: o app só abre depois dele.
export const VERSAO_DOS_TERMOS = 'v2026-11-26';

const FALTA_ACEITE =
  'Para continuar, confirme que tem 18 anos ou mais e que leu os Termos de uso e a Política de privacidade.';
const VERSAO_QUE_NAO_VALE =
  'Os Termos de uso e a Política de privacidade mudaram. Recarregue a página e aceite a versão nova.';

/**
 * Lê o aceite enviado no cadastro ou na sessão. Só vale a versão em vigor: uma versão que
 * nunca foi publicada não pode ficar registrada como aceita. Sem aceite válido devolve null.
 */
export function lerAceite(corpo) {
  if (corpo?.aceite?.versao !== VERSAO_DOS_TERMOS) return null;
  return { versao: VERSAO_DOS_TERMOS, em: new Date().toISOString() };
}

/** Aceite obrigatório (cadastro): devolve o registro ou recusa com 400. */
export function exigirAceite(corpo) {
  const aceite = lerAceite(corpo);
  if (!aceite) throw new HttpError(400, corpo?.aceite ? VERSAO_QUE_NAO_VALE : FALTA_ACEITE);
  return aceite;
}

/** Aceite opcional (sessão): sem aceite devolve null; aceite de versão errada é recusado. */
export function aceiteOpcional(corpo) {
  return corpo?.aceite === undefined ? null : exigirAceite(corpo);
}

/** O perfil tem o aceite da versão em vigor? */
export const aceitouTermos = perfil => perfil?.termosAceitos?.versao === VERSAO_DOS_TERMOS;
