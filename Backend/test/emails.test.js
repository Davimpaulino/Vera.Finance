import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import {
  MODELOS,
  camposPadrao,
  escaparHtml,
  nomesDosModelos,
  preencher,
  renderizarEmail
} from '../src/emails/index.js';
import { EXEMPLOS } from '../src/emails/exemplos.js';

// Modelos de e-mail (ainda sem envio): todo modelo monta com os dados de exemplo, nada de
// marcação sobra, e o que vem dos dados nunca vira HTML nem marcação.
const SITE = 'https://site.teste';

test('escaparHtml troca os cinco caracteres que quebram o HTML', () => {
  assert.equal(escaparHtml(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  assert.equal(escaparHtml(42), '42');
});

test('todo modelo tem HTML, texto e exemplo, e nenhum arquivo sobra em modelos/', () => {
  const arquivos = readdirSync(new URL('../src/emails/modelos/', import.meta.url)).sort();
  const esperados = nomesDosModelos().flatMap(nome => [`${nome}.html`, `${nome}.txt`]).sort();
  assert.deepEqual(arquivos, esperados);
  assert.deepEqual(Object.keys(EXEMPLOS).sort(), nomesDosModelos().sort());
});

test('todo modelo monta com os dados de exemplo, sem marcação sobrando', () => {
  for (const nome of nomesDosModelos()) {
    const { assunto, html, texto } = renderizarEmail(nome, EXEMPLOS[nome], { site: SITE });
    assert.ok(assunto && !/[\r\n]/.test(assunto), `${nome}: assunto vazio ou com quebra de linha`);
    for (const [tipo, corpo] of [['html', html], ['texto', texto]]) {
      assert.doesNotMatch(corpo, /\{\{|\}\}/, `${nome} (${tipo}) sobrou marcação`);
      assert.match(corpo, /ajuda@vera\.finance/, `${nome} (${tipo}) sem o contato`);
    }
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /<html lang="pt-BR">/);
    assert.ok(html.includes(`<title>${escaparHtml(assunto)}</title>`), `${nome}: título diferente do assunto`);
    assert.doesNotMatch(texto, /<[a-z]/i, `${nome}: o texto não pode ter HTML`);
  }
});

test('o nome e os campos vêm escapados no HTML e como vieram no texto', () => {
  const nome = '<script>alert("oi")</script> & Cia';
  const { html, texto, assunto } = renderizarEmail('boas-vindas', { nome }, { site: SITE });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;alert(&quot;oi&quot;)&lt;/script&gt; &amp; Cia'));
  assert.ok(texto.includes(nome));
  assert.equal(assunto, `Boas-vindas à vera, ${nome}`);
});

test('valor com marcação não é lido de novo (uma passada só)', () => {
  const { html, texto } = renderizarEmail('boas-vindas', { nome: '{{linkApp}} {{#x}}' }, { site: SITE });
  assert.ok(html.includes('Oi, {{linkApp}} {{#x}}.'));
  assert.ok(texto.includes('Oi, {{linkApp}} {{#x}}.'));
  assert.equal(preencher('{{a}}', { a: '{{b}}', b: 'não' }), '{{b}}');
});

test('campo que falta dá erro com o nome do campo', () => {
  assert.throws(() => renderizarEmail('boas-vindas', {}), /sem o campo "nome"/);
  const { validade, ...semValidade } = EXEMPLOS['confirme-email'];
  assert.ok(validade);
  assert.throws(() => renderizarEmail('confirme-email', semValidade), /"validade"/);
  assert.throws(() => renderizarEmail('boas-vindas', { nome: { primeiro: 'Ana' } }), /texto ou número/);
});

test('link só aceita http(s)', () => {
  const dados = { ...EXEMPLOS['confirme-email'], linkConfirmacao: 'javascript:alert(1)' };
  assert.throws(() => renderizarEmail('confirme-email', dados), /linkConfirmacao/);
  assert.throws(
    () => renderizarEmail('boas-vindas', { nome: 'Ana', linkApp: 'data:text/html,oi' }),
    /linkApp/
  );
});

test('modelo desconhecido dá erro (nada de ler arquivo por nome vindo de fora)', () => {
  assert.throws(() => renderizarEmail('../layout'), /desconhecido/);
  assert.throws(() => renderizarEmail('constructor'), /desconhecido/);
});

test('lista repete o trecho por item e some quando vazia', () => {
  const dados = EXEMPLOS['alerta-preco'];
  const alerta = renderizarEmail('alerta-preco', dados, { site: SITE });
  for (const item of dados.itens) {
    assert.ok(alerta.html.includes(escaparHtml(item.item)));
    assert.ok(
      alerta.texto.includes(
        `- ${item.item} está ${item.diferenca} mais barato no ${item.mercado} do que no ${dados.mercadoHabitual}.`
      )
    );
  }
  // O texto do modelo é nosso e sai como está; só o valor de cada item é escapado.
  assert.equal(
    preencher('[{{#itens}}<b>{{x}}</b>{{/itens}}]', { itens: [{ x: '<1>' }, { x: 2 }] }),
    '[<b>&lt;1&gt;</b><b>2</b>]'
  );
  assert.equal(preencher('[{{#itens}}{{x}}{{/itens}}]', { itens: [] }), '[]');
});

test('alerta de preço diz o mesmo que o aviso do sino (AlertaDaListaModel)', async () => {
  await import('./apoio/ambiente.js');
  const { AlertaDaListaModel } = await import('../src/models/AlertaDaListaModel.js');
  const dados = EXEMPLOS['alerta-preco'];
  const [item] = dados.itens;
  // O primeiro item do exemplo, como o AlertaDaListaModel guarda no perfil.
  const perfil = {
    prefs: {},
    local: { mercadoHabitual: 'habitual', raioKm: 5 },
    alertasDaLista: {
      em: new Date().toISOString(),
      habitualId: 'habitual',
      itens: [
        {
          itemId: 'arroz',
          item: item.item,
          qtd: 1,
          mercadoId: 'outro',
          mercado: item.mercado,
          distanciaKm: 2.4,
          preco: 21.9,
          precoHabitual: 24.9,
          mercadoHabitual: dados.mercadoHabitual
        }
      ]
    }
  };
  const [aviso] = AlertaDaListaModel.notificacoes({ user: perfil, owner: perfil }, [
    { id: 'arroz', nome: item.item, done: false }
  ]);
  assert.equal(aviso.titulo, `${item.item} está mais barato no ${item.mercado}`);
  assert.equal(
    aviso.texto,
    `${item.preco} lá e ${item.precoHabitual} no ${dados.mercadoHabitual}: ` +
      `${item.diferenca} a menos (${item.percentual}), a ${item.distancia}.`
  );
  const { texto } = renderizarEmail('alerta-preco', dados, { site: SITE });
  assert.ok(
    texto.includes(
      `${item.preco} lá e ${item.precoHabitual} no ${dados.mercadoHabitual} (${item.percentual} a menos), a ${item.distancia}.`
    )
  );
  // Sem distância conhecida, a linha termina no percentual, como no sino.
  const semDistancia = { ...dados, itens: [{ ...item, distancia: undefined }] };
  const outro = renderizarEmail('alerta-preco', semDistancia, { site: SITE });
  assert.ok(outro.texto.includes(`(${item.percentual} a menos).`));
  assert.ok(outro.html.includes(`(${item.percentual} a menos).`));
  assert.doesNotMatch(outro.texto, /, a \d/);
});

test('trecho com valor simples aparece só quando o valor existe', () => {
  const dados = EXEMPLOS['recibo-pagamento'];
  const primeira = renderizarEmail('recibo-pagamento', dados, { site: SITE });
  const renovacao = renderizarEmail('recibo-pagamento', { ...dados, primeiraCompra: false }, { site: SITE });
  assert.match(primeira.texto, /desistir em até 7 dias/);
  assert.doesNotMatch(renovacao.texto, /desistir em até 7 dias/);
  assert.doesNotMatch(renovacao.html, /desistir em até 7 dias/);
});

test('assunto sem quebra de linha, mesmo com valor que tem quebra', () => {
  const { assunto } = renderizarEmail('boas-vindas', { nome: 'Ana\r\nBcc: alguem@exemplo.com' }, { site: SITE });
  assert.equal(assunto, 'Boas-vindas à vera, Ana Bcc: alguem@exemplo.com');
});

test('links padrão usam o site informado, sem barra dupla', () => {
  const campos = camposPadrao('https://site.teste/');
  assert.equal(campos.linkApp, 'https://site.teste/app');
  assert.equal(campos.linkConfiguracoes, 'https://site.teste/app/configuracoes');
  const { html } = renderizarEmail('boas-vindas', { nome: 'Ana' }, { site: 'https://site.teste/' });
  assert.ok(html.includes('href="https://site.teste/app"'));
});

test('todo modelo tem assunto, prévia e rodapé', () => {
  for (const [nome, modelo] of Object.entries(MODELOS))
    for (const campo of ['assunto', 'previa', 'rodape'])
      assert.ok(modelo[campo], `${nome} sem ${campo}`);
});
