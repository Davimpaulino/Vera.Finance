import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('./apoio/ambiente.js');
process.env.NODE_ENV = 'test';
const { banco } = await import('../src/config/banco.js');
const { UsuarioModel } = await import('../src/models/UsuarioModel.js');
const { ExclusaoModel } = await import('../src/models/ExclusaoModel.js');
const { planejar, decidirLogin, conciliar, tirarRetrato } = await import(
  '../scripts/conferir-restauracao.mjs'
);

const chaveDoEmail = email => Buffer.from(email).toString('base64url');
const calado = () => {};

test('restauração: o plano compara o banco restaurado com o retrato do atual', () => {
  const restaurado = {
    usuarios: ['ana', 'bia', 'caio', 'duda'],
    exclusoes: [
      { uid: 'ana', quando: '2026-12-01T00:00:00.000Z' },
      { uid: 'caio', quando: '2026-12-10T00:00:00.000Z' },
      { uid: 'duda', quando: '2026-12-20T00:00:00.000Z' }
    ]
  };
  const atual = {
    usuarios: ['bia', 'caio', 'duda', 'eva', 'fabi'],
    exclusoes: [
      { uid: 'bia', quando: '2026-12-15T00:00:00.000Z' },
      { uid: 'duda', quando: '2026-12-20T00:00:00.000Z' },
      { uid: 'eva', quando: '2026-12-18T00:00:00.000Z' },
      // Pedido sem conta (sobra de uma exclusão que falhou no meio): não vira pedido novo.
      { uid: 'gil', quando: '2026-12-05T00:00:00.000Z' }
    ]
  };
  const plano = planejar(atual, restaurado);
  assert.deepEqual(plano.apagarDeNovo, ['ana'], 'ana foi apagada depois do backup');
  assert.deepEqual(plano.recriarPedidos, [{ uid: 'bia', quando: '2026-12-15T00:00:00.000Z' }]);
  assert.deepEqual(plano.cancelarPedidos, ['caio'], 'caio desistiu depois do backup');
  assert.deepEqual(plano.criadasDepois, ['eva', 'fabi']);
  assert.deepEqual(plano.pedidosSemConta, [{ uid: 'eva', quando: '2026-12-18T00:00:00.000Z' }]);
});

test('restauração: o login só sai quando é o da própria conta', async () => {
  const logins = { 'ana@x.com': { uid: 'ana' }, 'nova@x.com': { uid: 'outro', metadata: { creationTime: 'ontem' } } };
  const autenticacao = {
    async getUserByEmail(email) {
      if (email === 'quebra@x.com') throw Object.assign(new Error('sem rede'), { code: 'app/network-error' });
      if (!logins[email]) throw Object.assign(new Error('não achou'), { code: 'auth/user-not-found' });
      return logins[email];
    }
  };
  assert.equal((await decidirLogin(autenticacao, 'ana', 'ana@x.com')).apagarLogin, true);
  const outro = await decidirLogin(autenticacao, 'nova', 'nova@x.com');
  assert.equal(outro.apagarLogin, false, 'e-mail com login de outro uid: pode ser conta nova');
  assert.equal(outro.conferir, true);
  assert.equal((await decidirLogin(autenticacao, 'x', 'ninguem@x.com')).apagarLogin, false);
  assert.equal((await decidirLogin(null, 'ana', 'ana@x.com')).apagarLogin, false);
  await assert.rejects(decidirLogin(autenticacao, 'q', 'quebra@x.com'), /sem rede/, 'erro de rede para tudo');
});

test('restauração: simula sem gravar e, com --executar, apaga de novo, recria e tira pedidos', async () => {
  // Banco restaurado: o estado do dia do backup.
  for (const [uid, email] of [
    ['r-ana', 'r-ana@x.com'],
    ['r-bia', 'r-bia@x.com'],
    ['r-caio', 'r-caio@x.com'],
    ['r-duda', 'r-duda@x.com']
  ]) {
    await UsuarioModel.criarSeNaoExistir(uid, { nome: uid, email });
    await banco.gravar(`contas/${chaveDoEmail(email)}`, { uid, email });
  }
  await banco.gravar('usuarios/r-ana/lancamentos/l1', { valor: 10 });
  await banco.gravar('familias/r-f1', { donoId: 'r-ana', membros: [{ uid: 'r-ana' }, { uid: 'r-duda' }] });
  await UsuarioModel.atualizar('r-ana', { familiaId: 'r-f1' });
  await UsuarioModel.atualizar('r-duda', { familiaId: 'r-f1' });
  await ExclusaoModel.agendar('r-caio', '2026-12-10T00:00:00.000Z');

  // Retrato do banco atual: ana apagou a conta, bia pediu a exclusão, caio desistiu.
  const restaurado = await tirarRetrato();
  const atual = {
    tiradoEm: '2026-11-26T12:00:00.000Z',
    usuarios: [...restaurado.usuarios.filter(uid => uid !== 'r-ana'), 'r-eva'],
    exclusoes: [
      ...restaurado.exclusoes.filter(pedido => !pedido.uid.startsWith('r-')),
      { uid: 'r-bia', quando: '2026-12-15T00:00:00.000Z' }
    ]
  };

  // Login de ana com outro uid no Firebase: só os dados saem, e fica para conferir.
  const autenticacao = {
    getUserByEmail: async () => ({ uid: 'r-ana-nova', metadata: { creationTime: 'hoje' } })
  };
  const simulado = await conciliar(atual, { autenticacao, registrar: calado });
  assert.deepEqual(simulado.apagarDeNovo, ['r-ana']);
  assert.ok(await UsuarioModel.buscar('r-ana'), 'a simulação não apaga');
  assert.equal(await banco.ler('exclusoes/r-bia'), null, 'a simulação não grava');

  const feito = await conciliar(atual, { executar: true, autenticacao, registrar: calado });
  assert.deepEqual(feito.paraConferir, ['r-ana']);
  assert.equal(await banco.ler('usuarios/r-ana'), null);
  assert.equal(await banco.ler(`contas/${chaveDoEmail('r-ana@x.com')}`), null);
  assert.equal(await banco.ler('familias/r-f1'), null);
  assert.equal((await UsuarioModel.buscar('r-duda')).familiaId, null, 'o membro fica com a própria conta');
  assert.deepEqual(await banco.ler('exclusoes/r-bia'), { quando: '2026-12-15T00:00:00.000Z' });
  assert.equal((await UsuarioModel.buscar('r-bia')).exclusaoAgendadaPara, '2026-12-15T00:00:00.000Z');
  assert.equal(await banco.ler('exclusoes/r-caio'), null, 'caio desistiu: o pedido antigo sai');
  // Gravar null apaga o campo, como no Firebase.
  assert.equal((await UsuarioModel.buscar('r-caio')).exclusaoAgendadaPara ?? null, null);
  assert.deepEqual(feito.criadasDepois, ['r-eva']);

  // Rodar de novo não muda mais nada.
  const denovo = await conciliar(atual, { executar: true, autenticacao, registrar: calado });
  assert.equal(denovo.apagarDeNovo.length + denovo.recriarPedidos.length + denovo.cancelarPedidos.length, 0);
});

test('restauração: retrato do atual vazio ou de outro formato é recusado', async () => {
  await assert.rejects(conciliar({ usuarios: [], exclusoes: [] }, { registrar: calado }), /nenhuma conta/);
  await assert.rejects(conciliar({ contas: 3 }, { registrar: calado }), /não é um retrato/);
});
