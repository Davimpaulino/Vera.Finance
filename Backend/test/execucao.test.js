import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rodouDireto } from '../src/utils/execucao.js';

// Os scripts de scripts/ só rodam sozinhos quando são o arquivo que o node abriu (process.argv[1]).
// No Windows a URL muda com a letra do disco, as barras e a codificação: compara caminhos.

test('Windows: letra do disco, maiúsculas e barras não importam', () => {
  const url = 'file:///C:/Users/Ana/vera.finance/Backend/scripts/cobertura-das-cidades.mjs';
  for (const argumento of [
    'C:\\Users\\Ana\\vera.finance\\Backend\\scripts\\cobertura-das-cidades.mjs',
    'c:\\Users\\Ana\\vera.finance\\Backend\\scripts\\cobertura-das-cidades.mjs',
    'C:\\users\\ana\\VERA.FINANCE\\backend\\scripts\\cobertura-das-cidades.mjs',
    'C:/Users/Ana/vera.finance/Backend/scripts/cobertura-das-cidades.mjs',
    'C:\\Users\\Ana\\vera.finance\\Backend\\scripts\\..\\scripts\\cobertura-das-cidades.mjs'
  ])
    assert.equal(rodouDireto(url, argumento, 'win32'), true, argumento);
  // O jeito antigo falhava com o disco em minúscula.
  assert.notEqual(url, 'file:///c:/Users/Ana/vera.finance/Backend/scripts/cobertura-das-cidades.mjs');
});

test('Windows: pasta com espaço e acento', () => {
  const url = 'file:///D:/%C3%81rea%20de%20Trabalho/vera/Backend/scripts/saude-das-redes.mjs';
  assert.equal(rodouDireto(url, 'D:\\Área de Trabalho\\vera\\Backend\\scripts\\saude-das-redes.mjs', 'win32'), true);
  assert.equal(rodouDireto(url, 'd:\\área de trabalho\\vera\\backend\\scripts\\saude-das-redes.mjs', 'win32'), true);
});

test('Windows: outro arquivo ou outro disco não conta', () => {
  const url = 'file:///C:/vera/Backend/scripts/cobertura-das-cidades.mjs';
  assert.equal(rodouDireto(url, 'C:\\vera\\Backend\\scripts\\saude-das-redes.mjs', 'win32'), false);
  assert.equal(rodouDireto(url, 'D:\\vera\\Backend\\scripts\\cobertura-das-cidades.mjs', 'win32'), false);
  assert.equal(rodouDireto(url, 'C:\\vera\\node_modules\\.bin\\node-test', 'win32'), false);
});

test('Linux e macOS: maiúsculas contam; sem argumento, não roda', () => {
  const url = 'file:///home/ana/vera/Backend/scripts/cobertura-das-cidades.mjs';
  assert.equal(rodouDireto(url, '/home/ana/vera/Backend/scripts/cobertura-das-cidades.mjs', 'linux'), true);
  assert.equal(rodouDireto(url, '/home/ana/vera/Backend/scripts/../scripts/cobertura-das-cidades.mjs', 'linux'), true);
  assert.equal(rodouDireto(url, '/home/ana/vera/backend/scripts/cobertura-das-cidades.mjs', 'linux'), false);
  assert.equal(rodouDireto(url, undefined, 'linux'), false);
  assert.equal(rodouDireto(url, '', 'linux'), false);
});

test('neste sistema: o próprio arquivo sim, o teste importado não', () => {
  const aqui = fileURLToPath(import.meta.url);
  assert.equal(rodouDireto(import.meta.url, aqui), true);
  assert.equal(rodouDireto(pathToFileURL('/outro/arquivo.mjs').href, aqui), false);
});

test('o script roda sozinho pelo node, e importado não roda', async () => {
  const script = fileURLToPath(new URL('../scripts/cobertura-das-cidades.mjs', import.meta.url));
  // Uso errado sai com 2 antes de qualquer pedido ao mapa: prova que principal() rodou.
  const rodar = promisify(execFile);
  const erro = await rodar(process.execPath, [script, '--cidades=nao-existe-xx']).catch(e => e);
  assert.equal(erro.code, 2);
  assert.match(erro.stderr, /Cidades desconhecidas: nao-existe-xx/);
});
