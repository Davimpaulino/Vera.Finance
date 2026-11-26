# Como contribuir

Obrigado por ajudar a vera. Este guia é curto de propósito: o resto está no [readme](readme.md), em
[docs/operacao.md](docs/operacao.md) e em [docs/marca.md](docs/marca.md).

## Antes de começar

- Node.js 22.12 ou mais novo (o Vite do `Frontend` pede 22.12; a API sozinha roda a partir do
  22.9). Rode `npm ci` em `Backend` e em `Frontend`.
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
cd Frontend && npm run build    # se mexeu no frontend
```

- Mudou regra do backend? Acrescente ou ajuste um teste em `Backend/test/` (`node --test`).
- Mexeu no banco ou no adaptador do PostgreSQL? Rode também `npm run test:pg` (veja o readme).
- Mudou a lista de redes? `test/redesSite.test.js` confere que site, `llms.txt` e `RedeModel` batem.

## Pull request

1. Suba a branch e abra o pull request para a `main`. O modelo do PR aparece sozinho: preencha.
2. O CI roda os testes do backend e o build do frontend. Só faça merge com ele verde.
3. Peça revisão de pelo menos uma pessoa do time. Quem revisa confere o comportamento, os testes e
   os textos.
4. Depois do merge, acompanhe o deploy com o checklist de [docs/operacao.md](docs/operacao.md#checklist-de-deploy).
