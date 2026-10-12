// Localização: distância entre dois pontos e endereço → coordenadas.
// Endereços viram coordenadas pelo Nominatim (OpenStreetMap) e CEPs pelo ViaCEP, ambos gratuitos.
const RAIO_DA_TERRA_KM = 6371;
const IDENTIFICACAO = 'vera.finance/1.0 (https://github.com/veragroupia/vera-finances)';

const cepsAchados = new Map();

const radianos = graus => (graus * Math.PI) / 180;

const temCoordenadas = ponto =>
  !!ponto && Number.isFinite(Number(ponto.lat)) && Number.isFinite(Number(ponto.lng));

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
  temCoordenadas,

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
    const resultado = await buscarJson(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(texto)}`
    );
    if (!resultado || !resultado[0]) return null;
    return { lat: Number(resultado[0].lat), lng: Number(resultado[0].lon) };
  },

  /** CEP do endereço mais próximo das coordenadas (Nominatim reverso). */
  async cepDe(ponto) {
    if (!temCoordenadas(ponto)) return '';
    const chave = `${Number(ponto.lat).toFixed(3)},${Number(ponto.lng).toFixed(3)}`;
    if (cepsAchados.has(chave)) return cepsAchados.get(chave);
    const dados = await buscarJson(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${ponto.lat}&lon=${ponto.lng}`
    );
    const cep = String(dados?.address?.postcode || '').replace(/\D/g, '');
    const valido = cep.length === 8 ? cep : '';
    cepsAchados.set(chave, valido);
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

  async porCep(cep) {
    const digitos = String(cep || '').replace(/\D/g, '');
    if (digitos.length !== 8) return null;
    const dados = await buscarJson(`https://viacep.com.br/ws/${digitos}/json/`);
    if (!dados || dados.erro) return null;
    const cidade = `${dados.localidade} - ${dados.uf}`;
    const coordenadas =
      (await this.geocodificar(
        [dados.logradouro, dados.bairro, dados.localidade, dados.uf].filter(Boolean).join(', ')
      )) || (await this.geocodificar(`${dados.localidade}, ${dados.uf}`));
    return { cidade, ...(coordenadas || {}) };
  }
};
