import { Router } from '../utils/router.js';
import { exigirLogin } from '../middlewares/auth.js';
import { exigirAceiteDosTermos } from '../middlewares/termos.js';
import { limitar } from '../middlewares/limite.js';
import { authController } from '../controllers/authController.js';
import { userController } from '../controllers/userController.js';
import { onboardingController } from '../controllers/onboardingController.js';
import { dashboardController } from '../controllers/dashboardController.js';
import { lancamentoController } from '../controllers/lancamentoController.js';
import { categoriaController } from '../controllers/categoriaController.js';
import { metaController } from '../controllers/metaController.js';
import { relatorioController } from '../controllers/relatorioController.js';
import { mercadoController } from '../controllers/mercadoController.js';
import { listaController } from '../controllers/listaController.js';
import { notaController } from '../controllers/notaController.js';
import { familiaController } from '../controllers/familiaController.js';
import { publicoController } from '../controllers/publicoController.js';
import { notificacaoController } from '../controllers/notificacaoController.js';

const r = new Router();
const auth = exigirLogin;
// Rotas do app: além do login, pedem o aceite da versão em vigor dos termos.
// Abrir a sessão (onde o aceite é gravado), ler o perfil e os direitos do titular
// (baixar os dados e a planilha, apagar a conta, cancelar a assinatura) seguem só com o login.
const app = async ctx => {
  await exigirLogin(ctx);
  await exigirAceiteDosTermos(ctx);
};
const MINUTO = 60 * 1000;
const limiteDeLogin = limitar('login', 10, 15 * MINUTO);
const limiteDeCadastro = limitar('cadastro', 5, 60 * MINUTO);
const limiteDeConsulta = limitar('email', 20, 15 * MINUTO);
const limiteDeLeads = limitar('leads', 5, 60 * MINUTO);
const limiteDeNotas = limitar('notas', 30, 60 * MINUTO);

// Públicas
r.get('/api/saude', publicoController.saude);
r.get('/api/planos', publicoController.planos);
r.post('/api/leads', limiteDeLeads, publicoController.lead);
r.get('/api/auth/configuracao', authController.configuracao);
r.post('/api/auth/cadastrar', limiteDeCadastro, authController.cadastrar);
r.post('/api/auth/entrar', limiteDeLogin, authController.entrar);
r.post('/api/auth/email-em-uso', limiteDeConsulta, authController.emailEmUso);
r.get('/api/mercados', mercadoController.list);
r.get('/api/onboarding/raio', onboardingController.raio);

// Sessão e perfil
r.post('/api/auth/sessao', auth, authController.sessao);
r.get('/api/me', auth, userController.me);
r.get('/api/me/exportar', auth, userController.exportar);
r.patch('/api/me', app, userController.update);
r.patch('/api/me/plano', app, userController.trocarPlano);
r.post('/api/me/cancelar-assinatura', auth, userController.cancelarAssinatura);
r.delete('/api/me', auth, userController.agendarExclusao);
r.post('/api/me/cancelar-exclusao', auth, userController.cancelarExclusao);
r.post('/api/me/senha', limiteDeLogin, auth, authController.trocarSenha);

// Cadastro guiado
r.post('/api/onboarding/sugestao', app, onboardingController.sugestao);
r.post('/api/onboarding', app, onboardingController.concluir);

// App
r.get('/api/dashboard', app, dashboardController.get);

r.get('/api/lancamentos', app, lancamentoController.list);
// A planilha dos lançamentos também é portabilidade: segue só com o login.
r.get('/api/lancamentos/export', auth, lancamentoController.exportar);
r.post('/api/lancamentos', app, lancamentoController.create);
r.delete('/api/lancamentos/:id', app, lancamentoController.remove);

r.get('/api/categorias', app, categoriaController.list);
r.post('/api/categorias', app, categoriaController.create);
r.patch('/api/categorias/:id', app, categoriaController.update);
r.delete('/api/categorias/:id', app, categoriaController.remove);

r.get('/api/metas', app, metaController.list);
r.post('/api/metas', app, metaController.create);
r.patch('/api/metas/:id', app, metaController.update);
r.delete('/api/metas/:id', app, metaController.remove);
r.post('/api/metas/:id/aportes', app, metaController.aporte);
r.get('/api/metas/:id/simular', app, metaController.simular);

r.get('/api/relatorios', app, relatorioController.get);

r.get('/api/mercados/produtos', app, mercadoController.produtos);
r.get('/api/mercados/comparar', app, mercadoController.comparar);

r.get('/api/lista', app, listaController.get);
r.get('/api/lista/opcoes', app, listaController.opcoes);
r.post('/api/lista', app, listaController.add);
r.delete('/api/lista/comprados', app, listaController.limparComprados);
r.post('/api/lista/finalizar', app, listaController.finalizar);
r.patch('/api/lista/:id', app, listaController.update);
r.delete('/api/lista/:id', app, listaController.remove);

r.get('/api/notas', app, notaController.pendentes);
r.post('/api/notas/ler', limiteDeNotas, app, notaController.ler);
r.post('/api/notas/:id/confirmar', app, notaController.confirmar);
r.delete('/api/notas/:id', app, notaController.descartar);

r.get('/api/notificacoes', app, notificacaoController.listar);
r.post('/api/notificacoes/vistas', app, notificacaoController.marcarVistas);

r.get('/api/familia', app, familiaController.get);
r.post('/api/familia', app, familiaController.criar);
r.post('/api/familia/convites', app, familiaController.convidar);
r.get('/api/familia/convites', app, familiaController.meusConvites);
r.post('/api/familia/:id/aceitar', app, familiaController.aceitar);

export default r;
