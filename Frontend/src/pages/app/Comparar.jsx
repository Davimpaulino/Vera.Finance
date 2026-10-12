import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Icon,
  Input,
  PriceTag,
  ProjectionLine
} from '../../components/ds/index.js';
import { SectionHead } from '../../components/SectionHead.jsx';
import { PageError, PageSkeleton } from '../../components/Loading.jsx';
import { useRouter } from '../../lib/router.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useShell } from '../../components/app/AppShell.jsx';
import { api } from '../../services/api.js';
import { brlCents, diaDeMes, idadeNota, km, mes, plural } from '../../lib/format.js';
import { cx } from '../../lib/cx.js';
import './css/comparar.css';

function origemDoPreco(m) {
  if (m.estado === 'none') return undefined;
  if (m.fonte === 'site') return m.regional ? 'site · preço para o seu CEP' : 'site da rede · hoje';
  return `${idadeNota(m.idadeDias)} · ${plural(m.leituras, 'leitura', 'leituras')}`;
}

function difTexto(m) {
  if (m.estado === 'none') return [m.motivo || 'nenhum preço deste produto aqui ainda', null];
  if (m.estado === 'aged') return ['preço velho: pode ter mudado', 'warning'];
  if (m.melhor)
    return m.difHabitual < 0
      ? [`${brlCents(-m.difHabitual)} abaixo do seu mercado de sempre`, 'success']
      : ['o menor preço do seu raio', 'success'];
  if (m.habitual) return ['o seu mercado de sempre', null];
  if (m.difMelhor < 0) return [`${brlCents(-m.difMelhor)} mais barato, mas é outro produto`, null];
  return [`${brlCents(m.difMelhor)} acima do mais barato`, null];
}

