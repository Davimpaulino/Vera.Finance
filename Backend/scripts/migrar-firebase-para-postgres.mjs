// Migra o Firebase Realtime Database (a árvore inteira) para o PostgreSQL, usando o mesmo
// adaptador da API. A árvore vem do export JSON baixado pelo console ou, com --origem-firebase,
// direto do banco Firebase configurado no ambiente (as mesmas variáveis da API), para rodar como
// job no Render sem baixar arquivo. Na mesma passada:
// - troca os ids antigos de preços, que levavam a chave de acesso da NFC-e ("<44 dígitos>-N"),
//   pelo formato novo "n<resumo>-N" do PrecoModel;
// - arredonda a localização dos perfis (usuarios/*/perfil/local) para 3 casas (~100 m), como o
//   GeoModel.aproximar faz hoje com quem salva a localização.
//
// Uso (na pasta Backend, com DATABASE_URL no ambiente ou no .env):
//   npm run migrar:postgres -- caminho/do/export.json --simular   (só mostra o que faria)
//   npm run migrar:postgres -- caminho/do/export.json             (grava)
//   npm run migrar:postgres -- --origem-firebase --simular        (lê do Firebase do ambiente)
//   npm run migrar:postgres -- --origem-firebase                  (lê do Firebase e grava)
// Opções: --lote=500 (caminhos por transação) e --continuar (aceita banco de destino com dados).
import { readFileSync } from 'node:fs';
import { rodouDireto } from '../src/utils/execucao.js';
import { localizar } from '../src/config/bancoPostgres.js';
import { podar, vazio } from '../src/config/caminhos.js';
import { resumoDaChaveDaNota } from '../src/utils/resumoDaNota.js';
import { GeoModel } from '../src/models/GeoModel.js';

const ID_ANTIGO_DE_PRECO = /^(\d{44})-(\d+)$/;

/** Id novo para um id de preço no formato antigo; null se já não estiver no formato antigo. */
export function converterIdDePreco(id) {
  const partes = ID_ANTIGO_DE_PRECO.exec(id);
  return partes ? `n${resumoDaChaveDaNota(partes[1])}-${partes[2]}` : null;
}

// Número de verdade (ou texto com número): null e "" não viram 0.
const ehCoordenada = valor =>
  (typeof valor === 'number' || (typeof valor === 'string' && valor.trim() !== '')) &&
  Number.isFinite(Number(valor));

/**
 * Perfil com a localização arredondada a ~100 m (3 casas decimais). Devolve o mesmo objeto quando
 * não há o que arredondar e, senão, uma cópia (o export original não é alterado).
 */
export function arredondarLocalDoPerfil(perfil) {
  const local = perfil?.local;
  if (!local || !ehCoordenada(local.lat) || !ehCoordenada(local.lng)) return perfil;
  const aproximado = GeoModel.aproximar(local);
  if (aproximado.lat === local.lat && aproximado.lng === local.lng) return perfil;
  return { ...perfil, local: { ...local, ...aproximado } };
}

function grupoDoDocumento(doc) {
  if (doc.tabela === 'usuarios') return 'usuarios/perfil';
  if (doc.tabela === 'itens_usuario') return `usuarios/${doc.chaves[1]}`;
  if (doc.tabela === 'documentos') return 'documentos (reserva)';
  return doc.tabela;
}

/**
 * Quebra a árvore do export em documentos (uma linha do PostgreSQL cada), já com os ids de
 * preços convertidos e a localização dos perfis arredondada. Não grava nada.
 */
