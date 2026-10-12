import { HttpError } from '../utils/http.js';
import { round2 } from '../utils/money.js';

// Leitura da NFC-e pelo endereço do QR Code. O QR aponta para a consulta pública da Sefaz
// do estado (sempre um site .gov.br); a página traz emitente, itens, preços e total.
// O layout lido aqui é o do "Portal da NFC-e" usado pela maioria dos estados (SP, RS, PR, BA, GO...).

const ENTIDADES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ordm: 'º', ordf: 'ª' };

const limpar = html =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (tudo, nome) => ENTIDADES[nome.toLowerCase()] ?? tudo)
    .replace(/\s+/g, ' ')
    .trim();

const numero = texto => {
  const achado = /-?[\d.]*\d,\d+|-?\d+(?:\.\d+)?/.exec(String(texto || ''));
  if (!achado) return null;
  const bruto = achado[0].includes(',') ? achado[0].replace(/\./g, '').replace(',', '.') : achado[0];
  const valor = Number(bruto);
  return Number.isFinite(valor) ? valor : null;
};

const primeiro = (regex, html) => {
  const achado = regex.exec(html);
  return achado ? limpar(achado[1]) : '';
};

// Conteúdo do primeiro <span> com a classe pedida (a classe precisa bater inteira).
const doSpan = (classe, html) =>
  primeiro(
    new RegExp(String.raw`<span[^>]*class=["']?(?:[^"'>]*\s)?${classe}(?=["'\s>])[^>]*>([\s\S]*?)<\/span>`, 'i'),
    html
  );

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'sem', 'em']);

/** "ARROZ TIO JOAO T1 5KG" → "Arroz Tio Joao T1 5kg" */
export function nomeDeProduto(descricao) {
  return limpar(descricao)
    .toLowerCase()
    .split(' ')
    .map((palavra, i) =>
      /\d/.test(palavra) || (i > 0 && MINUSCULAS.has(palavra))
        ? palavra
        : palavra.charAt(0).toUpperCase() + palavra.slice(1)
    )
    .join(' ');
}

const LIMPEZA = /sabao|sabão|detergente|amaciante|desinfetante|sanitaria|sanitária|alvejante|limpador|esponja|lava roupa|multiuso/i;
const HIGIENE = /shampoo|xampu|condicionador|sabonete|creme dental|dental|escova|papel hig|desodorante|absorvente|fralda/i;

export const categoriaDoProduto = nome =>
  LIMPEZA.test(nome) ? 'Limpeza' : HIGIENE.test(nome) ? 'Higiene' : 'Comida';

export function validarEndereco(texto) {
  let url;
  try {
    url = new URL(String(texto || '').trim());
  } catch {
    throw new HttpError(
      400,
      'Isso não parece o link de uma NFC-e. Aponte a câmera para o QR Code no rodapé da nota.'
    );
  }
  const host = url.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || !host.endsWith('.gov.br'))
    throw new HttpError(
      400,
      'Este QR Code não é de uma nota fiscal: o link precisa ser da Sefaz (.gov.br).'
    );
  return url;
}

export function chaveDoEndereco(url) {
  const bruto =
    url.searchParams.get('p') ||
    url.searchParams.get('chNFe') ||
    url.searchParams.get('chave') ||
    url.href;
  const achado = /\d{44}/.exec(decodeURIComponent(bruto).replace(/\s/g, ''));
  return achado ? achado[0] : null;
}

