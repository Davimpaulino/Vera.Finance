import { CatalogoVtexModel } from './CatalogoVtexModel.js';
import { CatalogoGpaModel } from './CatalogoGpaModel.js';
import { CatalogoPagueMenosModel } from './CatalogoPagueMenosModel.js';
import { CatalogoTendaModel } from './CatalogoTendaModel.js';
import { CatalogoOccModel } from './CatalogoOccModel.js';
import { CatalogoSfccModel } from './CatalogoSfccModel.js';

// O leitor de cada plataforma (campo `plataforma` do RedeModel). Fica separado do CatalogoModel,
// que guarda histórico no banco, para scripts como o monitor de saúde das redes lerem os sites
// sem abrir conexão com o banco.
export const LEITORES = {
  vtex: CatalogoVtexModel,
  gpa: CatalogoGpaModel,
  paguemenos: CatalogoPagueMenosModel,
  tenda: CatalogoTendaModel,
  occ: CatalogoOccModel,
  sfcc: CatalogoSfccModel
};
