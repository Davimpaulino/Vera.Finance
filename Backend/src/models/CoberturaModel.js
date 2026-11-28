import { GeoModel } from './GeoModel.js';
import { RegiaoModel } from './RegiaoModel.js';
import { RedeModel } from './RedeModel.js';
import { normalize } from '../utils/text.js';

// Verificador público de CEP: quais redes com preço online têm loja perto daquele CEP.
// Usa só os mercados do mapa (OpenStreetMap), nunca os das notas lidas pelas pessoas, e não guarda
// o CEP em lugar nenhum além deste cache em memória. A resposta é pequena e igual para todos.
const RAIO_KM = 15;
const VALIDADE_MS = 24 * 60 * 60 * 1000;
// Mapa fora do ar: guarda pouco tempo, para tentar de novo logo sem martelar o serviço.
const VALIDADE_DA_FALHA_MS = 5 * 60 * 1000;
const MAXIMO_NO_CACHE = 5000;
const MAXIMO_SEM_PRECO = 10;
// Qualquer um chama este endpoint, sem login, e cada CEP novo custa uma consulta ao ViaCEP, uma
// ou duas ao Nominatim e uma ao mapa (Overpass) num raio de 15 km. Além do limite por IP (em
// routes/index.js), há um teto para o serviço inteiro, para esses serviços gratuitos não
// bloquearem a vera (o que quebraria a localização também no app): no máximo 10 CEPs novos por
// minuto e 2 consultas ao mesmo tempo. Passou do teto, a resposta é "tente de novo daqui a pouco";
// CEP já consultado continua saindo do cache.
const CEPS_NOVOS_POR_MINUTO = 10;
const CONSULTAS_AO_MESMO_TEMPO = 2;
const MINUTO_MS = 60 * 1000;

const emCache = new Map();
const emAndamento = new Map();
const iniciosRecentes = [];
const fila = [];
let consultando = 0;

/** Reserva um dos CEPs novos do minuto. Devolve 0 ou, sem vaga, em quantos segundos abre uma. */
function reservarCepNovo(agora = Date.now()) {
  while (iniciosRecentes.length && agora - iniciosRecentes[0] >= MINUTO_MS) iniciosRecentes.shift();
  if (iniciosRecentes.length >= CEPS_NOVOS_POR_MINUTO)
    return Math.max(1, Math.ceil((iniciosRecentes[0] + MINUTO_MS - agora) / 1000));
  iniciosRecentes.push(agora);
  return 0;
}

/** Roda a consulta quando houver vaga (no máximo CONSULTAS_AO_MESMO_TEMPO ao mesmo tempo). */
async function naVez(tarefa) {
  if (consultando < CONSULTAS_AO_MESMO_TEMPO) consultando += 1;
  // Sem vaga, espera quem está consultando passar a vez (a vaga passa direto, sem disputa).
  else await new Promise(resolver => fila.push(resolver));
  try {
    return await tarefa();
  } finally {
    const proximo = fila.shift();
    if (proximo) proximo();
    else consultando -= 1;
  }
}

const cepBonito = cep => `${cep.slice(0, 5)}-${cep.slice(5)}`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/**
 * Agrupa os mercados por rede (ou pelo nome, quem não tem preço online), do mais perto ao mais longe.
 * Também usado por scripts/cobertura-das-cidades.mjs, que monta as páginas das cidades do site.
 */
export function agruparPorRede(mercados) {
  const grupos = new Map();
  for (const mercado of mercados) {
    const rede = mercado.redeId ? RedeModel.buscar(mercado.redeId) : null;
    const nome = rede ? rede.nome : String(mercado.marca || mercado.nome || '').trim();
    if (!nome) continue;
    const chave = rede ? `rede:${rede.id}` : `nome:${normalize(nome)}`;
    const grupo = grupos.get(chave);
    if (grupo) {
      grupo.lojas += 1;
      grupo.distanciaKm = Math.min(grupo.distanciaKm, mercado.distanciaKm);
      continue;
    }
    grupos.set(chave, {
      id: rede ? rede.id : null,
      nome,
      tipo: rede ? rede.tipo : mercado.tipo || 'mercado',
      precoOnline: !!rede,
      lojas: 1,
      distanciaKm: mercado.distanciaKm
    });
  }
  const todos = [...grupos.values()].sort(
    (a, b) => Number(b.precoOnline) - Number(a.precoOnline) || a.distanciaKm - b.distanciaKm
  );
  return [
    ...todos.filter(grupo => grupo.precoOnline),
    ...todos.filter(grupo => !grupo.precoOnline).slice(0, MAXIMO_SEM_PRECO)
  ];
}

