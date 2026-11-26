import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';

process.env.BANCO = 'memoria';
const { CredencialModel } = await import('../src/models/CredencialModel.js');
const { montarRegistro, OPCOES_DO_HASH } = await import('../scripts/importar-usuarios-firebase.mjs');

test('importação: o registro reproduz o hash da senha com os parâmetros declarados', async () => {
  const credencial = await CredencialModel.cadastrar({
    email: 'Importa@Email.com',
    senha: 'senha-de-teste-1',
    nome: 'Rita'
  });
  const { registro } = montarRegistro(credencial);
  assert.equal(registro.uid, credencial.uid);
  assert.equal(registro.email, 'importa@email.com');
  assert.equal(registro.displayName, 'Rita');
  const { memoryCost, blockSize, parallelization, derivedKeyLength } = OPCOES_DO_HASH.hash;
  const recalculado = scryptSync('senha-de-teste-1', registro.passwordSalt, derivedKeyLength, {
    N: memoryCost,
    r: blockSize,
    p: parallelization
  });
  assert.deepEqual(recalculado, registro.passwordHash);
});

test('importação: credencial incompleta é pulada com o motivo', () => {
  assert.equal(montarRegistro({ uid: 'x', email: 'a@b.com', sal: 'ab' }).motivo, 'hash fora do formato');
  assert.equal(montarRegistro({ email: 'a@b.com' }).motivo, 'uid ausente ou inválido');
});
