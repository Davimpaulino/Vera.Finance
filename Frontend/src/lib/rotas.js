// Rotas que dependem de saber quem está logado: Entrar, o cadastro (com as perguntas) e o app.
// Só nelas o AuthContext liga o login e o navegador baixa o Firebase. As páginas do site (home,
// preços, perguntas, termos, privacidade e as que vierem) abrem sem esse peso.
const COM_LOGIN = /^\/(entrar|cadastro|app)(\/|$)/;

export const precisaDeLogin = caminho => COM_LOGIN.test(caminho);
