import { guardarComTeto } from '../utils/cache.js';

// Localização: distância entre dois pontos e endereço → coordenadas.
// Endereços viram coordenadas pelo Nominatim (OpenStreetMap) e CEPs pelo ViaCEP, ambos gratuitos.
const RAIO_DA_TERRA_KM = 6371;
const IDENTIFICACAO = 'vera.finance/1.0 (https://github.com/veragroupia/vera-finances)';

const cepsAchados = new Map();
const TETO_DO_CACHE = 5000;
// CEP → cidade e coordenadas. O cadastro guiado pergunta o mesmo CEP a cada mudança do raio, e o
// Nominatim pede no máximo uma consulta por segundo: a resposta fica guardada por um dia.
const enderecosDosCeps = new Map();
const VALIDADE_DO_CEP_MS = 24 * 60 * 60 * 1000;

const radianos = graus => (graus * Math.PI) / 180;

const temCoordenadas = ponto =>
  !!ponto && Number.isFinite(Number(ponto.lat)) && Number.isFinite(Number(ponto.lng));

// A vera não precisa da casa exata de ninguém: 3 casas decimais (~100 m) bastam para achar os
// mercados do raio. Arredondar antes de guardar ou de mandar para fora (Nominatim) é minimização
// de dados (LGPD, art. 6º, III).
const CASAS = 3;
const arredondar = valor => Number(Number(valor).toFixed(CASAS));

// A política de uso do Nominatim público pede no máximo 1 pedido por segundo para a aplicação
// inteira (app logado e verificador público de CEP juntos). Os pedidos saem em fila, com 1,1 s
// entre um e outro. Quando a fila já passa de 10 s de espera, o pedido desiste na hora (fica
// como "o mapa não achou"), em vez de empilhar sem fim.
const INTERVALO_DO_NOMINATIM_MS = 1100;
const ESPERA_MAXIMA_DO_NOMINATIM_MS = 10 * 1000;
let proximaVezNoNominatim = 0;
const esperar = ms => new Promise(resolver => setTimeout(resolver, ms));

async function buscarNoNominatim(endereco) {
  const agora = Date.now();
  const vez = Math.max(agora, proximaVezNoNominatim);
  if (vez - agora > ESPERA_MAXIMA_DO_NOMINATIM_MS) return null;
  proximaVezNoNominatim = vez + INTERVALO_DO_NOMINATIM_MS;
  if (vez > agora) await esperar(vez - agora);
  return buscarJson(endereco);
}

async function buscarJson(endereco) {
  try {
    const resposta = await fetch(endereco, {
      headers: { 'User-Agent': IDENTIFICACAO, 'Accept-Language': 'pt-BR' },
      signal: AbortSignal.timeout(6000)
    });
    return resposta.ok ? await resposta.json() : null;
  } catch {
    return null;
  }
}

export const GeoModel = {
  /** Esquece os CEPs e endereços guardados em memória (usado pelos testes). */
  limparCache() {
    cepsAchados.clear();
    enderecosDosCeps.clear();
  },

  temCoordenadas,

  /** Ponto arredondado a ~100 m, para guardar no perfil. */
  aproximar: ponto => ({ lat: arredondar(ponto.lat), lng: arredondar(ponto.lng) }),

  distanciaKm(a, b) {
    if (!temCoordenadas(a) || !temCoordenadas(b)) return null;
    const dLat = radianos(b.lat - a.lat);
    const dLng = radianos(b.lng - a.lng);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radianos(a.lat)) * Math.cos(radianos(b.lat)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * RAIO_DA_TERRA_KM * Math.asin(Math.sqrt(h)) * 10) / 10;
  },

  async geocodificar(endereco) {
    const texto = String(endereco || '').trim();
    if (!texto) return null;
    const resultado = await buscarNoNominatim(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(texto)}`
    );
    if (!resultado || !resultado[0]) return null;
    return { lat: Number(resultado[0].lat), lng: Number(resultado[0].lon) };
  },

  /** CEP do endereço mais próximo das coordenadas (Nominatim reverso). */
  async cepDe(ponto) {
    if (!temCoordenadas(ponto)) return '';
    const [lat, lng] = [arredondar(ponto.lat), arredondar(ponto.lng)];
    const chave = `${lat},${lng}`;
    if (cepsAchados.has(chave)) return cepsAchados.get(chave);
    const dados = await buscarNoNominatim(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`
    );
    const cep = String(dados?.address?.postcode || '').replace(/\D/g, '');
    const valido = cep.length === 8 ? cep : '';
    // Só guarda a resposta de verdade: com o Nominatim fora do ar (ou a fila cheia), tenta de novo
    // na próxima vez em vez de ficar sem CEP para essas coordenadas até reiniciar.
    if (dados) guardarComTeto(cepsAchados, chave, valido, TETO_DO_CACHE);
    return valido;
  },

  /**
   * CEP para consultar os sites das redes. CEP genérico de cidade (terminado em 000) não indica
   * loja, então vale mais o CEP da rua tirado das coordenadas.
   */
  async cepParaPrecos(local) {
    const cep = String(local?.cep || '').replace(/\D/g, '');
    if (cep.length === 8 && !cep.endsWith('000')) return cep;
    const daRua = await this.cepDe(local);
    return daRua || (cep.length === 8 ? cep : '');
  },

  /** { cidade, lat, lng } do CEP (sem lat/lng quando o mapa não achou o endereço), ou null. */
  async porCep(cep) {
    const achado = await this.consultarCep(cep);
    return achado.erro ? null : achado;
  },

  /**
   * Como porCep, mas diz por que não achou: { erro: 'invalido' } (não tem 8 números),
   * 'naoExiste' (o ViaCEP não conhece o CEP) ou 'falhou' (o ViaCEP não respondeu).
   */
  async consultarCep(cep) {
    const digitos = String(cep || '').replace(/\D/g, '');
    if (digitos.length !== 8) return { erro: 'invalido' };
    const guardado = enderecosDosCeps.get(digitos);
    if (guardado && Date.now() - guardado.em < VALIDADE_DO_CEP_MS) return guardado.resultado;
    const guardar = resultado =>
      guardarComTeto(enderecosDosCeps, digitos, { em: Date.now(), resultado }, TETO_DO_CACHE);

    const dados = await buscarJson(`https://viacep.com.br/ws/${digitos}/json/`);
    // Sem resposta (fora do ar) não fica guardado: a próxima pergunta tenta de novo.
    if (!dados) return { erro: 'falhou' };
    if (dados.erro) {
      const naoExiste = { erro: 'naoExiste' };
      guardar(naoExiste);
      return naoExiste;
    }
    const cidade = `${dados.localidade} - ${dados.uf}`;
    const coordenadas =
      (await this.geocodificar(
        [dados.logradouro, dados.bairro, dados.localidade, dados.uf].filter(Boolean).join(', ')
      )) || (await this.geocodificar(`${dados.localidade}, ${dados.uf}`));
    const resultado = { cidade, ...(coordenadas || {}) };
    if (coordenadas) guardar(resultado);
    return resultado;
  }
};
