import { useState } from 'react';
import { Button, Callout, Input } from '../ds/index.js';
import { Link } from '../../lib/router.jsx';
import { km, plural } from '../../lib/format.js';
import { api } from '../../services/api.js';

// Verificador público de CEP (GET /api/publico/redes): o campo, o botão e o resultado.
// Usado na página Onde funciona e nas páginas das cidades. O CSS fica em
// pages/site/css/onde-funciona.css, que as duas páginas importam.

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

/** Campo de CEP que consulta as redes com preço online perto daquele CEP. */
export function VerificadorDeCep() {
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

  return (
    <div className="onde-consulta">
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
    </div>
  );
}
