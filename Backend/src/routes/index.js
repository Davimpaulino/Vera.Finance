import { Router } from '../utils/router.js';
import { exigirLogin } from '../middlewares/auth.js';
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

// Públicas
r.get('/api/saude', publicoController.saude);
r.get('/api/planos', publicoController.planos);
r.post('/api/leads', publicoController.lead);
r.get('/api/auth/configuracao', authController.configuracao);
r.post('/api/auth/cadastrar', authController.cadastrar);
r.post('/api/auth/entrar', authController.entrar);
r.post('/api/auth/email-em-uso', authController.emailEmUso);
r.get('/api/mercados', mercadoController.list);
r.get('/api/onboarding/raio', onboardingController.raio);

// Sessão e perfil
r.post('/api/auth/sessao', auth, authController.sessao);
r.get('/api/me', auth, userController.me);
r.patch('/api/me', auth, userController.update);
r.patch('/api/me/plano', auth, userController.trocarPlano);
r.post('/api/me/cancelar-assinatura', auth, userController.cancelarAssinatura);
r.delete('/api/me', auth, userController.agendarExclusao);
r.post('/api/me/senha', auth, authController.trocarSenha);

// Cadastro guiado
r.post('/api/onboarding/sugestao', auth, onboardingController.sugestao);
r.post('/api/onboarding', auth, onboardingController.concluir);

// App
r.get('/api/dashboard', auth, dashboardController.get);

r.get('/api/lancamentos', auth, lancamentoController.list);
r.get('/api/lancamentos/export', auth, lancamentoController.exportar);
r.post('/api/lancamentos', auth, lancamentoController.create);
r.delete('/api/lancamentos/:id', auth, lancamentoController.remove);

r.get('/api/categorias', auth, categoriaController.list);
r.post('/api/categorias', auth, categoriaController.create);
r.patch('/api/categorias/:id', auth, categoriaController.update);
r.delete('/api/categorias/:id', auth, categoriaController.remove);

r.get('/api/metas', auth, metaController.list);
r.post('/api/metas', auth, metaController.create);
r.patch('/api/metas/:id', auth, metaController.update);
r.delete('/api/metas/:id', auth, metaController.remove);
r.post('/api/metas/:id/aportes', auth, metaController.aporte);
r.get('/api/metas/:id/simular', auth, metaController.simular);

r.get('/api/relatorios', auth, relatorioController.get);

r.get('/api/mercados/produtos', auth, mercadoController.produtos);
r.get('/api/mercados/comparar', auth, mercadoController.comparar);

r.get('/api/lista', auth, listaController.get);
r.get('/api/lista/opcoes', auth, listaController.opcoes);
r.post('/api/lista', auth, listaController.add);
r.delete('/api/lista/comprados', auth, listaController.limparComprados);
r.post('/api/lista/finalizar', auth, listaController.finalizar);
r.patch('/api/lista/:id', auth, listaController.update);
r.delete('/api/lista/:id', auth, listaController.remove);

r.get('/api/notas', auth, notaController.pendentes);
r.post('/api/notas/ler', auth, notaController.ler);
r.post('/api/notas/:id/confirmar', auth, notaController.confirmar);
r.delete('/api/notas/:id', auth, notaController.descartar);

r.get('/api/notificacoes', auth, notificacaoController.listar);
r.post('/api/notificacoes/vistas', auth, notificacaoController.marcarVistas);

r.get('/api/familia', auth, familiaController.get);
r.post('/api/familia', auth, familiaController.criar);
r.post('/api/familia/convites', auth, familiaController.convidar);
r.get('/api/familia/convites', auth, familiaController.meusConvites);
r.post('/api/familia/:id/aceitar', auth, familiaController.aceitar);

export default r;
