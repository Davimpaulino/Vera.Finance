// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { cssDosIcones, nomesUsados } from '../scripts/icones.mjs';
import { ICONE_RESERVA, ICONS } from '../src/components/ds/icons.js';

const require = createRequire(import.meta.url);
const pasta = dirname(require.resolve('bootstrap-icons/font/bootstrap-icons.json'));

describe('ícones do design system', () => {
  it('todo nome de icons.js existe no Bootstrap Icons', async () => {
    const codigos = JSON.parse(await readFile(`${pasta}/bootstrap-icons.json`, 'utf8'));
    const faltando = [...Object.values(ICONS), ICONE_RESERVA].filter(nome => !(nome in codigos));
    expect(faltando).toEqual([]);
  });

  it('o CSS do build tem a fonte reduzida embutida e uma regra por ícone usado', async () => {
    const original = await readFile(`${pasta}/bootstrap-icons.min.css`, 'utf8');
    const css = await cssDosIcones(original, pasta);
    expect(css).toMatch(/^\/\*!\s*\n?\s*\* Bootstrap Icons/);
    expect(css).toContain('src:url(data:font/woff2;base64,');
    expect(css).not.toContain('fonts/bootstrap-icons.woff');
    for (const nome of nomesUsados()) expect(css).toContain(`.bi-${nome}::before{content:"\\`);
    // Fonte inteira + CSS do pacote: ~215 KB. Só o que o site usa: bem menos de 20 KB.
    expect(css.length).toBeLessThan(20_000);
  });
});
