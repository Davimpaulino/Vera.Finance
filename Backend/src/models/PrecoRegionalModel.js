import { CatalogoModel, chaveDeProduto } from './CatalogoModel.js';
import { RedeModel } from './RedeModel.js';
import { PrecoModel } from './PrecoModel.js';
import { ComparacaoModel } from './ComparacaoModel.js';
import { categoriaDoProduto } from './NfceModel.js';
import { diffDays } from '../utils/dates.js';
import { round2 } from '../utils/money.js';
import { normalize, tokens } from '../utils/text.js';

// Comparação com os mercados reais da região, juntando duas fontes:
// o preço do site da rede para o CEP da pessoa (só o que a rede entrega ali) e o preço das notas
// fiscais lidas naquela loja. Mercados sem nenhuma das duas aparecem como "sem preço".
const FRESCO_DIAS = 14;
const VALIDO_DIAS = 45;
const GENERICAS = new Set([
  'de',
  'da',
  'do',
  'com',
  'sem',
  'tipo',
  'caixa',
  'pacote',
  'garrafa',
  'tampa',
  'uht',
  'longa',
  'vida'
]);

const MOTIVOS = {
  semEntrega: 'a loja online desta rede não atende o seu CEP',
  semCep: 'informe o CEP para ver o preço desta rede',
  falhou: 'o site da rede não respondeu agora',
  ok: 'o site da rede não tem este produto para o seu CEP'
};

/** A loja mais perto de cada rede que tem preço no site. */
function lojasPorRede(mercados) {
  const vistas = new Map();
  mercados.forEach(mercado => {
    if (mercado.redeId && !vistas.has(mercado.redeId))
      vistas.set(mercado.redeId, { rede: RedeModel.buscar(mercado.redeId), loja: mercado });
  });
  return [...vistas.values()].filter(item => item.rede);
}

async function emLotes(tarefas, limite = 16) {
  const resultados = new Array(tarefas.length);
  let proxima = 0;
  const trabalhar = async () => {
    while (proxima < tarefas.length) {
      const atual = proxima++;
      resultados[atual] = await tarefas[atual]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, tarefas.length) }, trabalhar));
  return resultados;
}

// Tamanho da embalagem ("1l", "500g", "5kg") e palavras que identificam o produto.
const tamanho = nome =>
  (normalize(nome).match(/\d+(?:[.,]\d+)?\s?(?:kg|g|ml|l|un)\b/) || [''])[0]
    .replace(/\s/g, '')
    .replace(',', '.');
const palavras = nome =>
  new Set(tokens(nome).filter(t => !/^\d/.test(t) && !GENERICAS.has(t) && t.length > 1));

function parecenca(a, b) {
  const x = palavras(a.produto);
  const y = palavras(b.produto);
  const comuns = [...x].filter(t => y.has(t)).length;
  return comuns / Math.max(1, new Set([...x, ...y]).size);
}

// Palavras que mudam o produto: "coquetel" não é "tradicional", "sem lactose" não é o comum.
const VARIANTES = new Set([
  'tradicional',
  'coquetel',
  'pipoquinha',
  'lanche',
  'mini',
  'airfryer',
  'air',
  'recheado',
  'lactose',
  'zero',
  'desnatado',
  'semidesnatado',
  'integral',
  'light',
  'diet',
  'organico',
  'a2',
  'forti',
  'chocolate',
  'morango',
  'baunilha',
  'parboilizado',
  'agulhinha',
  'branco',
  'preto',
  'carioca',
  'extra',
  'gourmet',
  'premium',
  'refil',
  'po',
  'liquido',
  'condensado',
  'fermentado',
  'pasteurizado',
  'waffle',
  'palito',
  'petit',
  'multigraos',
  'temperado',
  'defumado'
]);
const variantes = nome => new Set([...palavras(nome)].filter(t => VARIANTES.has(t)));
const marcaNormal = marca => normalize(marca).replace(/[^a-z0-9 ]/g, '').trim();

