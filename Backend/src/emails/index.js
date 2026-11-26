import { readFileSync } from 'node:fs';

// Modelos dos e-mails transacionais da vera. Aqui só se monta o e-mail (assunto, HTML e texto):
// o envio ainda não existe, porque o provedor não foi escolhido. Quem for integrar chama
// renderizarEmail(nome, dados) e entrega o resultado ao provedor.
//
// Cada modelo tem dois arquivos em modelos/ (<nome>.html e <nome>.txt), que entram no miolo de
// layout.html e layout.txt. Marcações:
// - {{campo}}: troca pelo valor. No HTML o valor sai escapado; no texto, como veio.
// - {{#lista}}...{{/lista}}: repete o trecho para cada item da lista (os campos do item valem
//   lá dentro). Com um valor que não é lista, mostra o trecho uma vez se o valor existir.
// Os valores chegam prontos para ler ("R$ 12,90", "26/11/2026"): o modelo não formata nada.
// Campo que falta dá erro, para um e-mail nunca sair com "{{nome}}" ou com um buraco no texto.

// Endereço público do site, o mesmo padrão de Frontend/src/lib/site.js.
const SITE_PADRAO = 'https://vera-finance.onrender.com';
const CONTA = 'Você recebeu este e-mail porque tem uma conta na vera.finance.';

