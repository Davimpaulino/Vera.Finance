// Migra o export JSON do Firebase Realtime Database (a árvore inteira, baixada pelo console)
// para o PostgreSQL, usando o mesmo adaptador da API. Na mesma passada troca os ids antigos de
// preços, que levavam a chave de acesso da NFC-e ("<44 dígitos>-N"), pelo formato novo
// "n<resumo>-N" do PrecoModel.
//
// Uso (na pasta Backend, com DATABASE_URL no ambiente ou no .env):
//   npm run migrar:postgres -- caminho/do/export.json --simular   (só mostra o que faria)
//   npm run migrar:postgres -- caminho/do/export.json             (grava)
// Opções: --lote=500 (caminhos por transação) e --continuar (aceita banco de destino com dados).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { localizar } from '../src/config/bancoPostgres.js';
import { podar, vazio } from '../src/config/caminhos.js';
import { resumoDaChaveDaNota } from '../src/utils/resumoDaNota.js';

const ID_ANTIGO_DE_PRECO = /^(\d{44})-(\d+)$/;

/** Id novo para um id de preço no formato antigo; null se já não estiver no formato antigo. */
export function converterIdDePreco(id) {
  const partes = ID_ANTIGO_DE_PRECO.exec(id);
  return partes ? `n${resumoDaChaveDaNota(partes[1])}-${partes[2]}` : null;
}

function grupoDoDocumento(doc) {
  if (doc.tabela === 'usuarios') return 'usuarios/perfil';
  if (doc.tabela === 'itens_usuario') return `usuarios/${doc.chaves[1]}`;
  if (doc.tabela === 'documentos') return 'documentos (reserva)';
  return doc.tabela;
}

/**
 * Quebra a árvore do export em documentos (uma linha do PostgreSQL cada), já com os ids de
 * preços convertidos. Não grava nada.
 */
export function prepararMigracao(arvore) {
  const entradas = [];
  const contagem = {};
  const problemas = [];
  let convertidos = 0;
  let duplicados = 0;
  const precos = arvore && typeof arvore === 'object' ? arvore.precos || {} : {};

  function percorrer(no, partes) {
    const alvo = localizar(partes);
    if (alvo.doc) {
      const valor = podar(no);
      if (vazio(valor)) return;
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
  return { entradas, contagem, problemas, convertidos, duplicados };
}

/** Grava as entradas em lotes, cada lote numa transação (atualizarVarios). */
export async function gravarEmLotes(banco, entradas, { lote = 500, aoGravar = () => {} } = {}) {
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

async function principal(argumentos) {
  const arquivo = argumentos.find(argumento => !argumento.startsWith('--'));
  const simular = argumentos.includes('--simular');
  const continuar = argumentos.includes('--continuar');
  const lote = Number((argumentos.find(a => a.startsWith('--lote=')) || '').split('=')[1]) || 500;
  if (!arquivo) {
    console.error('Uso: npm run migrar:postgres -- <export.json> [--simular] [--lote=500]');
    return 2;
  }

  const plano = prepararMigracao(JSON.parse(readFileSync(arquivo, 'utf8')));
  mostrarContagem(`Export: ${arquivo}`, [['documentos', plano.contagem]]);
  console.log(`\nIds de preços convertidos para o formato novo: ${plano.convertidos}`);
  if (plano.duplicados)
    console.log(`Preços antigos ignorados (a mesma nota já estava no formato novo): ${plano.duplicados}`);
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
      ['no export', plano.contagem],
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

if (import.meta.url === pathToFileURL(process.argv[1] || '').href)
  principal(process.argv.slice(2))
    .then(codigo => (process.exitCode = codigo))
    .catch(erro => {
      console.error(erro);
      process.exitCode = 1;
    });
