// Caches em memória com teto de entradas. Cada busca diferente (termo, CEP, região) vira uma
// entrada; sem teto, buscas sem fim fariam o processo crescer até cair. Passou do teto, sai a
// entrada mais antiga (o Map guarda na ordem em que as chaves entraram).
export function guardarComTeto(mapa, chave, valor, teto) {
  mapa.delete(chave);
  mapa.set(chave, valor);
  while (mapa.size > teto) mapa.delete(mapa.keys().next().value);
}