export const MODELOS = {
  'boas-vindas': {
    assunto: 'Boas-vindas à vera, {{nome}}',
    previa: 'Sua conta está pronta. Veja por onde começar.',
    rodape: CONTA
  },
  'confirme-email': {
    assunto: 'Confirme o seu e-mail',
    previa: 'Falta um passo para usar a vera.',
    rodape:
      'Você recebeu este e-mail porque este endereço foi usado num cadastro na vera.finance. Se não foi você, é só ignorar.'
  },
  'recibo-pagamento': {
    assunto: 'Recibo do {{plano}}',
    previa: 'Pagamento de {{valor}} confirmado.',
    rodape: CONTA
  },
  'cobranca-falhou': {
    assunto: 'Não conseguimos cobrar o {{plano}}',
    previa: 'Atualize a forma de pagamento até {{dataLimite}}.',
    rodape: CONTA
  },
  'assinatura-cancelada': {
    assunto: 'Assinatura do {{plano}} cancelada',
    previa: 'O vera+ continua até {{ativaAte}}.',
    rodape: CONTA
  },
  'exclusao-agendada': {
    assunto: 'Sua conta será apagada em {{dataDaExclusao}}',
    previa: 'Até lá, dá para desistir em Configurações.',
    rodape: CONTA
  },
  'conta-apagada': {
    assunto: 'Sua conta na vera foi apagada',
    previa: 'Apagamos os seus dados, como você pediu.',
    rodape:
      'Você recebeu este e-mail porque pediu para apagar a sua conta na vera.finance. Não enviaremos outros e-mails para este endereço, a não ser que você crie uma conta nova.'
  },
  'alerta-preco': {
    assunto: 'Alerta de preço na sua lista',
    previa: 'Veja os itens da sua lista que mudaram de preço.',
    rodape: CONTA
  },
  'resumo-semanal': {
    assunto: 'Sua semana na vera: {{periodo}}',
    previa: 'Você gastou {{totalGasto}} e ainda tem {{livre}} livre no ciclo.',
    rodape: CONTA
  }
};

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa o texto para entrar no HTML, inclusive dentro de atributo entre aspas. */
export const escaparHtml = texto => String(texto).replace(/[&<>"']/g, letra => ESCAPES[letra]);

const comoVeio = texto => String(texto);

// Uma passada só pelo modelo: seção ({{#x}}...{{/x}}) ou campo ({{x}}). O que vem dos dados nunca
// é lido de novo, então um nome de produto com "{{linkApp}}" aparece como texto, não vira link.
const MARCACAO = /\{\{#([a-zA-Z]\w*)\}\}([\s\S]*?)\{\{\/\1\}\}|\{\{\s*([a-zA-Z]\w*)\s*\}\}/g;

// Campo de link só aceita http(s): nada de "javascript:" num botão, mesmo que o valor venha de fora.
const LINK_SEGURO = /^https?:\/\//i;

function valorDoCampo(chave, dados, escapar, prontos) {
  if (Object.hasOwn(prontos, chave)) return prontos[chave];
  const valor = Object.hasOwn(dados, chave) ? dados[chave] : undefined;
  if (valor === undefined || valor === null) throw new Error(`E-mail sem o campo "${chave}".`);
  if (typeof valor === 'object') throw new Error(`O campo "${chave}" do e-mail precisa ser texto ou número.`);
  const texto = String(valor);
  if (chave.startsWith('link') && !LINK_SEGURO.test(texto))
    throw new Error(`O campo "${chave}" do e-mail precisa ser um endereço http(s).`);
  return escapar(texto);
}

/**
 * Preenche um modelo. `escapar` trata cada valor (escaparHtml no HTML); `prontos` são trechos já
 * montados por este módulo (o miolo do e-mail dentro do layout), que entram sem escapar de novo.
 */
export function preencher(modelo, dados = {}, escapar = escaparHtml, prontos = {}) {
  return modelo.replace(MARCACAO, (_, secao, miolo, campo) => {
    if (campo) return valorDoCampo(campo, dados, escapar, prontos);
    const valor = Object.hasOwn(dados, secao) ? dados[secao] : undefined;
    if (Array.isArray(valor))
      return valor.map(item => preencher(miolo, { ...dados, ...item }, escapar, prontos)).join('');
    return valor ? preencher(miolo, dados, escapar, prontos) : '';
  });
}

const arquivos = new Map();
function ler(caminho) {
  if (!arquivos.has(caminho))
    arquivos.set(caminho, readFileSync(new URL(caminho, import.meta.url), 'utf8'));
  return arquivos.get(caminho);
}

/** Campos que todo e-mail já tem: links do site e endereços de contato. */
export function camposPadrao(site = process.env.SITE_URL || SITE_PADRAO) {
  const base = String(site).replace(/\/+$/, '');
  return {
    linkSite: base,
    linkApp: `${base}/app`,
    linkConfiguracoes: `${base}/app/configuracoes`,
    linkLista: `${base}/app/lista`,
    linkPrecos: `${base}/precos`,
    linkPrivacidade: `${base}/privacidade`,
    linkCadastro: `${base}/cadastro`,
    emailAjuda: 'ajuda@vera.finance',
    emailPrivacidade: 'privacidade@vera.finance'
  };
}

export const nomesDosModelos = () => Object.keys(MODELOS);

/**
 * Monta um e-mail: { assunto, html, texto }. `dados` traz os campos do modelo (veja
 * src/emails/exemplos.js); os links e contatos de camposPadrao() já vêm preenchidos e podem
 * ser trocados pelos dados. `opcoes.site` troca o endereço do site (padrão: SITE_URL).
 */
export function renderizarEmail(nome, dados = {}, opcoes = {}) {
  if (!Object.hasOwn(MODELOS, nome)) throw new Error(`Modelo de e-mail desconhecido: ${nome}.`);
  const { assunto, previa, rodape } = MODELOS[nome];
  const todos = { ...camposPadrao(opcoes.site), ...dados };
  // Assunto é cabeçalho do e-mail: sem quebra de linha, senão vira outro cabeçalho no envio.
  const linha = texto => texto.replace(/\s+/g, ' ').trim();
  const doLayout = {
    ...todos,
    assunto: linha(preencher(assunto, todos, comoVeio)),
    previa: linha(preencher(previa, todos, comoVeio)),
    rodape
  };
  const html = preencher(ler('./layout.html'), doLayout, escaparHtml, {
    conteudo: preencher(ler(`./modelos/${nome}.html`), todos, escaparHtml)
  });
  const texto = preencher(ler('./layout.txt'), doLayout, comoVeio, {
    conteudo: preencher(ler(`./modelos/${nome}.txt`), todos, comoVeio).trim()
  });
  return { assunto: doLayout.assunto, html, texto };
}