/** Lê a página de consulta pública e devolve os dados da nota. Função pura: recebe o HTML. */
export function interpretarPagina(html, chave) {
  const itens = [];
  const linhas = html.split(/<tr[^>]*id=["']?Item\s*\+?\s*\d+/i).slice(1);
  linhas.forEach(linha => {
    const descricao = doSpan('txtTit', linha);
    if (!descricao) return;
    const quantidade = numero(doSpan('Rqtd', linha)) || 1;
    const unidade = doSpan('RUN', linha)
      .replace(/UN:\s*/i, '')
      .trim();
    const unitario = numero(doSpan('RvlUnit', linha));
    const total = numero(doSpan('valor', linha));
    const codigo = doSpan('RCod', linha).replace(/\D/g, '');
    const preco = unitario ?? (total != null ? round2(total / quantidade) : null);
    if (preco == null || preco <= 0) return;
    itens.push({
      produto: nomeDeProduto(descricao),
      descricao,
      codigo,
      quantidade,
      unidade: unidade || 'UN',
      preco: round2(preco),
      total: round2(total ?? preco * quantidade),
      categoria: categoriaDoProduto(descricao)
    });
  });

  const estabelecimento =
    primeiro(/id=["']?u20[^>]*>([\s\S]*?)<\/div>/i, html) ||
    primeiro(/class=["']?txtTopo[^>]*>([\s\S]*?)<\/div>/i, html);
  const textos = [...html.matchAll(/<div[^>]*class=["']?text["'\s>][^>]*>([\s\S]*?)<\/div>/gi)].map(
    achado => limpar(achado[1])
  );
  const linhaCnpj = textos.find(texto => /CNPJ/i.test(texto)) || '';
  const cnpj = (/[\d./-]{14,18}/.exec(linhaCnpj) || [''])[0].replace(/\D/g, '');
  const endereco = (textos[textos.indexOf(linhaCnpj) + 1] || '')
    .replace(/,\s*,/g, ',')
    .replace(/\s+,/g, ',')
    .trim();
  const totalPagina = numero(
    doSpan('txtMax', html)
  );
  const emissao = /Emiss[ãa]o:?\s*(?:<[^>]*>\s*)*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})/i.exec(
    html
  );

  return {
    chave,
    estabelecimento: estabelecimento || 'Nota fiscal',
    cnpj,
    endereco,
    itens,
    valor: round2(totalPagina ?? itens.reduce((soma, item) => soma + item.total, 0)),
    compradoEm: emissao
      ? new Date(`${emissao[3]}-${emissao[2]}-${emissao[1]}T${emissao[4]}-03:00`).toISOString()
      : null
  };
}

function decodificar(buffer, tipo) {
  const charset = (/charset=([\w-]+)/i.exec(tipo || '') || [])[1] || 'utf-8';
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

export const NfceModel = {
  async ler(texto) {
    const url = validarEndereco(texto);
    const chave = chaveDoEndereco(url);
    if (!chave) throw new HttpError(400, 'Não achei a chave de acesso de 44 números neste QR Code.');

    let resposta;
    try {
      resposta = await fetch(url.href, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        },
        signal: AbortSignal.timeout(15000)
      });
    } catch {
      throw new HttpError(
        502,
        'O site da Sefaz não respondeu. Tente de novo em alguns minutos ou lance o gasto à mão.'
      );
    }
    if (!new URL(resposta.url || url.href).hostname.endsWith('.gov.br'))
      throw new HttpError(502, 'A Sefaz redirecionou para um endereço desconhecido.');
    if (!resposta.ok)
      throw new HttpError(502, `A Sefaz respondeu com erro (${resposta.status}). Tente de novo.`);

    const html = decodificar(await resposta.arrayBuffer(), resposta.headers.get('content-type'));
    const nota = interpretarPagina(html, chave);
    const temEmitente = /txtTopo|id=["']?u20/i.test(html);
    if (!nota.itens.length && !temEmitente)
      throw new HttpError(
        404,
        'A Sefaz não mostrou os dados desta nota. Confira se o QR Code é de uma NFC-e (notas emitidas agora podem levar alguns minutos para aparecer) ou lance o gasto à mão.'
      );
    if (!nota.itens.length)
      throw new HttpError(
        422,
        'A Sefaz do seu estado mostrou a nota num formato que a vera ainda não lê. Lance o gasto à mão.'
      );
    return nota;
  }
};
