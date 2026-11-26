import { UsuarioModel } from '../models/UsuarioModel.js';
import { aceitouTermos } from '../config/termos.js';
import { HttpError } from '../utils/http.js';

// O app só abre com o aceite da versão em vigor dos termos (e da idade mínima). Sem isto,
// a caixa da tela seria fácil de pular: bastaria entrar pelo Google na tela Entrar ou chamar a API.
// Rode depois do exigirLogin. Perfil que ainda não existe segue, e o controller responde 404.
export async function exigirAceiteDosTermos(ctx) {
  const perfil = await UsuarioModel.buscar(ctx.user.uid);
  if (perfil && !aceitouTermos(perfil))
    throw new HttpError(
      403,
      'Para continuar, aceite os Termos de uso e a Política de privacidade.',
      { motivo: 'termos' }
    );
}
