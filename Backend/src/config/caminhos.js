import { randomBytes } from 'node:crypto';

export const partesDoCaminho = caminho => String(caminho).split('/').filter(Boolean);

export const juntarCaminho = (...partes) => partes.flatMap(partesDoCaminho).join('/');

const ALFABETO = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

export function gerarId() {
  let tempo = Date.now();
  let prefixo = '';
  for (let i = 0; i < 8; i++) {
    prefixo = ALFABETO[tempo % 64] + prefixo;
    tempo = Math.floor(tempo / 64);
  }
  const aleatorio = [...randomBytes(12)].map(byte => ALFABETO[byte % 64]).join('');
  return prefixo + aleatorio;
}

export function limparValor(valor) {
  if (valor === undefined) return null;
  return JSON.parse(JSON.stringify(valor));
}

export function achatarEmCaminhos(objeto, prefixo = '') {
  const resultado = {};
  for (const [chave, valor] of Object.entries(objeto)) {
    const caminho = prefixo ? `${prefixo}/${chave}` : chave;
    const ehObjetoSimples = valor && typeof valor === 'object' && !Array.isArray(valor);
    if (ehObjetoSimples && Object.keys(valor).length)
      Object.assign(resultado, achatarEmCaminhos(valor, caminho));
    else resultado[caminho] = valor === undefined ? null : valor;
  }
  return resultado;
}

export function filhosComId(valor) {
  if (!valor || typeof valor !== 'object') return [];
  return Object.entries(valor)
    .filter(([, filho]) => filho && typeof filho === 'object')
    .map(([id, filho]) => ({ id, ...filho }));
}
