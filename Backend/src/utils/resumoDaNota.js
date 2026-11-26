import { createHash } from 'node:crypto';

/**
 * Resumo (hash) da chave de acesso de uma NFC-e, usado no id dos preços da nota. Evita contar a
 * mesma nota duas vezes sem guardar a chave, que abre a nota completa no portal da Fazenda.
 * Usado também pelo script de migração para converter os ids antigos: não mude a fórmula.
 */
export const resumoDaChaveDaNota = chave =>
  createHash('sha256').update(`vera-precos|${chave}`).digest('hex').slice(0, 24);
