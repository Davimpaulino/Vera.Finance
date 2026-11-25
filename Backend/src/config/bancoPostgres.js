import { readFileSync } from 'node:fs';
import pg from 'pg';
import {
  partesDoCaminho,
  gerarId,
  limparValor,
  achatarEmCaminhos,
  filhosComId,
  vazio,
  podar
} from './caminhos.js';

// Adaptador PostgreSQL com a mesma interface e o mesmo comportamento do bancoMemoria.js
// (que imita o Firebase Realtime Database): os models continuam falando em caminhos
// ("usuarios/<uid>/lista/<id>") e aqui cada caminho vira uma linha de uma tabela própria.
// Caminhos mais fundos que a linha (um campo do perfil, um campo de um item) são lidos e
// gravados dentro do jsonb da linha.

const SQL_DO_ESQUEMA = readFileSync(new URL('./esquema.sql', import.meta.url), 'utf8');

// Coleções de usuarios/<uid>/ guardadas em itens_usuario. Outro nome cai em "documentos".
export const COLECOES_DO_USUARIO = new Set([
  'categorias',
  'lancamentos',
  'lista',
  'metas',
  'notas',
  'fixos'
]);

// Coleções da raiz com tabela própria, e o nome da coluna da chave.
export const TABELAS_DA_RAIZ = {
  contas: 'chave',
  credenciais: 'chave',
  regioes: 'chave',
  familias: 'id',
  mercados: 'id',
  precos: 'id',
  interessados: 'id',
  exclusoes: 'uid'
};

// Número fixo qualquer: dois servidores subindo juntos não criam as tabelas ao mesmo tempo.
const TRAVA_DO_ESQUEMA = 7_341_112;
const ERROS_DE_CONCORRENCIA = new Set(['40P01', '40001']);

/**
 * Opções do pool a partir da DATABASE_URL (sslmode=require liga o SSL).
 * PGSSL, opcional, manda no SSL: "disable", "no-verify" ou "require".
 */
