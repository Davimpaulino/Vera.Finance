import { SiteLayout } from '../../components/site/SiteLayout.jsx';
import { Chamada } from '../../components/site/Chamada.jsx';
import { JsonLd } from '../../components/site/JsonLd.jsx';
import { Trilha } from '../../components/site/Trilha.jsx';
import { VerificadorDeCep } from '../../components/site/VerificadorDeCep.jsx';
import { Link } from '../../lib/router.jsx';
import { REDES_COM_PRECO, REDES_DE_ATACADO } from '../../lib/site.js';
import { metaDaPagina, urlDaPagina } from '../../lib/paginas.js';
import { km, plural } from '../../lib/format.js';
import { trilhaEstruturada } from '../../conteudo/dadosEstruturados.js';
import { dataPorExtenso } from '../../conteudo/formato.js';
import { CIDADES, temLevantamento } from '../../conteudo/cidades.js';
import './css/conteudo.css';
import './css/onde-funciona.css';

const TRILHA = [
  ['Início', '/'],
  ['Onde a vera funciona', '/onde-funciona']
];

// Lista estática (lib/site.js), que vai pronta no HTML para buscadores e IAs.
const ATACADOS = REDES_COM_PRECO.filter(nome => REDES_DE_ATACADO.includes(nome));
const MERCADOS = REDES_COM_PRECO.filter(nome => !REDES_DE_ATACADO.includes(nome));

const COMO_FUNCIONA = [
  [
    'Preço do site da rede para o seu CEP',
    'A vera consulta o site público de cada rede que tem loja no seu raio de busca, de 2 a 15 km do CEP. Na maioria das redes, o preço é o da loja que atende o seu CEP; em algumas, o site tem um preço só para todo lugar.'
  ],
  [
    'Preço das notas fiscais lidas',
    'Qualquer mercado entra na comparação quando alguém lê a nota fiscal (NFC-e) de uma compra feita lá. Vale o preço mais recente da loja, de até 45 dias atrás, sempre com a data à mostra.'
  ],
  [
    'O preço que vale é o do caixa',
    'O site da rede muda e a loja física pode ter outro preço. A comparação ajuda a escolher onde comprar, mas é uma estimativa.'
  ]
];

