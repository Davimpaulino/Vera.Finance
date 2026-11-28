// O SDK do Firebase (que só baixa nas telas de login) continua entrando com e-mail e senha, e o
// botão do Google chama o login do Firebase. As respostas do Firebase Auth são simuladas aqui:
// o teste não depende da internet nem de um projeto de verdade.
import { expect, test } from './apoio.js';

const base64url = objeto => Buffer.from(JSON.stringify(objeto)).toString('base64url');

/** idToken no formato do Firebase (o SDK lê as datas do conteúdo; a assinatura quem confere é a API). */
function tokenFalso(email) {
  const agora = Math.floor(Date.now() / 1000);
  const conteudo = {
    iss: 'https://securetoken.google.com/verafinance-d43d6',
    aud: 'verafinance-d43d6',
    auth_time: agora,
    user_id: 'uid-e2e',
    sub: 'uid-e2e',
    iat: agora,
    exp: agora + 3600,
    email,
    email_verified: false,
    firebase: { identities: { email: [email] }, sign_in_provider: 'password' }
  };
  return `${base64url({ alg: 'RS256', kid: 'e2e', typ: 'JWT' })}.${base64url(conteudo)}.assinatura`;
}

test('e-mail e senha pelo Firebase: o token do Firebase vai para a API', async ({ page }) => {
  const email = 'firebase@exemplo.com';
  const idToken = tokenFalso(email);
  await page.route(/identitytoolkit\.googleapis\.com\/v1\/accounts:signInWithPassword/, rota =>
    rota.fulfill({
      json: { kind: 'identitytoolkit#VerifyPasswordResponse', localId: 'uid-e2e', email, displayName: '', idToken, registered: true, refreshToken: 'renovar', expiresIn: '3600' }
    })
  );
  await page.route(/identitytoolkit\.googleapis\.com\/v1\/accounts:lookup/, rota =>
    rota.fulfill({
      json: {
        users: [
          {
            localId: 'uid-e2e',
            email,
            emailVerified: false,
            providerUserInfo: [{ providerId: 'password', federatedId: email, email, rawId: email }],
            lastLoginAt: String(Date.now()),
            createdAt: String(Date.now())
          }
        ]
      }
    })
  );
  // A API de teste não confere token do Firebase (usa o login próprio): aqui só interessa o que chega.
  const autorizacoes = [];
  await page.route(/\/api\/auth\/sessao$/, rota => {
    autorizacoes.push(rota.request().headers().authorization);
    return rota.fulfill({ status: 503, json: { erro: 'API de teste: sessão do Firebase recebida.' } });
  });

  await page.goto('/entrar/');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-de-teste-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText('API de teste: sessão do Firebase recebida.');
  expect(autorizacoes.length).toBeGreaterThan(0);
  expect(autorizacoes.every(valor => valor === `Bearer ${idToken}`)).toBe(true);
  // "Manter conectado" marcado: o Firebase guarda a sessão no localStorage.
  const guardou = await page.evaluate(() => Object.keys(localStorage).some(chave => chave.startsWith('firebase:authUser:')));
  expect(guardou).toBe(true);
});

test('o botão do Google chama o login do Firebase (sem internet, avisa)', async ({ page }) => {
  await page.goto('/entrar/');
  await page.getByRole('button', { name: 'Continuar com Google' }).click();
  // Sem rede para o Google, o SDK falha antes de abrir a janela e a tela explica o que houve,
  // em vez de mostrar o código do Firebase.
  await expect(page.getByRole('alert')).toHaveText(/^Não deu para abrir o login agora\./);
});
