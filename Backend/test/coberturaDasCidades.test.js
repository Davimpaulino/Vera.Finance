import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

await import('./apoio/ambiente.js');

// Levantamento das cidades prioritárias (scripts/cobertura-das-cidades.mjs) com o Nominatim e o
// mapa (Overpass) de mentira, no estilo do test/redesPublicas.test.js. Nada sai para a internet.
const CENTROS = {
  Campinas: { lat: -22.9056, lng: -47.0608 },
  Recife: { lat: -8.0476, lng: -34.877 },
  Manaus: { lat: -3.119, lng: -60.0217 }
};
const MAPA_DE_CAMPINAS = {
  elements: [
    { type: 'node', id: 1, lat: -22.91, lon: -47.061, tags: { shop: 'supermarket', name: 'Savegnago' } },
    { type: 'node', id: 2, lat: -22.95, lon: -47.06, tags: { shop: 'supermarket', name: 'Savegnago Supermercados' } },
    { type: 'way', id: 3, center: { lat: -22.92, lon: -47.07 }, tags: { shop: 'wholesale', name: 'Atacadão', brand: 'Atacadão' } },
    { type: 'node', id: 4, lat: -22.907, lon: -47.062, tags: { shop: 'supermarket', name: 'Mercadinho Bom Preço' } },
    { type: 'node', id: 5, lat: -23.5, lon: -47.5, tags: { shop: 'supermarket', name: 'Muito Longe' } }
  ]
};

