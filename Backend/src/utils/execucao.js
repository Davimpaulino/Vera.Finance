import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * O módulo de `urlDoModulo` (import.meta.url) é o arquivo que o node rodou (process.argv[1])?
 * Os scripts usam para rodar sozinhos e ainda poder ser importados pelos testes.
 * Compara caminhos, não URLs: no Windows a URL muda com a letra do disco (c: ou C:), as barras e
 * a codificação de espaço e acento, e `import.meta.url === pathToFileURL(argv[1]).href` falha. No
 * Windows a comparação ignora maiúsculas, como o próprio sistema de arquivos. `plataforma` é só
 * para os testes.
 */
export function rodouDireto(urlDoModulo, argumento = process.argv[1], plataforma = process.platform) {
  if (!argumento) return false;
  const windows = plataforma === 'win32';
  const caminhos = windows ? path.win32 : path.posix;
  const real = caminho => {
    // Atalho (link simbólico) para o script: o import.meta.url já vem com o caminho real.
    if (plataforma !== process.platform) return caminho;
    try {
      return realpathSync.native(caminho);
    } catch {
      return caminho;
    }
  };
  const doModulo = real(caminhos.resolve(fileURLToPath(urlDoModulo, { windows })));
  const rodado = real(caminhos.resolve(argumento));
  return windows ? doModulo.toLowerCase() === rodado.toLowerCase() : doModulo === rodado;
}