/** Mesmo produto em redes diferentes: mesmo código de barras, ou mesma marca, tamanho e variante. */
function mesmoProduto(a, b) {
  if (a.ean && b.ean) return a.ean === b.ean;
  if (tamanho(a.produto) !== tamanho(b.produto)) return false;
  const [x, y] = [marcaNormal(a.marca), marcaNormal(b.marca)];
  if (x && y && !x.includes(y) && !y.includes(x)) return false;
  const [va, vb] = [variantes(a.produto), variantes(b.produto)];
  if (va.size !== vb.size || [...va].some(t => !vb.has(t))) return false;
  return parecenca(a, b) >= 0.5;
}

const marcaBonita = marca =>
  String(marca || '')
    .toLowerCase()
    .replace(/(^|\s|\()(\p{L})/gu, (_, antes, letra) => antes + letra.toUpperCase())
    .trim();

function agrupar(resultados) {
  const grupos = [];
  resultados.forEach(({ rede, produtos }) =>
    produtos.forEach(produto => {
      const grupo = grupos.find(g => mesmoProduto(g.referencia, produto));
      if (grupo) {
        if (!grupo.ofertas.has(rede.id)) grupo.ofertas.set(rede.id, produto);
        grupo.score = Math.max(grupo.score, produto.score);
        grupo.menor = Math.min(grupo.menor, produto.preco);
      } else
        grupos.push({
          chave: chaveDeProduto(produto),
          referencia: produto,
          ofertas: new Map([[rede.id, produto]]),
          score: produto.score,
          menor: produto.preco
        });
    })
  );
  return grupos.sort(
    (a, b) => b.ofertas.size - a.ofertas.size || b.score - a.score || a.menor - b.menor
  );
}

function ultimoDaNota(precos, mercadoId, hoje = new Date()) {
  const daLoja = precos
    .filter(preco => preco.mercadoId === mercadoId)
    .sort((a, b) => b.data.localeCompare(a.data));
  const ultimo = daLoja[0];
  if (!ultimo) return null;
  const idade = diffDays(ultimo.data, hoje);
  if (idade > VALIDO_DIAS) return null;
  return {
    preco: ultimo.preco,
    idadeDias: idade,
    leituras: daLoja.filter(preco => diffDays(preco.data, hoje) <= 30).length,
    estado: idade <= FRESCO_DIAS ? 'fresh' : 'aged'
  };
}

const habitualDe = (mercados, habitualId) =>
  mercados.find(mercado => mercado.id === habitualId || mercado.notaId === habitualId) || null;

/** Termo para achar o produto escolhido no site de cada rede: o que a pessoa buscou + a marca. */
const termoDoItem = item =>
  item.produto ? `${item.produto.termo || item.nome} ${item.produto.marca || ''}`.trim() : item.nome;

/** Oferta da rede para o item: o produto exato escolhido ou, para item sem produto, o mais parecido. */
function ofertaDoItem(item, achados) {
  if (!item.produto) {
    // Item só com nome: o mais parecido que respeita o que foi pedido ("preto" não é "carioca",
    // "1kg" não é "2kg").
    const tam = tamanho(item.nome);
    const pedidas = variantes(item.nome);
    return (
      achados.find(
        oferta =>
          (!tam || tamanho(oferta.produto) === tam) &&
          [...pedidas].every(variante => variantes(oferta.produto).has(variante))
      ) || null
    );
  }
  const referencia = { produto: item.nome, marca: item.produto.marca, ean: item.produto.ean };
  return achados.find(oferta => mesmoProduto(referencia, oferta)) || null;
}

/**
 * Equivalente na loja quando ela não tem o produto escolhido: mesmo tamanho e variante, e o
 * mesmo tipo de produto (palavras em comum), de outra marca. O mais parecido; no empate, o mais barato.
 */
function substitutoDoItem(item, achados) {
  if (!item.produto) return null;
  const referencia = { produto: item.nome, marca: item.produto.marca };
  const tam = tamanho(item.nome);
  const va = variantes(item.nome);
  return (
    achados
      .filter(oferta => {
        if (tam && tamanho(oferta.produto) !== tam) return false;
        const vb = variantes(oferta.produto);
        if (va.size !== vb.size || [...va].some(t => !vb.has(t))) return false;
        return parecenca(referencia, oferta) >= 0.25;
      })
      .sort((a, b) => parecenca(referencia, b) - parecenca(referencia, a) || a.preco - b.preco)[0] ||
    null
  );
}

const mediana = valores => {
  if (!valores.length) return null;
  const ordem = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordem.length / 2);
  return round2(ordem.length % 2 ? ordem[meio] : (ordem[meio - 1] + ordem[meio]) / 2);
};

