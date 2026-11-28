// Depois de restaurar um backup, leva para o banco restaurado o que as pessoas decidiram depois da
// data do backup. Sem isso, a restauração desfaz pedidos feitos pela LGPD:
// - quem apagou a conta depois do backup volta a existir e precisa ser apagado de novo;
// - quem pediu a exclusão depois do backup perde o pedido, e a conta nunca é apagada;
// - quem desistiu da exclusão depois do backup recebe o pedido antigo de volta, e a rotina diária
//   da API apagaria a conta contra a vontade da pessoa.
//
// Uso (na pasta Backend), em dois passos, antes de ligar a API no banco restaurado:
//   1. Com o .env apontando para o banco ATUAL:
//        node --env-file=.env scripts/conferir-restauracao.mjs retrato ~/vera-retrato-atual.json
//   2. Com o .env apontando para o banco RESTAURADO:
//        node --env-file=.env scripts/conferir-restauracao.mjs conferir ~/vera-retrato-atual.json
//          simulação (padrão): só mostra o que faria
//        node --env-file=.env scripts/conferir-restauracao.mjs conferir ~/vera-retrato-atual.json --executar
//
// O retrato guarda só os uids das contas e os pedidos de exclusão (uid e data), sem e-mail nem nome.
import { readFileSync, writeFileSync } from 'node:fs';
import { rodouDireto } from '../src/utils/execucao.js';
import { banco, autenticacaoFirebase, modoBanco } from '../src/config/banco.js';
import { configuracao } from '../src/config/env.js';
import { ExclusaoModel } from '../src/models/ExclusaoModel.js';
import { UsuarioModel } from '../src/models/UsuarioModel.js';

const USO = `Uso:
  node --env-file=.env scripts/conferir-restauracao.mjs retrato <arquivo.json>
  node --env-file=.env scripts/conferir-restauracao.mjs conferir <arquivo.json> [--executar]`;

// Qual banco o .env escolheu, para não rodar um passo no banco errado. Do PostgreSQL mostra só
// o servidor e o nome do banco: a senha da DATABASE_URL nunca aparece.
function descreverBanco() {
  if (modoBanco === 'postgres') {
    const { host, pathname } = new URL(configuracao.postgres.url);
    return `PostgreSQL ${host}${pathname}`;
  }
  return `Firebase Realtime Database ${configuracao.banco.url}`;
}

/** Contas e pedidos de exclusão do banco configurado. */
export async function tirarRetrato() {
  const usuarios = (await banco.listar('usuarios')).map(usuario => usuario.id);
  const exclusoes = (await banco.listar('exclusoes'))
    .filter(pedido => pedido.quando)
    .map(pedido => ({ uid: pedido.id, quando: pedido.quando }));
  return { tiradoEm: new Date().toISOString(), usuarios, exclusoes };
}

/** O que muda no banco restaurado para ele respeitar o que aconteceu depois do backup. */
export function planejar(atual, restaurado) {
  const existemHoje = new Set(atual.usuarios);
  const noBackup = new Set(restaurado.usuarios);
  const pedidosHoje = new Map(atual.exclusoes.map(pedido => [pedido.uid, pedido.quando]));
  const pedidosNoBackup = new Map(restaurado.exclusoes.map(pedido => [pedido.uid, pedido.quando]));
  const pedidosDeContasVivas = atual.exclusoes.filter(pedido => existemHoje.has(pedido.uid));
  return {
    // Estão no backup e não existem mais: foram apagadas depois dele.
    apagarDeNovo: restaurado.usuarios.filter(uid => !existemHoje.has(uid)),
    // Pedidos feitos (ou refeitos, com outra data) depois do backup.
    recriarPedidos: pedidosDeContasVivas.filter(
      pedido => noBackup.has(pedido.uid) && pedidosNoBackup.get(pedido.uid) !== pedido.quando
    ),
    // O backup tem o pedido, mas hoje a conta existe sem ele: a pessoa desistiu.
    cancelarPedidos: [...pedidosNoBackup.keys()].filter(
      uid => existemHoje.has(uid) && !pedidosHoje.has(uid)
    ),
    // Criadas depois do backup: os dados delas não estão no banco restaurado.
    criadasDepois: atual.usuarios.filter(uid => !noBackup.has(uid)),
    // Dessas, as que pediram exclusão. Não há dados para apagar, mas o login continua.
    pedidosSemConta: pedidosDeContasVivas.filter(pedido => !noBackup.has(pedido.uid))
  };
}

/**
 * Decide se o login do Firebase com o e-mail de uma conta apagada também sai. A exclusão já tinha
 * apagado esse login: se hoje existe um com outro uid, ele pode ser de uma conta nova com o mesmo
 * e-mail, e fica para conferir à mão.
 */
