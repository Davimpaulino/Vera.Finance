import { useState } from 'react';
import { Button, Callout, Input } from '../../components/ds/index.js';
import { SiteLayout } from '../../components/site/SiteLayout.jsx';
import { SiteFooter } from '../../components/site/SiteFooter.jsx';
import { Chamada } from '../../components/site/Chamada.jsx';
import { JsonLd } from '../../components/site/JsonLd.jsx';
import { Trilha } from '../../components/site/Trilha.jsx';
import { Link } from '../../lib/router.jsx';
import { REDES_COM_PRECO, REDES_DE_ATACADO, urlDoSite } from '../../lib/site.js';
import { metaDaPagina } from '../../lib/paginas.js';
import { km, plural } from '../../lib/format.js';
import { trilhaEstruturada } from '../../conteudo/dadosEstruturados.js';
import { api } from '../../services/api.js';
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

const formatarCep = texto =>
  texto
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2');

/**
 * Resposta de GET /api/publico/redes?cep=, do jeito que a tela usa. Aceita `mapaFalhou: true`
 * ou `situacao: 'mapaFalhou'`; quando a rota manda também mercados sem preço online (sem id ou
 * com precoOnline false), eles vão para `semPreco`. Resposta sem a lista de redes é erro.
 */
function lerResposta(r) {
  if (!r || typeof r !== 'object' || !Array.isArray(r.redes)) return null;
  const validas = r.redes.filter(rede => rede && typeof rede.nome === 'string' && rede.nome.trim());
  const temPreco = rede => !!rede.id && rede.precoOnline !== false;
  return {
    cep: typeof r.cep === 'string' ? r.cep : '',
    cidade: typeof r.cidade === 'string' ? r.cidade : '',
    raioKm: Number(r.raioKm) || null,
    mapaFalhou: r.mapaFalhou === true || r.situacao === 'mapaFalhou',
    mensagem: typeof r.mensagem === 'string' ? r.mensagem : '',
    comPreco: validas.filter(temPreco),
    semPreco: validas.filter(rede => !temPreco(rede))
  };
}

function mensagemDeErro(erro) {
  // Rota que ainda não existe neste servidor: não é culpa do CEP.
  if (erro.status === 405 || (erro.status === 404 && /rota/i.test(erro.message)))
    return 'A consulta por CEP está fora do ar agora. Veja abaixo a lista de redes com preço online.';
  if (erro.status >= 500) return 'Não deu para consultar agora. Tente de novo em alguns minutos.';
  // Sem conexão (0), CEP inválido (400), CEP que não existe (404), muitas tentativas (429).
  return erro.message || 'Não deu para consultar agora. Tente de novo em alguns minutos.';
}

// Sem distância na resposta (ou distância estranha), a linha mostra só o tipo da rede.
const distancia = valor =>
  typeof valor === 'number' && Number.isFinite(valor) && valor >= 0
    ? km(Math.round(valor * 10) / 10)
    : null;

function Resultado({ r, onTentar }) {
  const onde = [r.cep && `CEP ${r.cep}`, r.cidade].filter(Boolean).join(' · ');
  const raio = r.raioKm ? `a até ${r.raioKm} km deste CEP` : 'perto deste CEP';

  if (r.mapaFalhou)
    return (
      <Callout
        tone="warning"
        title="Não deu para ver os mercados agora"
        action={
          <Button size="sm" variant="secondary" onClick={onTentar}>
            Tentar de novo
          </Button>
        }
      >
        {r.mensagem || 'O mapa de mercados não respondeu. Tente de novo em alguns minutos.'}
      </Callout>
    );

  return (
    <div className="onde-resultado">
      {onde ? <span className="onde-resultado__onde">{onde}</span> : null}
      {r.comPreco.length ? (
        <>
          <span className="onde-resultado__titulo">
            {plural(r.comPreco.length, 'rede', 'redes')} com preço online {raio}
          </span>
          <ul className="onde-resultado__lista">
            {r.comPreco.map(rede => (
              <li key={rede.id} className="onde-resultado__rede">
                <span className="onde-resultado__nome">{rede.nome}</span>
                <span className="onde-resultado__meta">
                  {[
                    rede.tipo === 'atacado' ? 'atacado' : 'supermercado',
                    distancia(rede.distanciaKm) && `loja mais perto a ${distancia(rede.distanciaKm)}`
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
          <p className="conteudo__p">
            Na vera, você compara o preço da sua lista de compras nessas redes e nos mercados das
            notas fiscais lidas perto de você.
          </p>
        </>
      ) : (
        <>
          <span className="onde-resultado__titulo">Nenhuma rede com preço online {raio}</span>
          <p className="conteudo__p">
            Você ainda pode usar a vera: os mercados da região entram na comparação quando as notas
            fiscais das compras são lidas, e o controle de gastos funciona em qualquer lugar.
          </p>
        </>
      )}
      {r.semPreco.length ? (
        <p className="conteudo__p conteudo__p--nota">
          Outros mercados perto: {r.semPreco.map(rede => rede.nome).join(', ')}. Eles não têm preço
          online e entram na comparação quando alguém lê uma nota fiscal de lá.
        </p>
      ) : null}
      <div className="vera-cta-stack conteudo-acoes">
        <Link to="/cadastro" className="vera-btn vera-btn--primary">
          Criar conta grátis
        </Link>
      </div>
    </div>
  );
}

/** /onde-funciona: verificador de CEP e a lista das redes com preço online. */
export default function OndeFunciona() {
  const [cep, setCep] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const consultar = async () => {
    const digitos = cep.replace(/\D/g, '');
    setResultado(null);
    if (digitos.length !== 8) {
      setErro('Digite um CEP com 8 números.');
      return;
    }
    setErro('');
    setBuscando(true);
    try {
      const lido = lerResposta(await api.get(`/publico/redes?cep=${digitos}`));
      if (lido) setResultado(lido);
      else setErro('Não deu para consultar agora. Tente de novo em alguns minutos.');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setBuscando(false);
    }
  };

  const dados = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: 'Onde a vera funciona',
        description: metaDaPagina('/onde-funciona').descricao,
        url: urlDoSite('/onde-funciona'),
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

        <form
          className="onde-busca"
          onSubmit={e => {
            e.preventDefault();
            consultar();
          }}
        >
          <div className="vera-filter-row">
            <Input
              label="Seu CEP"
              placeholder="00000-000"
              inputMode="numeric"
              autoComplete="postal-code"
              numeric
              value={cep}
              onChange={e => setCep(formatarCep(e.target.value))}
              className="onde-busca__campo"
            />
            <Button type="submit" loading={buscando} loadingLabel="Consultando">
              Ver redes
            </Button>
          </div>
          <span className="onde-busca__dica">Não precisa de cadastro.</span>
        </form>

        <div aria-live="polite" className="onde-busca__saida">
          {erro ? (
            <div className="vera-form-error" role="alert">
              {erro}
            </div>
          ) : null}
          {resultado ? <Resultado r={resultado} onTentar={consultar} /> : null}
        </div>

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

        <h2 className="conteudo__h2">Como a vera compara os preços</h2>
        <ol className="conteudo__passos">
          {COMO_FUNCIONA.map(([titulo, texto]) => (
            <li key={titulo} className="conteudo__passo">
              <span className="conteudo__passo-nome">{titulo}</span>
              <p className="conteudo__p">{texto}</p>
            </li>
          ))}
        </ol>
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
      <SiteFooter />
    </SiteLayout>
  );
}
