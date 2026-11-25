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
