import { banco } from '../config/banco.js';
import { PlanoModel } from './PlanoModel.js';

const PADRAO = {
  plano: 'gratis',
  onboardingCompleto: false,
  ciclo: { diaVirada: 5, frequencia: 'Uma vez por mês', rendaFixa: 0, rendaVariavel: 0 },
  local: { cep: '', cidade: '', raioKm: 5, mercados: [] },
  prefs: {
    tema: 'tinta',
    ocultarValores: false,
    zerarNaVirada: true,
    resumoAntesDeFechar: false,
    contribuirPrecos: true,
    alertaAltaPreco: true
  }
};

const caminhoDoPerfil = uid => `usuarios/${uid}/perfil`;

export const UsuarioModel = {
  PADRAO,

  async buscar(uid) {
    const perfil = await banco.ler(caminhoDoPerfil(uid));
    if (!perfil) return null;
    // Plano e assinatura saem já com o cancelamento vencido aplicado (veja PlanoModel.emVigor):
    // toda conferência de limite (notas, metas, família) e a tela de Configurações leem daqui.
    return {
      id: uid,
      ...perfil,
      local: { mercados: [], ...perfil.local },
      familiaId: perfil.familiaId || null,
      ...PlanoModel.emVigor(perfil)
    };
  },

  async criarSeNaoExistir(uid, { nome, email, termosAceitos }) {
    const atual = await this.buscar(uid);
    if (atual) return atual;
    const perfil = {
      ...structuredClone(PADRAO),
      nome: nome || '',
      email: email || '',
      ...(termosAceitos ? { termosAceitos } : {}),
      criadoEm: new Date().toISOString()
    };
    await banco.gravar(caminhoDoPerfil(uid), perfil);
    return this.buscar(uid);
  },

  async atualizar(uid, dados) {
    await banco.mesclar(caminhoDoPerfil(uid), { ...dados, atualizadoEm: new Date().toISOString() });
    return this.buscar(uid);
  }
};