/** Os três jeitos de a vera achar preço, iguais em todas as páginas de Onde funciona. */
function ComoAVeraCompara() {
  return (
    <>
      <h2 className="conteudo__h2">Como a vera compara os preços</h2>
      <ol className="conteudo__passos">
        {COMO_FUNCIONA.map(([titulo, texto]) => (
          <li key={titulo} className="conteudo__passo">
            <span className="conteudo__passo-nome">{titulo}</span>
            <p className="conteudo__p">{texto}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

/** /onde-funciona: verificador de CEP e a lista das redes com preço online. */
export default function OndeFunciona() {
  const dados = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: 'Onde a vera funciona',
        description: metaDaPagina('/onde-funciona').descricao,
        url: urlDaPagina('/onde-funciona'),
        inLanguage: 'pt-BR'
      },
      trilhaEstruturada(TRILHA)
    ]
  };

  return (
    <SiteLayout>
      <section className="conteudo">
        <Trilha itens={TRILHA} />
        <header className="conteudo__cabeca">
          <h1 className="conteudo__title">Onde a vera funciona</h1>
          <p className="conteudo__lead">
            Digite o seu CEP e veja quais redes com preço online têm loja perto de você. Os outros
            mercados da região entram na comparação quando alguém lê uma nota fiscal de lá.
          </p>
        </header>

        <VerificadorDeCep />

        <h2 className="conteudo__h2">As {REDES_COM_PRECO.length} redes com preço online</h2>
        <p className="conteudo__p">
          A vera consulta o preço no site destas redes quando há uma loja delas no seu raio de busca.
          A vera não tem vínculo com as redes citadas.
        </p>
        <div className="onde-grupos">
          {[
            ['Supermercados', MERCADOS],
            ['Atacados e atacarejos', ATACADOS]
          ].map(([titulo, nomes]) => (
            <div key={titulo} className="onde-grupo">
              <h3 className="onde-grupo__titulo">
                {titulo} <span className="onde-grupo__total">{nomes.length}</span>
              </h3>
              <ul className="onde-grupo__lista">
                {nomes.map(nome => (
                  <li key={nome} className="onde-grupo__rede">
                    {nome}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h2 className="conteudo__h2">Páginas por cidade</h2>
        <p className="conteudo__p">
          Como a vera compara o preço de supermercado em algumas das maiores cidades do Brasil.
        </p>
        <ul className="onde-cidades">
          {CIDADES.map(cidade => (
            <li key={cidade.slug}>
              <Link to={cidade.caminho} className="onde-cidades__link">
                {cidade.nome} <span className="onde-cidades__uf">{cidade.uf}</span>
              </Link>
            </li>
          ))}
        </ul>

        <ComoAVeraCompara />
        <p className="conteudo__p">
          Os detalhes estão em <Link to="/ajuda/como-funciona-a-comparacao">como funciona a
          comparação de preços</Link> e em{' '}
          <Link to="/ajuda/preco-diferente-na-loja">por que o preço pode ser diferente na loja</Link>.
          Para escolher entre um atacado e o mercado do bairro, leia{' '}
          <Link to="/blog/atacarejo-ou-supermercado-quando-compensa">
            atacarejo ou supermercado: quando compensa
          </Link>
          . Outras dúvidas estão nas <Link to="/perguntas">perguntas frequentes</Link>.
        </p>

        <Chamada />
      </section>
      <JsonLd dados={dados} />
    </SiteLayout>
  );
}

const maiuscula = texto => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Supermercado ou atacado, as lojas e a distância da mais perto até o centro. */
const detalheDaRede = rede =>
  [
    rede.tipo === 'atacado' ? 'atacado' : 'supermercado',
    plural(rede.lojas, 'loja', 'lojas'),
    `a mais perto a ${km(rede.distanciaKm)} do centro`
  ].join(' · ');

/**
 * /onde-funciona/<cidade>: como a vera compara o preço na cidade, o verificador de CEP e, quando
 * há levantamento (src/conteudo/cidades.json), as redes com preço online perto do centro.
 */
export function OndeFuncionaNaCidade({ cidade }) {
  const trilha = [...TRILHA, [cidade.nome, cidade.caminho]];
  const levantada = temLevantamento(cidade);
  const dados = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: `Comparar preço de supermercado ${cidade.em}`,
        description: metaDaPagina(cidade.caminho).descricao,
        url: urlDaPagina(cidade.caminho),
        inLanguage: 'pt-BR'
      },
      trilhaEstruturada(trilha)
    ]
  };

  return (
    <SiteLayout>
      <section className="conteudo">
        <Trilha itens={trilha} />
        <header className="conteudo__cabeca">
          <h1 className="conteudo__title">Comparar preço de supermercado {cidade.em}</h1>
          <p className="conteudo__lead">
            {maiuscula(cidade.em)} ({cidade.uf}), a vera compara o preço da sua lista de compras nos
            mercados num raio de 2 a 15 km do seu CEP. Entram o preço do site das redes com preço
            online e o das notas fiscais lidas por quem usa a vera.
          </p>
        </header>

        <VerificadorDeCep />

        {levantada ? (
          <>
            <h2 className="conteudo__h2">
              Redes com preço online a até {cidade.raioKm} km do centro {cidade.de}
            </h2>
            {cidade.redes.length ? (
              <ul className="onde-resultado__lista onde-cidade__redes">
                {cidade.redes.map(rede => (
                  <li key={rede.id} className="onde-resultado__rede">
                    <span className="onde-resultado__nome">{rede.nome}</span>
                    <span className="onde-resultado__meta">{detalheDaRede(rede)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="conteudo__p">
                Nenhuma rede com preço online tinha loja a até {cidade.raioKm} km do centro. Os
                mercados da cidade entram na comparação quando alguém lê uma nota fiscal de lá.
              </p>
            )}
            <p className="conteudo__p conteudo__p--nota">
              Levantamento de {dataPorExtenso(cidade.levantadoEm)} com dados do OpenStreetMap
              {Number.isFinite(cidade.totalMercados)
                ? `: ${plural(cidade.totalMercados, 'mercado', 'mercados')} no mapa a até ${cidade.raioKm} km do centro`
                : ''}
              . As redes perto de você dependem do seu CEP: consulte no campo acima. A vera não tem
              vínculo com as redes citadas.
            </p>
          </>
        ) : (
          <>
            <h2 className="conteudo__h2">Quais redes têm loja perto de você</h2>
            <p className="conteudo__p">
              Digite o seu CEP no campo acima e veja quais das {REDES_COM_PRECO.length} redes com
              preço online têm loja a até {cidade.raioKm} km de você {cidade.em}. Os outros mercados da
              região entram na comparação quando alguém lê uma nota fiscal de lá.
            </p>
          </>
        )}

        <ComoAVeraCompara />
        <p className="conteudo__p">
          A lista de todas as redes com preço online e as outras cidades estão em{' '}
          <Link to="/onde-funciona">onde a vera funciona</Link>. Os detalhes da comparação estão em{' '}
          <Link to="/ajuda/como-funciona-a-comparacao">como funciona a comparação de preços</Link>.
        </p>

        <Chamada />
      </section>
      <JsonLd dados={dados} />
    </SiteLayout>
  );
}
