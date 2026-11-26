import { UsuarioModel } from '../models/UsuarioModel.js';
import { PlanoModel } from '../models/PlanoModel.js';
import { ExclusaoModel } from '../models/ExclusaoModel.js';
import { FamiliaModel } from '../models/FamiliaModel.js';
import { GeoModel } from '../models/GeoModel.js';
import { PortabilidadeModel } from '../models/PortabilidadeModel.js';
import { HttpError, toNumber } from '../utils/http.js';
import { booleano, inteiroEntre, localDoCorpo, objeto, texto } from '../utils/validacao.js';
import { cycleFor } from '../utils/dates.js';
import { VERSAO_DOS_TERMOS } from '../config/termos.js';

// Cada campo do perfil que a pessoa muda tem tipo e tamanho conferidos: o que chega no corpo vai
// direto para o banco, e um objeto qualquer ali ficaria guardado no perfil para sempre.
const TEMAS = ['tinta', 'papel'];
const PREFERENCIAS_SIM_OU_NAO = [
  'ocultarValores',
  'zerarNaVirada',
  'resumoAntesDeFechar',
  'contribuirPrecos',
  'alertaAltaPreco'
];

// Campo vazio (null vem de um NaN no JSON, '' de um campo em branco) conta como não enviado.
const enviado = valor => valor !== undefined && valor !== null && valor !== '';

export function cicloDoCorpo(corpo) {
  const ciclo = objeto(corpo, 'O ciclo');
  const limpo = {};
  if (enviado(ciclo.diaVirada))
    limpo.diaVirada = inteiroEntre(ciclo.diaVirada, 1, 31, 'Dia de virada entre 1 e 31.');
  if (enviado(ciclo.frequencia))
    limpo.frequencia = texto(ciclo.frequencia, 'A frequência', { max: 60 });
  ['rendaFixa', 'rendaVariavel'].forEach(campo => {
    if (!enviado(ciclo[campo])) return;
    limpo[campo] = toNumber(ciclo[campo], campo);
    if (limpo[campo] < 0) throw new HttpError(400, 'A renda não pode ser negativa.');
  });
  return limpo;
}

function prefsDoCorpo(corpo) {
  const prefs = objeto(corpo, 'O grupo de preferências');
  const limpo = {};
  if (prefs.tema !== undefined) {
    if (!TEMAS.includes(prefs.tema)) throw new HttpError(400, 'Tema desconhecido.');
    limpo.tema = prefs.tema;
  }
  PREFERENCIAS_SIM_OU_NAO.forEach(campo => {
    if (prefs[campo] !== undefined) limpo[campo] = booleano(prefs[campo], 'A preferência');
  });
  return limpo;
}

function proximaCobranca(assinatura) {
  if (!assinatura || !assinatura.desde) return null;
  const desde = new Date(assinatura.desde);
  const hoje = new Date();
  const passo = assinatura.plano === 'anual' ? 12 : 1;
  const d = new Date(desde);
  while (d <= hoje) d.setMonth(d.getMonth() + passo);
  return d.toISOString();
}

export function apresentarUsuario(u, familia) {
  const plano = PlanoModel.buscar(u.plano) || PlanoModel.buscar('gratis');
  return {
    ...u,
    planoInfo: plano,
    assinatura: u.assinatura
      ? { ...u.assinatura, proximaCobranca: proximaCobranca(u.assinatura) }
      : null,
    cicloAtual: cycleFor(u.ciclo?.diaVirada || 5),
    termosAceitos: u.termosAceitos || null,
    versaoDosTermos: VERSAO_DOS_TERMOS,
    familia: familia
      ? { id: familia.id, nome: familia.nome, membros: familia.membros?.length || 1 }
      : null
  };
}