const consultas = [];
// Centro e raio (km) da consulta: o script pede o retângulo em volta do círculo, com 150 m de folga.
const daCaixa = consulta => {
  const [sul, , norte] = consulta.match(/\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)\)/).slice(1).map(Number);
  return { lat: (sul + norte) / 2, raio: Math.round((((norte - sul) / 2) * 111320 - 150) / 1000) };
};
const perto = (lat, centro) => Math.abs(lat - centro.lat) < 0.01;
globalThis.fetch = async (endereco, opcoes = {}) => {
  const url = new URL(String(endereco));
  consultas.push(url.hostname);
  const json = (corpo, status = 200) => ({ ok: status < 400, status, json: async () => corpo });
  assert.match(opcoes.headers['User-Agent'], /github\.com\/Davimpaulino\/Vera\.Finance/);
  if (url.hostname === 'nominatim.openstreetmap.org') {
    const lugar = Object.keys(CENTROS).find(nome => url.searchParams.get('q').startsWith(nome));
    return json(lugar ? [{ lat: String(CENTROS[lugar].lat), lon: String(CENTROS[lugar].lng) }] : []);
  }
  if (url.pathname.endsWith('/interpreter')) {
    const consulta = decodeURIComponent(String(opcoes.body));
    // A consulta do script: retângulo, uma busca só, com teto de tempo e de memória.
    assert.match(consulta, /^data=\[out:json\]\[timeout:90\]\[maxsize:134217728\];nwr\["shop"~"\^\(supermarket\|wholesale\)\$"\]\(/);
    assert.match(consulta, /out center tags qt;$/);
    assert.doesNotMatch(consulta, /around:/);
    const { lat, raio } = daCaixa(consulta);
    // Recife: o mapa não responde em raio nenhum.
    if (perto(lat, CENTROS.Recife)) return json({}, 500);
    // Manaus: 15 km dá 504, 10 km estoura o tempo do Overpass (200 com "remark"), 5 km responde.
    if (perto(lat, CENTROS.Manaus)) {
      if (raio === 15) return json({}, 504);
      if (raio === 10)
        return json({ elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 91 seconds.' });
      assert.equal(raio, 5);
      return json({ elements: [{ type: 'node', id: 9, lat: -3.12, lon: -60.02, tags: { shop: 'supermarket', name: 'Atacadão' } }] });
    }
    assert.equal(raio, 15, 'Campinas responde já nos 15 km');
    return json(MAPA_DE_CAMPINAS);
  }
  throw new Error(`fetch inesperado: ${url}`);
};

const { CIDADES, RAIOS_KM, principal, slugDaCidade, semLevantamento, hojeNoBrasil } = await import(
  '../scripts/cobertura-das-cidades.mjs'
);
const { banco } = await import('../src/config/banco.js');

const pasta = await mkdtemp(join(tmpdir(), 'vera-cidades-'));
after(() => rm(pasta, { recursive: true, force: true }));

const DE_TESTE = [
  { slug: 'campinas-sp', nome: 'Campinas', uf: 'SP' },
  { slug: 'recife-pe', nome: 'Recife', uf: 'PE' },
  { slug: 'porto-alegre-rs', nome: 'Porto Alegre', uf: 'RS' }
];

const rodar = async (argumentos, arquivo, cidades = DE_TESTE) => {
  const saida = [];
  const avisos = [];
  const codigo = await principal(argumentos, {
    arquivo,
    cidades,
    hoje: '2026-11-28',
    escrever: linha => saida.push(linha),
    avisar: linha => avisos.push(linha)
  });
  return { codigo, saida, avisos, json: JSON.parse(await readFile(arquivo, 'utf8')) };
};

test('slug da cidade: sem acento, minúsculas e a UF no fim', () => {
  assert.equal(slugDaCidade('São Paulo', 'SP'), 'sao-paulo-sp');
  assert.equal(slugDaCidade('Brasília', 'DF'), 'brasilia-df');
  assert.equal(slugDaCidade('Goiânia', 'GO'), 'goiania-go');
  assert.equal(CIDADES.length, 12);
  assert.equal(new Set(CIDADES.map(cidade => cidade.slug)).size, 12);
});

test('levanta as redes com preço online a até 15 km e, se o mapa falha, mantém o que havia', async () => {
  const arquivo = join(pasta, 'cidades.json');
  const anteriorDoRecife = {
    ...semLevantamento(DE_TESTE[1]),
    totalMercados: 40,
    redes: [{ id: 'atacadao', nome: 'Atacadão', tipo: 'atacado', lojas: 2, distanciaKm: 3.4 }],
    levantadoEm: '2026-10-01'
  };
  await writeFile(arquivo, JSON.stringify([anteriorDoRecife]));
  const { codigo, json, avisos } = await rodar([], arquivo);

  assert.equal(codigo, 1, 'Recife e Porto Alegre falharam');
  assert.deepEqual(
    json.map(cidade => cidade.slug),
    DE_TESTE.map(cidade => cidade.slug),
    'na ordem da lista'
  );
  const [campinas, recife, portoAlegre] = json;
  assert.deepEqual(campinas, {
    slug: 'campinas-sp',
    nome: 'Campinas',
    uf: 'SP',
    raioKm: 15,
    totalMercados: 4,
    redes: [
      { id: 'savegnago', nome: 'Savegnago', tipo: 'mercado', lojas: 2, distanciaKm: 0.5 },
      { id: 'atacadao', nome: 'Atacadão', tipo: 'atacado', lojas: 1, distanciaKm: 1.9 }
    ],
    levantadoEm: '2026-11-28'
  });
  // O mapa não respondeu: fica o levantamento anterior, inteiro.
  assert.deepEqual(recife, anteriorDoRecife);
  // O Nominatim não achou e não havia nada antes: a cidade fica sem levantamento, sem lista.
  assert.deepEqual(portoAlegre, semLevantamento(DE_TESTE[2]));
  assert.match(
    avisos.join('\n'),
    /Recife \(PE\): o mapa de mercados não respondeu \(tentei 15, 10, 5 km\)\. Ficou o levantamento de 2026-10-01/
  );
  // Cada tentativa sai numa linha: servidor, status e tempo, em cada raio.
  for (const raio of [15, 10, 5])
    assert.match(avisos.join('\n'), new RegExp(`Recife \\(PE\\), ${raio} km: overpass-api\\.de: HTTP 500 em \\d+,\\d s`));
  assert.match(avisos.join('\n'), /Recife \(PE\), 15 km: overpass\.kumi\.systems: HTTP 500/);
  assert.match(avisos.join('\n'), /Porto Alegre \(RS\): o mapa não achou o centro da cidade\. Ficou sem levantamento/);
  // Sem coordenadas nem endereço de loja no JSON do site.
  assert.ok(!/"lat"|"lng"|endereco/.test(JSON.stringify(json)));
  // Nada no banco: nem a região do mapa.
  assert.equal(await banco.ler('regioes'), null);
});

test('se 15 km falha, tenta 10 e 5 km e grava o raio usado', async () => {
  const arquivo = join(pasta, 'manaus.json');
  const manaus = [{ slug: 'manaus-am', nome: 'Manaus', uf: 'AM' }];
  const { codigo, json, avisos, saida } = await rodar([], arquivo, manaus);
  assert.equal(codigo, 0);
  assert.equal(json[0].raioKm, 5);
  assert.deepEqual(json[0].redes, [
    { id: 'atacadao', nome: 'Atacadão', tipo: 'atacado', lojas: 1, distanciaKm: 0.2 }
  ]);
  assert.match(saida.join('\n'), /Manaus \(AM\): 1 rede com preço online, 1 mercado no mapa a até 5 km do centro/);
  const log = avisos.join('\n');
  assert.match(log, /Manaus \(AM\), 15 km: overpass-api\.de: HTTP 504/);
  assert.match(log, /Manaus \(AM\), 10 km: overpass-api\.de: runtime error: Query timed out/);
  assert.match(log, /Manaus \(AM\), 5 km: overpass-api\.de: 1 mercado em \d+,\d s/);
});

test('--cidades levanta só as escolhidas e deixa as outras como estavam', async () => {
  const arquivo = join(pasta, 'so-campinas.json');
  const { codigo, json } = await rodar(['--cidades=campinas-sp'], arquivo);
  assert.equal(codigo, 0);
  assert.equal(json[0].levantadoEm, '2026-11-28');
  assert.deepEqual(json.slice(1), DE_TESTE.slice(1).map(semLevantamento));
  assert.equal((await rodar(['--cidades=atlantida-xx'], arquivo)).codigo, 2);
});

test('data do levantamento no fuso do Brasil', () => {
  // 1h da manhã em UTC ainda é o dia anterior em São Paulo.
  assert.equal(hojeNoBrasil(new Date('2026-11-29T01:00:00Z')), '2026-11-28');
});

test('o cidades.json do site tem as 12 cidades da lista, e lista só com levantamento', async () => {
  const doSite = JSON.parse(
    await readFile(new URL('../../Frontend/src/conteudo/cidades.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(
    doSite.map(({ slug, nome, uf }) => ({ slug, nome, uf })),
    CIDADES
  );
  for (const cidade of doSite) {
    assert.ok(RAIOS_KM.includes(cidade.raioKm), `${cidade.slug}: raio ${cidade.raioKm}`);
    if (cidade.redes === null) {
      assert.equal(cidade.levantadoEm, null, `${cidade.slug}: data sem levantamento`);
      assert.equal(cidade.totalMercados, null, `${cidade.slug}: total sem levantamento`);
    } else {
      assert.match(cidade.levantadoEm, /^\d{4}-\d{2}-\d{2}$/, cidade.slug);
      assert.ok(Array.isArray(cidade.redes), cidade.slug);
    }
  }
});
