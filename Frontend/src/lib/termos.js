// Versão dos Termos de uso e da Política de privacidade que a pessoa aceita no cadastro
// (ou na tela de aceite, depois do login).
// Precisa ser a mesma de Backend/src/config/termos.js; troque as duas junto com a data em Legal.jsx.
export const VERSAO_DOS_TERMOS = 'v2026-11-29';

/** O perfil tem o aceite da versão em vigor? A versão em vigor vem da API, junto com o perfil. */
export const aceitouTermos = user =>
  !!user?.termosAceitos && user.termosAceitos.versao === (user.versaoDosTermos || VERSAO_DOS_TERMOS);