export function prepararMigracao(arvore) {
  const entradas = [];
  const contagem = {};
  const problemas = [];
  let convertidos = 0;
  let duplicados = 0;
  let arredondados = 0;
  const precos = arvore && typeof arvore === 'object' ? arvore.precos || {} : {};

  function percorrer(no, partes) {
    const alvo = localizar(partes);
    if (alvo.doc) {
      let valor = podar(no);
      if (vazio(valor)) return;
      if (alvo.doc.tabela === 'usuarios' && !alvo.sub.length) {
        const arredondado = arredondarLocalDoPerfil(valor);
        if (arredondado !== valor) arredondados += 1;
        valor = arredondado;
      }
      let caminho = partes;
      let doc = alvo.doc;
      const idNovo = partes[0] === 'precos' && partes.length === 2 && converterIdDePreco(partes[1]);
      if (idNovo) {
        // A mesma nota já gravada no formato novo vale mais (é a leitura mais recente).
        if (precos[idNovo]) {
          duplicados += 1;
          return;
        }
        convertidos += 1;
        caminho = ['precos', idNovo];
        doc = localizar(caminho).doc;
      }
      entradas.push([caminho.join('/'), valor]);
      const grupo = grupoDoDocumento(doc);
      contagem[grupo] = (contagem[grupo] || 0) + 1;
      return;
    }
    if (vazio(no)) return;
    if (typeof no !== 'object') {
      problemas.push(`/${partes.join('/')} tem um valor simples onde deveria haver uma coleção`);
      return;
    }
    for (const [chave, filho] of Object.entries(no)) percorrer(filho, [...partes, chave]);
  }

  percorrer(arvore, []);
  return { entradas, contagem, problemas, convertidos, duplicados, arredondados };
}

/**
 * Lê a árvore inteira do Firebase Realtime Database configurado no ambiente: com a conta de
 * serviço (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY), pelo Admin SDK;
 * sem ela, pela API REST. O endereço vem de FIREBASE_URL_BANCO, como na API.
 */
export async function lerDoFirebase() {
  const { configuracao, temContaDeServico } = await import('../src/config/env.js');
  const { url } = configuracao.banco;
  if (!url) throw new Error('Defina FIREBASE_URL_BANCO com o endereço do Realtime Database.');
  if (!temContaDeServico) {
    const { criarBancoRest } = await import('../src/config/bancoRest.js');
    return { arvore: await criarBancoRest(configuracao.banco).ler(''), origem: `Firebase (REST) em ${url}` };
  }
  const { initializeApp, deleteApp } = await import('firebase-admin/app');
  const { getDatabase } = await import('firebase-admin/database');
  const { credencialFirebase } = await import('../src/config/credencialFirebase.js');
  const { criarBancoAdmin } = await import('../src/config/bancoAdmin.js');
  // App com nome próprio, separado do app padrão da API.
  const aplicativo = initializeApp(
    { credential: credencialFirebase(configuracao.contaDeServico), databaseURL: url },
    'migracao-para-postgres'
  );
  try {
    return {
      arvore: await criarBancoAdmin(getDatabase(aplicativo)).ler(''),
      origem: `Firebase (conta de serviço) em ${url}`
    };
  } finally {
    // Fecha a conexão do Admin SDK: sem isso o processo do job não termina.
    await deleteApp(aplicativo);
  }
}

const loteValido = lote => Number.isInteger(lote) && lote > 0;

/** Grava as entradas em lotes, cada lote numa transação (atualizarVarios). */
export async function gravarEmLotes(banco, entradas, { lote = 500, aoGravar = () => {} } = {}) {
  // Lote zero, negativo ou quebrado faria o laço nunca terminar.
  if (!loteValido(lote)) throw new Error(`Lote inválido: ${lote}. Use um inteiro maior que zero.`);
  for (let i = 0; i < entradas.length; i += lote) {
    const pedaco = entradas.slice(i, i + lote);
    await banco.atualizarVarios(Object.fromEntries(pedaco));
    aoGravar(Math.min(i + lote, entradas.length), entradas.length);
  }
}

/** Contagem por coleção do que está no banco agora, para conferir com o export. */
export async function contarNoBanco(banco) {
  return prepararMigracao(await banco.ler('')).contagem;
}

function mostrarContagem(titulo, colunas) {
  const grupos = [...new Set(colunas.flatMap(([, contagem]) => Object.keys(contagem)))].sort();
  const largura = Math.max(24, ...grupos.map(grupo => grupo.length + 2));
  console.log(`\n${titulo}`);
  console.log(
    'coleção'.padEnd(largura) + colunas.map(([nome]) => nome.padStart(14)).join('')
  );
  for (const grupo of grupos)
    console.log(
      grupo.padEnd(largura) +
        colunas.map(([, contagem]) => String(contagem[grupo] || 0).padStart(14)).join('')
    );
}

const USO =
  'Uso: npm run migrar:postgres -- <export.json> [--simular] [--lote=500] [--continuar]\n' +
  '  ou: npm run migrar:postgres -- --origem-firebase [--simular] [--lote=500] [--continuar]';

