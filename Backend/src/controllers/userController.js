import { UsuarioModel } from '../models/UsuarioModel.js';
import { PlanoModel } from '../models/PlanoModel.js';
import { FamiliaModel } from '../models/FamiliaModel.js';
import { GeoModel } from '../models/GeoModel.js';
import { HttpError, toNumber } from '../utils/http.js';
import { cycleFor } from '../utils/dates.js';

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter(k => obj && obj[k] !== undefined).map(k => [k, obj[k]]));

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
    if (body.nome !== undefined) data.nome = String(body.nome).trim();
    if (body.ciclo) {
      data.ciclo = pick(body.ciclo, ['diaVirada', 'frequencia', 'rendaFixa', 'rendaVariavel']);
      if (data.ciclo.diaVirada !== undefined) {
        const d = Number(data.ciclo.diaVirada);
        if (!(d >= 1 && d <= 31)) throw new HttpError(400, 'Dia de virada entre 1 e 31.');
        data.ciclo.diaVirada = d;
      }
      ['rendaFixa', 'rendaVariavel'].forEach(k => {
        if (data.ciclo[k] !== undefined) data.ciclo[k] = toNumber(data.ciclo[k], k);
      });
    }
    if (body.local) {
      data.local = pick(body.local, [
        'cep',
        'cidade',
        'raioKm',
        'mercados',
        'mercadoHabitual',
        'lat',
        'lng'
      ]);
      if (data.local.raioKm !== undefined) data.local.raioKm = Number(data.local.raioKm);
      if (GeoModel.temCoordenadas(data.local)) {
        data.local.lat = Number(data.local.lat);
        data.local.lng = Number(data.local.lng);
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
    if (body.prefs) {
      data.prefs = pick(body.prefs, [
        'tema',
        'ocultarValores',
        'zerarNaVirada',
        'resumoAntesDeFechar',
        'contribuirPrecos',
        'alertaAltaPreco'
      ]);
    }
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
    if (!u.assinatura) throw new HttpError(400, 'Você já está no plano grátis.');
    const atual = apresentarUsuario(u);
    const upd = await UsuarioModel.atualizar(user.uid, {
      assinatura: { ...u.assinatura, cancelada: true, ativaAte: atual.assinatura.proximaCobranca }
    });
    return apresentarUsuario(upd, await FamiliaModel.buscar(upd.familiaId));
  },

  async agendarExclusao({ user }) {
    const quando = new Date(Date.now() + 30 * 86400000).toISOString();
    await UsuarioModel.atualizar(user.uid, { exclusaoAgendadaPara: quando });
    return { exclusaoAgendadaPara: quando };
  }
};
