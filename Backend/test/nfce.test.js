import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.BANCO = 'memoria';
const { NfceModel, buscarNaSefaz } = await import('../src/models/NfceModel.js');

const CHAVE = '35241112345678000190650010000123451234567890';
const QR = `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE}|2|1|1|abc`;
const fetchOriginal = globalThis.fetch;

// Fetch falso: responde conforme o mapa de endereços e guarda o que foi pedido.
function fetchFalso(rotas) {
  const pedidos = [];
  globalThis.fetch = async (endereco, opcoes) => {
    pedidos.push({ endereco: String(endereco), opcoes });
    const rota = rotas[String(endereco)];
    if (!rota) throw new Error(`endereço inesperado: ${endereco}`);
    return new Response(rota.corpo ?? '', {
      status: rota.status ?? 200,
      headers: rota.location ? { location: rota.location } : { 'content-type': 'text/html' }
    });
  };
  return pedidos;
}

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

test('nota: redirecionamento para fora do .gov.br é recusado sem buscar o destino', async () => {
  const pedidos = fetchFalso({ [QR]: { status: 302, location: 'http://169.254.169.254/dados' } });
  await assert.rejects(NfceModel.ler(QR), erro => {
    assert.equal(erro.status, 502);
    assert.match(erro.message, /endereço desconhecido/);
    return true;
  });
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0].opcoes.redirect, 'manual');
});

test('nota: redirecionamento para outro protocolo é recusado', async () => {
  fetchFalso({ [QR]: { status: 301, location: 'ftp://www.fazenda.sp.gov.br/x' } });
  await assert.rejects(NfceModel.ler(QR), { status: 502 });
});

test('nota: segue redirecionamentos dentro do .gov.br, inclusive relativos', async () => {
  const pedidos = fetchFalso({
    [QR]: { status: 302, location: 'https://outra.sefaz.gov.br/consulta' },
    'https://outra.sefaz.gov.br/consulta': { status: 303, location: '/final' },
    'https://outra.sefaz.gov.br/final': { corpo: '<html>ok</html>' }
  });
  const resposta = await buscarNaSefaz(new URL(QR));
  assert.equal(resposta.status, 200);
  assert.equal(await resposta.text(), '<html>ok</html>');
  assert.equal(pedidos.length, 3);
});

test('nota: mais de 5 redirecionamentos é recusado', async () => {
  const rotas = {};
  for (let i = 0; i < 7; i++)
    rotas[i ? `https://a.gov.br/${i}` : QR] = { status: 302, location: `https://a.gov.br/${i + 1}` };
  const pedidos = fetchFalso(rotas);
  await assert.rejects(buscarNaSefaz(new URL(QR)), { status: 502 });
  assert.equal(pedidos.length, 6);
});