export const userController = {
  async me({ user }) {
    const u = await UsuarioModel.buscar(user.uid);
    if (!u) throw new HttpError(404, 'Perfil não encontrado.');
    return apresentarUsuario(u, await FamiliaModel.buscar(u.familiaId));
  },

  async update({ user, body }) {
    const data = {};
    if (body.nome !== undefined) data.nome = texto(body.nome, 'O nome', { max: 100 });
    if (body.ciclo !== undefined) data.ciclo = cicloDoCorpo(body.ciclo);
    if (body.local !== undefined) {
      data.local = localDoCorpo(body.local);
      const cepEmBranco = data.local.cep !== undefined && !/\d/.test(data.local.cep);
      if (cepEmBranco && !GeoModel.temCoordenadas(data.local)) {
        // CEP em branco apaga a localização (Política de Privacidade): o CEP, o ponto aproximado e
        // a cidade. Na mescla, null tira a chave do perfil. Gravar lat e lng nulos não serve:
        // Number(null) é 0, e temCoordenadas leria o ponto 0,0.
        Object.assign(data.local, { cep: '', lat: null, lng: null, cidade: null });
      } else if (GeoModel.temCoordenadas(data.local)) {
        // Guarda só o ponto aproximado (~100 m), nunca a posição exata do aparelho.
        Object.assign(data.local, GeoModel.aproximar(data.local));
        // Localização do aparelho: o CEP passa a ser o da rua onde a pessoa está.
        if (data.local.cep === undefined) {
          const cep = await GeoModel.cepDe(data.local);
          if (cep) data.local.cep = `${cep.slice(0, 5)}-${cep.slice(5)}`;
        }
      } else if (data.local.cep) {
        const achado = await GeoModel.porCep(data.local.cep);
        if (achado?.lat) Object.assign(data.local, { lat: achado.lat, lng: achado.lng });
        if (achado?.cidade && !data.local.cidade) data.local.cidade = achado.cidade;
      }
    }
    if (body.prefs !== undefined) data.prefs = prefsDoCorpo(body.prefs);
    // Um grupo vazio ({}) na mescla apagaria o grupo inteiro do perfil: fica de fora.
    for (const grupo of ['ciclo', 'local', 'prefs'])
      if (data[grupo] && !Object.keys(data[grupo]).length) delete data[grupo];
    const u = await UsuarioModel.atualizar(user.uid, data);
    return apresentarUsuario(u, await FamiliaModel.buscar(u.familiaId));
  },

  async trocarPlano({ user, body }) {
    const plano = PlanoModel.buscar(body.plano);
    if (!plano) throw new HttpError(400, 'Plano desconhecido.');
    const assinatura =
      plano.preco > 0
        ? { plano: plano.id, desde: new Date().toISOString(), cancelada: false }
        : null;
    const u = await UsuarioModel.atualizar(user.uid, { plano: plano.id, assinatura });
    return apresentarUsuario(u, await FamiliaModel.buscar(u.familiaId));
  },

  async cancelarAssinatura({ user }) {
    const u = await UsuarioModel.buscar(user.uid);
    if (!u) throw new HttpError(404, 'Perfil não encontrado.');
    if (!u.assinatura) throw new HttpError(400, 'Você já está no plano grátis.');
    const atual = apresentarUsuario(u);
    const upd = await UsuarioModel.atualizar(user.uid, {
      assinatura: { ...u.assinatura, cancelada: true, ativaAte: atual.assinatura.proximaCobranca }
    });
    return apresentarUsuario(upd, await FamiliaModel.buscar(upd.familiaId));
  },

  async agendarExclusao({ user }) {
    const quando = new Date(Date.now() + 30 * 86400000).toISOString();
    await ExclusaoModel.agendar(user.uid, quando);
    return { exclusaoAgendadaPara: quando };
  },

  /** Baixa todos os dados da pessoa em JSON (portabilidade, LGPD art. 18, V). */
  async exportar({ user }) {
    const dados = await PortabilidadeModel.exportar(user.uid);
    if (!dados) throw new HttpError(404, 'Perfil não encontrado.');
    return {
      raw: JSON.stringify(dados, null, 2),
      contentType: 'application/json; charset=utf-8',
      headers: { 'Content-Disposition': 'attachment; filename="vera-meus-dados.json"' }
    };
  },

  /** Desiste da exclusão marcada (dentro dos 30 dias). */
  async cancelarExclusao({ user }) {
    await ExclusaoModel.cancelar(user.uid);
    return { exclusaoAgendadaPara: null };
  }
};
