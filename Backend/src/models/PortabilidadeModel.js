import { UsuarioModel } from './UsuarioModel.js';
import { FamiliaModel } from './FamiliaModel.js';
import { CategoriaModel } from './CategoriaModel.js';
import { LancamentoModel } from './LancamentoModel.js';
import { MetaModel } from './MetaModel.js';
import { ListaModel } from './ListaModel.js';
import { NotaModel } from './NotaModel.js';
import { FixoModel } from './FixoModel.js';
import { VERSAO_DOS_TERMOS } from '../config/termos.js';

// Portabilidade (LGPD, art. 18, V): tudo o que é da pessoa, num arquivo só.
// Nunca entra a credencial do login (hash e sal da senha) nem dado de outra pessoa:
// da família vão só o nome e o papel de cada membro.
const ehDoTitular = uid => lancamento => !lancamento.quemId || lancamento.quemId === uid;

export const PortabilidadeModel = {
  async exportar(uid) {
    const perfil = await UsuarioModel.buscar(uid);
    if (!perfil) return null;
    const familia = await FamiliaModel.buscar(perfil.familiaId);
    const donoDaFamilia = familia && familia.donoId !== uid ? familia.donoId : null;

    const [categorias, lancamentos, metas, lista, notas, fixos, naFamilia] = await Promise.all([
      CategoriaModel.listarOrdenado(uid),
      LancamentoModel.listar(uid, { ordenarPor: 'data', direcao: 'desc' }),
      MetaModel.listar(uid),
      ListaModel.listarOrdenado(uid),
      NotaModel.listar(uid, { ordenarPor: 'lidaEm', direcao: 'desc' }),
      FixoModel.listar(uid),
      // Quem é membro lança no ciclo do dono: esses lançamentos também são da pessoa.
      donoDaFamilia
        ? LancamentoModel.listar(donoDaFamilia, { ordenarPor: 'data', direcao: 'desc' })
        : []
    ]);

    return {
      geradoEm: new Date().toISOString(),
      versaoDosTermos: VERSAO_DOS_TERMOS,
      perfil,
      categorias,
      lancamentos: lancamentos.filter(ehDoTitular(uid)),
      lancamentosNaFamilia: naFamilia.filter(lancamento => lancamento.quemId === uid),
      metas,
      lista,
      notas,
      fixos,
      familia: familia
        ? {
            nome: familia.nome,
            membros: familia.membros.map(membro => ({ nome: membro.nome, papel: membro.papel }))
          }
        : null
    };
  }
};
