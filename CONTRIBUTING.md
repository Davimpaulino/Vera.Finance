# Como contribuir

Obrigado por ajudar a vera. Este guia é curto de propósito: o resto está no [readme](readme.md), em
[docs/operacao.md](docs/operacao.md) e em [docs/marca.md](docs/marca.md).

## Antes de começar

- Node.js 22.12 ou mais novo. A API sozinha roda a partir do 22.9; o Vite 7 do `Frontend` pede
  22.12; os testes do `Frontend` (Vitest com jsdom) pedem 22.22.2. Na dúvida, use o Node 22 mais
  recente, como o CI. Rode `npm ci` em `Backend` e em `Frontend`.
- Para rodar a API sem banco de verdade: `cd Backend && BANCO=memoria npm run dev`.
- Nunca coloque segredo (chave, senha, `DATABASE_URL`, arquivo da conta de serviço) em código,
  commit, issue ou print. O repositório é público.
- Achou uma falha de segurança? Não abra issue pública: escreva para [PREENCHER: contato de
  segurança].

## Branch

Crie a branch a partir da `main` atualizada, com um nome curto que diga o assunto:

```bash
git switch main && git pull
git switch -c lista-alerta-de-preco
```

Uma branch por assunto. Mudança grande vira vários pull requests pequenos.

## Commits

Mensagem em português, no formato `tipo(escopo): o que muda`, no presente e sem ponto final:

```
feat(lista): alerta no sino quando um item está mais barato perto
fix(pwa): service worker não guarda HTML no lugar de arquivo de /assets/
docs: como rodar os testes no PostgreSQL
```

| Tipo | Quando |
|---|---|
| `feat` | algo novo para quem usa |
| `fix` | conserto |
| `docs` | só documentação |
| `test` | só testes |
| `perf` | mais rápido ou mais leve |
| `refactor` | muda o código sem mudar o comportamento |
| `chore` | dependências, configuração, arquivos de apoio |

O escopo é a parte mexida (`lista`, `banco`, `login`, `pwa`, `seo`, `lgpd`, `site`...). Se precisar
explicar o porquê, use o corpo da mensagem, depois de uma linha em branco. Commits pequenos, cada um
fazendo uma coisa.

## Código

- JavaScript (não TypeScript), ES modules, aspas simples, ponto e vírgula, 2 espaços.
- Nomes e comentários em português. O comentário explica **por que**, não o que a linha faz.
- Textos de interface em português do Brasil, simples e diretos (veja o tom de voz em
  [docs/marca.md](docs/marca.md)). Nada de número, depoimento ou parceria inventada.
- Backend sem framework: rota em `src/routes/index.js`, regra no model, resposta no controller.
- Frontend: use os componentes de `src/components/ds` e os tokens de `src/css` em vez de cores e
  tamanhos soltos.

## Testes

Antes de abrir o pull request:

```bash
cd Backend && npm test          # precisa passar
cd Frontend && npm test         # precisa passar (Vitest, sem rede)
cd Frontend && npm run build    # se mexeu no frontend
```

- Mudou regra do backend? Acrescente ou ajuste um teste em `Backend/test/` (`node --test`).
- Mudou algo do frontend? Acrescente ou ajuste um teste em `Frontend/test/` (Vitest com Testing
  Library).
- Mexeu numa tela ou num fluxo do app? Rode também `cd Frontend && npm run test:e2e` (Playwright).
  Na primeira vez, rode antes `npx playwright install chromium`. Ele sobe a API em memória e o site
  do build em portas só dele (4100 e 4180), e roda só na sua máquina, não no CI. Ele refaz o
  `dist/` apontando para a API de teste: não publique esse `dist/`.
- Teste novo no e2e? Prefira entrar de novo numa conta já criada (`entrarComSenha` em
  `e2e/jornada.spec.js`). A API aceita só 5 cadastros por hora por IP.
- Mexeu no banco ou no adaptador do PostgreSQL? Rode também `npm run test:pg` (veja o readme).
- Mudou a lista de redes? `test/redesSite.test.js` confere que site, `llms.txt` e `RedeModel` batem.
- Escreveu artigo na ajuda ou no blog? `Backend/test/conteudo.test.js` confere que ele está no
  `sitemap.xml` e no `llms.txt` e que, se citar uma rede, traz o aviso de que a vera não tem vínculo
  com ela.
- Ícone novo vai em `Frontend/src/components/ds/icons.js`. Nome que não existe no Bootstrap Icons
  faz o `npm test` e o build falharem.

## Pull request

1. Suba a branch e abra o pull request para a `main`. O modelo do PR aparece sozinho: preencha.
2. O CI roda os testes do backend, os testes do frontend (`npm test`) e o build do frontend. Só
   faça merge com ele verde.
3. Peça revisão de pelo menos uma pessoa do time. Quem revisa confere o comportamento, os testes e
   os textos.
4. Depois do merge, acompanhe o deploy com o checklist de [docs/operacao.md](docs/operacao.md#checklist-de-deploy).
