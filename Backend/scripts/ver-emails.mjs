// Grava cada modelo de e-mail, preenchido com os dados de exemplo, para conferir no navegador.
// Não envia nada: o envio ainda não existe.
//
// Uso (na pasta Backend):
//   npm run emails:ver                 grava em <pasta temporária>/vera-emails
//   npm run emails:ver -- ./saida      grava na pasta informada
// Abra o index.html que ele mostra no fim.
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { escaparHtml, nomesDosModelos, renderizarEmail } from '../src/emails/index.js';
import { EXEMPLOS } from '../src/emails/exemplos.js';

const pasta = resolve(process.argv[2] || join(tmpdir(), 'vera-emails'));
mkdirSync(pasta, { recursive: true });

const linhas = nomesDosModelos().map(nome => {
  const { assunto, html, texto } = renderizarEmail(nome, EXEMPLOS[nome]);
  writeFileSync(join(pasta, `${nome}.html`), html);
  writeFileSync(join(pasta, `${nome}.txt`), `Assunto: ${assunto}\n\n${texto}`);
  return `<li><a href="${nome}.html">${escaparHtml(nome)}</a> · <a href="${nome}.txt">texto</a> · ${escaparHtml(assunto)}</li>`;
});
writeFileSync(
  join(pasta, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>E-mails da vera</title><h1>E-mails da vera (dados de exemplo)</h1><ul>${linhas.join('')}</ul>`
);
console.log(`${linhas.length} modelos gravados. Abra ${join(pasta, 'index.html')}`);