function mensagemDe({ situacao, semCoordenadas, comPrecoOnline, totalMercados }) {
  if (situacao === 'mapaFalhou')
    return semCoordenadas
      ? 'Não deu para localizar este CEP no mapa agora. Tente de novo em alguns minutos.'
      : 'O mapa de mercados não respondeu agora. Tente de novo em alguns minutos.';
  if (comPrecoOnline)
    return `${plural(comPrecoOnline, 'rede', 'redes')} com preço online a até ${RAIO_KM} km deste CEP.`;
  if (totalMercados)
    return `Nenhuma rede com preço online a até ${RAIO_KM} km deste CEP. Os mercados da região entram na comparação quando você lê as notas fiscais das compras.`;
  return `Não achamos mercados no mapa a até ${RAIO_KM} km deste CEP.`;
}

async function consultar(cep) {
  const local = await GeoModel.consultarCep(cep);
  if (local.erro === 'naoExiste' || local.erro === 'invalido') return { naoExiste: true };
  const base = { cep: cepBonito(cep), cidade: local.cidade || null, raioKm: RAIO_KM };
  const semCoordenadas = !GeoModel.temCoordenadas(local);
  // guardar: false — a região que vier do mapa não vai para o banco nem fica na memória do
  // RegiaoModel; daqui só fica o resumo pequeno, no cache deste arquivo.
  const mercados = semCoordenadas
    ? null
    : await RegiaoModel.mercadosPerto(local, RAIO_KM, { guardar: false });
  if (!mercados) {
    const falha = { situacao: 'mapaFalhou', totalMercados: 0, comPrecoOnline: 0, redes: [] };
    return { ...base, ...falha, mensagem: mensagemDe({ ...falha, semCoordenadas }) };
  }
  const redes = agruparPorRede(mercados);
  const resumo = {
    situacao: 'ok',
    totalMercados: mercados.length,
    comPrecoOnline: redes.filter(grupo => grupo.precoOnline).length
  };
  return { ...base, ...resumo, mensagem: mensagemDe(resumo), redes, atualizadoEm: new Date().toISOString() };
}

function guardar(cep, resultado) {
  // O mais antigo sai primeiro (o Map guarda a ordem de entrada).
  if (emCache.size >= MAXIMO_NO_CACHE) emCache.delete(emCache.keys().next().value);
  const validade = resultado.situacao === 'mapaFalhou' ? VALIDADE_DA_FALHA_MS : VALIDADE_MS;
  emCache.set(cep, { ate: Date.now() + validade, resultado });
}

export const CoberturaModel = {
  RAIO_KM,

  /**
   * Redes com preço online perto do CEP (8 números). Devolve { naoExiste: true } quando o CEP não
   * existe; { ocupado: true, tenteEmSegundos } quando o teto de CEPs novos do minuto já foi usado;
   * senão { cep, cidade, raioKm, situacao: 'ok' | 'mapaFalhou', mensagem, totalMercados,
   * comPrecoOnline, redes: [{ id, nome, tipo, precoOnline, lojas, distanciaKm }] }.
   */
  async doCep(cep) {
    const guardado = emCache.get(cep);
    if (guardado && Date.now() < guardado.ate) return guardado.resultado;
    // Pedidos do mesmo CEP ao mesmo tempo esperam a mesma consulta (e gastam uma vaga só).
    if (!emAndamento.has(cep)) {
      const tenteEmSegundos = reservarCepNovo();
      if (tenteEmSegundos) return { ocupado: true, tenteEmSegundos };
      emAndamento.set(
        cep,
        naVez(() => consultar(cep))
          .then(resultado => {
            guardar(cep, resultado);
            return resultado;
          })
          .finally(() => emAndamento.delete(cep))
      );
    }
    return emAndamento.get(cep);
  },

  limparCache() {
    emCache.clear();
    iniciosRecentes.length = 0;
  }
};
