import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REDES } from '../src/models/RedeModel.js';

// A landing, as perguntas frequentes, a página Onde funciona e o llms.txt citam as redes com preço
// online. Se uma rede entrar ou sair do RedeModel, esses textos precisam mudar junto.
const raiz = new URL('../../Frontend/', import.meta.url);

/** Os nomes de uma lista `export const <nome> = [...]` de Frontend/src/lib/site.js. */
async function listaDoSite(nome) {
  const site = await readFile(new URL('src/lib/site.js', raiz), 'utf8');
  const inicio = site.indexOf(`export const ${nome} = [`);
  assert.ok(inicio >= 0, `${nome} falta em src/lib/site.js`);
  const bloco = site.slice(inicio);
  return [...bloco.slice(0, bloco.indexOf('];')).matchAll(/'([^']+)'|"([^"]+)"/g)].map(
    ([, a, b]) => a || b
  );
}

test('lista de redes do site é a mesma do RedeModel', async () => {
  assert.deepEqual(await listaDoSite('REDES_COM_PRECO'), REDES.map(rede => rede.nome));
});

test('lista de atacados do site é a das redes de tipo atacado do RedeModel', async () => {
  // A página Onde funciona separa supermercados e atacados com REDES_DE_ATACADO.
  assert.deepEqual(
    await listaDoSite('REDES_DE_ATACADO'),
    REDES.filter(rede => rede.tipo === 'atacado').map(rede => rede.nome)
  );
});

test('llms.txt cita todas as redes do RedeModel', async () => {
  const llms = await readFile(new URL('public/llms.txt', raiz), 'utf8');
  for (const rede of REDES) assert.ok(llms.includes(rede.nome), `${rede.nome} falta no llms.txt`);
});
