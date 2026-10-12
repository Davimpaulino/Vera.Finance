import { ColecaoDoUsuario } from './ColecaoDoUsuario.js';

class Metas extends ColecaoDoUsuario {
  constructor() {
    super('metas');
  }

  simular(meta, aporte) {
    const falta = Math.max(0, meta.alvo - meta.guardado);
    if (falta === 0) return { ciclos: 0, falta: 0 };
    if (!aporte || aporte <= 0) return { ciclos: null, falta };
    return { ciclos: Math.ceil(falta / aporte), falta };
  }
}

export const MetaModel = new Metas();
