import { contexto, podeVerCategoria, podeVerNota } from '../models/ContextoModel.js';
import { NotaModel } from '../models/NotaModel.js';
import { CategoriaModel } from '../models/CategoriaModel.js';
import { LancamentoModel } from '../models/LancamentoModel.js';
import { NfceModel } from '../models/NfceModel.js';
import { MercadoModel } from '../models/MercadoModel.js';
import { PrecoModel } from '../models/PrecoModel.js';
import { PlanoModel } from '../models/PlanoModel.js';
import { HttpError, requireFields, toNumber } from '../utils/http.js';
import { idValido, texto } from '../utils/validacao.js';

// Nota do espaço (do dono, no modo família) que esta pessoa pode ver e mexer.
async function notaVisivel(ctx, id) {
  const nota = await NotaModel.buscar(ctx.ownerUid, id);
  return nota && podeVerNota(ctx, nota) ? nota : null;
}

export const notaController = {
  async pendentes({ user }) {
    return NotaModel.pendentesVisiveis(await contexto(user.uid));
  },

  /** Lê a NFC-e pelo link do QR Code: guarda a nota para confirmar e os preços para comparar. */
  async ler({ user, body }) {
    requireFields(body, ['endereco']);
    const endereco = texto(body.endereco, 'O link da nota', { max: 2000 });
    const ctx = await contexto(user.uid);
    const limite = PlanoModel.buscar(ctx.owner.plano)?.limites?.notasPorMes;
    if (limite && (await NotaModel.lidasNoMes(ctx.ownerUid)) >= limite)
      throw new HttpError(
        403,
        `O plano grátis lê até ${limite} notas por mês. Assine o vera+ para ler notas ilimitadas.`
      );
    const lida = await NfceModel.ler(endereco);
    if (await NotaModel.buscarPorChave(ctx.ownerUid, lida.chave))
      throw new HttpError(409, 'Esta nota já foi lida.');
    const mercado = await MercadoModel.registrarDaNota({
      cnpj: lida.cnpj,
      nome: lida.estabelecimento,
      endereco: lida.endereco
    });
    if (ctx.user.prefs?.contribuirPrecos !== false) await PrecoModel.gravarDaNota(lida, mercado.id);
    const nota = await NotaModel.criar(ctx.ownerUid, {
      chave: lida.chave,
      estabelecimento: lida.estabelecimento,
      cnpj: lida.cnpj,
      mercadoId: mercado.id,
      valor: lida.valor,
      itens: lida.itens.length,
      produtos: lida.itens.map(({ produto, quantidade, unidade, preco, total }) => ({
        produto,
        quantidade,
        unidade,
        preco,
        total
      })),
      status: 'pendente',
      lidaEm: new Date().toISOString(),
      compradoEm: lida.compradoEm,
      // No modo família a nota fica no espaço do dono; quemId diz de quem ela é (portabilidade).
      quemId: user.uid
    });
    return { status: 201, body: nota };
  },

  /** Confirma a nota lida: vira lançamento na categoria escolhida. */
  async confirmar({ user, params, body }) {
    requireFields(body, ['categoriaId']);
    const ctx = await contexto(user.uid);
    const nota = await notaVisivel(ctx, params.id);
    if (!nota || nota.status !== 'pendente')
      throw new HttpError(404, 'Nota não encontrada ou já confirmada.');
    if (!idValido(body.categoriaId)) throw new HttpError(400, 'Categoria não encontrada.');
    const cat = await CategoriaModel.buscar(ctx.ownerUid, body.categoriaId);
    // Quem não é dono só lança nas categorias compartilhadas, como num gasto à mão.
    if (!cat || !podeVerCategoria(ctx, cat)) throw new HttpError(400, 'Categoria não encontrada.');
    const valor = toNumber(body.valor ?? nota.valor, 'valor');
    if (valor <= 0) throw new HttpError(400, 'O valor precisa ser maior que zero.');
    const lanc = await LancamentoModel.criar(ctx.ownerUid, {
      titulo: texto(body.titulo, 'A descrição', { max: 120 }) || nota.estabelecimento,
      valor,
      tipo: 'saida',
      origem: 'nota',
      categoriaId: cat.id,
      categoriaNome: cat.nome,
      data: nota.compradoEm || nota.lidaEm,
      quemId: user.uid,
      quemNome: ctx.user.nome || 'Você',
      notaId: nota.id
    });
    await NotaModel.atualizar(ctx.ownerUid, nota.id, {
      status: 'confirmada',
      lancamentoId: lanc.id
    });
    return lanc;
  },

  async descartar({ user, params }) {
    const ctx = await contexto(user.uid);
    // Só marca nota que existe: um id qualquer não cria um registro novo no banco.
    if (!(await notaVisivel(ctx, params.id))) throw new HttpError(404, 'Nota não encontrada.');
    await NotaModel.atualizar(ctx.ownerUid, params.id, { status: 'descartada' });
    return { status: 204 };
  }
};