export default function Comparar() {
  const { navigate } = useRouter();
  const { toast } = useUi();
  const { abrirLeitor } = useShell();
  const [q, setQ] = useState(
    () => new URLSearchParams(window.location.search).get('produto') || 'Arroz 5kg'
  );
  const [sugestoes, setSugestoes] = useState([]);
  const [r, setR] = useState(null);
  const [error, setError] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [abertas, setAbertas] = useState(false);
  const [termo, setTermo] = useState('');
  const [todasOpcoes, setTodasOpcoes] = useState(false);
  const [ativa, setAtiva] = useState(-1);
  const [localizando, setLocalizando] = useState(false);
  const { setUser } = useAuth();

  const comparar = useCallback(
    async (termo, opcao) => {
      const t = (termo ?? q).trim();
      if (t.length < 2) return;
      setCarregando(true);
      try {
        setR(
          await api.get(
            `/mercados/comparar?produto=${encodeURIComponent(t)}${opcao ? `&opcao=${encodeURIComponent(opcao)}` : ''}`
          )
        );
        setTermo(t);
        setError(null);
      } catch (e) {
        setError(e);
      } finally {
        setCarregando(false);
      }
    },
    [q]
  );

  useEffect(() => {
    comparar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (q.trim().length < 2) {
      setSugestoes([]);
      return undefined;
    }
    const t = setTimeout(
      () =>
        api
          .get(`/mercados/produtos?q=${encodeURIComponent(q)}`)
          .then(setSugestoes)
          .catch(() => {}),
      200
    );
    return () => clearTimeout(t);
  }, [q]);

  const escolherSugestao = sugestao => {
    setQ(sugestao);
    setAbertas(false);
    comparar(sugestao);
  };

  const teclarNaBusca = e => {
    if (!abertas || !sugestoes.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      setAtiva(i => Math.max(0, Math.min(sugestoes.length - 1, i + passo)));
    } else if (e.key === 'Enter' && ativa >= 0) {
      e.preventDefault();
      escolherSugestao(sugestoes[ativa]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setAbertas(false);
    }
  };

  // Guarda a posição atual para medir a distância real até os mercados das notas lidas.
  const usarLocalizacao = () => {
    if (!navigator.geolocation) {
      toast('Este navegador não informa a localização.', 'danger');
      return;
    }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      async posicao => {
        try {
          setUser(
            await api.patch('/me', {
              local: { lat: posicao.coords.latitude, lng: posicao.coords.longitude }
            })
          );
          toast('Localização atualizada. Os mercados agora são medidos a partir daqui.');
          comparar();
        } catch (e) {
          toast(e.message, 'danger');
        } finally {
          setLocalizando(false);
        }
      },
      erro => {
        setLocalizando(false);
        toast(
          erro.code === 1
            ? 'A localização foi bloqueada. Libere nas permissões do navegador.'
            : 'Não deu para pegar a localização agora.',
          'danger'
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  };

  const levar = async () => {
    try {
      const escolhida = (r.opcoes || []).find(opcao => opcao.chave === r.opcao);
      await api.post(
        '/lista',
        escolhida
          ? {
              nome: escolhida.produto,
              produto: {
                chave: escolhida.chave,
                ean: escolhida.ean || '',
                marca: escolhida.marca,
                tamanho: escolhida.tamanho || '',
                termo
              }
            }
          : { nome: r.produto }
      );
      toast(`${r.produto} foi para a lista.`);
    } catch (e) {
      toast(e.message, 'danger');
    }
  };

  const comPreco = r ? r.mercados.filter(m => m.estado !== 'none').length : 0;

  return (
    <div className="vera-page vera-stack vera-stack--24">
      <Card wide gap={18} className="cmp-busca-card">
        <form
          className="cmp-busca"
          onSubmit={e => {
            e.preventDefault();
            comparar();
          }}
        >
          <div className="cmp-busca__campo">
            <Input
              label="Qual produto?"
              icon="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={abertas && sugestoes.length ? 'true' : 'false'}
              aria-controls="cmp-sugestoes"
              autoComplete="off"
              value={q}
              onChange={e => {
                setQ(e.target.value);
                setAbertas(true);
                setAtiva(-1);
              }}
              onFocus={() => setAbertas(true)}
              onBlur={() => setAbertas(false)}
              onKeyDown={teclarNaBusca}
              placeholder="arroz 5kg, leite integral, sabão em pó"
            />
            {abertas && sugestoes.length ? (
              <ul id="cmp-sugestoes" role="listbox" className="vera-select__list cmp-sugestoes">
                {sugestoes.map((sugestao, i) => (
                  <li
                    key={sugestao}
                    role="option"
                    aria-selected={i === ativa ? 'true' : 'false'}
                    className={cx(
                      'vera-select__option',
                      i === ativa && 'vera-select__option--ativa'
                    )}
                    onPointerDown={e => e.preventDefault()}
                    onPointerEnter={() => setAtiva(i)}
                    onClick={() => escolherSugestao(sugestao)}
                  >
                    <Icon name="search" size={14} className="vera-select__icone" />
                    <span className="vera-select__option-label">{sugestao}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="cmp-busca__botao">
            <Button
              type="submit"
              icon="arrow-left-right"
              size="lg"
              block
              loading={carregando}
              loadingLabel="Comparando"
            >
              Comparar
            </Button>
          </div>
        </form>
      </Card>

      {r && !r.temLocalizacao ? (
        <Callout
          tone="info"
          title="Veja os mercados de verdade perto de você"
          action={
            <Button
              size="sm"
              variant="secondary"
              icon="store"
              onClick={usarLocalizacao}
              loading={localizando}
              loadingLabel="Localizando"
            >
              Usar minha localização
            </Button>
          }
        >
          Para comparar, a vera precisa saber onde você está. Com a sua localização (ou o CEP em
          Configurações), ela busca os mercados reais da região e os preços nos sites das redes.
        </Callout>
      ) : null}

      {r && r.mapaFalhou ? (
        <Callout
          tone="warning"
          title="O mapa de mercados não respondeu"
          action={
            <Button size="sm" variant="secondary" onClick={() => comparar()}>
              Tentar de novo
            </Button>
          }
        >
          O serviço que lista os mercados perto de você (OpenStreetMap) está lento agora. Tente de
          novo em alguns segundos.
        </Callout>
      ) : null}
      {r && r.modo === 'real' && !r.mapaFalhou && !r.totalMercados ? (
        <Callout tone="info" title="Nenhum mercado no seu raio">
          Não achamos supermercados a até {km(r.raioKm)} de você. Aumente o raio de busca em
          Configurações.
        </Callout>
      ) : null}

      {error ? <PageError error={error} onRetry={() => comparar()} /> : null}
      {!r && !error ? <PageSkeleton /> : null}
      {r && r.temLocalizacao && !r.produto ? (
        <Card>
          <EmptyState
            icon="search"
            title="Nenhuma nota com esse produto"
            action={
              <Button size="sm" icon="scan-line" onClick={abrirLeitor}>
                Ler uma nota fiscal
              </Button>
            }
          >
            Nenhum site de rede nem nota lida no seu raio tem “{q}”. Tente um nome mais curto, como
            “arroz 5kg” ou “leite integral”. Cada nota lida soma os preços dela à comparação.
          </EmptyState>
        </Card>
      ) : null}

      {r && r.opcoes && r.opcoes.length > 1 ? (
        <Card gap={14}>
          <SectionHead
            label="Escolha a marca e o tamanho"
            meta={`${r.opcoes.length} produtos encontrados para “${termo}”`}
          />
          <div className="cmp-opcoes">
            {(todasOpcoes ? r.opcoes : r.opcoes.slice(0, 8)).map(opcao => (
              <button
                key={opcao.chave}
                type="button"
                aria-pressed={opcao.chave === r.opcao ? 'true' : 'false'}
                className="cmp-opcao"
                onClick={() => comparar(termo, opcao.chave)}
              >
                <span className="cmp-opcao__nome">{opcao.produto}</span>
                <span className="cmp-opcao__meta">
                  {opcao.marca ? `${opcao.marca} · ` : ''}a partir de {brlCents(opcao.menorPreco)}
                  {opcao.redes > 1 ? ` · em ${opcao.redes} redes` : ''}
                </span>
              </button>
            ))}
          </div>
          {r.opcoes.length > 8 ? (
            <button
              type="button"
              className="v-more cmp-opcoes__mais"
              onClick={() => setTodasOpcoes(v => !v)}
            >
              {todasOpcoes ? 'Mostrar menos' : `Ver todos os ${r.opcoes.length}`}
              <Icon name={todasOpcoes ? 'chevron-down' : 'chevron-right'} size={16} />
            </button>
          ) : null}
        </Card>
      ) : null}

      {r && r.produto ? (
        <div className="vera-grid vera-grid--sidebar">
          <div className="vera-stack vera-stack--12">
            <SectionHead
              label={r.produto}
              meta={`${plural(comPreco, 'mercado', 'mercados')} no raio de ${km(r.raioKm)}`}
            />
            {r.mercados.map(m => {
              const [dif, tom] = difTexto(m);
              return (
                <Card
                  key={`${m.mercadoId}-${m.fonte}`}
                  className={cx(m.melhor && 'cmp-mercado--melhor')}
                >
                  <div className={cx('cmp-mercado', m.melhor && 'cmp-mercado--melhor')}>
                    <div className="cmp-mercado__icon">
                      <Icon name={m.tipo === 'atacado' ? 'warehouse' : 'store'} size={18} />
                    </div>
                    <div className="cmp-mercado__info">
                      <div className="cmp-mercado__nome">
                        <span className="vera-t-title">{m.nome}</span>
                        {m.melhor ? (
                          <Badge tone="success" icon="trending-down">
                            mais barato
                          </Badge>
                        ) : null}
                      </div>
                      <span className="vera-t-meta">
                        {m.endereco ? `${m.endereco} · ` : ''}
                        {km(m.distanciaKm)}
                      </span>
                      <span className={cx('cmp-dif', tom && `cmp-dif--${tom}`)}>{dif}</span>
                      {m.produtoNaLoja && m.fonte === 'site' ? (
                        <span className="cmp-produto">
                          {m.igual ? m.produtoNaLoja : `parecido: ${m.produtoNaLoja}`}
                        </span>
                      ) : null}
                      {m.lojaOnline ? (
                        <span className="cmp-produto">loja que atende o seu CEP: {m.lojaOnline}</span>
                      ) : null}
                      {m.link ? (
                        <a
                          href={m.link}
                          target="_blank"
                          rel="noreferrer"
                          className="vera-tap cmp-produto cmp-produto--link"
                        >
                          ver no site da rede
                        </a>
                      ) : null}
                    </div>
                    <PriceTag
                      value={
                        m.preco != null
                          ? `${brlCents(m.preco)}${m.unidade === 'kg' ? '/kg' : ''}`
                          : ''
                      }
                      state={m.estado}
                      source={origemDoPreco(m)}
                      size="lg"
                      align="end"
                    />
                  </div>
                </Card>
              );
            })}
            <span className="vera-t-caption">
              {r.modo === 'real'
                ? `Mercados reais num raio de ${km(r.raioKm)} (OpenStreetMap). Preços do site das redes${r.fontes && r.fontes.redes.length ? ` (${r.fontes.redes.join(', ')})` : ''}${r.fontes && r.fontes.cep ? ` para o CEP ${r.fontes.cep.replace(/^(\d{5})/, '$1-')}` : ''}, só com o que a rede vende para você, e das notas fiscais lidas na região. O preço da loja física pode ter promoções próprias. A vera não vende produtos.`
                : 'Informe o CEP em Configurações ou use a sua localização para ver os mercados perto de você. A vera não vende produtos.'}
            </span>
          </div>

          <div className="vera-stack vera-stack--16">
            {r.historico ? (
              <Card gap={18}>
                <SectionHead label="Histórico de preço" meta="90 dias" />
                <ProjectionLine
                  points={r.historico.pontos}
                  todayIndex={r.historico.pontos.length - 1}
                  height={90}
                  label="Histórico de preço em 90 dias"
                />
                <div className="cmp-historico__eixo">
                  <span>{mes(r.historico.inicio)}</span>
                  <span>{mes(new Date().toISOString())}</span>
                </div>
                <span className="vera-t-note">
                  {r.historico.variacaoPct === 0
                    ? `Estável desde ${mes(r.historico.inicio)}.`
                    : `${r.historico.variacaoPct > 0 ? 'Subiu' : 'Caiu'} ${Math.abs(r.historico.variacaoPct)}% desde ${mes(r.historico.inicio)}.`}{' '}
                  O menor preço lido nos 90 dias foi {brlCents(r.historico.menor.preco)}, no{' '}
                  {r.historico.menor.mercado} em {diaDeMes(r.historico.menor.data)}.
                </span>
              </Card>
            ) : null}
            {r.troca ? (
              <Callout
                tone="accent"
                title="Vale a troca?"
                action={
                  <>
                    <Button size="sm" icon="shopping-basket" onClick={levar}>
                      Levar para a lista
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/app/lista')}>
                      Ver a lista inteira
                    </Button>
                  </>
                }
              >
                Trocar {r.troca.de} por {r.troca.para} nesta compra economiza{' '}
                {brlCents(r.troca.economia)} em {r.produto.toLowerCase()}.
                {r.lista && r.lista.diferenca > 0
                  ? ` Com a sua lista inteira, a diferença chega a ${brlCents(r.lista.diferenca)}`
                  : ''}
                {r.troca.distanciaExtraKm > 0
                  ? `${r.lista && r.lista.diferenca > 0 ? ' — e' : ' E'} o ${r.troca.para} fica ${km(r.troca.distanciaExtraKm)} mais longe.`
                  : '.'}
              </Callout>
            ) : (
              <Callout
                tone="accent"
                title="Leve para a lista"
                action={
                  <Button size="sm" icon="shopping-basket" onClick={levar}>
                    Levar para a lista
                  </Button>
                }
              >
                A lista de compras soma este item nos mercados do seu raio e mostra onde a compra
                inteira sai mais barato.
              </Callout>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
