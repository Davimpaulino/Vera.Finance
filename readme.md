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
  - [Testes](#testes)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Deploy no Render](#deploy-no-render)
  - [Sem internet](#sem-internet)
  - [Deploy com a aba aberta](#deploy-com-a-aba-aberta)
- [Scripts de operação](#scripts-de-operação)
- [PostgreSQL (dados)](#postgresql-dados)
- [Levar as contas do login por senha para o Firebase Authentication](#levar-as-contas-do-login-por-senha-para-o-firebase-authentication)
- [E-mails transacionais](#e-mails-transacionais)
- [Segurança da API](#segurança-da-api)
- [Verificador de CEP (público)](#verificador-de-cep-público)
- [Alerta de preço da lista](#alerta-de-preço-da-lista)
- [Páginas de conteúdo (Onde funciona, Central de ajuda e Blog)](#páginas-de-conteúdo-onde-funciona-central-de-ajuda-e-blog)
- [Planos](#planos)
- [Desempenho do site](#desempenho-do-site)
- [O que o navegador guarda](#o-que-o-navegador-guarda)
- [Dependências](#dependências)
- [Integração contínua](#integração-contínua)
- [Redes de supermercado](#redes-de-supermercado)
  - [Robô de coleta identificado](#robô-de-coleta-identificado)
  - [Monitor de saúde das redes](#monitor-de-saúde-das-redes)
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
  a nota no portal da Secretaria da Fazenda do estado, prepara um gasto com o valor e a loja para a
  pessoa escolher a categoria e guarda os preços para comparar. Lê o layout do "Portal da NFC-e"
  usado pela maioria dos estados; quando o estado mostra outro formato, o app pede para lançar à
  mão.
- **Metas**: valor-alvo, aportes e simulador de quantos ciclos faltam.
- **Relatórios**: gastos dos últimos 6 ciclos e mês a mês no ano, limites estourados, a categoria
  que mais caiu e os lugares onde a pessoa mais gasta.

**Mercado**

- **Comparação de preços**: o mesmo produto nos mercados num raio de 2 a 15 km do CEP, com o preço
  do site de cada rede (consultado para o CEP quando a plataforma permite) e o de notas fiscais
  lidas por quem usa a vera. Cada preço mostra a data e a origem. Histórico de 90 dias por produto.
- **Lista de compras**: soma a lista em cada mercado do raio, mostra onde ela sai mais barata e, ao
  finalizar, lança a compra nas categorias. Quando um item está mais barato em outro mercado perto,
  aparece um aviso no sino ([alerta de preço da lista](#alerta-de-preço-da-lista)).
- **Mercados perto do CEP**: vêm do OpenStreetMap (Overpass), com CEP pelo ViaCEP e endereço pelo
  Nominatim.

**Conta e família**

- **Login**: e-mail e senha ou Google, pelo Firebase Authentication. Login com a Apple pronto, mas
  escondido até ser configurado (veja `VITE_LOGIN_APPLE`). Há também o login próprio da API
  (legado), usado pelas contas antigas; veja
  [como levar essas contas para o Firebase](#levar-as-contas-do-login-por-senha-para-o-firebase-authentication).
- **Confirmação de e-mail**: quem cria conta com e-mail e senha recebe o e-mail de confirmação e vê
  um aviso discreto até confirmar. O aviso não bloqueia nada ([detalhes](#confirmação-de-e-mail)).
- **Planos**: Grátis (não expira; até 3 metas e 5 notas lidas por mês), vera+ mensal e vera+ anual.
  Os planos e limites ficam em `Backend/src/models/PlanoModel.js`. Cancelado, o vera+ vale até o fim
  do período já começado; depois a conta volta para o grátis, sem apagar nada ([Planos](#planos)).
  A cobrança ainda não existe (veja [O que ainda não existe](#o-que-ainda-não-existe)).
- **Modo família** (vera+): o dono do ciclo convida pessoas pelo e-mail delas (o convite aparece
  no app quando a pessoa entra com esse e-mail) e escolhe quais categorias são compartilhadas.
- **Avisos no app** (sino): notas para confirmar, categoria perto do limite ou estourada, convites
  da família, meta batida, alta de preço no mercado de sempre e item da lista mais barato em outro
  mercado perto.
- **LGPD**: aceite dos Termos e da Política de privacidade com versão (`VERSAO_DOS_TERMOS`), baixar
  todos os dados em JSON, planilha dos lançamentos e exclusão da conta em 30 dias (com opção de
  desistir). A localização do aparelho é guardada arredondada (~100 m). O botão "Apagar
  localização" (ou o CEP salvo em branco), em Configurações › Mercado e localização, apaga o CEP, o
  ponto aproximado, a cidade, os mercados escolhidos e os alertas da lista; o raio de busca fica.
- **Aparência**: superfície escura (tinta) ou clara (papel) e opção de esconder os valores.

**Site**

- Páginas públicas (início, planos, perguntas, onde funciona, central de ajuda e artigos, blog e
  posts, termos, privacidade, entrar e cadastro) pré-renderizadas no build, para buscadores e robôs
  de IA lerem sem JavaScript. `robots.txt`, `sitemap.xml`, `llms.txt` e aviso ao IndexNow.
- **Onde funciona** (`/onde-funciona`): sem cadastro, a pessoa digita o CEP e vê quais redes com
  preço online têm loja perto ([verificador de CEP](#verificador-de-cep-público)).
- **Central de ajuda** (`/ajuda`) e **blog** (`/blog`), com um artigo por página
  ([como escrever](#páginas-de-conteúdo-onde-funciona-central-de-ajuda-e-blog)).
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
  do dia da troca. Cancelar marca até quando o vera+ continua; passada essa data, a conta é lida
  como grátis ([Planos](#planos)).
- **E-mails**: os modelos estão prontos em `Backend/src/emails/`, mas nenhum deles é enviado (o
  provedor ainda não foi escolhido). Hoje saem só dois e-mails, os dois pelo próprio Firebase
  Authentication: o de redefinir a senha ("Esqueci a senha") e o de
  [confirmação de e-mail](#confirmação-de-e-mail) (`sendEmailVerification`), para quem cria conta
  com e-mail e senha. Avisos só aparecem dentro do app; não há notificação push.
- **Preço de todas as redes**: só as [redes listadas](#redes-de-supermercado) têm preço do site.
  Outros mercados aparecem quando alguém lê uma nota fiscal de lá.
- **Duas opções de Configurações**, "Zerar categorias na virada" e "Resumo antes de fechar o ciclo",
  só ficam guardadas, sem efeito.
- **"Alerta de alta de preço"** (Configurações) promete dois avisos. O do item da lista que está pelo
  menos 5% mais barato em outro mercado perto existe ([alerta de preço da lista](#alerta-de-preço-da-lista)).
  O outro diz avisar quando um item que a pessoa compra sempre sobe no mercado dela. O aviso do sino
  que existe (`ComparacaoModel.dica`) mostra o produto da base de preços que mais subiu no mercado
  habitual, com qualquer alta, quando outro mercado do raio está mais barato. Ele não olha o que a
  pessoa compra. A mesma dica aparece no painel mesmo com a opção desligada.

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
  por IP ou por conta, em memória (`limite.js`; veja [Limites de uso](#limites-de-uso)).
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
  do app carregam sob demanda (`sobDemanda` em `src/App.jsx`). O Firebase e o texto da ajuda e do
  blog também vêm em pedaços separados (veja [Desempenho do site](#desempenho-do-site)).
- **Design system** em `src/components/ds` (botões, campos, cartões, tabelas, ícones do Bootstrap
  Icons) e tokens de cor, tipografia e espaço em `src/css`. Guia em [docs/marca.md](docs/marca.md).
- **Pré-renderização**: `npm run build` faz o build do Vite, um build SSR de
  `src/entry-server.jsx` e roda `scripts/prerender.mjs`, que grava o HTML pronto de cada página
  pública em `dist/<rota>/index.html` (títulos e descrições em `src/lib/paginas.js`) e a casca do
  app em `dist/app.html`.
- **PWA**: `public/manifest.webmanifest` e `public/sw.js` (detalhes no
  [deploy](#app-instalável-pwa)).
- **Login no navegador**: Firebase Authentication (`src/services/firebase.js`,
  `configuracaoFirebase.js` e `servicoDeLogin.js`), com o login próprio da API como plano B para as
  contas antigas.

---

## Estrutura de pastas

```
vera.finance/
├── .github/
│   ├── workflows/ci.yml          testes do backend, testes e build do frontend a cada push e PR
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
│   │   └── utils/                datas, dinheiro, texto, HTTP, validação, robots.txt e roteador
│   └── test/                     testes (node --test) e dados de apoio
├── Frontend/                     site e app (React 19 + Vite 7)
│   ├── public/                   sw.js, manifest, ícones, robots.txt, sitemap.xml, llms.txt
│   ├── scripts/                  pré-renderização, ícones, IndexNow e service worker de emergência
│   ├── src/
│   │   ├── main.jsx              entrada no navegador (registra o service worker)
│   │   ├── entry-server.jsx      entrada da pré-renderização
│   │   ├── App.jsx               escolhe a página pelo caminho
│   │   ├── pages/site, auth, app páginas públicas, de login e do app
│   │   ├── conteudo/             artigos da central de ajuda e do blog
│   │   ├── components/ds/        design system
│   │   ├── components/app, site  peças do app e do site
│   │   ├── css/                  tokens (cores, tipografia, espaços) e estilos globais
│   │   ├── lib/                  roteador, metadados das páginas, endereço do site, termos
│   │   ├── context/, hooks/      login, tema e avisos
│   │   ├── services/             chamadas da API e Firebase
│   │   └── assets/landing/       telas de celular da landing (ilustrativas)
│   ├── test/                     testes de unidade (Vitest)
│   ├── e2e/                      testes de ponta a ponta (Playwright)
│   ├── captura.html, captura.jsx página de apoio do `npm run dev` com as telas de celular
│   ├── playwright.config.js
│   └── vite.config.js
├── docs/                         operação (operacao.md) e marca (marca.md)
├── database.rules.json           regras do Firebase Realtime Database
├── firebase.json                 aponta o Firebase CLI para as regras
├── CONTRIBUTING.md
└── readme.md
```

---

## Como rodar localmente

Precisa do **Node.js 22.12 ou mais novo** e do npm. A API sozinha roda a partir do 22.9; o Vite 7,
que faz o build do site, pede 22.12. Os testes do site (`npm test` no Frontend) usam o jsdom, que
pede 22.22.2 ou mais novo. Na dúvida, use o Node 22 mais recente, como o CI.

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
`src/services/configuracaoFirebase.js`; para não criar contas de teste nele, aponte essas variáveis
para um projeto Firebase de desenvolvimento e use o mesmo projeto em `FIREBASE_PROJECT_ID` na API (é
com ele que a API confere o token de login).

`npm run preview` serve o `dist` do build do mesmo jeito que o Render (páginas pré-renderizadas e a
regra `/* -> /app.html`).

### Testes

```bash
cd Backend
npm test          # banco em memória; os testes só do PostgreSQL são pulados
npm run test:pg   # a suíte inteira também no PostgreSQL (veja "Testes no PostgreSQL")

cd ../Frontend
npm test                          # Vitest: testes de unidade em test/ (jsdom, sem rede)
npx playwright install chromium   # só na primeira vez
npm run test:e2e                  # Playwright: testes de ponta a ponta em e2e/
npm run build                     # o build também confere (ícones, artigos, service worker)
```

O CI roda o `npm test` do Backend e do Frontend e o build do Frontend. O `npm run test:e2e` roda
só na máquina de quem desenvolve.

- `npm test` (Frontend) cobre `src/lib` (formatação, páginas, roteador, site, recarga depois de
  deploy), o seletor de produto, os textos legais, o aceite dos termos, os campos e o diálogo do
  design system, o estado "Sem conexão" (com as saídas), o "Ver o painel", a moldura do site
  (rodapé fora do `<main>`) e a lista de ícones.
- `npm run test:e2e` sobe a API com `BANCO=memoria` na porta **4100** e o site do build
  (`vite preview`) na **4180**. Ele nunca reaproveita um servidor que já esteja rodando, para não
  gravar contas de teste num banco de verdade. Tudo fora de `localhost` é bloqueado e o Firebase Auth
  é simulado como "login não ligado", então o cadastro segue pelo login próprio da API.
- O `npm run test:e2e` refaz o `dist/` apontando para a API de teste. Não publique esse `dist/` à
  mão.
- O e2e percorre cadastro (com o aceite dos termos), cadastro guiado, painel, novo gasto, lista de
  compras, comparar, sair da conta (com e sem rede) e a aba aberta durante um deploy. Ele roda o
  axe-core (WCAG 2.1 AA) em cada tela nos temas tinta e papel e confere que as páginas do site não
  baixam o Firebase.
- A API aceita 5 cadastros por hora por IP, e todos os testes saem do mesmo IP. A rodada inteira
  cria 4 contas. Num teste novo, prefira entrar de novo com a senha numa conta já criada
  (`entrarComSenha` em `e2e/jornada.spec.js`) a criar outra.

Alguns testes do backend conferem arquivos do frontend: o service worker (`public/sw.js`), a lista
de redes do site (`src/lib/site.js` e `public/llms.txt`) e as páginas de conteúdo no
`public/sitemap.xml` e no `public/llms.txt` (`test/conteudo.test.js`).

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
| `SITE_URL` | Não | Endereço do site nos links dos modelos de e-mail (ainda sem envio) e no user-agent do [robô de coleta](#robô-de-coleta-identificado). Padrão: `https://vera-finance.onrender.com`. | `https://vera-finance.onrender.com` |
| `COLETA_IDENTIFICADA` | Não | `1` faz os pedidos aos sites das redes saírem com o user-agent do robô da vera e confere o robots.txt de cada site antes ([detalhes](#robô-de-coleta-identificado)). Sem ela, os pedidos vão como um navegador comum. | `1` |
| `CEP_DE_TESTE` | Não | CEP usado pelo `npm run saude:redes` ([monitor das redes](#monitor-de-saúde-das-redes)). Só o script lê; a API não usa. Padrão: `01310100`. | `13334100` |

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
| `VITE_FIREBASE_API_KEY` | Não | Configuração Web do Firebase (pública). Padrão: a do projeto em `src/services/configuracaoFirebase.js`. | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Não | Domínio de login do Firebase. Padrão: `<projeto>.firebaseapp.com`. | `meu-projeto.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Não | Projeto do Firebase do site. | `meu-projeto` |
| `VITE_FIREBASE_APP_ID` | Não | Id do app Web no Firebase. | `1:000000000000:web:abc123` |
| `VITE_FIREBASE_DATABASE_URL` | Não | URL do Realtime Database na configuração Web. | `https://<projeto>-default-rtdb.firebaseio.com` |
| `VITE_LOGIN_APPLE` | Não | `1` mostra o botão "Continuar com Apple". Ligue só depois de configurar o login da Apple no Apple Developer e no Firebase. | `1` |

O `npm run indexnow` também lê `VITE_SITE_URL` do ambiente do terminal.

---

## Deploy no Render

São dois serviços no Render, os dois ligados a este repositório: a API como **Web Service** e o site
como **Static Site**. Um terceiro é opcional: o **Cron Job** do
[monitor de saúde das redes](#monitor-de-saúde-das-redes).

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
`npm run regras:firebase -- --executar`, que publica e confere (sem `--executar`, só simula; veja
[como usar](#publicar-as-regras-do-realtime-database)). Também dá com
`firebase deploy --only database` ou colando o conteúdo em Firebase Console → Realtime Database →
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
  `/onde-funciona`, `/ajuda`, `/ajuda/<slug>`, `/blog`, `/blog/<slug>`, `/termos`, `/privacidade`,
  `/entrar`, `/cadastro`) em `dist/<rota>/index.html`. Assim buscadores e robôs de IA, que não rodam
  JavaScript, leem o conteúdo. Não precisa de navegador no build. Título, descrição, canonical,
  robots e os textos de compartilhamento (`og:`/`twitter:`) de cada página vêm de
  `src/lib/paginas.js`; os dos artigos vêm de `src/conteudo/`. A home mantém os do `index.html`.
- `/onde-funciona` chama `GET /api/publico/redes` da API. Publique a API com essa rota antes do
  site (veja [Verificador de CEP](#verificador-de-cep-público)).
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
- Sem internet abre só a casca do app, não os dados: o login e os números vêm da API. Sem conexão
  com a API, o app mostra a tela "Sem conexão" (veja [Sem internet](#sem-internet)).
- A versão do cache muda a cada build: o plugin `vera-versao-do-sw` do `vite.config.js` troca o
  marcador `__VERSAO_DO_BUILD__` do `dist/sw.js` em qualquer `vite build` e faz o build falhar se o
  marcador sumir. Os caches antigos são apagados quando a versão nova assume.
- Emergência (o service worker atrapalhando em produção): copie `scripts/sw-emergencia.js` por cima
  de `public/sw.js` e, no mesmo deploy, apague o bloco que registra o service worker em
  `src/main.jsx`. Publique. A primeira visita de cada pessoa depois do deploy ainda passa pelo
  service worker antigo, que baixa o novo; a partir daí os caches da vera somem, o registro sai e
  tudo vem direto da rede. Para voltar ao normal, restaure os dois arquivos pelo git.

### Sem internet

- Quem abre entrar, cadastro ou o app sem conexão com a API vê "Sem conexão" com "Tentar de novo".
  O login não se perde.
- Quando o navegador avisa que a rede voltou, a vera tenta de novo sozinha.
- A tela tem saída: o logotipo leva ao site, e quem tem sessão neste aparelho vê "Sair da conta",
  que funciona sem rede.

### Deploy com a aba aberta

Depois de um deploy, quem está com o site aberto ainda pede os pedaços do build antigo
(`firebase-HASH.js`, telas do app). Para um `/assets/` que não existe mais, o Render responde 200
com o HTML da casca.

- A página percebe (evento `vite:preloadError` em `src/main.jsx`) e recarrega uma vez sozinha para
  pegar o build novo (`src/lib/versaoNova.js`).
- Se falhar de novo em menos de 60 s, não é deploy: aparece "Sem conexão", e o "Tentar de novo"
  recarrega a página.
- Por isso, tela nova do app que for lazy usa `sobDemanda(() => import(...))` em `src/App.jsx`, e
  não o `lazy` puro.

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
| `Backend/scripts/migrar-firebase-para-postgres.mjs` | `npm run migrar:postgres -- <export.json> --simular` e depois sem `--simular`; ou `npm run migrar:postgres -- --origem-firebase --simular` e depois sem `--simular` | Leva os dados do Realtime Database (do export JSON ou, com `--origem-firebase`, direto do Firebase do ambiente) para o PostgreSQL de `DATABASE_URL`, em lotes, e confere as contagens no fim. Opções: `--lote=500`, `--continuar`. | Uma vez, na troca do Firebase pelo PostgreSQL ([passo a passo](#postgresql-dados)). |
| `Backend/scripts/publicar-regras-firebase.mjs` | `npm run regras:firebase` (simulação) e depois `npm run regras:firebase -- --executar` | Publica o `database.rules.json` no Realtime Database com as credenciais da API, lê de volta e confere. | Sempre que o `database.rules.json` mudar ([detalhes](#publicar-as-regras-do-realtime-database)). |
| `Backend/scripts/saude-das-redes.mjs` | `npm run saude:redes` (opções `--cep=`, `--termo=`, `--redes=`) | Busca um produto em cada rede e mostra se o leitor funciona. Sai com código 1 se alguma rede deu erro ou voltou sem produtos. Não grava nada, então não precisa de simulação. | Todo dia, como Cron Job no Render, e depois de mexer num leitor ([detalhes](#monitor-de-saúde-das-redes)). |
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

### Alternativa: migrar direto do Firebase

Em vez do arquivo exportado (passos 2 a 4 acima), o script pode ler do Firebase configurado no
ambiente, com as mesmas variáveis `FIREBASE_*` da API:

```bash
npm run migrar:postgres -- --origem-firebase --simular   # só lê e mostra as contagens
npm run migrar:postgres -- --origem-firebase             # lê do Firebase e grava no DATABASE_URL
```

- `--lote` e `--continuar` funcionam do mesmo jeito.
- Lendo do arquivo ou do Firebase, a localização dos perfis (`usuarios/*/perfil/local`) vai para o
  PostgreSQL arredondada a 3 casas (~100 m). O relatório mostra quantos perfis foram arredondados.
- Para rodar como job no Render, use um serviço com `FIREBASE_URL_BANCO`, a conta de serviço e
  `DATABASE_URL`. Suspenda a API antes, para ninguém gravar durante a cópia.

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

Hoje saem dois e-mails, os dois pelo Firebase Authentication: o de redefinir a senha ("Esqueci a
senha") e o de confirmação de e-mail. Os modelos da própria vera, em `Backend/src/emails/`, ainda
não são enviados.

### Confirmação de e-mail

Quem cria conta com e-mail e senha recebe o e-mail de confirmação do Firebase em português, com um
botão para voltar ao app. Para esse botão aparecer, o domínio do site precisa estar em Firebase →
Authentication → Settings → Authorized domains. Sem isso, o e-mail vai sem o botão.

Enquanto o e-mail não for confirmado, o app mostra um aviso discreto. Ele não bloqueia nada e não
aparece para quem entra com Google ou Apple:

- Se o e-mail já saiu deste aparelho (no cadastro ou pelo botão), o aviso diz "Clique no link que
  enviamos para …", com o botão "Reenviar".
- Senão (por exemplo, conta criada antes da confirmação existir), diz "Receba o link de confirmação
  em …", com o botão "Enviar link".

Para saber se o e-mail já saiu, o aparelho guarda só o uid da conta (`localStorage`, chave
`vera.confirmacaoEnviada`), não o e-mail. Veja tudo o que fica no aparelho em
[O que o navegador guarda](#o-que-o-navegador-guarda).

### Modelos da vera (ainda sem envio)

Os modelos ficam em `Backend/src/emails/` (HTML com estilos inline e versão em texto, em português):
boas-vindas, confirme seu e-mail, recibo de pagamento, cobrança que falhou, assinatura cancelada,
exclusão agendada, conta apagada, alerta de preço da lista e resumo semanal. **Nenhum deles é
enviado ainda**: falta escolher o provedor. O modelo `confirme-email` não é usado, porque hoje quem
manda esse e-mail é o Firebase.

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
  modelo `assinatura-cancelada` diz que a conta volta para o grátis na data de fim. Essa volta já
  existe (`PlanoModel.emVigor`, veja [Planos](#planos)).

---

## Segurança da API

### Limites de uso

Contados em memória (`Backend/src/middlewares/limite.js`), por janela de 15 minutos, salvo onde diz
outra coisa. Passou do limite, a API responde `429` com `Retry-After`.

| Rota | Limite |
|---|---|
| `POST /api/auth/entrar`, `POST /api/me/senha` | 10 por IP, as duas somadas |
| `POST /api/auth/cadastrar` | 5 por IP por hora |
| `POST /api/auth/email-em-uso` | 20 por IP |
| `POST /api/leads` | 5 por IP por hora |
| `POST /api/notas/ler` | 30 por IP por hora |
| `GET /api/publico/redes` (pública) | 20 por IP, mais o teto do serviço inteiro (veja [Verificador de CEP](#verificador-de-cep-público)) |
| `GET /api/mercados`, `GET /api/onboarding/raio` (públicas) | 120 por IP, cada uma |
| `GET /api/mercados/comparar` | 90 por conta |
| `GET /api/mercados/produtos` | 400 por conta |
| `GET /api/lista/opcoes` | 300 por conta |
| `/api/lista` (ler e mudar) | 300 por conta |
| Todas as rotas de preço juntas (`/api/mercados/produtos`, `/api/mercados/comparar` e `/api/lista`) | 1500 por IP, contados antes do login |
| `PATCH /api/me` | 60 por conta |
| `POST /api/onboarding` | 20 por conta por hora |

### Qual IP conta

O IP de quem pede vem do `CF-Connecting-IP` ou do `True-Client-IP`, que a borda do Render põe. Sem
eles, vale o último valor do `X-Forwarded-For` (o que o proxy acrescenta) e, por fim, o endereço da
conexão (máquina local, testes). O começo do `X-Forwarded-For`, que o cliente pode mandar, não
conta. A regra fica na função `ipDe`, em `limite.js`.

### O que a API confere

- **Ids da URL** (`/api/lista/:id` e as outras rotas com `:id`): nada de barra, `. # $ [ ]`,
  caracteres de controle, `__proto__` ou mais de 128 caracteres. Fora disso, a resposta é `400`. Um
  id como `constructor` ou `toString` dá "não encontrado", inclusive no banco em memória.
- **Corpo**: precisa ser um objeto JSON de até 1 MB. Cada campo só aceita o tipo esperado: um objeto
  no lugar de um texto ou de um número dá `400`.
- **Tamanhos**: e-mail até 254 caracteres; senha de 8 a 200; nome 100; descrição do lançamento 120;
  nome de categoria 40; nome de meta 80; nome de item da lista 150; termo de busca nos sites 80. Ao
  abrir a sessão (`POST /api/auth/sessao`), um nome maior que 100 é cortado em vez de recusado.
- **Quantidades**: a lista tem até 150 itens, e cada item de 1 a 99 unidades. Cada conta tem até 40
  categorias, contando as que o cadastro guiado cria para os gastos fixos. O cadastro guiado aceita
  até 30 categorias e 50 gastos fixos.
- **Faixas**: raio de 1 a 15 km, em km inteiros; latitude e longitude válidas; valores em reais até
  R$ 1 bilhão.
- **Planilha de lançamentos**: toda célula vai entre aspas. Um texto que começa com `= + - @` ganha
  um apóstrofo na frente, e o mesmo vale logo depois de vírgula, ponto e vírgula, tabulação ou quebra
  de linha. Assim nada vira fórmula no Excel ou no Google Planilhas, mesmo num programa que separa
  as colunas por vírgula.

### Modo família

- Quem não é dono vê as entradas, as categorias compartilhadas e os próprios lançamentos. A regra
  vale na tela, no relatório e na planilha.
- Quem não é dono só lança em categoria compartilhada: à mão, ao confirmar uma nota e ao finalizar a
  lista. Na lista, se nenhuma categoria compartilhada serve, a compra entra sem categoria.
- Nota lida e ainda não confirmada é de quem a leu e do dono.
- Metas: todos guardam dinheiro nelas. Mudar, apagar ou retirar qualquer valor é do dono ou de quem
  criou a meta. Os outros retiram só o que eles mesmos guardaram.
- Nas metas criadas antes de a vera registrar quem as criou, conta como criador quem fez o aporte
  junto com a criação. Sem esse aporte, só o dono muda a meta.
- Quem já está numa família não aceita outro convite.

### Publicar as regras do Realtime Database

O script `Backend/scripts/publicar-regras-firebase.mjs` envia o `database.rules.json` com as
credenciais que a API já usa:

- **conta de serviço** (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`, ou
  `GOOGLE_APPLICATION_CREDENTIALS`), pelo Admin SDK;
- ou **segredo legado** do banco (`FIREBASE_SEGREDO_BANCO`), pela API REST.

O endereço vem só de `FIREBASE_URL_BANCO`: o script não tem endereço padrão.

```bash
cd Backend
npm run regras:firebase                 # simulação: mostra as regras atuais e o que seria publicado
npm run regras:firebase -- --executar   # publica, lê de volta e confere
```

Depois de publicar, o script lê as regras de volta e compara com o arquivo. Em seguida faz uma
leitura **sem credencial** na raiz do banco, que precisa ser recusada (`401` ou `403`). Se algo não
conferir, ele sai com código 1.

**No Render**: rode como job do serviço da API, que já tem as variáveis. O comando é
`node scripts/publicar-regras-firebase.mjs` primeiro, e depois o mesmo comando com `--executar`. Se
a pasta raiz do serviço não for `Backend`, use `cd Backend && node scripts/publicar-regras-firebase.mjs`.

---

## Verificador de CEP (público)

`GET /api/publico/redes?cep=13334100` (aceita `13334-100`). Não precisa de login. É a rota que a
página `/onde-funciona` consulta.

Limites:

- **Por IP:** 20 consultas a cada 15 minutos. Depois disso, `429` com `Retry-After`.
- **Do serviço inteiro:** no máximo 10 CEPs novos por minuto e 2 consultas ao mesmo tempo. Depois
  disso, `429` com `Retry-After` e
  `{ "erro": "Muita gente consultando agora. Tente de novo em um minuto." }`. CEP já consultado
  continua saindo do cache e não gasta vaga.

Resposta 200:

```json
{
  "cep": "13334-100",
  "cidade": "Indaiatuba - SP",
  "raioKm": 15,
  "situacao": "ok",
  "mensagem": "2 redes com preço online a até 15 km deste CEP.",
  "totalMercados": 6,
  "comPrecoOnline": 2,
  "redes": [
    { "id": "savegnago", "nome": "Savegnago", "tipo": "mercado", "precoOnline": true, "lojas": 2, "distanciaKm": 0.1 },
    { "id": "atacadao", "nome": "Atacadão", "tipo": "atacado", "precoOnline": true, "lojas": 1, "distanciaKm": 1.1 },
    { "id": null, "nome": "Dia", "tipo": "mercado", "precoOnline": false, "lojas": 2, "distanciaKm": 0.2 }
  ],
  "atualizadoEm": "2026-11-26T12:00:00.000Z"
}
```

- `redes` traz primeiro as redes com preço online (`precoOnline: true`, com o `id` do RedeModel).
  Depois vêm até 10 mercados sem preço online (`id: null`), agrupados pelo nome. Cada grupo vai do
  mais perto para o mais longe. `distanciaKm` é a distância da loja mais perto daquela rede e
  `lojas` é quantas lojas dela ficam no raio.
- `situacao: "mapaFalhou"` quer dizer que o mapa (ou a localização do CEP) não respondeu. `redes`
  vem vazia e `mensagem` explica o que houve. Essa resposta não vai para cache público.
- Erros: 400 `{ "erro": "Digite um CEP com 8 números." }`, 404
  `{ "erro": "Não achamos esse CEP. Confira os números." }` e 429 (veja os limites).
- Usa só os mercados do mapa (OpenStreetMap). O CEP não é gravado em lugar nenhum e a resposta não
  traz coordenadas nem endereço.
- A API guarda o resumo de cada CEP em memória por 24 h (5 min quando o mapa falha) e manda
  `Cache-Control: public, max-age=3600`. A região que vem do mapa para o verificador não é gravada
  no banco nem fica na memória das regiões do app.

### Serviços de mapa (Nominatim e Overpass)

- O Nominatim recebe no máximo 1 pedido por segundo da API inteira (app e verificador juntos). Os
  pedidos saem em fila, com 1,1 s entre um e outro. Se a fila passa de 10 s de espera, o pedido
  desiste na hora e fica como "não achou". Por isso, salvar a localização pode levar 1 a 2 s a mais
  quando há vários pedidos na fila.
- As regiões do mapa (mercados de um raio) ficam no banco por 7 dias. Na memória ficam no máximo
  100 regiões: quando enche, sai a usada há mais tempo, que depois volta do banco.

---

## Alerta de preço da lista

Quando a lista é comparada (ao abrir ou ao mexer nela), os itens ainda não comprados que estão pelo
menos 5% **e** pelo menos R$ 1 mais baratos em outro mercado do raio do que no mercado de sempre
viram aviso no sino: "Arroz … está mais barato no Tenda Atacado". O código fica em
`Backend/src/models/AlertaDaListaModel.js`.

Só conta o mesmo produto:

- o produto escolhido na lista nas duas lojas;
- o mesmo produto das notas fiscais nas duas lojas;
- em item genérico (sem produto escolhido), o mesmo código de barras ou a mesma embalagem, ou seja,
  tamanho e variante iguais. Pacote de 1 kg numa loja e de 5 kg na outra não vira alerta.

Substituto de outra marca nunca entra. São no máximo 3 avisos, os que mais economizam.

Para saber qual produto deu o preço em cada loja, a comparação da lista (`GET /api/lista`) traz em
cada item `produtoUsado: { <mercadoId>: { chave, tamanho, variantes } }`.

Os alertas ficam em `usuarios/<dono>/perfil/alertasDaLista`. Montar as notificações só lê esse
registro, sem consultar sites de rede nem o mapa. O registro também guarda `avisados`: o menor
preço já avisado de cada item em cada mercado, por 30 dias e com no máximo 50 pares. O id da
notificação usa esse preço, então um preço que sobe ou volta ao de antes não traz de volta um aviso
já visto. Só um preço ainda menor chega como novo, e o texto mostra o preço de agora.

O alerta respeita a preferência "Alerta de alta de preço". Ele some quando o item é comprado,
quando o mercado de sempre muda, quando a pessoa apaga a localização ou depois de 2 dias sem a lista
ser comparada de novo.

---

## Páginas de conteúdo (Onde funciona, Central de ajuda e Blog)

São páginas públicas, pré-renderizadas no build para os buscadores e as IAs:

- `/onde-funciona`: campo de CEP que consulta `GET /api/publico/redes?cep=XXXXXXXX` (a rota precisa
  estar publicada na API; veja [Verificador de CEP](#verificador-de-cep-público)). Abaixo do campo
  ficam:
  - as redes com preço online, separadas em supermercados e atacados (`REDES_COM_PRECO` e
    `REDES_DE_ATACADO` em `Frontend/src/lib/site.js`, que seguem o `Backend/src/models/RedeModel.js`);
  - como a comparação funciona.
- `/ajuda` e `/ajuda/<slug>`: central de ajuda (`Frontend/src/conteudo/ajuda.js`).
- `/blog` e `/blog/<slug>`: blog (`Frontend/src/conteudo/blog.js`).

### Escrever um artigo novo

1. Copie um bloco em `ajuda.js` ou em `blog.js`. No blog, o mais novo vai primeiro. O comentário no
   topo de cada arquivo explica os campos:
   - `slug`: não mude depois de publicado;
   - `titulo`, `descricao` e `resumo`;
   - `tipo`, só na ajuda: `HowTo` com `passos`, ou `Article`;
   - `corpo`: texto solto vira parágrafo; também aceita `{ titulo }`, `{ lista }` e
     `{ lista, numerada: true }`;
   - `relacionados`;
   - `publicadoEm`: data em que o artigo saiu. É fixa e vai para o `datePublished`;
   - `atualizadoEm`: data da última revisão. É obrigatória na ajuda e opcional no blog, e vai para o
     `dateModified` e para o "Atualizado em".
2. Para pôr um link no texto, escreva `[rótulo](/caminho)`.
3. Ponha a URL nova em `Frontend/public/sitemap.xml` e em `Frontend/public/llms.txt`. O teste
   `Backend/test/conteudo.test.js` falha se faltar. O mesmo teste falha se o artigo citar uma rede
   sem o aviso "A vera não tem vínculo com as redes citadas." ([docs/marca.md](docs/marca.md)).
4. Post do blog que deve aparecer no rodapé: ponha `[nome curto, caminho]` em
   `Frontend/src/conteudo/rodape.js`.
5. Rode `cd Frontend && npm run build`. A rota, o título, o canonical, o `og:type` (article) e o
   JSON-LD saem sozinhos:
   - BlogPosting no blog;
   - HowTo ou Article na ajuda;
   - BreadcrumbList em todos.

   O build para se aparecer algum destes problemas:
   - slug repetido;
   - campo faltando;
   - data que não existe ou fora do formato AAAA-MM-DD;
   - `atualizadoEm` antes de `publicadoEm`;
   - link para uma página que não existe;
   - rodapé com um post que não existe.
6. Depois do deploy, rode `npm run indexnow`.

### Como o texto chega ao navegador

O texto dos artigos não entra no pacote principal do JavaScript. A central de ajuda, o blog e os
artigos ficam num pedaço separado, `Frontend/src/pages/site/Conteudo.jsx`, que
`Frontend/src/conteudo/carregar.js` baixa só em `/ajuda`, em `/blog` e nos artigos:

- No build, o `entry-server.jsx` importa esse pedaço direto, e o HTML sai completo.
- Quem abre um artigo pelo endereço vê o HTML pré-renderizado até o pedaço chegar.

Para não quebrar esse esquema:

- Não importe `ajuda.js`, `blog.js` nem `conteudo/index.js` fora do pedaço. Se fizer isso, o texto
  volta para o pacote principal.
- O CSS dessas páginas (`src/pages/site/css/conteudo.css`) precisa continuar no pacote principal. Se
  for para o pedaço, o HTML pré-renderizado abre sem estilo.

### Conteúdo verdadeiro

- Cada fato de funcionamento dos artigos de ajuda foi conferido no código. Se o produto mudar, mude
  o artigo junto.
- No blog, nada de número inventado: conta de exemplo diz que é exemplo, e dado de fora só entra
  com a fonte.

---

## Planos

Os planos, os preços e os limites ficam em `Backend/src/models/PlanoModel.js`.

Os itens de cada plano só mostram como diferença o que o código confere: notas por mês, metas e
pessoas no modo família. Comparação, histórico de preço, simulador de metas, alerta de alta de preço
e planilha dos lançamentos valem para todos os planos. Se isso mudar, atualize também:

- `Frontend/src/pages/site/Landing.jsx`;
- `Frontend/src/pages/site/Perguntas.jsx`;
- `Frontend/public/llms.txt`;
- o artigo `planos-e-cancelamento`.

Cancelar a assinatura grava `assinatura.cancelada` e `assinatura.ativaAte`, o fim do período já
começado. Depois dessa data, o perfil é lido como plano grátis (`PlanoModel.emVigor`, aplicado em
`UsuarioModel.buscar`). A partir daí valem os limites do grátis, e nada é apagado.

---

## Desempenho do site

- O SDK do Firebase (`src/services/firebase.js`) só é baixado nas rotas que usam login: `/entrar`,
  `/cadastro` e `/app` (`src/lib/rotas.js`). Não importe `firebase.js` direto de outro arquivo,
  senão ele volta para o JavaScript principal. Use `servicoDeLogin`.
- O texto da ajuda e do blog vem num pedaço separado (veja
  [Como o texto chega ao navegador](#como-o-texto-chega-ao-navegador)).
- Ícones: no build, a fonte e o CSS do Bootstrap Icons saem só com os ícones de
  `src/components/ds/icons.js` (plugin `vera-icones` em `vite.config.js` + `scripts/icones.mjs`).
  Para um ícone novo, basta pô-lo em `icons.js`. Se o nome não existir no Bootstrap Icons, o build e
  o `npm test` falham.
- As imagens dos celulares da home são WebP sem perda, e só as do tema atual são baixadas.
- Telas novas do app que forem lazy usam `sobDemanda(() => import(...))` em `src/App.jsx`, e não o
  `lazy` puro (veja [Deploy com a aba aberta](#deploy-com-a-aba-aberta)).

---

## O que o navegador guarda

- `localStorage`:
  - `vera.tema`: a superfície (tinta ou papel);
  - `vera.token`: a sessão, só nas contas do login próprio. Com "Manter conectado" desmarcado, vai
    para o `sessionStorage`;
  - `vera.sessao`: "1" enquanto há sessão aberta. Serve para o "Ver o painel" das páginas do site,
    onde o login não liga, mandar direto para o app. Sai quando a sessão fecha;
  - `vera.confirmacaoEnviada`: o uid da conta para a qual o e-mail de confirmação já saiu deste
    aparelho (veja [Confirmação de e-mail](#confirmação-de-e-mail)).
- `sessionStorage`:
  - `vera.aceite`: o aceite dos termos durante o login, por 10 minutos;
  - `vera.recarregadaEm`: a hora da última recarga automática depois de um deploy;
  - `vera.confirmarEmail.escondido`: o e-mail cujo aviso de confirmação a pessoa escondeu, até
    fechar a aba.
- O Firebase guarda a própria sessão.

---

## Dependências

### Backend

Depois de atualizar pacotes, `npm audit --omit=dev` na pasta `Backend` precisa dar
`found 0 vulnerabilities`.

### Frontend

- `firebase` está na versão 13. Nove pacotes que ele traz (`@firebase/app`, `auth`, `firestore`,
  `storage`, `ai` e os `-compat`) declaram `engines: node >=24.12.0`. Com o Node 22 do CI e do
  Backend, o `npm ci` do Frontend mostra 9 avisos `EBADENGINE`. Isso é esperado e inofensivo,
  porque o SDK roda no navegador e o Node só testa e empacota. Não ligue `engine-strict` no Frontend.
- Se um dia subir para Node 24, troque juntos o `node-version` do job frontend no
  `.github/workflows/ci.yml` e o `NODE_VERSION` do site no painel do Render.
- `overrides` no `Frontend/package.json`: o `@grpc/grpc-js` fica na 1.14.7, porque o Firestore do
  Firebase ainda pede a 1.9, que tem alertas no npm audit. Esse pacote só roda no Node e não entra
  no site. O `fontverter` (usado pelo `subset-font` no build) fica na 2.0.0.
- Se `npm install <pacote>` no Frontend falhar com
  `Cannot read properties of null (reading 'edgesOut')` (bug do npm 10), use
  `npx npm@11 install <pacote>`. O `npm ci` funciona normalmente.

---

## Integração contínua

Cada push e pull request roda, no GitHub Actions (`.github/workflows/ci.yml`), com Node 22:

- `cd Backend && npm ci && npm test`
- `cd Frontend && npm ci && npm test && npm run build`

Os testes de ponta a ponta (`npm run test:e2e`) não rodam no CI, só na máquina de quem desenvolve.
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

### Robô de coleta identificado

Todos os leitores pedem os preços pelo `Backend/src/models/ColetaModel.js`. Duas variáveis da API
mudam como esses pedidos saem:

| Variável | Para quê |
|---|---|
| `COLETA_IDENTIFICADA` | Opcional. Com `1`, os pedidos aos sites das redes vão com o user-agent `vera-finance-bot/1.0 (+<SITE_URL>/robo)`, e o robots.txt de cada site é conferido antes de cada consulta (guardado por 24 h). Se o caminho está bloqueado para `vera-finance-bot` (ou para `*`, quando não há grupo próprio), a consulta não é feita e a rede fica sem preço naquela busca. Sem a variável, os pedidos vão como um navegador comum, como sempre foi. |
| `SITE_URL` | Opcional. Endereço do site, usado no user-agent do robô. Padrão: `https://vera-finance.onrender.com`. |

- O nome do robô segue a RFC 9309 e só tem letras e hífen. Quem quiser escrever regras para ele no
  robots.txt usa `User-agent: vera-finance-bot`.
- A comparação com o robots.txt segue a RFC: acento e percent-encoding são normalizados nos dois
  lados (`/açúcar` = `/a%C3%A7%C3%BAcar`, `%c3` = `%C3`).
- O site ainda não tem a página `/robo`. Antes de ligar a variável, crie e publique essa página,
  explicando o que o robô faz e como falar com a vera.

### Monitor de saúde das redes

```bash
cd Backend
npm run saude:redes                                    # todas as redes, busca "arroz", CEP 01310-100
npm run saude:redes -- --cep=13334100 --termo=feijao   # outro CEP e outro termo
npm run saude:redes -- --redes=atacadao,tenda          # só algumas redes
```

O CEP de teste também pode vir da variável `CEP_DE_TESTE`. Cada rede sai numa linha com a situação
(`ok`, `sem entrega no CEP`, `sem produtos` ou `erro`), o número de produtos e o tempo.

O script sai com código 1 se alguma rede deu erro ou voltou sem produtos (e com código 2 se o CEP,
o termo ou o id de uma rede vierem errados). "Sem entrega no CEP" não
conta como falha, porque a rede só não atende aquela região. No Pão de Açúcar, a API fora do ar
(rede, erro HTTP ou resposta inválida) conta como `erro`, e não como "sem entrega". O script não
grava nada no banco.

No Render: crie um **Cron Job** com o mesmo repositório, *Root Directory* `Backend`, build `npm ci`,
comando `npm run saude:redes` e um horário fixo (ex.: `0 9 * * *`). Defina `CEP_DE_TESTE` (e
`COLETA_IDENTIFICADA`, se estiver ligada na API). Quando uma rede quebrar, o job falha e o Render
avisa.

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
   `precoDe`, `unidade` (`un` ou `kg`), `imagem` e `link`. Peça ao site com `pedirNaRede`
   (`Backend/src/models/ColetaModel.js`), e não com o `fetch` direto, para o leitor seguir o
   [robô de coleta identificado](#robô-de-coleta-identificado). Use `AbortSignal.timeout(9000)` no
   `signal`. Registre o leitor em `LEITORES`, em `Backend/src/models/CatalogoModel.js`. Se a
   plataforma devolve preço para o CEP, inclua-a em `PRECO_POR_CEP`
   (`Backend/src/models/PrecoRegionalModel.js`).
4. **Teste sem internet.** Escreva um teste com o formato real da resposta do site e um `fetch` de
   mentira (modelos: `Backend/test/saovicente.test.js` e `Backend/test/regiao.test.js`): o
   reconhecimento do nome (`RedeModel.identificar`) e a leitura de nome, preço, código de barras e
   disponibilidade.
5. **Atualize o site**, na mesma ordem do `RedeModel`: `REDES_COM_PRECO` em
   `Frontend/src/lib/site.js` (a landing e as perguntas usam essa lista), `REDES_DE_ATACADO` no
   mesmo arquivo se a rede for de `tipo: 'atacado'` (a página Onde funciona separa supermercados e
   atacados com ela) e a lista de redes de `Frontend/public/llms.txt`. O teste
   `Backend/test/redesSite.test.js` falha se as listas não baterem. Se quiser a rede entre os
   destaques da landing, ela vai em `MARCAS` (`Frontend/src/pages/site/Landing.jsx`).
6. **Atualize este readme** (tabela de redes) e rode `cd Backend && npm test` e
   `cd Frontend && npm test && npm run build`.
7. **Confira a rede de verdade** com `cd Backend && npm run saude:redes -- --redes=<id> --cep=<cep>`,
   usando um CEP perto de uma loja da rede ([monitor](#monitor-de-saúde-das-redes)).
8. **Depois do deploy**, procure um produto em `/app/comparar` com um CEP perto de uma loja da rede
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