/**
 * Melhor jeito de dividir a compra em dois mercados: cada item vai para o mais barato dos dois.
 * Só vale sugerir quando economiza de verdade (pelo menos R$ 5 e 3% do total no melhor mercado).
 */
function melhorDivisao(itens, candidatos, melhor) {
  if (!melhor || itens.length < 2 || candidatos.length < 2) return null;
  const qtd = item => Number(item.qtd) || 1;
  let achada = null;
  for (let a = 0; a < candidatos.length; a++)
    for (let b = a + 1; b < candidatos.length; b++) {
      const [x, y] = [candidatos[a], candidatos[b]];
      const partes = { [x.mercadoId]: [], [y.mercadoId]: [] };
      let total = 0;
      let estimados = 0;
      itens.forEach(item => {
        const px = item.precos[x.mercadoId];
        const py = item.precos[y.mercadoId];
        if (px == null && py == null) {
          total += item.estimativa * qtd(item);
          estimados += 1;
          return;
        }
        const noX = py == null || (px != null && px <= py);
        const mercadoId = noX ? x.mercadoId : y.mercadoId;
        total += (noX ? px : py) * qtd(item);
        partes[mercadoId].push({ item: item.nome, preco: noX ? px : py, qtd: qtd(item) });
      });
      if (!partes[x.mercadoId].length || !partes[y.mercadoId].length) continue;
      if (estimados > melhor.faltando.length) continue;
      total = round2(total);
      if (!achada || total < achada.total) achada = { total, estimados, mercados: [x, y], partes };
    }
  if (!achada) return null;
  const economia = round2(melhor.totalComparavel - achada.total);
  if (economia < 5 || economia < melhor.totalComparavel * 0.03) return null;
  return {
    total: achada.total,
    economia,
    mercados: achada.mercados.map(mercado => ({
      mercadoId: mercado.mercadoId,
      nome: mercado.nome,
      distanciaKm: mercado.distanciaKm,
      itens: achada.partes[mercado.mercadoId],
      total: round2(
        achada.partes[mercado.mercadoId].reduce((t, parte) => t + parte.preco * parte.qtd, 0)
      )
    }))
  };
}

