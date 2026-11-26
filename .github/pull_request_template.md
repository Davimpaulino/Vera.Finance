## O que muda

<!-- Uma ou duas frases: o que muda para quem usa a vera ou para o time. -->

## Por quê

<!-- O problema que isso resolve. Link da issue, se houver. -->

## Como testar

<!-- Passos para quem revisa conferir. Ex.: entrar com a conta de teste, abrir /app/lista, ... -->

## Confira antes de pedir revisão

- [ ] `cd Backend && npm test` passa
- [ ] `cd Frontend && npm run build` passa (se mexeu no frontend)
- [ ] Teste novo ou ajustado para a regra que mudou
- [ ] Nenhum segredo, dado pessoal ou export do banco no diff
- [ ] Textos em português do Brasil, sem número, depoimento ou parceria inventada
- [ ] Variável de ambiente nova documentada no readme (e cadastrada no Render antes do deploy)
- [ ] Mudou os Termos ou a Política? `VERSAO_DOS_TERMOS` trocada no backend e no frontend
- [ ] Mudou a lista de redes? `RedeModel`, `src/lib/site.js`, `llms.txt` e a tabela do readme juntos

## Telas

<!-- Antes e depois, se mudou algo visível. Use dados de teste, nunca dados de uma pessoa real. -->
