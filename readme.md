# 💰 Vera Finance

## 📌 Descrição

O Vera Finance é uma plataforma SaaS de gestão financeira pessoal desenvolvida para ajudar usuários a organizarem suas finanças, acompanharem gastos, criarem metas financeiras e tomarem decisões mais inteligentes sobre seu dinheiro.

A plataforma centraliza informações financeiras em um único ambiente, permitindo o controle de receitas, despesas, contas bancárias, listas de compras, comparação de preços entre mercados e geração de relatórios detalhados.

O objetivo é transformar dados financeiros em informações simples e acionáveis, auxiliando usuários a economizarem mais e alcançarem seus objetivos financeiros.

---

# 🎯 Objetivo

Desenvolver uma plataforma inteligente que permita aos usuários:

* Controlar receitas e despesas.
* Gerenciar múltiplas contas bancárias.
* Definir metas financeiras.
* Acompanhar a evolução do patrimônio.
* Economizar em compras através da comparação de preços.
* Visualizar relatórios financeiros completos.
* Compartilhar o gerenciamento financeiro com a família.

---

# 🧩 Tecnologias Utilizadas

## Backend (2TW)

* React
* Node.js
* Firebase

## Mobile

* React Native

---

# 🚀 Funcionalidades

## 📊 Dashboard Financeiro

* Resumo financeiro geral.
* Controle de saldo.
* Visão consolidada das movimentações.
* Indicadores financeiros.

## 💵 Controle de Receitas e Despesas

* Cadastro de entradas.
* Cadastro de gastos.
* Histórico de movimentações.
* Organização por categorias.

## 🏦 Gestão Bancária

* Cadastro de contas bancárias.
* Controle por banco.
* Visualização centralizada dos saldos.

## 🎯 Metas Financeiras

* Criação de metas personalizadas.
* Acompanhamento de progresso.
* Indicadores de conclusão.

## 🛒 Lista de Compras Inteligente

* Criação de listas.
* Controle de itens.
* Estimativa de economia.

## 🏪 Comparador de Mercados

* Comparação de preços entre estabelecimentos.
* Histórico de preços.
* Sugestão do mercado mais econômico.

## 📈 Relatórios

* Relatórios financeiros detalhados.
* Análise de gastos.
* Evolução financeira.

## 📝 Notas Inteligentes

* Registro de observações financeiras.
* Organização de informações importantes.

## 👨‍👩‍👧‍👦 Modo Família

* Compartilhamento financeiro.
* Controle colaborativo de despesas.
* Gestão familiar centralizada.

## 🔔 Sistema de Notificações

* Alertas financeiros.
* Avisos de metas.
* Lembretes importantes.

---

# 📂 Estrutura do Projeto

vera-finance/

├── assets/
│   ├── css/
│   ├── js/
│   ├── images/
│
├── pages/
│   ├── dashboard/
│   ├── categorias/
│   ├── bancos/
│   ├── metas/
│   ├── relatorios/
│   ├── mercados/
│   ├── configuracoes/
│
├── components/
│
├── firebase/
│
├── index.html
│
└── README.md

---

# ▶️ Como Executar

## 1. Clonar o Repositório

```bash
git clone https://github.com/Davimpaulino/Vera.Finance.git
```

## 2. Entrar na Pasta

```bash
cd Vera.Finance
```

## 3. Executar Localmente

Abra no terminal:

npm run dev
---

# 🔐 Configuração (variáveis de ambiente)

Backend (Render → Environment):

| Variável | Para quê |
|---|---|
| `SEGREDO_LOGIN` | **Obrigatória.** Segredo aleatório de 32+ caracteres que assina as sessões do login por senha (`openssl rand -base64 48`). Sem ela, as sessões caem a cada reinício. |
| `CORS_ORIGIN` | Endereço do site (ex.: `https://vera-finance.onrender.com`). Nunca `*`. |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Conta de serviço do Firebase (Admin SDK). |
| `FIREBASE_URL_BANCO` | URL do Realtime Database. |
| `NODE_ENV` | `production` |

Frontend (build do site estático no Render → Environment):

| Variável | Para quê |
|---|---|
| `VITE_API_URL` | Endereço da API (ex.: `https://sua-api.onrender.com`). |
| `VITE_SITE_URL` | Endereço público do site, sem `/` no fim. Padrão: `https://vera-finance.onrender.com`. Vai para o canonical, `og:url`, `og:image` e JSON-LD do `index.html` e para os links absolutos das páginas (`src/lib/site.js`). Ao trocar para um domínio próprio, atualize também as URLs de `public/sitemap.xml`, `public/robots.txt` e `public/llms.txt`. |

Regras do banco: o arquivo `database.rules.json` fecha o Realtime Database para leitura e escrita
diretas (só a API, com a conta de serviço, acessa). Publique com `firebase deploy --only database`
ou cole o conteúdo em Firebase Console → Realtime Database → Regras.

---

# 🌐 Deploy


## Render (2TW)

https://vera-finance.onrender.com/

### Site estático (Frontend)