export function opcoesDeConexao(url, pgssl = process.env.PGSSL) {
  const endereco = new URL(url);
  const modoDaUrl = (endereco.searchParams.get('sslmode') || '').toLowerCase();
  const modo = (pgssl || modoDaUrl).toLowerCase();
  // O SSL é decidido aqui, então a URL vai sem ele (o pg avisa quando recebe "require").
  for (const parametro of ['sslmode', 'ssl', 'channel_binding', 'uselibpqcompat'])
    endereco.searchParams.delete(parametro);
  let ssl;
  if (['', 'disable', 'false', '0', 'allow'].includes(modo)) ssl = false;
  else if (modo === 'no-verify') ssl = { rejectUnauthorized: false };
  else ssl = { rejectUnauthorized: true };
  return {
    connectionString: endereco.toString(),
    ssl,
    max: Number(process.env.PGPOOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    // Deixa scripts e testes terminarem sozinhos quando ninguém mais usa o banco.
    allowExitOnIdle: true
  };
}

// --- Onde cada caminho mora -----------------------------------------------------------------

const documentoDaRaiz = (tabela, chave) => ({
  tabela,
  colunas: [TABELAS_DA_RAIZ[tabela]],
  chaves: [chave],
  coluna: 'dados'
});
const documentoReserva = caminho => ({
  tabela: 'documentos',
  colunas: ['caminho'],
  chaves: [caminho],
  coluna: 'dados'
});

/**
 * Traduz as partes de um caminho em { doc, sub } (uma linha e o trecho dentro do jsonb) ou
 * { nivel } (um "galho" acima das linhas: a raiz, todos os usuários, uma coleção...).
 */
export function localizar(partes) {
  if (!partes.length) return { nivel: 'raiz' };
  const [topo] = partes;
  if (topo === 'usuarios') {
    if (partes.length === 1) return { nivel: 'usuarios' };
    const uid = partes[1];
    if (partes.length === 2) return { nivel: 'usuario', uid };
    const filho = partes[2];
    if (filho === 'perfil')
      return {
        doc: { tabela: 'usuarios', colunas: ['uid'], chaves: [uid], coluna: 'perfil' },
        sub: partes.slice(3)
      };
    if (COLECOES_DO_USUARIO.has(filho)) {
      if (partes.length === 3) return { nivel: 'colecaoDoUsuario', uid, colecao: filho };
      return {
        doc: {
          tabela: 'itens_usuario',
          colunas: ['usuario_id', 'colecao', 'id'],
          chaves: [uid, filho, partes[3]],
          coluna: 'dados'
        },
        sub: partes.slice(4)
      };
    }
    return { doc: documentoReserva(partes.slice(0, 3).join('/')), sub: partes.slice(3) };
  }
  if (TABELAS_DA_RAIZ[topo]) {
    if (partes.length === 1) return { nivel: 'tabela', tabela: topo };
    return { doc: documentoDaRaiz(topo, partes[1]), sub: partes.slice(2) };
  }
  return { doc: documentoReserva(topo), sub: partes.slice(1) };
}

const identidade = doc => `${doc.tabela}|${doc.coluna}|${JSON.stringify(doc.chaves)}`;

function descer(valor, sub) {
  const achado = sub.reduce((no, parte) => (no == null ? undefined : no[parte]), valor);
  return achado === undefined ? null : achado;
}

/** Mesma regra do bancoMemoria: grava "valor" no trecho "sub" do documento e poda os vazios. */
function aplicarNoValor(atual, sub, valor) {
  const novo = podar(limparValor(valor));
  if (!sub.length) return vazio(novo) ? null : novo;
  const raiz = atual && typeof atual === 'object' ? atual : {};
  let no = raiz;
  sub.slice(0, -1).forEach(parte => {
    if (!no[parte] || typeof no[parte] !== 'object') no[parte] = {};
    no = no[parte];
  });
  const ultimo = sub[sub.length - 1];
  if (vazio(novo)) delete no[ultimo];
  else no[ultimo] = novo;
  return podar(raiz);
}

const objetoOuNulo = objeto => (Object.keys(objeto).length ? objeto : null);

// --- SQL -------------------------------------------------------------------------------------

async function carregarDoc(executor, doc, bloquear = false) {
  const filtro = doc.colunas.map((coluna, i) => `${coluna} = $${i + 1}`).join(' and ');
  const { rows } = await executor.query(
    `select ${doc.coluna} as valor from ${doc.tabela} where ${filtro}${bloquear ? ' for update' : ''}`,
    doc.chaves
  );
  return rows.length ? rows[0].valor : null;
}

const registros = (colunas, extra = '') =>
  `jsonb_to_recordset($1::jsonb) as x(${colunas.map(c => `${c} text`).join(', ')}${extra})`;

/** Grava de uma vez os documentos alterados numa transação, agrupados por tabela. */
async function salvarDocs(cliente, pendentes) {
  const porTabela = new Map();
  for (const { doc, valor } of pendentes) {
    const chave = `${doc.tabela}|${doc.coluna}`;
    if (!porTabela.has(chave)) porTabela.set(chave, { doc, gravar: [], apagar: [] });
    const linha = Object.fromEntries(doc.colunas.map((coluna, i) => [coluna, doc.chaves[i]]));
    const grupo = porTabela.get(chave);
    if (vazio(valor)) grupo.apagar.push(linha);
    else grupo.gravar.push({ ...linha, valor });
  }
  for (const { doc, gravar, apagar } of porTabela.values()) {
    const { tabela, colunas, coluna } = doc;
    const lista = colunas.join(', ');
    const deX = colunas.map(c => `x.${c}`).join(', ');
    // Mesma ordem de chaves em todas as transações: evita uma travar a outra.
    const ordenar = linhas =>
      linhas.sort((a, b) => {
        const x = colunas.map(c => a[c]).join('\u0000');
        const y = colunas.map(c => b[c]).join('\u0000');
        return x < y ? -1 : x > y ? 1 : 0;
      });
    if (apagar.length) {
      const corpo = JSON.stringify(ordenar(apagar));
      if (coluna === 'perfil')
        await cliente.query(
          `update usuarios set perfil = null, atualizado_em = now()
           where uid in (select x.uid from ${registros(colunas)})`,
          [corpo]
        );
      else
        await cliente.query(
          `delete from ${tabela} where (${lista}) in (select ${deX} from ${registros(colunas)})`,
          [corpo]
        );
    }
    if (gravar.length) {
      const corpo = JSON.stringify(ordenar(gravar));
      // O item precisa da pessoa existindo (chave estrangeira).
      if (tabela === 'itens_usuario')
        await cliente.query(
          `insert into usuarios (uid)
           select distinct x.usuario_id from ${registros(['usuario_id'])}
           order by 1 on conflict (uid) do nothing`,
          [corpo]
        );
      await cliente.query(
        `insert into ${tabela} (${lista}, ${coluna})
         select ${deX}, x.valor from ${registros(colunas, ', valor jsonb')}
         on conflict (${lista}) do update set ${coluna} = excluded.${coluna}, atualizado_em = now()`,
        [corpo]
      );
    }
  }
}

const comPrefixo = 'left(caminho, length($1)) = $1';

async function montarUsuarios(executor, uid) {
  const filtro = uid === undefined ? '' : 'where uid = $1';
  const filtroItens = uid === undefined ? '' : 'where usuario_id = $1';
  const parametros = uid === undefined ? [] : [uid];
  const prefixo = uid === undefined ? 'usuarios/' : `usuarios/${uid}/`;
  const [perfis, itens, reservas] = await Promise.all([
    executor.query(
      `select uid, perfil from usuarios ${filtro} order by uid collate "C"`,
      parametros
    ),
    executor.query(
      `select usuario_id, colecao, id, dados from itens_usuario ${filtroItens}
       order by usuario_id collate "C", colecao collate "C", id collate "C"`,
      parametros
    ),
    executor.query(
      `select caminho, dados from documentos where ${comPrefixo} order by caminho collate "C"`,
      [prefixo]
    )
  ]);
  const usuarios = {};
  const doUsuario = id => (usuarios[id] ||= {});
  perfis.rows.forEach(linha => {
    if (!vazio(linha.perfil)) doUsuario(linha.uid).perfil = linha.perfil;
  });
  itens.rows.forEach(linha => {
    const pessoa = doUsuario(linha.usuario_id);
    (pessoa[linha.colecao] ||= {})[linha.id] = linha.dados;
  });
  reservas.rows.forEach(linha => {
    const [, dono, nome] = linha.caminho.split('/');
    doUsuario(dono)[nome] = linha.dados;
  });
  return usuarios;
}

async function montarTabela(executor, tabela) {
  const coluna = TABELAS_DA_RAIZ[tabela];
  const { rows } = await executor.query(
    `select ${coluna} as chave, dados from ${tabela} order by ${coluna} collate "C"`
  );
  return objetoOuNulo(Object.fromEntries(rows.map(linha => [linha.chave, linha.dados])));
}

async function montarGalho(executor, alvo) {
  if (alvo.nivel === 'tabela') return montarTabela(executor, alvo.tabela);
  if (alvo.nivel === 'colecaoDoUsuario') {
    const { rows } = await executor.query(
      `select id, dados from itens_usuario where usuario_id = $1 and colecao = $2
       order by id collate "C"`,
      [alvo.uid, alvo.colecao]
    );
    return objetoOuNulo(Object.fromEntries(rows.map(linha => [linha.id, linha.dados])));
  }
  if (alvo.nivel === 'usuario')
    return (await montarUsuarios(executor, alvo.uid))[alvo.uid] || null;
  if (alvo.nivel === 'usuarios') return objetoOuNulo(await montarUsuarios(executor));
  // Raiz: tudo, como o export do Firebase.
  const raiz = { usuarios: objetoOuNulo(await montarUsuarios(executor)) };
  for (const tabela of Object.keys(TABELAS_DA_RAIZ))
    raiz[tabela] = await montarTabela(executor, tabela);
  const { rows } = await executor.query(
    `select caminho, dados from documentos where position('/' in caminho) = 0
     order by caminho collate "C"`
  );
  rows.forEach(linha => (raiz[linha.caminho] = linha.dados));
  // Raiz vazia é {} (e não null), igual ao bancoMemoria.
  return podar(raiz) || {};
}

async function removerGalho(cliente, alvo) {
  if (alvo.nivel === 'tabela') return cliente.query(`delete from ${alvo.tabela}`);
  if (alvo.nivel === 'colecaoDoUsuario')
    return cliente.query('delete from itens_usuario where usuario_id = $1 and colecao = $2', [
      alvo.uid,
      alvo.colecao
    ]);
  if (alvo.nivel === 'usuario') {
    // O "on delete cascade" leva junto os itens da pessoa.
    await cliente.query('delete from usuarios where uid = $1', [alvo.uid]);
    return cliente.query(`delete from documentos where ${comPrefixo}`, [`usuarios/${alvo.uid}/`]);
  }
  await cliente.query('delete from usuarios');
  if (alvo.nivel === 'usuarios')
    return cliente.query(`delete from documentos where ${comPrefixo}`, ['usuarios/']);
  for (const tabela of Object.keys(TABELAS_DA_RAIZ)) await cliente.query(`delete from ${tabela}`);
  return cliente.query('delete from documentos');
}

// --- O banco ---------------------------------------------------------------------------------

export function criarBancoPostgres({ url, ssl } = {}) {
  if (!url) throw new Error('DATABASE_URL não configurada.');
  const pool = new pg.Pool(opcoesDeConexao(url, ssl));
  // Uma conexão parada que cai não pode derrubar o servidor: o pool abre outra.
  pool.on('error', erro => console.error('[postgres]', erro.message));

  async function emTransacao(trabalho, tentativas = 3) {
    const cliente = await pool.connect();
    try {
      await cliente.query('begin');
      const resultado = await trabalho(cliente);
      await cliente.query('commit');
      return resultado;
    } catch (erro) {
      await cliente.query('rollback').catch(() => {});
      if (tentativas > 1 && ERROS_DE_CONCORRENCIA.has(erro.code))
        return emTransacao(trabalho, tentativas - 1);
      throw erro;
    } finally {
      cliente.release();
    }
  }

  let preparo = null;
  const pronto = () =>
    (preparo ||= emTransacao(async cliente => {
      await cliente.query('select pg_advisory_xact_lock($1)', [TRAVA_DO_ESQUEMA]);
      await cliente.query(SQL_DO_ESQUEMA);
    }).catch(erro => {
      preparo = null;
      throw erro;
    }));

  /** Aplica uma lista de [caminho, valor] numa transação, na ordem, como o bancoMemoria faria. */
  async function aplicarTudo(entradas) {
    await pronto();
    return emTransacao(async cliente => {
      const pendentes = new Map();
      const descarregar = async () => {
        if (pendentes.size) await salvarDocs(cliente, [...pendentes.values()]);
        pendentes.clear();
      };
      async function aplicar(partes, valor) {
        const alvo = localizar(partes);
        if (alvo.doc) {
          const id = identidade(alvo.doc);
          let atual = pendentes.get(id);
          if (!atual) {
            // Só precisa ler a linha quando a escrita é num trecho dela.
            const valorAtual = alvo.sub.length ? await carregarDoc(cliente, alvo.doc, true) : null;
            atual = { doc: alvo.doc, valor: valorAtual };
            pendentes.set(id, atual);
          }
          atual.valor = aplicarNoValor(atual.valor, alvo.sub, valor);
          return;
        }
        // Gravar num galho substitui tudo o que há embaixo dele.
        await descarregar();
        await removerGalho(cliente, alvo);
        const podado = podar(limparValor(valor));
        if (vazio(podado)) return;
        if (typeof podado !== 'object')
          throw new Error(`Não dá para gravar um valor simples em /${partes.join('/')}.`);
        for (const [chave, filho] of Object.entries(podado))
          await aplicar([...partes, chave], filho);
      }
      for (const [caminho, valor] of entradas) await aplicar(partesDoCaminho(caminho), valor);
      await descarregar();
    });
  }

  const banco = {
    async ler(caminho) {
      await pronto();
      const alvo = localizar(partesDoCaminho(caminho));
      if (alvo.doc) return descer(await carregarDoc(pool, alvo.doc), alvo.sub);
      return montarGalho(pool, alvo);
    },
    gravar: (caminho, valor) => aplicarTudo([[caminho, valor]]),
    atualizar: (caminho, campos) =>
      aplicarTudo(Object.entries(campos).map(([chave, valor]) => [`${caminho}/${chave}`, valor])),
    mesclar: (caminho, objeto) => banco.atualizar(caminho, achatarEmCaminhos(objeto)),
    remover: caminho => aplicarTudo([[caminho, null]]),
    async adicionar(caminho, valor) {
      const id = gerarId();
      await banco.gravar(`${caminho}/${id}`, valor);
      return id;
    },
    async listar(caminho) {
      return filhosComId(await banco.ler(caminho));
    },
    atualizarVarios: mapaDeCaminhos => aplicarTudo(Object.entries(mapaDeCaminhos)),
    // Fora da interface comum: usados pelo script de migração e pelos testes.
    preparar: pronto,
    fechar: () => pool.end()
  };
  return banco;
}
