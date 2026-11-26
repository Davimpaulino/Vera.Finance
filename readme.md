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
| `DATABASE_URL` | Opcional. Endereço do PostgreSQL. Com ela, os **dados** vão para o PostgreSQL e o login continua como está hoje (Firebase Auth com a conta de serviço, ou login próprio). Sem ela, nada muda. Veja "PostgreSQL" abaixo. |
| `PGSSL` | Opcional. Força o SSL do PostgreSQL: `require`, `no-verify` ou `disable`. Sem ela, vale o `sslmode` da `DATABASE_URL`. |
| `NODE_ENV` | `production` |

Regras do banco: o arquivo `database.rules.json` fecha o Realtime Database para leitura e escrita
diretas (só a API, com a conta de serviço, acessa). Publique com `firebase deploy --only database`
ou cole o conteúdo em Firebase Console → Realtime Database → Regras.

---

# 🐘 PostgreSQL (dados)

A API funciona com o Firebase Realtime Database (como hoje) ou com PostgreSQL. Quem escolhe é a
variável `DATABASE_URL`: sem ela, nada muda. Só os dados mudam de lugar: o login continua como
está hoje (Firebase Auth com a conta de serviço, ou login próprio).

- O adaptador fica em `Backend/src/config/bancoPostgres.js` e segue a mesma interface dos outros
  bancos (`ler`, `gravar`, `atualizar`, `mesclar`, `remover`, `adicionar`, `listar`,
  `atualizarVarios`), então os models não mudam. O que ainda difere do banco em memória (poucos
  detalhes, cada um com teste) está no comentário do início desse arquivo.
- As tabelas ficam em `Backend/src/config/esquema.sql` e são criadas sozinhas na primeira conexão.
  Os dados de cada pessoa ficam em `usuarios` (o perfil) e `itens_usuario` (categorias,
  lançamentos, lista, metas, notas e fixos, separados pela coluna `colecao`); as demais coleções
  (`contas`, `precos`, `familias`...) têm tabela própria. Apagar uma pessoa apaga tudo dela
  (cascata). Caminho sem tabela própria vai para `documentos`, sem perder dado.

## 1. Criar o banco (grátis, no Neon)

1. Crie uma conta em [neon.tech](https://neon.tech) e um projeto novo.
2. Na região, escolha **São Paulo** (AWS `sa-east-1`) se aparecer na lista; senão, a mais próxima
   do Render.
3. Em **Connection string**, copie o endereço `postgresql://...?sslmode=require`. Ele tem a senha
   do banco: **nunca** coloque no código, em commit ou em print.

## 2. Exportar o Firebase e migrar (em janela de manutenção)

Escolha um horário de pouco uso e avise quem usa. A ideia é ninguém gravar nada entre o export e a
troca do banco.

1. **Pare a API** no Render (Dashboard → serviço → *Suspend*), para não entrar dado novo.
2. **Exporte o JSON**: Firebase Console → Realtime Database → Dados → menu **⋮** → *Exportar JSON*.
   O arquivo vem como `<projeto>-default-rtdb-export.json`. Salve **fora** da pasta do projeto
   (ele tem dados pessoais; nunca vai para o Git). Os exemplos abaixo usam
   `~/exportacao-firebase.json`; troque pelo caminho do seu arquivo.
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
   coleção no export e no banco. Ele termina com "as contagens batem" ou aponta a diferença.
   Se o banco de destino já tiver dados, ele não grava; para repetir uma migração interrompida,
   use `--continuar`.

5. **Configure o Render**: Dashboard → serviço → *Environment* → adicione `DATABASE_URL` com o
   endereço do Neon. Salve e reative o serviço (*Resume*). O log de início deve mostrar
   `PostgreSQL (DATABASE_URL)`.
6. **Confira no site**: entre com uma conta de teste, veja lançamentos, lista, metas e a comparação
   de preços.

Para voltar atrás, basta remover `DATABASE_URL` do Render: a API volta a usar o Firebase (o que foi
gravado no PostgreSQL nesse meio-tempo não volta junto).

## 3. Depois de alguns dias sem problema

Guarde o JSON exportado num lugar seguro e então apague o Realtime Database (Firebase Console →
Realtime Database → menu **⋮** → excluir banco). **Não** apague o projeto do Firebase: o login usa
o Firebase Auth. Depois disso, `FIREBASE_URL_BANCO` pode sair do Render.

## Testes no PostgreSQL

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

# 🌐 Deploy


## Render (2TW)

https://vera-finance.onrender.com/


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