export async function decidirLogin(autenticacao, uid, email) {
  if (!autenticacao) return { apagarLogin: false, motivo: 'sem a conta de serviço, o login não é conferido' };
  if (!email) return { apagarLogin: false, motivo: 'o perfil não tem e-mail' };
  let login = null;
  try {
    login = await autenticacao.getUserByEmail(email);
  } catch (erro) {
    if (erro?.code !== 'auth/user-not-found') throw erro;
  }
  if (!login) return { apagarLogin: false, motivo: 'não há login com esse e-mail' };
  if (login.uid === uid) return { apagarLogin: true, motivo: 'o login é o da própria conta' };
  return {
    apagarLogin: false,
    conferir: true,
    motivo:
      `o login com esse e-mail tem outro uid (${login.uid}, criado em ` +
      `${login.metadata?.creationTime || 'data desconhecida'}); pode ser uma conta nova`
  };
}

/** Compara o banco configurado (o restaurado) com o retrato do atual. Sem executar, só mostra. */
export async function conciliar(
  atual,
  { executar = false, autenticacao = autenticacaoFirebase, registrar = console.log } = {}
) {
  if (!Array.isArray(atual?.usuarios) || !Array.isArray(atual?.exclusoes))
    throw new Error('O arquivo não é um retrato deste script.');
  // Um retrato vazio mandaria apagar todas as contas do backup.
  if (!atual.usuarios.length) throw new Error('O retrato do banco atual não tem nenhuma conta.');

  const restaurado = await tirarRetrato();
  const plano = planejar(atual, restaurado);
  const paraConferir = [];
  registrar(`Retrato do banco atual tirado em ${atual.tiradoEm || 'data desconhecida'}.`);
  registrar(`Contas: ${atual.usuarios.length} hoje, ${restaurado.usuarios.length} no banco restaurado.`);

  registrar(`\nApagar de novo (apagadas depois do backup): ${plano.apagarDeNovo.length}`);
  for (const uid of plano.apagarDeNovo) {
    const perfil = await UsuarioModel.buscar(uid);
    const login = await decidirLogin(autenticacao, uid, perfil?.email);
    if (login.conferir) paraConferir.push(uid);
    registrar(`  - ${uid}: ${login.apagarLogin ? 'dados e login' : 'só os dados'} (${login.motivo})`);
    if (executar) await ExclusaoModel.apagar(uid, { apagarLogin: login.apagarLogin });
  }

  registrar(`\nRecriar pedidos de exclusão feitos depois do backup: ${plano.recriarPedidos.length}`);
  for (const { uid, quando } of plano.recriarPedidos) {
    registrar(`  - ${uid}: exclusão em ${quando}`);
    if (executar) await ExclusaoModel.agendar(uid, quando);
  }

  registrar(`\nTirar o pedido de quem desistiu depois do backup: ${plano.cancelarPedidos.length}`);
  for (const uid of plano.cancelarPedidos) {
    registrar(`  - ${uid}`);
    if (executar) await ExclusaoModel.cancelar(uid);
  }

  registrar(
    `\nContas criadas depois do backup (os dados delas não estão no banco restaurado): ` +
      plano.criadasDepois.length
  );
  plano.criadasDepois.forEach(uid => registrar(`  - ${uid}`));
  if (plano.pedidosSemConta.length) {
    registrar('\nDessas, pediram a exclusão (apague o login no Firebase Authentication à mão):');
    plano.pedidosSemConta.forEach(({ uid, quando }) => registrar(`  - ${uid}: exclusão em ${quando}`));
  }
  if (paraConferir.length)
    registrar(`\nConfira à mão o login de: ${paraConferir.join(', ')}. O script não apaga esse login.`);

  registrar(
    executar
      ? '\nPronto. Agora a API pode passar a usar o banco restaurado.'
      : '\nNada foi gravado. Confira o relatório e rode de novo com --executar.'
  );
  return { ...plano, paraConferir };
}

async function principal() {
  const [acao, arquivo] = process.argv.slice(2);
  if (!['retrato', 'conferir'].includes(acao) || !arquivo) {
    console.error(USO);
    process.exit(1);
  }
  if (modoBanco === 'memoria') {
    console.error('O .env não aponta para um banco de verdade: o banco escolhido é o em memória.');
    process.exit(1);
  }
  console.log(`Banco: ${descreverBanco()}`);

  if (acao === 'retrato') {
    const retrato = await tirarRetrato();
    try {
      // "wx": nunca sobrescreve um retrato, nem o do banco atual por engano.
      writeFileSync(arquivo, JSON.stringify(retrato, null, 2), { flag: 'wx', mode: 0o600 });
    } catch (erro) {
      if (erro.code !== 'EEXIST') throw erro;
      console.error(`${arquivo} já existe. Use outro nome de arquivo.`);
      process.exit(1);
    }
    console.log(
      `Retrato gravado em ${arquivo}: ${retrato.usuarios.length} conta(s) e ` +
        `${retrato.exclusoes.length} pedido(s) de exclusão.`
    );
    process.exit(0);
  }

  const executar = process.argv.includes('--executar');
  console.log(`Modo: ${executar ? 'EXECUTAR (grava no banco restaurado)' : 'simulação (nada é gravado)'}\n`);
  await conciliar(JSON.parse(readFileSync(arquivo, 'utf8')), { executar });
  process.exit(0);
}

if (rodouDireto(import.meta.url))
  principal().catch(erro => {
    console.error(erro.message);
    process.exit(1);
  });