export async function principal(argumentos) {
  const arquivo = argumentos.find(argumento => !argumento.startsWith('--'));
  const doFirebase = argumentos.includes('--origem-firebase');
  const simular = argumentos.includes('--simular');
  const continuar = argumentos.includes('--continuar');
  const opcaoDoLote = argumentos.find(argumento => argumento.startsWith('--lote='));
  const lote = opcaoDoLote ? Number(opcaoDoLote.slice('--lote='.length)) : 500;
  if (arquivo && doFirebase) {
    console.error('Use o arquivo do export ou --origem-firebase, não os dois.');
    console.error(USO);
    return 2;
  }
  if (!arquivo && !doFirebase) {
    console.error(USO);
    return 2;
  }
  if (!loteValido(lote)) {
    console.error(`--lote precisa ser um número inteiro maior que zero (veio "${opcaoDoLote}").`);
    return 2;
  }

  let arvore;
  let origem;
  if (doFirebase) {
    try {
      ({ arvore, origem } = await lerDoFirebase());
    } catch (erro) {
      console.error(`\nNão deu para ler o Firebase: ${erro.message}`);
      return 1;
    }
  } else {
    arvore = JSON.parse(readFileSync(arquivo, 'utf8'));
    origem = `Export: ${arquivo}`;
  }
  if (!arvore || typeof arvore !== 'object') {
    console.error(`\n${origem}: o banco veio vazio. Nada a migrar.`);
    return 1;
  }

  const plano = prepararMigracao(arvore);
  mostrarContagem(doFirebase ? `Origem: ${origem}` : origem, [['documentos', plano.contagem]]);
  console.log(`\nIds de preços convertidos para o formato novo: ${plano.convertidos}`);
  if (plano.duplicados)
    console.log(`Preços antigos ignorados (a mesma nota já estava no formato novo): ${plano.duplicados}`);
  console.log(`Perfis com a localização arredondada (~100 m): ${plano.arredondados}`);
  if (plano.problemas.length) {
    console.error('\nO export tem caminhos que não dá para migrar. Nada foi gravado:');
    plano.problemas.forEach(problema => console.error(`- ${problema}`));
    return 1;
  }
  if (simular) {
    console.log('\nSimulação: nada foi gravado.');
    return 0;
  }

  if (!process.env.DATABASE_URL) {
    console.error('\nDefina DATABASE_URL (no ambiente ou no .env da pasta Backend).');
    return 2;
  }
  const { criarBancoPostgres } = await import('../src/config/bancoPostgres.js');
  const banco = criarBancoPostgres({ url: process.env.DATABASE_URL, ssl: process.env.PGSSL });
  try {
    const antes = await contarNoBanco(banco);
    if (Object.keys(antes).length && !continuar) {
      mostrarContagem('O PostgreSQL de destino já tem dados:', [['no banco', antes]]);
      console.error(
        '\nNada foi gravado. Se for mesmo para gravar por cima (ex.: repetir uma migração ' +
          'interrompida), rode de novo com --continuar.'
      );
      return 1;
    }
    console.log(`\nGravando ${plano.entradas.length} documentos em lotes de ${lote}...`);
    await gravarEmLotes(banco, plano.entradas, {
      lote,
      aoGravar: (feitos, total) => console.log(`  ${feitos}/${total}`)
    });
    const depois = await contarNoBanco(banco);
    mostrarContagem('Conferência:', [
      [doFirebase ? 'no Firebase' : 'no export', plano.contagem],
      ['no banco', depois]
    ]);
    const diferentes = Object.keys({ ...plano.contagem, ...depois }).filter(
      grupo => (plano.contagem[grupo] || 0) !== (depois[grupo] || 0)
    );
    if (diferentes.length) {
      console.error(`\nContagens diferentes em: ${diferentes.join(', ')}. Confira antes de seguir.`);
      return 1;
    }
    console.log('\nMigração concluída: as contagens batem.');
    return 0;
  } finally {
    await banco.fechar();
  }
}

if (rodouDireto(import.meta.url))
  principal(process.argv.slice(2))
    .then(codigo => (process.exitCode = codigo))
    .catch(erro => {
      console.error(erro);
      process.exitCode = 1;
    });
