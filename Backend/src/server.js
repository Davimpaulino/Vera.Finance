import { createServer } from 'node:http';
import { configuracao } from './config/env.js';
import { modoBanco } from './config/banco.js';
import { handle } from './app.js';
import { ExclusaoModel } from './models/ExclusaoModel.js';

const descricaoDoBanco = {
  memoria: 'banco em memória (apaga ao reiniciar)',
  rest: `Firebase Realtime Database em ${configuracao.banco.url}`,
  admin: `Firebase Realtime Database em ${configuracao.banco.url} (Admin SDK)`
};

createServer(handle).listen(configuracao.porta, () => {
  console.log(
    `vera.finance API em http://localhost:${configuracao.porta} · ${descricaoDoBanco[modoBanco]}`
  );
});

// Uma vez por dia (e logo depois de subir), apaga as contas cuja exclusão venceu.
const executarExclusoes = () =>
  ExclusaoModel.executarVencidas()
    .then(total => total && console.log(`[exclusão] ${total} conta(s) apagada(s).`))
    .catch(erro => console.error('[exclusão]', erro.message));
setTimeout(executarExclusoes, 60 * 1000).unref();
setInterval(executarExclusoes, 24 * 60 * 60 * 1000).unref();
