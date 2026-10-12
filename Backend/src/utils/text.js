// Normaliza nomes de produto para busca: minúsculas, sem acento, sem pontuação.
export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9,.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(s) {
  return normalize(s)
    .split(' ')
    .filter(t => t.length > 1);
}

/** Pontuação de semelhança entre a busca e o nome do produto (0 a 1). */
export function matchScore(query, nome) {
  const q = tokens(query);
  if (!q.length) return 0;
  const n = normalize(nome);
  const hits = q.filter(t => n.includes(t)).length;
  return hits / q.length;
}
