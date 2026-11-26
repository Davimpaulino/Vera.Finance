// Ícones só com o que o site usa. O Bootstrap Icons traz uns 2.000 glifos (fonte de 128 KB e CSS
// de 86 KB) e o design system usa uns 80 (src/components/ds/icons.js). No build do site o plugin
// "vera-icones" do vite.config.js troca o CSS do pacote por este: a fonte com só esses glifos
// (cerca de 8 KB, embutida no CSS, sem pedido a mais) e uma regra por ícone usado.
// Ícone novo: basta pôr em icons.js; o build falha se o nome não existir no Bootstrap Icons.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import subsetFont from 'subset-font';
import { ICONE_RESERVA, ICONS } from '../src/components/ds/icons.js';

/** Nomes "bi-*" que o componente Icon pode pedir, sem repetir. */
export const nomesUsados = () => [...new Set([...Object.values(ICONS), ICONE_RESERVA])];

/**
 * CSS do Bootstrap Icons só com os ícones usados.
 * `css` é o bootstrap-icons.min.css original e `pasta` é a pasta dele (bootstrap-icons/font).
 */
export async function cssDosIcones(css, pasta) {
  const codigos = JSON.parse(await readFile(join(pasta, 'bootstrap-icons.json'), 'utf8'));
  const nomes = nomesUsados();
  const faltando = nomes.filter(nome => !(nome in codigos));
  if (faltando.length)
    throw new Error(
      `Ícone que não existe no Bootstrap Icons: ${faltando.join(', ')} (src/components/ds/icons.js).`
    );
  // A licença (MIT) e a regra que dá a fonte, o tamanho e o alinhamento a todo .bi-*.
  const licenca = css.match(/^\/\*![\s\S]*?\*\//);
  const base = css.match(/\.bi::before,[^{]*\{[^}]*\}/);
  if (!licenca || !base)
    throw new Error('O CSS do Bootstrap Icons mudou de formato: revise scripts/icones.mjs.');
  const fonte = await subsetFont(
    await readFile(join(pasta, 'fonts', 'bootstrap-icons.woff2')),
    String.fromCodePoint(...nomes.map(nome => codigos[nome])),
    { targetFormat: 'woff2' }
  );
  const regras = nomes
    .map(nome => `.bi-${nome}::before{content:"\\${codigos[nome].toString(16)}"}`)
    .join('');
  return (
    `${licenca[0]}@font-face{font-display:block;font-family:bootstrap-icons;` +
    `src:url(data:font/woff2;base64,${fonte.toString('base64')}) format("woff2")}` +
    `${base[0]}${regras}`
  );
}
