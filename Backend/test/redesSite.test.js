import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REDES } from '../src/models/RedeModel.js';

// A landing, as perguntas frequentes e o llms.txt citam as redes com preço online.
// Se uma rede entrar ou sair do RedeModel, esses textos precisam mudar junto.
const raiz = new URL('../../Frontend/', import.meta.url);

test('lista de redes do site é a mesma do RedeModel', async () => {
  const site = await readFile(new URL('src/lib/site.js', raiz), 'utf8');
  const bloco = site.slice(site.indexOf('REDES_COM_PRECO'));
  const nomes = [...bloco.slice(0, bloco.indexOf('];')).matchAll(/'([^']+)'|"([^"]+)"/g)].map(
    ([, a, b]) => a || b
  );
  assert.deepEqual(nomes, REDES.map(rede => rede.nome));
});

test('llms.txt cita todas as redes do RedeModel', async () => {
  const llms = await readFile(new URL('public/llms.txt', raiz), 'utf8');
  for (const rede of REDES) assert.ok(llms.includes(rede.nome), `${rede.nome} falta no llms.txt`);
});