export const PrecoRegionalModel = {
  /**
   * Produtos achados para um termo nos sites das redes da região, já agrupados: cada opção é um
   * produto (marca, tamanho e variante) com o menor preço e em quantas redes ele aparece.
   */
  async opcoes(termo, mercados, cep = '') {
    const resultados = await Promise.all(
      lojasPorRede(mercados).map(async ({ rede }) => ({
        rede,
        ...(await CatalogoModel.buscar(rede, termo, cep))
      }))
    );
    return agrupar(resultados)
      .slice(0, 40)
      .map(grupo => ({
        chave: grupo.chave,
        produto: grupo.referencia.produto,
        marca: marcaBonita(grupo.referencia.marca),
        tamanho: tamanho(grupo.referencia.produto).replace('.', ','),
        ean: grupo.referencia.ean || '',
        imagem: grupo.referencia.imagem || '',
        menorPreco: grupo.menor,
        redes: grupo.ofertas.size
      }));
  },

  /**
   * Compara um produto nos mercados da região. `opcao` escolhe um dos produtos achados
   * (marca e tamanho); sem ela, vale o produto vendido no maior número de redes.
   */
  async comparar(termo, mercados, habitualId, { cep = '', opcao = '' } = {}) {
    const lojas = lojasPorRede(mercados);
    const resultados = await Promise.all(
      lojas.map(async ({ rede, loja }) => ({
        rede,
        loja,
        ...(await CatalogoModel.buscar(rede, termo, cep))
      }))
    );
    const grupos = agrupar(resultados);
    const alvo = grupos.find(grupo => grupo.chave === opcao) || grupos[0] || null;

    const candidatosDaNota = await PrecoModel.buscarProdutos(termo);
    const produtoDaNota = candidatosDaNota[0]?.produto || null;
    const precosDaNota = produtoDaNota
      ? (await PrecoModel.doProduto(produtoDaNota)).filter(preco => preco.origem !== 'site')
      : [];

    const linhas = [];
    const semPrecoDoSite = [];
    resultados.forEach(({ rede, loja, produtos, situacao, lojaOnline }) => {
      if (!produtos.length) {
        semPrecoDoSite.push({ rede, loja, motivo: MOTIVOS[situacao] || MOTIVOS.ok });
        return;
      }
      const igual = alvo ? alvo.ofertas.get(rede.id) : null;
      const referencia = alvo?.referencia;
      const escolhido =
        igual ||
        (referencia
          ? [...produtos].sort(
              (a, b) =>
                Number(tamanho(b.produto) === tamanho(referencia.produto)) -
                  Number(tamanho(a.produto) === tamanho(referencia.produto)) ||
                parecenca(b, referencia) - parecenca(a, referencia) ||
                a.preco - b.preco
            )[0]
          : produtos[0]);
      linhas.push({
        mercadoId: loja.id,
        redeId: rede.id,
        nome: loja.nome,
        endereco: loja.endereco,
        distanciaKm: loja.distanciaKm,
        tipo: loja.tipo,
        preco: escolhido.preco,
        precoDe: escolhido.precoDe,
        unidade: escolhido.unidade,
        estado: 'fresh',
        idadeDias: 0,
        leituras: 0,
        fonte: 'site',
        regional: !!cep && rede.plataforma !== 'paguemenos',
        lojaOnline: lojaOnline || null,
        produtoNaLoja: escolhido.produto,
        marca: marcaBonita(escolhido.marca),
        igual: !!igual,
        link: escolhido.link
      });
    });
    mercados
      .filter(mercado => mercado.notaId)
      .forEach(mercado => {
        const daNota = ultimoDaNota(precosDaNota, mercado.notaId);
        if (!daNota) return;
        linhas.push({
          mercadoId: mercado.id,
          redeId: mercado.redeId || null,
          nome: mercado.nome,
          endereco: mercado.endereco,
          distanciaKm: mercado.distanciaKm,
          tipo: mercado.tipo,
          ...daNota,
          fonte: 'nota',
          produtoNaLoja: produtoDaNota,
          igual: false
        });
      });

    // O "mais barato" compara o mesmo produto; os parecidos aparecem, mas não ganham o selo.
    const comPreco = linhas.sort((a, b) => Number(b.igual) - Number(a.igual) || a.preco - b.preco);
    const iguais = comPreco.filter(linha => linha.igual);
    const melhor = (iguais.length ? iguais : comPreco).reduce(
      (atual, linha) => (!atual || linha.preco < atual.preco ? linha : atual),
      null
    );
    const habitualMercado = habitualDe(mercados, habitualId);
    const habitual =
      comPreco.find(linha => habitualMercado && linha.mercadoId === habitualMercado.id) ||
      comPreco.find(linha => habitualMercado?.redeId && linha.redeId === habitualMercado.redeId) ||
      null;

    const representados = new Set(comPreco.map(linha => linha.mercadoId));
    const redesTratadas = new Set([
      ...comPreco.map(linha => linha.redeId),
      ...semPrecoDoSite.map(item => item.rede.id)
    ]);
    const semPreco = [
      ...semPrecoDoSite.map(({ rede, loja, motivo }) => ({
        mercadoId: loja.id,
        redeId: rede.id,
        nome: loja.nome,
        endereco: loja.endereco,
        distanciaKm: loja.distanciaKm,
        tipo: loja.tipo,
        preco: null,
        estado: 'none',
        fonte: null,
        motivo
      })),
      ...mercados
        .filter(
          mercado =>
            !representados.has(mercado.id) && !(mercado.redeId && redesTratadas.has(mercado.redeId))
        )
        .slice(0, 6)
        .map(mercado => ({
          mercadoId: mercado.id,
          nome: mercado.nome,
          endereco: mercado.endereco,
          distanciaKm: mercado.distanciaKm,
          tipo: mercado.tipo,
          preco: null,
          estado: 'none',
          fonte: null,
          motivo: 'sem preço online: leia uma nota desta loja para entrar na comparação'
        }))
    ];

    const produto = alvo?.referencia.produto || produtoDaNota || null;
    let historico = null;
    if (alvo) {
      const todos = await PrecoModel.listar();
      const doAlvo = todos.filter(preco => preco.origem === 'site' && preco.chave === alvo.chave);
      const dias = new Set(doAlvo.map(preco => preco.data.slice(0, 10)));
      if (dias.size >= 2)
        historico = ComparacaoModel.historico(
          doAlvo,
          [...new Set(doAlvo.map(preco => preco.mercadoId))],
          RedeModel.listar().map(rede => ({ id: `rede-${rede.id}`, nome: rede.nome }))
        );
    }

    return {
      produto,
      categoria: produto ? categoriaDoProduto(produto) : null,
      opcao: alvo?.chave || null,
      opcoes: grupos.slice(0, 30).map(grupo => ({
        chave: grupo.chave,
        produto: grupo.referencia.produto,
        marca: marcaBonita(grupo.referencia.marca),
        menorPreco: grupo.menor,
        redes: grupo.ofertas.size
      })),
      sugestoes: grupos.slice(0, 6).map(grupo => grupo.referencia.produto),
      mercados: [
        ...comPreco.map(linha => ({
          ...linha,
          melhor: linha === melhor,
          habitual: linha === habitual,
          difMelhor: melhor ? round2(linha.preco - melhor.preco) : null,
          difHabitual: habitual ? round2(linha.preco - habitual.preco) : null
        })),
        ...semPreco
      ],
      historico,
      troca:
        melhor && habitual && melhor !== habitual && melhor.igual && habitual.igual
          ? {
              de: habitual.nome,
              para: melhor.nome,
              economia: round2(habitual.preco - melhor.preco),
              distanciaExtraKm: round2(melhor.distanciaKm - habitual.distanciaKm)
            }
          : null,
      fontes: {
        redes: resultados.filter(item => item.produtos.length).map(item => item.rede.nome),
        notas: comPreco.filter(linha => linha.fonte === 'nota').length,
        cep
      }
    };
  },

  /** Nomes de produto para o campo de busca, tirados do site das redes mais perto. */
  async sugestoes(termo, mercados, cep = '') {
    const lojas = lojasPorRede(mercados).slice(0, 3);
    const listas = await Promise.all(
      lojas.map(({ rede }) => CatalogoModel.buscar(rede, termo, cep))
    );
    const nomes = [];
    listas
      .flatMap(lista => lista.produtos)
      .sort((a, b) => b.score - a.score)
      .forEach(item => {
        if (nomes.length < 8 && !nomes.includes(item.produto)) nomes.push(item.produto);
      });
    return nomes;
  },

  /**
   * Total da lista em cada mercado da região, de um jeito justo: o mercado que não vende um item
   * não "ganha" por isso.
   * - exato: o produto escolhido (ou, num item genérico, o mais parecido) com o preço da loja;
   * - substituto: a loja não tem o produto escolhido, mas tem um equivalente (mesmo tipo, tamanho e
   *   variante, outra marca), que entra com o preço dele e o nome à mostra;
   * - faltando: nem equivalente; entra no total comparável com a mediana do item nos outros mercados.
   * Também procura a melhor divisão da compra em dois mercados.
   */
  async lista(itens, mercados, habitualId, cep = '') {
    const lojas = lojasPorRede(mercados);
    const tarefas = [];
    itens.forEach((item, i) =>
      lojas.forEach(({ rede }, j) =>
        tarefas.push(async () => ({
          i,
          j,
          achados: (await CatalogoModel.buscar(rede, termoDoItem(item), cep)).produtos
        }))
      )
    );
    const respostas = await emLotes(tarefas);

    const daNota = await ComparacaoModel.lista(
      itens,
      mercados.filter(mercado => mercado.notaId).map(mercado => ({ ...mercado, id: mercado.notaId })),
      null
    );
    const lojaDaNota = Object.fromEntries(
      mercados.filter(mercado => mercado.notaId).map(mercado => [mercado.notaId, mercado])
    );

    const porItem = itens.map((item, i) => {
      const precos = {};
      const situacao = {};
      const substitutos = {};
      respostas
        .filter(resposta => resposta.i === i)
        .forEach(resposta => {
          const lojaId = lojas[resposta.j].loja.id;
          const oferta = ofertaDoItem(item, resposta.achados);
          if (oferta) {
            precos[lojaId] = oferta.preco;
            situacao[lojaId] = item.produto ? 'exato' : 'aproximado';
            return;
          }
          const troca = substitutoDoItem(item, resposta.achados);
          if (troca) {
            precos[lojaId] = troca.preco;
            situacao[lojaId] = 'substituto';
            substitutos[lojaId] = troca.produto;
          }
        });
      Object.entries(daNota.itens[i]?.precos || {}).forEach(([notaId, preco]) => {
        const loja = lojaDaNota[notaId];
        if (!loja || precos[loja.id] != null) return;
        precos[loja.id] = preco;
        situacao[loja.id] = 'nota';
      });
      const valores = Object.entries(precos).sort((a, b) => a[1] - b[1]);
      const melhorLoja = valores[0]
        ? mercados.find(mercado => mercado.id === valores[0][0])
        : null;
      return {
        ...item,
        produtoDaNota: daNota.itens[i]?.produtoDaNota || null,
        categoria: categoriaDoProduto(item.nome),
        precos,
        situacao,
        substitutos,
        estimativa: mediana(Object.values(precos)),
        disponivelEm: valores.length,
        melhorPreco: valores[0] ? valores[0][1] : null,
        melhorMercado: melhorLoja ? melhorLoja.nome : null
      };
    });

    const comPrecoEmAlgum = porItem.filter(item => item.estimativa != null);
    const qtd = item => Number(item.qtd) || 1;
    const lojasComPreco = mercados.filter(mercado =>
      porItem.some(item => item.precos[mercado.id] != null)
    );
    const totais = lojasComPreco.map(mercado => {
      const temAqui = item => item.precos[mercado.id] != null;
      const presentes = porItem.filter(temAqui);
      const faltando = comPrecoEmAlgum.filter(item => !temAqui(item));
      const total = round2(presentes.reduce((t, item) => t + item.precos[mercado.id] * qtd(item), 0));
      const estimado = round2(faltando.reduce((t, item) => t + item.estimativa * qtd(item), 0));
      return {
        mercadoId: mercado.id,
        nome: mercado.nome,
        distanciaKm: mercado.distanciaKm,
        total,
        estimado,
        totalComparavel: round2(total + estimado),
        itensComPreco: presentes.length,
        itensNaLista: comPrecoEmAlgum.length,
        substitutos: presentes
          .filter(item => item.situacao[mercado.id] === 'substituto')
          .map(item => ({ item: item.nome, por: item.substitutos[mercado.id] })),
        faltando: faltando.map(item => ({ item: item.nome, estimativa: item.estimativa })),
        porCategoria: presentes.reduce((acc, item) => {
          const categoria = item.categoria || 'Comida';
          acc[categoria] = round2((acc[categoria] || 0) + item.precos[mercado.id] * qtd(item));
          return acc;
        }, {})
      };
    });

    // Ranking pelo total comparável. Quem tem menos da metade da lista fica depois: o total dele
    // seria mais estimativa do que preço de verdade.
    const metade = Math.ceil(comPrecoEmAlgum.length / 2);
    const ranking = [...totais].sort(
      (a, b) =>
        Number(b.itensComPreco >= metade) - Number(a.itensComPreco >= metade) ||
        a.totalComparavel - b.totalComparavel ||
        b.itensComPreco - a.itensComPreco
    );
    const habitualMercado = habitualDe(mercados, habitualId);
    const redeDaLoja = id => mercados.find(mercado => mercado.id === id)?.redeId;
    const habitual =
      totais.find(total => habitualMercado && total.mercadoId === habitualMercado.id) ||
      totais.find(
        total => habitualMercado?.redeId && redeDaLoja(total.mercadoId) === habitualMercado.redeId
      ) ||
      null;

    return {
      itens: porItem,
      totais: ranking.slice(0, 3),
      todos: ranking,
      melhor: ranking[0] || null,
      habitual,
      divisao: melhorDivisao(comPrecoEmAlgum, ranking.slice(0, 6), ranking[0] || null),
      semPreco: porItem.filter(item => item.estimativa == null).map(item => item.nome)
    };
  }
};
