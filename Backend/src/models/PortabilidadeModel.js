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
// Nunca entra a credencial do login (hash e sal da senha). No modo família, tudo fica no
// espaço do dono, e cada lançamento, nota lida, item da lista e aporte guarda quemId: cada
// registro vai para quem o fez. O dono não leva o que os membros fizeram, e o membro leva o
// que fez no espaço do dono. Categorias, fixos e as metas em si são do espaço (do dono).
// Dos membros da família vão só o nome e o papel. Registro sem quemId (antigo) é do dono do espaço.
const ehDoTitular = uid => registro => !registro.quemId || registro.quemId === uid;
const feitoPor = uid => registro => registro.quemId === uid;

export const PortabilidadeModel = {
  async exportar(uid) {
    const perfil = await UsuarioModel.buscar(uid);
    if (!perfil) return null;
    const familia = await FamiliaModel.buscar(perfil.familiaId);
    const donoDaFamilia = familia && familia.donoId !== uid ? familia.donoId : null;
    const doDono = listar => (donoDaFamilia ? listar(donoDaFamilia) : []);

    const [categorias, lancamentos, metas, lista, notas, fixos, ...noDono] = await Promise.all([
      CategoriaModel.listarOrdenado(uid),
      LancamentoModel.listar(uid, { ordenarPor: 'data', direcao: 'desc' }),
      MetaModel.listar(uid),
      ListaModel.listarOrdenado(uid),
      NotaModel.listar(uid, { ordenarPor: 'lidaEm', direcao: 'desc' }),
      FixoModel.listar(uid),
      // Quem é membro lança, lê notas, monta a lista e guarda nas metas do dono.
      doDono(dono => LancamentoModel.listar(dono, { ordenarPor: 'data', direcao: 'desc' })),
      doDono(dono => NotaModel.listar(dono, { ordenarPor: 'lidaEm', direcao: 'desc' })),
      doDono(dono => ListaModel.listarOrdenado(dono)),
      doDono(dono => MetaModel.listar(dono))
    ]);
    const [lancamentosDoDono, notasDoDono, listaDoDono, metasDoDono] = noDono;

    return {
      geradoEm: new Date().toISOString(),
      versaoDosTermos: VERSAO_DOS_TERMOS,
      perfil,
      categorias,
      lancamentos: lancamentos.filter(ehDoTitular(uid)),
      metas: metas.map(meta => ({
        ...meta,
        aportes: (meta.aportes || []).filter(ehDoTitular(uid))
      })),
      lista: lista.filter(ehDoTitular(uid)),
      notas: notas.filter(ehDoTitular(uid)),
      fixos,
      lancamentosNaFamilia: lancamentosDoDono.filter(feitoPor(uid)),
      notasNaFamilia: notasDoDono.filter(feitoPor(uid)),
      listaNaFamilia: listaDoDono.filter(feitoPor(uid)),
      aportesNaFamilia: metasDoDono.flatMap(meta =>
        (meta.aportes || [])
          .filter(feitoPor(uid))
          .map(aporte => ({ metaId: meta.id, meta: meta.nome, ...aporte }))
      ),
      familia: familia
        ? {
            nome: familia.nome,
            membros: familia.membros.map(membro => ({ nome: membro.nome, papel: membro.papel }))
          }
        : null
    };
  }
};
