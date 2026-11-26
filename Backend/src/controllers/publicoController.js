import { PlanoModel } from '../models/PlanoModel.js';
import { InteressadoModel } from '../models/InteressadoModel.js';
import { CoberturaModel } from '../models/CoberturaModel.js';
import { HttpError } from '../utils/http.js';

export const publicoController = {
  planos: async () => PlanoModel.listar(),

  /** Verificador de CEP do site: quais redes com preço online atendem a região. */
  async redes({ query, res }) {
    const cep = String(query.get('cep') || '').replace(/\D/g, '');
    if (cep.length !== 8) throw new HttpError(400, 'Digite um CEP com 8 números.');
    const resultado = await CoberturaModel.doCep(cep);
    if (resultado.naoExiste) throw new HttpError(404, 'Não achamos esse CEP. Confira os números.');
    if (resultado.ocupado) {
      // Teto de CEPs novos do serviço inteiro (veja CoberturaModel): não é culpa de quem pediu.
      res.setHeader('Retry-After', String(resultado.tenteEmSegundos));
      throw new HttpError(429, 'Muita gente consultando agora. Tente de novo em um minuto.');
    }
    // A resposta é igual para todo mundo e não tem dado pessoal: navegador e proxy podem guardar
    // por 1 hora. Com o mapa fora do ar, não guarda, para a próxima tentativa já pegar o mapa de volta.
    const cabecalhos =
      resultado.situacao === 'ok' ? { 'Cache-Control': 'public, max-age=3600', Vary: 'Origin' } : {};
    return {
      raw: JSON.stringify(resultado),
      contentType: 'application/json; charset=utf-8',
      headers: cabecalhos
    };
  },

  async lead({ body }) {
    const email = String(body.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new HttpError(400, 'Digite um e-mail válido.');
    await InteressadoModel.adicionar(email);
    return { status: 201, body: { ok: true } };
  },

  saude: async () => ({ ok: true })
};
