import { createServer } from 'node:http';
import { configuracao } from './config/env.js';
import { modoBanco } from './config/banco.js';
import { handle } from './app.js';

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
