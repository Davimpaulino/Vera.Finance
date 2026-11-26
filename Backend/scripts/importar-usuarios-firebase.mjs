// Leva as contas do login próprio (e-mail e senha guardados em 'credenciais') para o
// Firebase Authentication, sem pedir senha nova a ninguém: o hash scrypt vai como está.
//
// Uso (na pasta Backend, com a conta de serviço do Firebase configurada no .env):
//   node --env-file=.env scripts/importar-usuarios-firebase.mjs            simulação (padrão)
//   node --env-file=.env scripts/importar-usuarios-firebase.mjs --executar importa de verdade
//
// A simulação só lê e confere; nada é gravado. Quem já existe no Firebase (mesmo uid ou
// mesmo e-mail) é pulado, para não sobrescrever uma conta que já entra pelo Firebase.
import { pathToFileURL } from 'node:url';

// Parâmetros do scrypt usados em CredencialModel (scryptSync do Node com as opções padrão).
export const OPCOES_DO_HASH = {
  hash: {
    algorithm: 'STANDARD_SCRYPT',
    memoryCost: 16384,
    blockSize: 8,
    parallelization: 1,
    derivedKeyLength: 64
  }
};

const TAMANHO_DO_LOTE = 1000; // limite do importUsers por chamada
const TAMANHO_DA_CONSULTA = 100; // limite do getUsers por chamada

const emLotes = (lista, tamanho) =>
  Array.from({ length: Math.ceil(lista.length / tamanho) }, (_, i) =>
    lista.slice(i * tamanho, (i + 1) * tamanho)
  );

/** Converte uma credencial do banco no registro do importUsers. Devolve { registro } ou { motivo }. */
export function montarRegistro(credencial) {
  const { uid, email, nome, sal, hash } = credencial || {};
  if (!uid || typeof uid !== 'string' || uid.length > 128) return { motivo: 'uid ausente ou inválido' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { motivo: 'e-mail inválido' };
  if (typeof sal !== 'string' || !sal) return { motivo: 'sal ausente' };
  if (typeof hash !== 'string' || !/^[0-9a-f]{128}$/i.test(hash)) return { motivo: 'hash fora do formato' };
  return {
    registro: {
      uid,
      email: email.toLowerCase(),
      ...(nome ? { displayName: String(nome).slice(0, 256) } : {}),
      emailVerified: false,
      passwordHash: Buffer.from(hash, 'hex'),
      // O CredencialModel passa o sal ao scrypt como texto (os caracteres hex), não como os
      // bytes que ele representa. Por isso o sal vai em UTF-8, e não decodificado do hex.
      passwordSalt: Buffer.from(sal, 'utf8')
    }
  };
}

/** Pergunta ao Firebase quais uids e e-mails já existem lá. */
async function jaNoFirebase(autenticacao, registros) {
  const uids = new Set();
  const emails = new Set();
  for (const lote of emLotes(registros, TAMANHO_DA_CONSULTA / 2)) {
    const { users } = await autenticacao.getUsers(
      lote.flatMap(registro => [{ uid: registro.uid }, { email: registro.email }])
    );
    users.forEach(usuario => {
      uids.add(usuario.uid);
      if (usuario.email) emails.add(usuario.email.toLowerCase());
    });
  }
  return { uids, emails };
}

async function principal() {
  const executar = process.argv.includes('--executar');
  const { banco, autenticacaoFirebase, modoBanco } = await import('../src/config/banco.js');

  console.log(`Modo: ${executar ? 'EXECUTAR (grava no Firebase)' : 'simulação (nada é gravado)'}`);
  console.log(`Banco: ${modoBanco}`);
  if (executar && !autenticacaoFirebase) {
    console.error(
      'Para executar é preciso a conta de serviço do Firebase (FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY, ou GOOGLE_APPLICATION_CREDENTIALS).'
    );
    process.exit(1);
  }

  const credenciais = await banco.listar('credenciais');
  const relatorio = { lidas: credenciais.length, invalidas: [], jaExistiam: [], importadas: 0, falhas: [] };

  const validos = [];
  for (const credencial of credenciais) {
    const { registro, motivo } = montarRegistro(credencial);
    if (registro) validos.push(registro);
    else relatorio.invalidas.push({ chave: credencial.id, motivo });
  }

  let paraImportar = validos;
  if (autenticacaoFirebase) {
    const existentes = await jaNoFirebase(autenticacaoFirebase, validos);
    paraImportar = validos.filter(registro => {
      const existe = existentes.uids.has(registro.uid) || existentes.emails.has(registro.email);
      if (existe) relatorio.jaExistiam.push(registro.email);
      return !existe;
    });
  } else {
    console.log('Sem conta de serviço: a simulação não confere quem já existe no Firebase.');
  }

  const lotes = emLotes(paraImportar, TAMANHO_DO_LOTE);
  for (const [i, lote] of lotes.entries()) {
    if (!executar) {
      console.log(`Lote ${i + 1}/${lotes.length}: ${lote.length} conta(s) seriam importadas.`);
      continue;
    }
    const resultado = await autenticacaoFirebase.importUsers(lote, OPCOES_DO_HASH);
    relatorio.importadas += resultado.successCount;
    resultado.errors.forEach(({ index, error }) =>
      relatorio.falhas.push({ email: lote[index].email, motivo: error.message })
    );
    console.log(
      `Lote ${i + 1}/${lotes.length}: ${resultado.successCount} importada(s), ${resultado.failureCount} falha(s).`
    );
  }

  console.log('\nRelatório');
  console.log(`  credenciais lidas: ${relatorio.lidas}`);
  console.log(`  inválidas (puladas): ${relatorio.invalidas.length}`);
  relatorio.invalidas.forEach(item => console.log(`    - ${item.chave}: ${item.motivo}`));
  console.log(`  já existiam no Firebase (puladas): ${relatorio.jaExistiam.length}`);
  relatorio.jaExistiam.forEach(email => console.log(`    - ${email}`));
  if (executar) {
    console.log(`  importadas: ${relatorio.importadas}`);
    console.log(`  falhas: ${relatorio.falhas.length}`);
    relatorio.falhas.forEach(item => console.log(`    - ${item.email}: ${item.motivo}`));
  } else {
    console.log(`  seriam importadas: ${paraImportar.length}`);
    console.log('\nNada foi gravado. Rode de novo com --executar para importar.');
  }
  process.exit(relatorio.falhas.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) principal();