- Build: `npm ci && npm run build` (pasta `Frontend`). Publicar a pasta `Frontend/dist`.
- O `npm run build` faz três coisas: o build normal do Vite, um build SSR de
  `src/entry-server.jsx` e o `scripts/prerender.mjs`, que grava o HTML pronto das páginas
  públicas (`/`, `/precos`, `/perguntas`, `/termos`, `/privacidade`, `/entrar`, `/cadastro`)
  em `dist/<rota>/index.html`. Assim buscadores e robôs de IA, que não rodam JavaScript, leem o
  conteúdo. Não precisa de navegador no build. Título, descrição, canonical, robots e os textos
  de compartilhamento (`og:`/`twitter:`) de cada página vêm de `src/lib/paginas.js` (o mesmo
  arquivo que o app usa no navegador); a home mantém os do `index.html`.
- O mesmo script grava `dist/app.html`, a casca do app: o `#root` vazio, sem o conteúdo da
  landing, com `noindex` e sem canonical. É ela que atende as rotas sem arquivo, para o app
  logado não baixar as imagens da landing e endereços que não existem não virarem cópias da home.
- Regra de rewrite no Render (Redirects/Rewrites): **Source** `/*`, **Destination**
  `/app.html`, **Action** `Rewrite`. O Render só aplica a regra quando não existe arquivo no
  caminho, então `/` abre o `index.html`, `/precos` abre `precos/index.html` e só as rotas do
  app (`/app`, `/app/lista`, `/cadastro/perguntas`...) e os endereços desconhecidos caem no
  `app.html`. Não crie regras que mandem as páginas públicas para outro arquivo, senão elas
  perdem o HTML pré-renderizado. Ao trocar a regra antiga (`/index.html`), publique antes um
  build que já tenha o `app.html`.
- `npm run preview` serve o `dist` do mesmo jeito, para conferir antes de publicar.
- Depois do deploy, confira: o código-fonte de `https://<site>/precos` (Ctrl+U) precisa ter o
  título `Planos e preços · vera.finance` e o texto dos planos, e o de `https://<site>/app` só o
  `<div id="root"></div>` vazio, com `noindex, nofollow`.

### App instalável (PWA)

- `public/manifest.webmanifest` (nome, ícones, abre em `/app`) e `public/sw.js`.
- O service worker só é registrado no build de produção. Ele guarda os arquivos de
  `/assets/` (têm hash no nome) e busca as páginas na rede primeiro, com a última cópia (ou a
  casca `app.html`) como reserva sem internet. Chamadas da API e pedidos com `Authorization`
  nunca vão para o cache.
- Sem internet abre só a casca do app, não os dados: o login e os números vêm da API, então
  quem está logado vê a tela de Entrar até a conexão voltar. O login não se perde.
- A versão do cache muda a cada build: o plugin `vera-versao-do-sw` do `vite.config.js` troca o
  marcador `__VERSAO_DO_BUILD__` do `dist/sw.js` em qualquer `vite build` e faz o build falhar
  se o marcador sumir. Os caches antigos são apagados quando a versão nova assume.
- Emergência (o service worker atrapalhando em produção): copie `scripts/sw-emergencia.js` por
  cima de `public/sw.js` e, no mesmo deploy, apague o bloco que registra o service worker em
  `src/main.jsx`. Publique. A primeira visita de cada pessoa depois do deploy ainda passa pelo
  service worker antigo, que baixa o novo; a partir daí os caches da vera somem, o registro sai
  e tudo vem direto da rede. Se o bloco do `src/main.jsx` ficar, o registro continua, mas vazio:
  não guarda nem intercepta nada. Para voltar ao normal, restaure os dois arquivos pelo git.

## Avisar os buscadores (IndexNow)

Depois de cada deploy que muda páginas públicas, avise Bing e os outros buscadores do IndexNow:

```bash
cd Frontend
npm run indexnow                                   # usa VITE_SITE_URL ou o endereço padrão
npm run indexnow -- https://seu-dominio.com.br     # outro endereço
npm run indexnow -- --teste                        # só mostra o que seria enviado
```

O script lê as URLs de `public/sitemap.xml` e usa a chave do arquivo `public/<chave>.txt`, que
precisa estar no ar (abra `https://<site>/<chave>.txt` para conferir antes de enviar).

Para aparecer no Google, cadastre o site no Google Search Console e envie o `sitemap.xml`.


---

# 📱 Aplicativo Mobile

O aplicativo mobile será desenvolvido utilizando React Native.

Formas de teste:

* Expo Go
* APK Android
* Build iOS

---

# 👥 Integrantes

- Davi Paulino
- Alaf Rocha
- Enzo Gabriel
- João Miguel
- Otávio Barbieri
- Pedro Henrique

---

# 🎤 Pitch

O Vera Finance é uma plataforma criada para simplificar a vida financeira das pessoas.

Através de dashboards intuitivos, controle financeiro completo, metas personalizadas e comparação inteligente de preços, o sistema ajuda usuários a economizar dinheiro, organizar suas finanças e tomar decisões mais conscientes.

Além disso, funcionalidades como Modo Família, Relatórios Inteligentes e Lista de Compras tornam o Vera uma solução completa para gestão financeira moderna.

---

# ⭐ Diferenciais

* Comparação de preços entre mercados.
* Lista de compras inteligente.
* Metas financeiras visuais.
* Gestão familiar compartilhada.
* Relatórios detalhados.
* Integração com contas bancárias.
* Plataforma SaaS escalável.
* Interface moderna e intuitiva.

---

# 📎 Links Importantes

## Repositório GitHub

https://github.com/Davimpaulino/Vera.Finance.git

## Deploy Render

https://vera-finance.onrender.com/
