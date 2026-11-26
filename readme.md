# vera.finance

[![CI](https://github.com/Davimpaulino/vera.finance/actions/workflows/ci.yml/badge.svg)](https://github.com/Davimpaulino/vera.finance/actions/workflows/ci.yml)

App brasileiro de finanças pessoais que funciona no navegador. A vera separa a renda do mês em
categorias, mostra quanto ainda dá para gastar e até que dia o dinheiro dura, guarda metas e
compara o preço da lista de compras nos supermercados perto do CEP da pessoa.

- Site: https://vera-finance.onrender.com
- Repositório: https://github.com/Davimpaulino/vera.finance

A vera não pede senha de banco, não vende produtos, não recebe de mercados para mostrar preços e
não tem vínculo com as redes de supermercado citadas.

---

## Sumário

- [O que a vera faz hoje](#o-que-a-vera-faz-hoje)
- [O que ainda não existe](#o-que-ainda-não-existe)
- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como rodar localmente](#como-rodar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Deploy no Render](#deploy-no-render)
- [Scripts de operação](#scripts-de-operação)
- [PostgreSQL (dados)](#postgresql-dados)
- [Levar as contas do login por senha para o Firebase Authentication](#levar-as-contas-do-login-por-senha-para-o-firebase-authentication)
- [E-mails transacionais](#e-mails-transacionais)
- [Integração contínua](#integração-contínua)
- [Redes de supermercado](#redes-de-supermercado)
- [Como adicionar uma rede nova](#como-adicionar-uma-rede-nova)
- [Mais documentação](#mais-documentação)
- [Integrantes](#integrantes)
- [Licença](#licença)

---

## O que a vera faz hoje

Tudo abaixo existe no código deste repositório.

**Dinheiro do mês**

- **Ciclo**: o mês da vera vira no dia do salário (dia de virada de 1 a 31), com renda fixa e
  variável. A renda fixa e os gastos fixos viram lançamentos sozinhos quando o dia chega.
- **Categorias**: a renda é reservada em categorias (como Comida e Rolê), cada uma com limite e
  aviso ao passar de 80%.
- **Painel**: saldo livre, quanto ainda dá em cada categoria e a projeção de até que dia o dinheiro
  dura.
- **Lançamentos**: entradas e saídas, com histórico e planilha (CSV) de todos os lançamentos.
- **Leitura de nota fiscal**: a câmera lê o QR Code da NFC-e (cupom fiscal eletrônico); a API busca
  os itens no portal da Secretaria da Fazenda do estado e separa cada item numa categoria. Lê o
  layout do "Portal da NFC-e" usado pela maioria dos estados; quando o estado mostra outro formato,
  o app pede para lançar à mão.
- **Metas**: valor-alvo, aportes e simulador de quantos ciclos faltam.
- **Relatórios**: gastos dos últimos 6 ciclos e mês a mês no ano, limites estourados, a categoria
  que mais caiu e os lugares onde a pessoa mais gasta.

**Mercado**

- **Comparação de preços**: o mesmo produto nos mercados num raio de 2 a 15 km do CEP, com o preço
  do site de cada rede (consultado para o CEP quando a plataforma permite) e o de notas fiscais
  lidas por quem usa a vera. Cada preço mostra a data e a origem. Histórico de 90 dias por produto.
- **Lista de compras**: soma a lista em cada mercado do raio, mostra onde ela sai mais barata e, ao
  finalizar, lança a compra nas categorias.
- **Mercados perto do CEP**: vêm do OpenStreetMap (Overpass), com CEP pelo ViaCEP e endereço pelo
  Nominatim.

**Conta e família**

- **Login**: e-mail e senha ou Google, pelo Firebase Authentication. Login com a Apple pronto, mas
  escondido até ser configurado (veja `VITE_LOGIN_APPLE`). Há também o login próprio da API
  (legado), usado pelas contas antigas; veja
  [como levar essas contas para o Firebase](#levar-as-contas-do-login-por-senha-para-o-firebase-authentication).
- **Planos**: Grátis (não expira; até 3 metas e 5 notas lidas por mês), vera+ mensal e vera+ anual.
  Os planos e limites ficam em `Backend/src/models/PlanoModel.js`. A cobrança ainda não existe
  (veja [O que ainda não existe](#o-que-ainda-não-existe)).
- **Modo família** (vera+): o dono do ciclo convida pessoas pelo e-mail delas (o convite aparece
  no app quando a pessoa entra com esse e-mail) e escolhe quais categorias são compartilhadas.
- **Avisos no app** (sino): notas para confirmar, categoria perto do limite ou estourada, convites
  da família, meta batida e alta de preço no mercado de sempre.
- **LGPD**: aceite dos Termos e da Política de privacidade com versão (`VERSAO_DOS_TERMOS`), baixar
  todos os dados em JSON, planilha dos lançamentos e exclusão da conta em 30 dias (com opção de
  desistir). A localização do aparelho é guardada arredondada (~100 m).
- **Aparência**: superfície escura (tinta) ou clara (papel) e opção de esconder os valores.

**Site**

- Páginas públicas (início, planos, perguntas, termos, privacidade, entrar e cadastro)
  pré-renderizadas no build, para buscadores e robôs de IA lerem sem JavaScript. `robots.txt`,
  `sitemap.xml`, `llms.txt` e aviso ao IndexNow.
- **App instalável (PWA)**: manifest e service worker; abre a casca do app sem internet.

## O que ainda não existe

Para ninguém prometer o que o produto não faz:

- **App nativo** (Android/iOS, lojas de aplicativo): não existe. Há o app instalável pelo navegador
  (PWA).
- **Contas bancárias e Open Finance**: a vera não se conecta a banco nem a cartão. Os gastos entram
  à mão, pela nota fiscal ou pela lista de compras.
- **Pagamento**: ainda não há provedor de pagamento integrado. Os planos e os limites existem no
  código (`PlanoModel.js`), mas nada é cobrado: escolher o vera+ no cadastro ou nos botões de
  Configurações ("Assinar mensal · R$ 12,90", "Trocar para anual · R$ 99,90") ativa o plano na
  hora, sem cobrança. A "próxima cobrança em ..." que o app mostra é só uma data calculada a partir
  do dia da troca. Cancelar marca até quando o vera+ continua, mas nada volta a conta para o grátis
  nessa data.
- **Dois benefícios da página de planos** (`PlanoModel.js`) não existem como descritos: "Alerta de
  preço por produto" (o aviso de alta de preço que existe vale para todos os planos e não deixa
  escolher produto) e "Suporte por e-mail em 24h" (nada no produto trata suporte por plano ou
  prazo).
- **E-mails**: os modelos estão prontos em `Backend/src/emails/`, mas nenhum deles é enviado (o
  provedor ainda não foi escolhido). O único e-mail que sai hoje é o de redefinir a senha ("Esqueci
  a senha"), enviado pelo próprio Firebase Authentication. Avisos só aparecem dentro do app; não há
  notificação push.
- **Preço de todas as redes**: só as [redes listadas](#redes-de-supermercado) têm preço do site.
  Outros mercados aparecem quando alguém lê uma nota fiscal de lá.
- **Três opções de Configurações** não fazem o que a descrição diz. "Zerar categorias na virada" e
  "Resumo antes de fechar o ciclo" só ficam guardadas, sem efeito. "Alerta de alta de preço" promete
  avisar quando um item que a pessoa compra sempre sobe mais de 5% no mercado dela; o aviso do sino
  (`ComparacaoModel.dica`) mostra o produto da base de preços que mais subiu no mercado habitual,
  com qualquer alta, quando outro mercado do raio está mais barato. Não olha o que a pessoa compra
  nem o limite de 5%. A mesma dica aparece no painel mesmo com a opção desligada.

---

## Arquitetura

```mermaid
flowchart LR
  pessoa["Navegador ou app instalado (PWA)"]
  site["Site estático<br/>Frontend/dist no Render"]
  api["API Node.js<br/>Backend no Render"]
  auth["Firebase Authentication"]
  banco[("Banco<br/>Firebase Realtime Database,<br/>PostgreSQL ou memória")]
  fora["Sites das redes, Sefaz,<br/>OpenStreetMap, ViaCEP"]

  pessoa -->|HTML pré-renderizado e JS| site
  pessoa -->|login| auth
  pessoa -->|HTTPS com token| api
  api -->|confere o token| auth
  api --> banco
  api --> fora
```

### Backend (`Backend/`)

- **Node.js 22 puro** (`node:http`, ES modules), sem framework. Dependências: `firebase-admin` e
  `pg`.
- **MVC sem view**: `src/routes/index.js` liga cada rota a uma cadeia de funções
  (middlewares e controller); os controllers recebem o pedido e devolvem a resposta; os models
  guardam as regras e falam com o banco. O roteador é próprio (`src/utils/router.js`).
- `src/app.js` aplica CORS (só as origens de `CORS_ORIGIN`), cabeçalhos de segurança e trata os
  erros. Middlewares: login (`auth.js`), aceite dos termos (`termos.js`) e limite de tentativas
  por IP, em memória (`limite.js`).
- `src/server.js` sobe a API e, um minuto depois de subir e a cada 24 horas, apaga as contas cuja
  exclusão venceu.
- **Banco abstraído**: os models falam em caminhos no estilo do Firebase
  (`usuarios/<uid>/lista/<id>`) e todos os bancos têm a mesma interface (`ler`, `gravar`,
  `atualizar`, `mesclar`, `remover`, `adicionar`, `listar`, `atualizarVarios`). `src/config/banco.js`
  escolhe o banco nesta ordem:
  1. `BANCO=memoria`: banco em memória (apaga ao reiniciar). Usado nos testes e no
     desenvolvimento.
  2. `DATABASE_URL` definida: PostgreSQL (`bancoPostgres.js`). Com a conta de serviço do
     Firebase, o login continua pelo Firebase Auth.
  3. `FIREBASE_URL_BANCO` vazia: banco em memória.
  4. Conta de serviço do Firebase: Realtime Database pelo Admin SDK (`bancoAdmin.js`) e login pelo
     Firebase Auth.
  5. Sem conta de serviço: Realtime Database pela API REST (`bancoRest.js`).
- **Login**: a API aceita dois tipos de token. O token do Firebase Authentication (e-mail e senha,
  Google, Apple) e o token do login próprio (legado), assinado com `SEGREDO_LOGIN` e válido por 30
  dias. Um e-mail é sempre uma conta só, venha de onde vier (`ContaModel.js`).

### Frontend (`Frontend/`)

- **React 19 + Vite 7**, sem biblioteca de rotas: o roteador é `src/lib/router.jsx` e as páginas
  do app carregam sob demanda.
- **Design system** em `src/components/ds` (botões, campos, cartões, tabelas, ícones do Bootstrap
  Icons) e tokens de cor, tipografia e espaço em `src/css`. Guia em [docs/marca.md](docs/marca.md).
- **Pré-renderização**: `npm run build` faz o build do Vite, um build SSR de
  `src/entry-server.jsx` e roda `scripts/prerender.mjs`, que grava o HTML pronto de cada página
  pública em `dist/<rota>/index.html` (títulos e descrições em `src/lib/paginas.js`) e a casca do
  app em `dist/app.html`.
- **PWA**: `public/manifest.webmanifest` e `public/sw.js` (detalhes no
  [deploy](#app-instalável-pwa)).
- **Login no navegador**: Firebase Authentication (`src/services/firebase.js` e
  `servicoDeLogin.js`), com o login próprio da API como plano B para as contas antigas.

---

## Estrutura de pastas

```
vera.finance/
├── .github/
│   ├── workflows/ci.yml          testes do backend e build do frontend a cada push e PR
│   └── pull_request_template.md
├── Backend/                      API (Node.js 22, sem framework)
│   ├── scripts/                  scripts de operação (veja abaixo)
│   ├── src/
│   │   ├── server.js             sobe a API e a rotina diária de exclusão de contas
│   │   ├── app.js                CORS, cabeçalhos de segurança, rotas e erros
│   │   ├── routes/index.js       todas as rotas da API
│   │   ├── controllers/          recebem o pedido e montam a resposta
│   │   ├── models/               regras e dados (inclui RedeModel e os leitores Catalogo*Model)
│   │   ├── middlewares/          login, aceite dos termos, limite de tentativas
│   │   ├── config/               variáveis de ambiente, bancos e esquema do PostgreSQL
│   │   ├── emails/               modelos de e-mail (ainda sem envio)
│   │   └── utils/                datas, dinheiro, texto, HTTP e roteador
│   └── test/                     testes (node --test) e dados de apoio
├── Frontend/                     site e app (React 19 + Vite 7)
│   ├── public/                   sw.js, manifest, ícones, robots.txt, sitemap.xml, llms.txt
│   ├── scripts/                  pré-renderização, IndexNow e service worker de emergência
│   ├── src/
│   │   ├── main.jsx              entrada no navegador (registra o service worker)
│   │   ├── entry-server.jsx      entrada da pré-renderização
│   │   ├── App.jsx               escolhe a página pelo caminho
│   │   ├── pages/site, auth, app páginas públicas, de login e do app
│   │   ├── components/ds/        design system
│   │   ├── components/app, site  peças do app e do site
│   │   ├── css/                  tokens (cores, tipografia, espaços) e estilos globais
│   │   ├── lib/                  roteador, metadados das páginas, endereço do site, termos
│   │   ├── context/, hooks/      login, tema e avisos
│   │   ├── services/             chamadas da API e Firebase
│   │   └── assets/landing/       telas de celular da landing (ilustrativas)
│   ├── captura.html, captura.jsx página de apoio do `npm run dev` com as telas de celular
│   └── vite.config.js
├── docs/                         operação (operacao.md) e marca (marca.md)
├── database.rules.json           regras do Firebase Realtime Database
├── firebase.json                 aponta o Firebase CLI para as regras
├── CONTRIBUTING.md
└── readme.md
```

---

## Como rodar localmente

Precisa do **Node.js 22.12 ou mais novo** e do npm. A API sozinha roda a partir do 22.9; o Vite, que
faz o build do site, pede 22.12.

### API

```bash
cd Backend
npm ci
BANCO=memoria npm run dev     # http://localhost:4000, banco em memória, reinicia ao salvar
```

`npm start` e `npm run dev` leem o arquivo `Backend/.env` se ele existir (o Git ignora esse
arquivo). Um `.env` de desenvolvimento pode ser só:

```bash
BANCO=memoria
CORS_ORIGIN=http://localhost:5173
SEGREDO_LOGIN=<texto aleatório de 32 caracteres ou mais>
```

Com `BANCO=memoria` tudo some quando a API reinicia. Para trabalhar com dados que ficam, use um
PostgreSQL local em `DATABASE_URL` (veja [PostgreSQL](#postgresql-dados)). Confira se a API subiu
em http://localhost:4000/api/saude (`{"ok":true}`).

### Site e app

```bash
cd Frontend
npm ci
npm run dev                   # http://localhost:5173, fala com a API em http://localhost:4000
```

Para outra API, crie `Frontend/.env.local` com `VITE_API_URL=...`. Sem as variáveis
`VITE_FIREBASE_*`, o site usa a configuração do projeto Firebase que está em
`src/services/firebase.js`; para não criar contas de teste nele, aponte essas variáveis para um
projeto Firebase de desenvolvimento e use o mesmo projeto em `FIREBASE_PROJECT_ID` na API (é com ele
que a API confere o token de login).

`npm run preview` serve o `dist` do build do mesmo jeito que o Render (páginas pré-renderizadas e a
regra `/* -> /app.html`).

### Testes

```bash
cd Backend
npm test          # banco em memória; os testes só do PostgreSQL são pulados
npm run test:pg   # a suíte inteira também no PostgreSQL (veja "Testes no PostgreSQL")

cd ../Frontend
npm run build     # o frontend não tem testes próprios: o build confere
```

Alguns testes do backend conferem arquivos do frontend: o service worker (`public/sw.js`) e a
lista de redes do site (`src/lib/site.js` e `public/llms.txt`).

---

## Variáveis de ambiente

Nunca coloque valores reais no código, em commit, em issue ou em print. Os exemplos abaixo são só o
formato.

### API (Render → serviço da API → Environment)

| Variável | Obrigatória | Para quê | Exemplo |
|---|---|---|---|
| `SEGREDO_LOGIN` | Sim, em produção | Assina as sessões do login próprio. Precisa de 32 caracteres ou mais. Sem ela, a API sorteia um segredo a cada início e as sessões do login por senha caem a cada reinício (a API avisa no log). Gere com `openssl rand -base64 48`. | `<48 bytes aleatórios em base64>` |
| `CORS_ORIGIN` | Sim, em produção | Endereços do site que podem chamar a API, separados por vírgula. Nunca `*`. Padrão: `http://localhost:5173`. | `https://vera-finance.onrender.com` |
| `NODE_ENV` | Não | Só o valor `test` muda algo: desliga o aviso do `SEGREDO_LOGIN` (os testes usam). Outros valores, como `production`, não mudam nada na API. | `test` |
| `FIREBASE_PROJECT_ID` | Sim, com Firebase | Projeto do Firebase: conta de serviço e conferência dos tokens de login. | `meu-projeto` |
| `FIREBASE_CLIENT_EMAIL` | Sim, com Firebase | E-mail da conta de serviço (Admin SDK). | `firebase-adminsdk-xxxx@meu-projeto.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Sim, com Firebase | Chave privada da conta de serviço. Pode vir numa linha só, com `\n` no lugar das quebras. | `-----BEGIN PRIVATE KEY-----\n...` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Não | Alternativa às três de cima: caminho do arquivo JSON da conta de serviço (o Git ignora `service-account*.json`). | `./service-account.json` |
| `FIREBASE_URL_BANCO` | Não | URL do Realtime Database. Tem um valor padrão no código (`src/config/env.js`); vazia, a API usa o banco em memória. Pode sair depois da migração para o PostgreSQL. | `https://<projeto>-default-rtdb.firebaseio.com` |
| `FIREBASE_SEGREDO_BANCO` | Não | Segredo legado do Realtime Database, usado só no acesso pela API REST (sem conta de serviço). | `<segredo>` |
| `DATABASE_URL` | Não | PostgreSQL. Com ela, os dados vão para o PostgreSQL e o login continua como está. A senha do banco vai dentro dela: a API nunca mostra esse valor no log. | `postgresql://usuario:senha@host/banco?sslmode=require` |
| `PGSSL` | Não | Força o SSL do PostgreSQL: `require`, `no-verify` ou `disable`. Sem ela, vale o `sslmode` da `DATABASE_URL`. | `require` |
| `PGPOOL_MAX` | Não | Máximo de conexões abertas com o PostgreSQL. Padrão: 10. | `10` |
| `BANCO` | Não | `memoria` força o banco em memória (desenvolvimento e testes). | `memoria` |
| `PORT` | Não | Porta da API. O Render define sozinho. Padrão: 4000. | `4000` |
| `TZ` | Não | Fuso horário das datas. Padrão: `America/Sao_Paulo`. | `America/Sao_Paulo` |
| `SITE_URL` | Não | Endereço do site nos links dos modelos de e-mail (ainda sem envio). Padrão: `https://vera-finance.onrender.com`. | `https://vera-finance.onrender.com` |

### Testes da API

| Variável | Para quê | Exemplo |
|---|---|---|
| `DATABASE_URL_TESTE` | PostgreSQL de teste do `npm run test:pg`. O nome do banco precisa ter "test", porque os testes apagam tudo. | `postgres://postgres:teste@localhost:5432/vera_teste` |
| `BANCO_TESTE` | O `npm run test:pg` define `postgres` sozinho. Não precisa mexer. | `postgres` |

### Site (Render → Static Site → Environment, usadas no build)

As variáveis `VITE_*` entram no JavaScript do site durante o build: tudo nelas fica público.
Nunca coloque segredo numa variável `VITE_*`. Depois de mudar uma delas, faça um deploy novo.

| Variável | Obrigatória | Para quê | Exemplo |
|---|---|---|---|
| `VITE_API_URL` | Sim, em produção | Endereço da API. Padrão: `http://localhost:4000`. | `https://sua-api.onrender.com` |
| `VITE_SITE_URL` | Não | Endereço público do site, sem `/` no fim. Vai para o `og:image`, o JSON-LD, os links absolutos e o canonical das páginas pré-renderizadas. Padrão: `https://vera-finance.onrender.com`. Ao trocar para um domínio próprio, atualize também `public/sitemap.xml`, `public/robots.txt` e `public/llms.txt`. | `https://vera-finance.onrender.com` |
| `VITE_FIREBASE_API_KEY` | Não | Configuração Web do Firebase (pública). Padrão: a do projeto em `src/services/firebase.js`. | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Não | Domínio de login do Firebase. Padrão: `<projeto>.firebaseapp.com`. | `meu-projeto.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Não | Projeto do Firebase do site. | `meu-projeto` |
| `VITE_FIREBASE_APP_ID` | Não | Id do app Web no Firebase. | `1:000000000000:web:abc123` |
| `VITE_FIREBASE_DATABASE_URL` | Não | URL do Realtime Database na configuração Web. | `https://<projeto>-default-rtdb.firebaseio.com` |
| `VITE_LOGIN_APPLE` | Não | `1` mostra o botão "Continuar com Apple". Ligue só depois de configurar o login da Apple no Apple Developer e no Firebase. | `1` |

O `npm run indexnow` também lê `VITE_SITE_URL` do ambiente do terminal.

---

## Deploy no Render

São dois serviços no Render, os dois ligados a este repositório: a API como **Web Service** e o site
como **Static Site**.

### API (Web Service)

| Campo | Valor |
|---|---|
| Root Directory | `Backend` |
| Runtime | Node. O Render segue `engines` do `Backend/package.json` (22.9 ou mais nova); para fixar a versão, defina `NODE_VERSION=22` no Environment |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/saude` |
| Environment | as variáveis da tabela [API](#api-render--serviço-da-api--environment) |

No log de início aparece o banco em uso, por exemplo
`vera.finance API em http://localhost:<porta> · PostgreSQL (DATABASE_URL) · login pelo Firebase Auth`.

Regras do Realtime Database: o arquivo `database.rules.json` fecha o banco para leitura e escrita
diretas (só a API, com a conta de serviço, acessa). Publique com
`firebase deploy --only database` ou cole o conteúdo em Firebase Console → Realtime Database →
Regras.

### Site (Static Site)

| Campo | Valor |
|---|---|
| Root Directory | `Frontend` |
| Node | 22.12 ou mais nova (o Vite pede). Se o build reclamar da versão, defina `NODE_VERSION=22` no Environment |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` (relativo ao Root Directory, ou seja, `Frontend/dist`) |
| Redirects/Rewrites | **Source** `/*` → **Destination** `/app.html`, **Action** `Rewrite` |
| Environment | as variáveis da tabela [Site](#site-render--static-site--environment-usadas-no-build) |

- O `npm run build` grava o HTML pronto das páginas públicas (`/`, `/precos`, `/perguntas`,
  `/termos`, `/privacidade`, `/entrar`, `/cadastro`) em `dist/<rota>/index.html`. Assim buscadores
  e robôs de IA, que não rodam JavaScript, leem o conteúdo. Não precisa de navegador no build.
  Título, descrição, canonical, robots e os textos de compartilhamento (`og:`/`twitter:`) de cada
  página vêm de `src/lib/paginas.js`; a home mantém os do `index.html`.
- O mesmo script grava `dist/app.html`, a casca do app: o `#root` vazio, sem o conteúdo da landing,
  com `noindex` e sem canonical.
- O Render só aplica o rewrite quando não existe arquivo no caminho: `/` abre o `index.html`,
  `/precos` abre `precos/index.html` e só as rotas do app (`/app`, `/app/lista`,
  `/cadastro/perguntas`...) e os endereços desconhecidos caem no `app.html`. Não crie regras que
  mandem as páginas públicas para outro arquivo, senão elas perdem o HTML pré-renderizado.
- Depois do deploy, confira: o código-fonte de `https://<site>/precos` (Ctrl+U) precisa ter o título
  `Planos e preços · vera.finance` e o texto dos planos, e o de `https://<site>/app` só o
  `<div id="root"></div>` vazio, com `noindex, nofollow`.

Sem Root Directory, use `cd Frontend && npm ci && npm run build` no build e `Frontend/dist` como
Publish Directory: o resultado é o mesmo.

O checklist completo de deploy, logs e rollback está em [docs/operacao.md](docs/operacao.md).

### App instalável (PWA)

- `public/manifest.webmanifest` (nome, ícones, abre em `/app`) e `public/sw.js`.
- O service worker só é registrado no build de produção. Ele guarda os arquivos de `/assets/` (têm
  hash no nome) e busca as páginas na rede primeiro, com a última cópia (ou a casca `app.html`) como
  reserva sem internet. Chamadas da API e pedidos com `Authorization` nunca vão para o cache.
- Sem internet abre só a casca do app, não os dados: o login e os números vêm da API.
- A versão do cache muda a cada build: o plugin `vera-versao-do-sw` do `vite.config.js` troca o
  marcador `__VERSAO_DO_BUILD__` do `dist/sw.js` em qualquer `vite build` e faz o build falhar se o
  marcador sumir. Os caches antigos são apagados quando a versão nova assume.
- Emergência (o service worker atrapalhando em produção): copie `scripts/sw-emergencia.js` por cima
  de `public/sw.js` e, no mesmo deploy, apague o bloco que registra o service worker em
  `src/main.jsx`. Publique. A primeira visita de cada pessoa depois do deploy ainda passa pelo
  service worker antigo, que baixa o novo; a partir daí os caches da vera somem, o registro sai e
  tudo vem direto da rede. Para voltar ao normal, restaure os dois arquivos pelo git.

### Avisar os buscadores (IndexNow)

Depois de cada deploy que muda páginas públicas, avise o Bing e os outros buscadores do IndexNow:

```bash
cd Frontend
npm run indexnow                                   # usa VITE_SITE_URL ou o endereço padrão
npm run indexnow -- https://seu-dominio.com.br     # outro endereço
npm run indexnow -- --teste                        # só mostra o que seria enviado
```

O script lê as URLs de `public/sitemap.xml` e usa a chave do arquivo `public/<chave>.txt`, que
precisa estar no ar (abra `https://<site>/<chave>.txt` para conferir antes de enviar). Para
aparecer no Google, cadastre o site no Google Search Console e envie o `sitemap.xml`.

---

## Scripts de operação

Os que gravam alguma coisa começam em **simulação** (ou têm uma) e só gravam quando você pede.
Rode sempre a simulação primeiro e, se der, num projeto ou banco de teste. Como rodar no Render, como
job, está em [docs/operacao.md](docs/operacao.md#rodar-um-script-como-job).

| Script | Como rodar (na pasta indicada) | O que faz | Quando rodar |
|---|---|---|---|
| `Backend/scripts/migrar-firebase-para-postgres.mjs` | `npm run migrar:postgres -- <export.json> --simular` e depois sem `--simular` | Leva o export JSON do Realtime Database para o PostgreSQL de `DATABASE_URL`, em lotes, e confere as contagens no fim. Opções: `--lote=500`, `--continuar`. | Uma vez, na troca do Firebase pelo PostgreSQL ([passo a passo](#postgresql-dados)). |
| `Backend/scripts/importar-usuarios-firebase.mjs` | `node --env-file=.env scripts/importar-usuarios-firebase.mjs` (simulação) e depois com `--executar` | Leva as contas do login próprio para o Firebase Authentication sem trocar a senha de ninguém. | Uma vez, antes de desligar o login próprio ([passo a passo](#levar-as-contas-do-login-por-senha-para-o-firebase-authentication)). |
| `Backend/scripts/conferir-restauracao.mjs` | `node --env-file=.env scripts/conferir-restauracao.mjs retrato <arquivo>` no banco atual; depois `conferir <arquivo>` (simulação) e `conferir <arquivo> --executar` no banco restaurado | Depois de restaurar um backup, apaga de novo as contas apagadas depois dele, recria os pedidos de exclusão feitos depois e tira os de quem desistiu. O login do Firebase só sai quando tem o mesmo uid da conta. | Em toda restauração de backup, antes de a API usar o banco restaurado ([passo a passo](docs/operacao.md#restaurar-sem-perder-ninguém-passo-a-passo)). |
| `Backend/scripts/ver-emails.mjs` | `npm run emails:ver` (ou `npm run emails:ver -- ./pasta`) | Grava os modelos de e-mail com dados de exemplo para ver no navegador. Não envia nada. | Ao mudar um modelo de e-mail. |
| `Frontend/scripts/prerender.mjs` | parte do `npm run build` | Grava o HTML das páginas públicas e a casca `app.html`. | Sozinho, em todo build. |
| `Frontend/scripts/indexnow.mjs` | `npm run indexnow` (com `--teste` só mostra) | Avisa os buscadores do IndexNow das URLs do sitemap. | Depois de um deploy que muda páginas públicas. |
| `Frontend/scripts/sw-emergencia.js` | copiar por cima de `public/sw.js` | Service worker que limpa os caches e se desregistra. | Só em emergência (veja [PWA](#app-instalável-pwa)). |

A exclusão das contas vencidas não é script: roda dentro da API (`src/server.js`), um minuto depois
de subir e a cada 24 horas.

---

## PostgreSQL (dados)

A API funciona com o Firebase Realtime Database ou com PostgreSQL. Quem escolhe é a variável
`DATABASE_URL`: sem ela, nada muda. Só os dados mudam de lugar: o login continua como está
(Firebase Auth com a conta de serviço, ou login próprio).

- O adaptador fica em `Backend/src/config/bancoPostgres.js` e segue a mesma interface dos outros
  bancos, então os models não mudam. O que ainda difere do banco em memória (poucos detalhes, cada
  um com teste) está no comentário do início desse arquivo.
- As tabelas ficam em `Backend/src/config/esquema.sql` e são criadas sozinhas na primeira conexão
  (tudo idempotente). Os dados de cada pessoa ficam em `usuarios` (o perfil) e `itens_usuario`
  (categorias, lançamentos, lista, metas, notas e fixos, separados pela coluna `colecao`); as demais
  coleções (`contas`, `precos`, `familias`...) têm tabela própria. Apagar uma pessoa apaga tudo
  dela (cascata). Caminho sem tabela própria vai para `documentos`, sem perder dado.

### 1. Criar o banco (grátis, no Neon)

1. Crie uma conta em [neon.tech](https://neon.tech) e um projeto novo.
2. Na região, escolha **São Paulo** (AWS `sa-east-1`) se aparecer na lista; senão, a mais próxima do
   Render.
3. Em **Connection string**, copie o endereço `postgresql://...?sslmode=require`. Ele tem a senha do
   banco: **nunca** coloque no código, em commit ou em print.

O Neon passa a guardar dados pessoais: antes de migrar, inclua-o na lista de empresas que tratam
dados da Política de privacidade (`Frontend/src/pages/site/Legal.jsx`) e decida com o encarregado de
dados se a mudança pede um novo aceite (`VERSAO_DOS_TERMOS`; veja
[docs/operacao.md](docs/operacao.md#pedidos-de-titulares-lgpd)).

### 2. Exportar o Firebase e migrar (em janela de manutenção)

Escolha um horário de pouco uso e avise quem usa. A ideia é ninguém gravar nada entre o export e a
troca do banco.

1. **Pare a API** no Render (Dashboard → serviço → *Suspend*), para não entrar dado novo.
2. **Exporte o JSON**: Firebase Console → Realtime Database → Dados → menu **⋮** → *Exportar JSON*.
   O arquivo vem como `<projeto>-default-rtdb-export.json`. Salve **fora** da pasta do projeto (ele
   tem dados pessoais; nunca vai para o Git). Os exemplos abaixo usam `~/exportacao-firebase.json`.
3. **Simule** a migração, na pasta `Backend` (só lê o arquivo e mostra as contagens):

   ```bash
   npm ci
   npm run migrar:postgres -- ~/exportacao-firebase.json --simular
   ```

4. **Migre** apontando para o Neon. Passe a `DATABASE_URL` só no terminal (ou num `Backend/.env`,
   que o Git ignora):

   ```bash
   DATABASE_URL='postgresql://...?sslmode=require' npm run migrar:postgres -- ~/exportacao-firebase.json
   ```

   O script grava em lotes (uma transação por lote), troca os ids antigos de preços pelo formato
   novo (sem a chave de acesso da nota) e, no fim, mostra a **conferência**: a contagem de cada
   coleção no export e no banco. Ele termina com "as contagens batem" ou aponta a diferença. Se o
   banco de destino já tiver dados, ele não grava; para repetir uma migração interrompida, use
   `--continuar`.

5. **Configure o Render**: Dashboard → serviço → *Environment* → adicione `DATABASE_URL` com o
   endereço do Neon. Salve e reative o serviço (*Resume*). O log de início deve mostrar
   `PostgreSQL (DATABASE_URL)`.
6. **Confira no site**: entre com uma conta de teste, veja lançamentos, lista, metas e a comparação
   de preços.

Para voltar atrás, basta remover `DATABASE_URL` do Render: a API volta a usar o Firebase (o que foi
gravado no PostgreSQL nesse meio-tempo não volta junto).

### 3. Depois de alguns dias sem problema

Guarde o JSON exportado num lugar seguro e então apague o Realtime Database (Firebase Console →
Realtime Database → menu **⋮** → excluir banco). **Não** apague o projeto do Firebase: o login usa o
Firebase Auth. Depois disso, `FIREBASE_URL_BANCO` pode sair do Render.

### Testes no PostgreSQL

`npm test` usa o banco em memória e não precisa de PostgreSQL (os testes do adaptador são pulados).
Para rodar **a suíte inteira** também no PostgreSQL, use um banco só de teste (o nome precisa ter
"test", porque os testes apagam tudo):

```bash
# exemplo com um PostgreSQL local; qualquer outro serve
createdb vera_teste
cd Backend
DATABASE_URL_TESTE='postgres://usuario:senha@localhost:5432/vera_teste' npm run test:pg
```

Sem PostgreSQL instalado, dá para subir um descartável com Docker:
`docker run --rm -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=vera_teste -p 5432:5432 postgres:16`
e usar `DATABASE_URL_TESTE='postgres://postgres:teste@localhost:5432/vera_teste'`.

---

## Levar as contas do login por senha para o Firebase Authentication

As contas criadas pelo login próprio da API (e-mail e senha guardados em `credenciais` no banco)
podem ir para o Firebase Authentication sem ninguém trocar de senha: o script leva o hash scrypt
como está, com o mesmo identificador (uid), e-mail e nome.

Na pasta `Backend`, com a conta de serviço do Firebase no `.env` (as mesmas variáveis do Render):

```bash
# 1. Simulação (padrão): só lê e mostra o relatório, não grava nada
node --env-file=.env scripts/importar-usuarios-firebase.mjs

# 2. Conferiu o relatório? Importa de verdade (lotes de até 1000 contas)
node --env-file=.env scripts/importar-usuarios-firebase.mjs --executar
```

Contas que já existem no Firebase (mesmo uid ou mesmo e-mail) são puladas, e o relatório final lista
as inválidas, as puladas e as que falharam. Rode primeiro num projeto de teste.

Depois que todas as contas estiverem no Firebase, o login próprio pode ser desligado: o site já
entra pelo Firebase, e as rotas `/api/auth/entrar`, `/api/auth/cadastrar`, `/api/me/senha` e o plano
B em `Frontend/src/services/servicoDeLogin.js` deixam de ser necessários.

---

## E-mails transacionais

Os modelos ficam em `Backend/src/emails/` (HTML com estilos inline e versão em texto, em português):
boas-vindas, confirme seu e-mail, recibo de pagamento, cobrança que falhou, assinatura cancelada,
exclusão agendada, conta apagada, alerta de preço da lista e resumo semanal. **Nenhum deles é
enviado ainda**: falta escolher o provedor.

```js
import { renderizarEmail } from './src/emails/index.js';

const { assunto, html, texto } = renderizarEmail('boas-vindas', { nome: 'Ana' });
// entregue assunto, html e texto ao provedor de envio
```

- Os campos de cada modelo estão em `src/emails/exemplos.js`. Os valores chegam prontos para ler
  (`R$ 12,90`, `26/11/2026`); o modelo não formata nada.
- No HTML, todo valor sai escapado. Campo que falta dá erro, campo `link*` só aceita `http(s)` e o
  assunto nunca tem quebra de linha.
- Os links do site (`linkApp`, `linkConfiguracoes`...) e os contatos já vêm preenchidos, a partir de
  `SITE_URL`.
- `npm run emails:ver` grava todos os modelos com os dados de exemplo para ver no navegador.
- Antes de ligar o alerta de preço e o resumo semanal, crie o jeito de parar de receber: os dois
  modelos pedem `linkDescadastro`.
- Recibo, cobrança que falhou e assinatura cancelada dependem da cobrança, que ainda não existe. O
  modelo `assinatura-cancelada` diz que a conta volta para o grátis na data de fim: essa volta
  precisa existir antes de ligar esse e-mail.

---

## Integração contínua

Cada push e pull request roda, no GitHub Actions (`.github/workflows/ci.yml`), com Node 22:

- `cd Backend && npm ci && npm test`
- `cd Frontend && npm ci && npm run build`

O CI não faz deploy: o Render publica sozinho a partir da branch configurada em cada serviço.

---

## Redes de supermercado

Redes com preço do site hoje (`Backend/src/models/RedeModel.js`). Ficaram de fora redes que não
publicam preço online e redes cuja plataforma exige login para consultar. A vera não tem vínculo com
as redes citadas.

| Rede | Tipo | Plataforma do site | Preço para o CEP |
|---|---|---|---|
| Atacadão | atacado | VTEX | sim |
| Sam's Club | atacado | VTEX | sim |
| Savegnago | mercado | VTEX | sim |
| Covabra | mercado | VTEX | sim |
| Giassi | mercado | VTEX | sim |
| Angeloni | mercado | VTEX | sim |
| Zona Sul | mercado | VTEX | sim |
| Prezunic | mercado | VTEX | sim |
| Mambo | mercado | VTEX | sim |
| Bistek | mercado | VTEX | sim |
| Hortifruti | mercado | VTEX | sim |
| Super Nosso | mercado | VTEX | sim |
| GBarbosa | mercado | VTEX | sim |
| Amigão | mercado | VTEX | sim |
| Giga Atacado | atacado | VTEX | sim |
| Mercantil Atacado | atacado | VTEX | sim |
| Zaffari | mercado | VTEX | sim |
| Super Muffato | mercado | VTEX | sim |
| Hiperideal | mercado | VTEX | sim |
| Rissul | mercado | VTEX | sim |
| Oba Hortifruti | mercado | VTEX | sim |
| Coop | mercado | VTEX | sim |
| São Vicente | mercado | Salesforce Commerce Cloud | não (preço da loja online) |
| Tenda Atacado | atacado | API pública do Tenda | não (preço da loja online) |
| Confiança | mercado | Oracle Commerce | não (preço da loja online) |
| Pão de Açúcar | mercado | GPA (loja escolhida pelo CEP) | sim |
| Pague Menos | mercado | página de busca do site | não (preço da loja online) |

Cada leitor tem tempo limite de 9 segundos e a busca fica 30 minutos em cache. Quando o site de uma
rede não responde, o app mostra "o site da rede não respondeu agora". O que fazer quando uma rede
quebra está em [docs/operacao.md](docs/operacao.md#quando-uma-rede-quebra).

---

## Como adicionar uma rede nova

1. **Confira se dá.** A rede precisa mostrar preço no site sem login. Descubra a plataforma: lojas
   VTEX respondem em `<site>/api/checkout/pub/regions?country=BRA&postalCode=<cep>`. Não use
   dados que exigem login e não contorne bloqueio do site.
2. **Cadastre a rede** em `Backend/src/models/RedeModel.js`, no array `REDES`:
   - `id`: curto, sem acento e único (vai nos ids de preço, `rede-<id>`; não mude depois);
   - `nome`: como aparece no app;
   - `site`: endereço da loja online;
   - `nomes`: expressão regular que reconhece a rede pelo nome ou pela marca do mercado no mapa
     (OpenStreetMap) e na nota fiscal. Cuidado com nomes que também são cidade ou bairro (veja o
     caso de São Vicente);
   - `tipo`: `mercado` ou `atacado`;
   - `plataforma`: `vtex`, `gpa`, `paguemenos`, `tenda`, `occ` ou `sfcc`, mais os campos que o
     leitor pede (`siteSfcc` no `sfcc`, `marcaGpa` no `gpa`).
3. **Plataforma nova?** Crie `Backend/src/models/Catalogo<Plataforma>Model.js` com
   `buscar(rede, termo, cep)` devolvendo `{ situacao, produtos }`, em que `situacao` é `ok`,
   `semEntrega`, `semCep` ou `falhou` e cada produto tem `produto`, `marca`, `ean`, `preco`,
   `precoDe`, `unidade` (`un` ou `kg`), `imagem` e `link`. Use `AbortSignal.timeout(9000)` no
   `fetch`. Registre o leitor em `LEITORES`, em `Backend/src/models/CatalogoModel.js`. Se a
   plataforma devolve preço para o CEP, inclua-a em `PRECO_POR_CEP`
   (`Backend/src/models/PrecoRegionalModel.js`).
4. **Teste sem internet.** Escreva um teste com o formato real da resposta do site e um `fetch` de
   mentira (modelos: `Backend/test/saovicente.test.js` e `Backend/test/regiao.test.js`): o
   reconhecimento do nome (`RedeModel.identificar`) e a leitura de nome, preço, código de barras e
   disponibilidade.
5. **Atualize o site**, na mesma ordem do `RedeModel`: `REDES_COM_PRECO` em
   `Frontend/src/lib/site.js` (a landing e as perguntas usam essa lista) e a lista de redes de
   `Frontend/public/llms.txt`. O teste `Backend/test/redesSite.test.js` falha se as listas não
   baterem. Se quiser a rede entre os destaques da landing, ela vai em `MARCAS`
   (`Frontend/src/pages/site/Landing.jsx`).
6. **Atualize este readme** (tabela de redes) e rode `cd Backend && npm test` e
   `cd Frontend && npm run build`.
7. **Depois do deploy**, procure um produto em `/app/comparar` com um CEP perto de uma loja da rede
   e rode `npm run indexnow` (as páginas públicas mudaram).

---

## Mais documentação

- [docs/operacao.md](docs/operacao.md): checklist de deploy, logs, jobs, redes quebradas, backup,
  rotação de segredos, pedidos de titulares (LGPD) e incidentes.
- [docs/marca.md](docs/marca.md): nome, logo, cores, tipografia, tom de voz e regras de honestidade.
- [CONTRIBUTING.md](CONTRIBUTING.md): branches, commits, testes e pull requests.

---

## Integrantes

- Davi Paulino
- Alaf Rocha
- Enzo Gabriel
- João Miguel
- Otávio Barbieri
- Pedro Henrique

---

## Licença

Este repositório ainda não tem um arquivo de licença. Por isso, **todos os direitos são
reservados** aos autores: ver o código é permitido pelo GitHub, mas copiar, modificar ou distribuir
depende de autorização. Sugestão: escolher uma licença (por exemplo em
[choosealicense.com](https://choosealicense.com)) e adicionar o arquivo `LICENSE` na raiz.
