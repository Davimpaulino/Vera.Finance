import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limparValor, partesDoCaminho } from '../src/config/caminhos.js';
import { criarBancoMemoria } from '../src/config/bancoMemoria.js';

// Regras comuns a todos os bancos. O PostgreSQL não guarda o caractere nulo nem metade de emoji.

test('limparValor tira o caractere nulo e troca metade de emoji solta, em valores e chaves', () => {
  assert.deepEqual(limparValor({ produto: 'arr\u0000oz', ['obs\u0000']: ['caf\ud83d', 'ok 😀'] }), {
    produto: 'arroz',
    obs: ['caf�', 'ok 😀']
  });
  // Barra invertida digitada não é o caractere nulo.
  assert.deepEqual(limparValor({ texto: 'a\\u0000b' }), { texto: 'a\\u0000b' });
  assert.deepEqual(limparValor({ em: new Date(0), nada: undefined, n: 1 }), {
    em: '1970-01-01T00:00:00.000Z',
    n: 1
  });
  assert.equal(limparValor(undefined), null);
});

test('partesDoCaminho recusa com 400 id com nulo, metade de emoji ou __proto__', () => {
  assert.deepEqual(partesDoCaminho('/usuarios//ana/lista/'), ['usuarios', 'ana', 'lista']);
  for (const caminho of ['usuarios/a\u0000b', 'precos/x\udc00', 'usuarios/ana/perfil/__proto__/x'])
    assert.throws(() => partesDoCaminho(caminho), { status: 400 }, JSON.stringify(caminho));
});

test('mesclar com chave __proto__ é recusado e não muda nenhum outro objeto', async () => {
  const banco = criarBancoMemoria();
  const corpo = JSON.parse('{"local": {"mercados": {"__proto__": {"marcaDoTeste": true}}}}');
  await assert.rejects(banco.mesclar('usuarios/ana/perfil', corpo), { status: 400 });
  assert.equal({}.marcaDoTeste, undefined);
  assert.equal(await banco.ler('usuarios/ana/perfil'), null);
});
