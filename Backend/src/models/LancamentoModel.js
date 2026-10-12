import { ColecaoDoUsuario } from './ColecaoDoUsuario.js';
import { startOfDay } from '../utils/dates.js';

class Lancamentos extends ColecaoDoUsuario {
  constructor() {
    super('lancamentos');
  }

  async entreDatas(uid, inicio, fim) {
    const desde = startOfDay(inicio).toISOString();
    const ate = new Date(startOfDay(fim).getTime() + 86400000 - 1).toISOString();
    const todos = await this.listar(uid, { ordenarPor: 'data', direcao: 'desc' });
    return todos.filter(lancamento => lancamento.data >= desde && lancamento.data <= ate);
  }
}

export const LancamentoModel = new Lancamentos();
export const TIPOS = ['saida', 'entrada'];
export const ORIGENS = ['manual', 'nota', 'recorrente', 'lista'];
