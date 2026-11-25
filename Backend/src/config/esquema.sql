-- Estrutura do banco PostgreSQL do vera.finance — versão 1.
-- Roda sozinha na primeira conexão (src/config/bancoPostgres.js). Tudo aqui é idempotente
-- (IF NOT EXISTS): pode rodar de novo sem estragar nada. Mudança de estrutura = nova versão
-- no fim do arquivo, também idempotente, e o número novo em esquema_versao.

create table if not exists esquema_versao (
  versao integer primary key,
  aplicado_em timestamptz not null default now()
);

-- Uma linha por pessoa. O perfil fica inteiro em jsonb, como era no Firebase.
create table if not exists usuarios (
  uid text primary key,
  perfil jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Itens das coleções de cada pessoa (categorias, lancamentos, lista, metas, notas, fixos).
-- Uma tabela só, com a coluna colecao, porque todas têm o mesmo formato e são sempre lidas por
-- (pessoa, coleção): coleção nova não exige mudar o banco. O "on delete cascade" garante que
-- apagar a pessoa apaga tudo dela.
create table if not exists itens_usuario (
  usuario_id text not null references usuarios (uid) on delete cascade,
  colecao text not null,
  id text not null,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, colecao, id)
);

create table if not exists contas (
  chave text primary key,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists credenciais (
  chave text primary key,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists familias (
  id text primary key,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists mercados (
  id text primary key,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists regioes (
  chave text primary key,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists interessados (
  id text primary key,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists exclusoes (
  uid text primary key,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Base anônima de preços. As colunas geradas copiam campos do jsonb para consultas e índices
-- futuros (por produto, código de barras, mercado e data) sem mudar o formato gravado.
create table if not exists precos (
  id text primary key,
  dados jsonb not null,
  produto_key text generated always as (dados ->> 'produtoKey') stored,
  ean text generated always as (nullif(dados ->> 'ean', '')) stored,
  mercado_id text generated always as (dados ->> 'mercadoId') stored,
  data text generated always as (dados ->> 'data') stored,
  origem text generated always as (dados ->> 'origem') stored,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists precos_produto_key_idx on precos (produto_key);
create index if not exists precos_ean_idx on precos (ean) where ean is not null;
create index if not exists precos_mercado_data_idx on precos (mercado_id, data);
create index if not exists precos_origem_idx on precos (origem);

-- Reserva: qualquer caminho que não tenha tabela própria cai aqui, inteiro em jsonb,
-- para nenhum dado se perder. Caminhos de pessoa (usuarios/<uid>/...) também são apagados
-- junto com ela.
create table if not exists documentos (
  caminho text primary key,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

insert into esquema_versao (versao) values (1) on conflict (versao) do nothing;
