# Operação da vera.finance

Guia do time para colocar no ar, acompanhar e cuidar da vera em produção. O que está entre
`[PREENCHER]` depende de decisão do time e precisa ser completado.

O readme explica a arquitetura, as variáveis de ambiente e o deploy no Render. Este guia parte de lá.

## Sumário

- [Onde as coisas rodam](#onde-as-coisas-rodam)
- [Checklist de deploy](#checklist-de-deploy)
- [Logs no Render](#logs-no-render)
- [Rodar um script como job](#rodar-um-script-como-job)
- [Quando uma rede quebra](#quando-uma-rede-quebra)
- [Backup e restauração](#backup-e-restauração)
- [Rotação de segredos](#rotação-de-segredos)
- [Pedidos de titulares (LGPD)](#pedidos-de-titulares-lgpd)
- [Incidentes](#incidentes)

---

## Onde as coisas rodam

| Peça | Onde | Quem tem acesso |
|---|---|---|
| Site (páginas públicas e app) | Render, Static Site (`Frontend/dist`) | [PREENCHER] |
| API | Render, Web Service (`Backend`) | [PREENCHER] |
| Login | Firebase Authentication | [PREENCHER] |
| Dados | Firebase Realtime Database ou PostgreSQL (Neon), conforme `DATABASE_URL` | [PREENCHER] |
| Código e CI | GitHub (`.github/workflows/ci.yml`) | [PREENCHER] |
| Segredos (cópia de segurança) | [PREENCHER: cofre de senhas do time] | [PREENCHER] |

Regra geral: segredo só no Render (Environment) e no cofre do time. Nunca em código, commit, issue,
chat ou print.

---

## Checklist de deploy

### Antes

- [ ] O pull request passou no CI (testes do backend e build do frontend).
- [ ] Rodou local: `cd Backend && npm test` e `cd Frontend && npm run build`.
- [ ] Variável de ambiente nova? Cadastre no Render **antes** do deploy que depende dela. As
      `VITE_*` só valem depois de um build novo do site.
- [ ] Mudou `Backend/src/config/esquema.sql`? O esquema roda sozinho na primeira conexão e precisa
      ser idempotente (`if not exists`). Faça um backup antes (veja
      [Backup](#backup-e-restauração)).
- [ ] Mudou os Termos ou a Política? Troque `VERSAO_DOS_TERMOS` em `Backend/src/config/termos.js` e
      em `Frontend/src/lib/termos.js` e a data em `Frontend/src/pages/site/Legal.jsx`, tudo no mesmo
      pull request. Todas as contas vão precisar aceitar de novo. Publique a API e o site em
      seguida, um logo depois do outro: com versões diferentes no ar, o aceite é recusado.
- [ ] Mudou `public/sw.js`? Confira que o marcador `__VERSAO_DO_BUILD__` continua lá (o build falha
      sem ele).
- [ ] Mudou uma rede ou a lista de redes? Siga [Como adicionar uma rede nova](../readme.md#como-adicionar-uma-rede-nova).

### Durante

1. Faça o merge na branch que o Render publica ([PREENCHER: branch de produção]).
2. Se a mudança envolve API e site, publique **a API primeiro** e o site depois (o site novo pode
   chamar rotas que só existem na API nova).
3. Acompanhe o deploy no Render (serviço → *Events*). Se o build falhar, o Render mantém a versão
   anterior no ar.

### Depois

- [ ] `https://<api>/api/saude` responde `{"ok":true}`.
- [ ] O log de início da API mostra o banco certo
      (`vera.finance API em ... · PostgreSQL (DATABASE_URL) · login pelo Firebase Auth`, por
      exemplo) e não mostra o aviso `[segurança] SEGREDO_LOGIN ausente`.
- [ ] O código-fonte de `https://<site>/precos` (Ctrl+U) tem o título `Planos e preços · vera.finance`
      e o texto dos planos; o de `https://<site>/app` tem só o `<div id="root"></div>` vazio, com
      `noindex, nofollow`.
- [ ] Entre com uma conta de teste ([PREENCHER: qual]) e abra painel, lançamentos, lista e
      comparação.
- [ ] Mudou página pública? Rode `cd Frontend && npm run indexnow`.

### Voltar atrás (rollback)

No Render, abra o serviço → *Events*, escolha o último deploy bom e use *Rollback*. Faça isso na API
e no site se os dois mudaram. Depois, reverta o commit no GitHub (`git revert`), para o próximo
deploy automático não publicar o erro de novo.

---

## Logs no Render

- **API**: Dashboard → serviço da API → *Logs*. Dá para filtrar por texto e por período.
- **Site**: é estático, não tem log de execução. O que existe é o log do build, em *Events* → o
  deploy.

O que procurar no log da API:

| Texto | O que é |
|---|---|
| `vera.finance API em ...` | A API subiu. Mostra o banco e o tipo de login, nunca a `DATABASE_URL`. |
| `[segurança] SEGREDO_LOGIN ausente ou curto` | Falta `SEGREDO_LOGIN` (ou tem menos de 32 caracteres). Corrija no Environment. |
| `[exclusão] N conta(s) apagada(s).` | A rotina diária apagou as contas cuja exclusão venceu. |
| `[exclusão] falhou para <uid>` | Uma exclusão falhou; ela é tentada de novo na próxima rodada. Veja a mensagem. |
| `[GET /api/...]` seguido de um erro | Erro inesperado numa rota (a pessoa recebeu "Algo deu errado do nosso lado"). |

O Render guarda os logs por um tempo limitado, que depende do plano. A Política de privacidade diz
que os registros de acesso ficam guardados por 6 meses (Marco Civil da Internet): confira se a
retenção do Render cobre esse prazo ou configure um *Log Stream* para outro serviço
([PREENCHER: onde ficam os registros de acesso]).

Nunca copie para fora do Render (chat, issue, print) um trecho de log com e-mail, nome ou outro
dado pessoal.

---

## Rodar um script como job

Os scripts estão listados no readme ("Scripts de operação"). Todos têm simulação: rode primeiro
sem gravar e leia o relatório.

### Opção 1: no seu computador, com o `.env`

É o jeito descrito no readme: na pasta `Backend`, um `.env` com as mesmas variáveis do Render e
`node --env-file=.env scripts/<script>.mjs`. Simples, mas os segredos de produção ficam na sua
máquina: apague o `.env` quando terminar e nunca faça commit dele (o Git já ignora).

### Opção 2: no Render, como job avulso (one-off job)

Roda o script na mesma imagem e com as mesmas variáveis do serviço da API, sem copiar segredo
para lugar nenhum. O job é criado pela API do Render (confira os detalhes na documentação do
Render sobre *one-off jobs*):

```bash
# <ID_DO_SERVICO>: id do serviço da API (srv-...), visto na URL do Dashboard.
# <CHAVE_DA_API_RENDER>: chave pessoal criada em Account Settings → API Keys. Não salve em arquivo.
curl -X POST "https://api.render.com/v1/services/<ID_DO_SERVICO>/jobs" \
  -H "Authorization: Bearer <CHAVE_DA_API_RENDER>" \
  -H "Content-Type: application/json" \
  -d '{"startCommand": "node scripts/importar-usuarios-firebase.mjs"}'
```

O resultado aparece nos logs do job, no Dashboard. Primeiro rode a simulação; depois, o mesmo
comando com `--executar` (ou sem `--simular`, na migração).

O script de migração precisa ler o export JSON do Firebase, que tem dados pessoais e não fica no
servidor. Esse roda na opção 1, com o arquivo fora da pasta do projeto.

### Opção 3: no Shell do Render

Em planos pagos, o serviço da API tem a aba *Shell*: um terminal no próprio servidor, com as
variáveis já carregadas. Rode `node scripts/<script>.mjs` ali.

### Tarefa que se repete

Para algo que precisa rodar sempre (por exemplo, um envio diário de e-mail no futuro), crie um
serviço do tipo *Cron Job* no Render, com o mesmo repositório, `Backend` como Root Directory,
`npm ci` no build, o comando do script e o horário (em UTC). Para não repetir as variáveis, guarde-as
num *Environment Group* ligado à API e ao Cron Job.

Hoje nenhuma tarefa recorrente precisa disso: a exclusão de contas vencidas roda dentro da API.

---

## Quando uma rede quebra

**Sintoma**: na comparação ou na lista, uma rede que tinha preço passa a mostrar "o site da rede não
respondeu agora", ou some dos resultados para CEPs onde ela tem loja. A API não registra no log a
falha de cada busca: o sinal vem do app ou de alguém do time testando.

### 1. Confirmar

Na pasta `Backend`, rode o leitor da rede direto, com um produto comum e um CEP perto de uma loja
dela. Troque `atacadao`, `arroz` e o CEP; os ids estão em `src/models/RedeModel.js`:

```bash
BANCO=memoria NODE_ENV=test node --input-type=module -e "
const [id, termo = 'arroz', cep = ''] = process.argv.slice(1);
const { RedeModel } = await import('./src/models/RedeModel.js');
const rede = RedeModel.buscar(id);
if (!rede) throw new Error('Rede desconhecida: ' + id);
const leitores = {
  vtex: 'CatalogoVtexModel', gpa: 'CatalogoGpaModel', paguemenos: 'CatalogoPagueMenosModel',
  tenda: 'CatalogoTendaModel', occ: 'CatalogoOccModel', sfcc: 'CatalogoSfccModel'
};
const nome = leitores[rede.plataforma];
const leitor = (await import('./src/models/' + nome + '.js'))[nome];
try {
  const { situacao, produtos } = await leitor.buscar(rede, termo, cep);
  console.log(rede.nome, '·', situacao, '·', produtos.length, 'produtos');
  console.table(produtos.slice(0, 5).map(p => ({ produto: p.produto, preco: p.preco, ean: p.ean })));
} catch (erro) {
  console.error(rede.nome, 'falhou:', erro.message, erro.cause?.code || '');
}
process.exit(0);
" atacadao arroz 01001000
```

`BANCO=memoria` garante que nada é gravado em banco de verdade.

### 2. Entender

| O que aparece | Causa provável |
|---|---|
| `HTTP 403` ou `HTTP 429` | O site está recusando ou limitando os pedidos. |
| `The operation was aborted due to timeout` | O site demorou mais de 9 segundos. Pode ser passageiro. |
| `ok · 0 produtos` com produto comum | O formato da resposta mudou: o leitor não acha mais os campos. |
| `semEntrega` | A loja online não atende aquele CEP. Teste outro CEP antes de concluir que quebrou. |
| `fetch failed` com `ENOTFOUND` | O endereço do site mudou. |

### 3. Corrigir

- **Formato mudou**: ajuste o leitor (`src/models/Catalogo<Plataforma>Model.js`) e o teste dele com
  um exemplo da resposta nova (`test/saovicente.test.js` e `test/regiao.test.js` mostram como).
- **Endereço mudou**: troque `site` da rede em `src/models/RedeModel.js`.
- **O site bloqueou a vera**: não contorne (nada de trocar de identificação, usar proxy ou tentar
  em massa). Tire a rede da lista até haver um caminho combinado ou público.
- **Sem conserto rápido**: tire a rede de `REDES` (`Backend/src/models/RedeModel.js`), de
  `REDES_COM_PRECO` (`Frontend/src/lib/site.js`) e de `Frontend/public/llms.txt`, para o site não
  prometer uma rede que não funciona. O teste `test/redesSite.test.js` confere que as três listas
  batem. Atualize a tabela de redes do readme e, depois do deploy, rode `npm run indexnow`.

Os preços que a rede já tinha gravado continuam na base (com a data), e as notas fiscais de lojas
dela continuam entrando normalmente.

---

## Backup e restauração

Faça um backup antes de mudança de esquema, migração ou qualquer script que grava, e teste a
restauração de vez em quando ([PREENCHER: frequência e responsável]).

Backups têm dados pessoais: guarde só em lugar com acesso restrito e criptografado
([PREENCHER: onde]), nunca na pasta do projeto nem no Git, e apague os antigos
([PREENCHER: por quanto tempo ficam]).

### PostgreSQL (Neon)

- **Histórico do Neon**: o Neon permite voltar o banco a um momento passado, dentro do período de
  histórico do plano. No painel, crie uma *branch* a partir do momento desejado, confira os dados
  nela e só então restaure (ou aponte a `DATABASE_URL` para ela). Os nomes exatos das opções estão no
  painel do Neon.
- **Cópia própria** com `pg_dump` (a versão do `pg_dump` precisa ser igual ou mais nova que a do
  servidor):

  ```bash
  # gerar
  pg_dump "$DATABASE_URL" --format=custom --no-owner --file=vera-AAAA-MM-DD.dump

  # restaurar num banco VAZIO, de preferência novo
  pg_restore --no-owner --dbname "$DATABASE_URL_DESTINO" vera-AAAA-MM-DD.dump
  ```

### Firebase Realtime Database

- Firebase Console → Realtime Database → Dados → menu **⋮** → *Exportar JSON* (é o mesmo arquivo
  usado na migração para o PostgreSQL).
- Backups automáticos diários existem no plano Blaze do Firebase ([PREENCHER: estão ligados?]).
- Importar um JSON pelo console **substitui** o nó onde ele entra. Exporte o estado atual antes de
  importar.

### Restaurar sem perder ninguém (passo a passo)

1. Suspenda a API (Render → serviço → *Suspend*) para ninguém gravar durante a restauração.
2. Exporte o estado atual, mesmo quebrado: ele pode ter dados que o backup não tem.
3. Restaure num banco novo e confira contagens e algumas contas de teste antes de trocar.
4. **Exclusões feitas depois do backup**: quem apagou a conta entre a data do backup e hoje volta a
   existir no banco restaurado. Compare os uids do banco restaurado com os do estado atual (passo 2):
   quem existe no backup e não existe mais hoje pediu exclusão e precisa ser apagado de novo (veja
   [Apagar a conta agora](#apagar-a-conta-agora)).
5. Troque a `DATABASE_URL` (ou o banco do Firebase), reative a API e faça o
   [checklist de depois do deploy](#depois).

---

## Rotação de segredos

Troque um segredo quando ele pode ter vazado (apareceu num print, num log, num commit), quando sai
alguém do time que tinha acesso e periodicamente ([PREENCHER: a cada quantos meses]).

### `SEGREDO_LOGIN`

1. Gere um novo: `openssl rand -base64 48`.
2. Render → serviço da API → *Environment* → troque o valor e salve. O Render publica de novo.
3. Efeito: todas as sessões do login próprio (contas antigas, por senha da API) caem e as pessoas
   entram de novo. As sessões do Firebase Authentication não mudam.
4. Atualize a cópia no cofre do time.

### Conta de serviço do Firebase

1. Firebase Console → engrenagem → *Configurações do projeto* → *Contas de serviço* → *Gerar nova
   chave privada*. Baixa um arquivo JSON: não salve na pasta do projeto.
2. No Render, troque `FIREBASE_CLIENT_EMAIL` (se mudou) e `FIREBASE_PRIVATE_KEY` (o campo
   `private_key` do JSON; pode ficar numa linha só, com `\n`). Salve e espere o deploy.
3. Confira no log que a API subiu com `login pelo Firebase Auth` (ou `(Admin SDK)`) e entre com uma
   conta de teste.
4. Revogue a chave antiga: Google Cloud Console → *IAM e administrador* → *Contas de serviço* → a
   conta `firebase-adminsdk-...` → *Chaves* → exclua a chave antiga (confira o id dela antes).
5. Apague o arquivo JSON baixado depois de guardar o conteúdo no cofre.

### Senha do PostgreSQL (`DATABASE_URL`)

1. No painel do Neon, gere uma senha nova para o usuário do banco.
2. Troque a `DATABASE_URL` no Render e salve. Até o deploy terminar, a API pode falhar ao abrir
   conexões novas: faça num horário de pouco uso.
3. Confira `/api/saude`, o log de início e uma conta de teste.

### O que não é segredo

A configuração Web do Firebase do site (`VITE_FIREBASE_*`) vai para o navegador de qualquer jeito:
não precisa de rotação. Quem protege os dados são as regras do banco e a conferência do token na API.

---

## Pedidos de titulares (LGPD)

Canal oficial: **privacidade@vera.finance** (está na Política de privacidade). Prazo prometido na
Política: resposta em até **15 dias**. Encarregado de dados: [PREENCHER].

### Regras

- Confirme a identidade antes de qualquer coisa: o pedido precisa vir do e-mail da conta. Se vier de
  outro endereço, responda pedindo que escreva do e-mail cadastrado. Nunca mande dados para um
  endereço diferente do da conta.
- Registre cada pedido ([PREENCHER: onde]): data, tipo de pedido, quem atendeu e data da resposta.
  Não copie para o registro os dados da pessoa.
- Primeiro, ofereça o caminho pelo app: quase tudo a própria pessoa faz em **Configurações › Dados**.

### Direitos e onde cada um está

| Pedido | Pelo app | Se a pessoa não consegue |
|---|---|---|
| Ver ou levar os dados (acesso e portabilidade) | Configurações › Dados › *Baixar todos os meus dados* (JSON) e *Exportar lançamentos em planilha* (CSV) | [Exportar pelo time](#exportar-os-dados-pelo-time) |
| Corrigir dados | Configurações (nome, ciclo, CEP, raio) | Corrija no banco e registre |
| Apagar a conta | Configurações › Dados › *Apagar a conta* (apaga em 30 dias; até lá dá para desistir) | [Apagar a conta agora](#apagar-a-conta-agora) |
| Retirar consentimento | Configurações: *Contribuir com preços anônimos* e localização do aparelho | Ajuste no perfil e registre |
| Saber com quem os dados são compartilhados | Política de privacidade, seção de compartilhamento | Responda com a lista da Política |

A base anônima de preços continua depois da exclusão, porque não identifica ninguém (está na
Política). Se o banco for para o Neon (PostgreSQL), inclua o Neon na lista de empresas da Política
(`Frontend/src/pages/site/Legal.jsx`) antes da migração e decida com o encarregado de dados se a
mudança pede um novo aceite (`VERSAO_DOS_TERMOS`).

### Exportar os dados pelo time

Na pasta `Backend`, com o `.env` de produção (veja [Rodar um script como job](#rodar-um-script-como-job)).
Gera o mesmo arquivo do botão *Baixar todos os meus dados*, fora da pasta do projeto:

```bash
node --env-file=.env --input-type=module -e "
const email = process.argv[1];
const { writeFileSync } = await import('node:fs');
const { join } = await import('node:path');
const { homedir } = await import('node:os');
const { ContaModel } = await import('./src/models/ContaModel.js');
const { PortabilidadeModel } = await import('./src/models/PortabilidadeModel.js');
const conta = await ContaModel.buscar(email);
if (!conta) { console.error('Nenhuma conta com esse e-mail.'); process.exit(1); }
const arquivo = join(homedir(), 'vera-dados-' + conta.uid + '.json');
writeFileSync(arquivo, JSON.stringify(await PortabilidadeModel.exportar(conta.uid), null, 2));
console.log('Dados gravados em', arquivo);
process.exit(0);
" pessoa@exemplo.com
```

Mande o arquivo só para o e-mail da conta, por um canal seguro ([PREENCHER: qual]), e apague a cópia
local depois.

### Apagar a conta agora

Faz o mesmo que a rotina diária faz quando a exclusão vence: perfil e dados, login (no Firebase
Auth, quando a API tem a conta de serviço) e a participação em família. Não dá para desfazer.

```bash
node --env-file=.env --input-type=module -e "
const email = process.argv[1];
const { ContaModel } = await import('./src/models/ContaModel.js');
const { ExclusaoModel } = await import('./src/models/ExclusaoModel.js');
const conta = await ContaModel.buscar(email);
if (!conta) { console.error('Nenhuma conta com esse e-mail.'); process.exit(1); }
await ExclusaoModel.apagar(conta.uid);
console.log('Conta apagada:', conta.uid);
process.exit(0);
" pessoa@exemplo.com
```

Depois, confirme por e-mail à pessoa (o modelo `conta-apagada` em `Backend/src/emails/` serve de
texto). Dados apagados ainda podem existir nos backups até eles vencerem
([PREENCHER: prazo dos backups]); se um backup for restaurado, apague a conta de novo (veja
[Restaurar sem perder ninguém](#restaurar-sem-perder-ninguém-passo-a-passo)).

---

## Incidentes

Incidente é qualquer coisa que deixa a vera fora do ar, mostra dado errado em escala ou pode expor
dado pessoal (vazamento de segredo, acesso indevido, perda de dados).

### Quem chamar

| Papel | Pessoa | Contato |
|---|---|---|
| Responsável pelo incidente (coordena e decide) | [PREENCHER] | [PREENCHER] |
| Backend e banco | [PREENCHER] | [PREENCHER] |
| Site e app | [PREENCHER] | [PREENCHER] |
| Encarregado de dados (LGPD) | [PREENCHER] | privacidade@vera.finance |
| Comunicação com quem usa a vera | [PREENCHER] | [PREENCHER] |
| Dono das contas do Render, Firebase, Neon e GitHub | [PREENCHER] | [PREENCHER] |

### O que fazer

1. **Abra um registro** ([PREENCHER: onde]) com hora, o que foi visto e quem está cuidando. Anote
   cada passo com a hora.
2. **Contenha**: se há risco para dados, suspenda a API (Render → *Suspend*). Se um segredo vazou,
   faça a [rotação](#rotação-de-segredos) na hora. Se foi um deploy, faça o
   [rollback](#voltar-atrás-rollback).
3. **Avalie**: o que aconteceu, desde quando, quais dados e quantas pessoas foram afetadas. Guarde os
   logs do período antes que o Render os descarte.
4. **Comunique**: se o incidente pode trazer risco ou dano relevante às pessoas, a LGPD (art. 48)
   manda avisar a ANPD e as pessoas afetadas. O regulamento da ANPD sobre comunicação de incidentes
   (Resolução CD/ANPD nº 15/2024) dá prazo de 3 dias úteis a partir de quando se soube do
   incidente; confira o texto em vigor no site da ANPD. Quem decide e assina a comunicação é o
   encarregado de dados.
5. **Resolva e confira** com o [checklist de depois do deploy](#depois).
6. **Escreva o pós-incidente** em até [PREENCHER] dias: o que aconteceu, impacto, linha do tempo,
   causa, o que funcionou, o que não funcionou e as ações (com dono e prazo). Sem culpar pessoas.

### Fora do ar

- A API não responde: veja o log (Render → *Logs*) e *Events* (deploy recente? instância
  reiniciando?). `/api/saude` mostra se o processo está de pé.
- Banco fora: o log mostra erro de conexão. No PostgreSQL, confira o painel do Neon; no Firebase, o
  status do Firebase.
- Site em branco depois de um deploy: pode ser o service worker. Veja a seção de emergência da PWA
  no readme.
