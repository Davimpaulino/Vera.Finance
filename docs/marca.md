# Guia de marca da vera.finance

Como a vera aparece e como ela fala. Tudo aqui sai do design system que está no código; quando o
código mudar, este guia muda junto.

Onde está cada coisa:

| O quê | Arquivo |
|---|---|
| Cores (valores) | `Frontend/src/css/palette.css` |
| Cores por superfície (tinta e papel) | `Frontend/src/css/semantic.css` |
| Tipografia | `Frontend/src/css/typography.css` e `Frontend/src/css/fonts.css` |
| Raios, espaços, sombras e movimento | `Frontend/src/css/radii.css`, `spacing.css`, `elevation.css`, `motion.css` |
| Logo | `Logo` em `Frontend/src/components/ds/core.jsx` e `Frontend/src/components/Brand.jsx` |
| Ícone do app e favicon | `Frontend/public/favicon.svg` e `Frontend/public/icons/` |
| Componentes | `Frontend/src/components/ds/` |
| E-mails | `Backend/src/emails/` |

---

## Nome

| Use | Não use |
|---|---|
| **vera.finance**: o nome completo, sempre em minúsculas e com o ponto | Vera Finance, VeraFinance, Vera.Finance, VERA FINANCE |
| **vera**: no meio do texto, com artigo feminino ("a vera avisa", "na vera") | o Vera, o app Vera |
| **vera+**: o plano pago; "vera+ mensal" e "vera+ anual" | Vera+, Vera Plus, vera plus, Premium |
| **Grátis**: o plano gratuito | Free, Básico |

- O nome fica em minúsculas mesmo no começo da frase: "vera.finance é um app...". Quando a frase
  começa pelo artigo, só o artigo leva maiúscula: "A vera não vende produtos."
- Em endereço de site, o nome é o mesmo: `vera.finance`.
- Contato: por enquanto, um e-mail só para tudo (contato, ajuda e privacidade),
  `veragroup.ia@gmail.com`. É provisório, até a vera ter domínio próprio. Também há o WhatsApp
  (11) 94072-3507 e o Instagram `@veragroup.ia`, da vera.group. Os três ficam em
  `Frontend/src/lib/site.js` (`EMAIL_DE_CONTATO`, `WHATSAPP` e `INSTAGRAM`): use as constantes,
  não escreva o contato à mão.

---

## Logo

O logo é a palavra **vera** em Syne Bold seguida de um **ponto âmbar**. A versão completa acrescenta
**finance** logo depois do ponto, na mesma fonte, em cor secundária.

```
vera.          logo (componente Logo)
vera.finance   marca completa (componente Brand)
```

- **O ponto é sempre âmbar** (`--accent-dot`, `#D96C2F`), nas duas superfícies. É o elemento que
  identifica a vera.
- A palavra "vera" usa a cor de texto principal da superfície (`--text-1`); "finance" usa a
  secundária (`--text-2`).
- Tamanhos do componente: `sm` 18px, `md` 22px (padrão), `lg` 32px, `xl` 44px. Na marca completa,
  "finance" acompanha: 17px, 22px e 32px.
- **Marca reduzida** (`<Logo mark />`): só o ponto âmbar, um círculo de 12px. Para espaços muito
  pequenos.
- **Ícone do app** (favicon, ícones do PWA, `apple-touch-icon`): quadrado de cantos arredondados em
  tinta (`#0C0E10`), com o "v" da Syne em contorno no tom claro (`#F5F2EE`) e o ponto âmbar
  (`#D96C2F`).
- **Carregando**: o logo `xl` pulsando (`vera-logo--pulse`) é a tela de espera do app.
- **Nos e-mails** (`Backend/src/emails/layout.html`), o logo é texto e pede a Syne. Como os leitores
  de e-mail não carregam fonte externa, ele só sai em Syne para quem tem a fonte instalada; para os
  outros, cai para Plus Jakarta Sans, Arial ou Helvetica, com as mesmas cores e o ponto âmbar. É a
  única exceção aceita à fonte do logo.

### Usos

| Faça | Não faça |
|---|---|
| Use os componentes `Logo` e `Brand`, que já trazem fonte, tamanho e cores certos | Redesenhar o logo em imagem ou com outra fonte |
| Deixe respiro em volta, de pelo menos a altura da letra "v" | Encostar o logo em outros elementos ou bordas |
| Use sobre as superfícies tinta ou papel, ou sobre cor lisa com bom contraste | Colocar sobre foto ou fundo com textura |
| Mantenha o ponto âmbar | Trocar a cor do ponto, tirar o ponto ou trocar por outro sinal |
| Escreva tudo junto: vera.finance | Separar ("vera . finance"), pôr maiúscula, esticar, inclinar, aplicar sombra, contorno ou degradê |

---

## Cores

A vera tem duas superfícies: **tinta** (escura, a padrão) e **papel** (clara). A pessoa escolhe em
Configurações › Aparência. Os componentes nunca usam o valor da cor direto: usam o token semântico
(`--accent`, `--text-1`...), que muda com a superfície.

### Paleta (valores)

| Token | Valor | Família |
|---|---|---|
| `--tinta-900` | `#0A0C0E` | tinta (fundos escuros) |
| `--tinta-800` | `#0C0E10` | |
| `--tinta-700` | `#14171A` | |
| `--tinta-600` | `#181C20` | |
| `--tinta-500` | `#22262B` | |
| `--papel-000` | `#FFFFFF` | papel (fundos claros) |
| `--papel-100` | `#FAF8F5` | |
| `--papel-200` | `#F0EDE8` | |
| `--papel-300` | `#E5E1DA` | |
| `--cinza-050` | `#F5F2EE` | cinza (textos) |
| `--cinza-300` | `#B8BCC2` | |
| `--cinza-500` | `#8A8F96` | |
| `--cinza-600` | `#6B7075` | |
| `--cinza-700` | `#5A5F66` | |
| `--cinza-800` | `#4A4F55` | |
| `--cinza-900` | `#17191C` | |
| `--ambar-300` | `#E8834E` | âmbar (destaque da marca) |
| `--ambar-400` | `#E8843F` | |
| `--ambar-500` | `#D96C2F` | |
| `--ambar-700` | `#A84D14` | |
| `--ardosia-100` | `#DCE5E7` | ardósia (dados e gráficos) |
| `--ardosia-400` | `#5D7D88` | |
| `--ardosia-600` | `#33505A` | |
| `--verde-400` | `#4ECB8B` | verde (deu certo) |
| `--verde-700` | `#0F6B3F` | |
| `--amarelo-400` | `#E8B93A` | amarelo (atenção) |
| `--amarelo-700` | `#8A6410` | |
| `--vermelho-400` | `#E8695C` | vermelho (problema) |
| `--vermelho-700` | `#B8281B` | |

### Tokens por superfície

| Token | Tinta (escura, padrão) | Papel (clara) | Para quê |
|---|---|---|---|
| `--surface-app` | `#0C0E10` | `#FAF8F5` | fundo da página |
| `--surface-sunken` | `#0A0C0E` | `#F0EDE8` | faixas e áreas rebaixadas |
| `--surface-card` | `#14171A` | `#FFFFFF` | cartões |
| `--surface-field` | `#181C20` | `#FFFFFF` | campos de formulário |
| `--text-1` | `#F5F2EE` | `#17191C` | texto principal |
| `--text-2` | `#B8BCC2` | `#4A4F55` | texto secundário |
| `--text-muted` | `#8A8F96` | `#6B7075` | legendas e metadados |
| `--accent` | `#D96C2F` | `#A84D14` | botão principal e destaque |
| `--accent-text` | `#E8843F` | `#A84D14` | texto em destaque |
| `--on-accent` | `#0C0E10` | `#FFFFFF` | texto sobre o destaque |
| `--accent-dot` | `#D96C2F` | `#D96C2F` | o ponto do logo (não muda) |
| `--success` | `#4ECB8B` | `#0F6B3F` | deu certo, dentro do limite |
| `--warning` | `#E8B93A` | `#8A6410` | atenção, perto do limite |
| `--danger` | `#E8695C` | `#B8281B` | estourou, erro, apagar |
| `--data` | `#5D7D88` | `#33505A` | gráficos e barras |
| `--meter-fill` | `#33505A` | `#33505A` | preenchimento dos medidores |

Bordas e divisórias são o texto principal com pouca opacidade (`--border-hairline`, `--divider`),
para funcionarem nas duas superfícies. A cor do navegador (`theme-color`) acompanha: `#0C0E10` na
tinta e `#FAF8F5` no papel.

### Regras

- **Âmbar é o destaque**: um botão principal por tela, valores que importam, o ponto do logo. Não use
  âmbar em textos longos nem como fundo de áreas grandes.
- Na superfície papel, o âmbar do texto e dos botões é o `--ambar-700` (`#A84D14`), mais escuro, para
  ter contraste no fundo claro.
- **Verde, amarelo e vermelho** só para estado (dentro do limite, perto, estourou), nunca para
  decorar.
- **Ardósia** é a cor dos dados: gráficos, medidores e barras.
- Estado nunca depende só da cor: venha junto um texto ou um ícone ("estourou", "perto do limite").
- Nos **e-mails** vale a superfície papel (fundo `#FAF8F5`, cartão `#FFFFFF`, texto `#17191C`,
  botão `#A84D14` com texto branco), porque muitos leitores de e-mail não respeitam o tema escuro.

---

## Tipografia

| Família | Token | Pesos | Onde |
|---|---|---|---|
| **Syne** | `--font-display` | 600, 700, 800 | logo e títulos das páginas do site (landing, perguntas, termos) |
| **Fraunces** | `--font-serif` | 500, 600 | valores em dinheiro em destaque (número grande do painel, preços) |
| **Plus Jakarta Sans** | `--font-sans` | 400, 500, 600, 700 | todo o resto: textos, botões, campos |

As três vêm do Google Fonts (`fonts.css`). Nos e-mails, que não carregam fontes externas, o logo
pede Syne e o texto pede Plus Jakarta Sans; quem não tem a fonte vê Arial ou Helvetica.

- **Números** sempre com algarismos de largura fixa (`font-variant-numeric: tabular-nums`, token
  `--num`), para colunas de valores alinharem.
- **Escala** (`--fs-*`): 11, 12, 13, 15 (texto), 16, 19 (abertura), 20 (números), 22, 26, 28
  (títulos), 34, 44, 56 e 64px (títulos de destaque).
- **Altura de linha**: 1,05 em títulos grandes, 1,2 em títulos, 1,45 no texto, 1,6 em texto longo.
- **Espaçamento entre letras**: −0,02em em títulos de display; 0,06em a 0,08em em rótulos em
  caixa alta.
- **Títulos** com só a primeira letra maiúscula: "Planos e preços", "Perguntas frequentes". Rótulos
  curtos, metadados e chamadas pequenas podem ficar em minúsculas: "renda fixa", "para sempre",
  "seu dinheiro com data marcada".

---

## Forma

- **Raios** (`radii.css`): ícone 9px, chip e campo 12px, cartão 16px, painel 20px, folha 24px, app
  28px, pílula 999px.
- **Espaços** (`spacing.css`): passos de 4px (4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 88).
- **Sombras** (`elevation.css`): três níveis, mais fortes na tinta e mais suaves no papel.
- **Movimento** (`motion.css`): 120ms, 200ms e 320ms, com desaceleração suave. Nada de animação que
  atrapalhe ler um valor.
- **Ícones**: Bootstrap Icons, pelo componente `Icon` (nomes próprios do design system em
  `components/ds/icons.js`). Ícone acompanha texto; sozinho, precisa de `label`.

---

## Tom de voz

A vera fala como uma amiga que entende de dinheiro e de mercado: direta, calma e concreta. Ela diz
o que aconteceu, o que significa e o que fazer, com os números da própria pessoa.

### Princípios

1. **Direta.** Frases curtas, uma ideia por frase. O verbo vem cedo.
2. **Sem jargão.** "Quanto ainda dá para gastar", "até que dia o dinheiro dura", "saldo livre". Nada
   de "fluxo de caixa", "liquidez", "orçamento base zero".
3. **Você.** A vera fala com "você" e fala de si mesma na terceira pessoa ("a vera avisa").
4. **Concreta.** Valor, data e lugar em vez de adjetivo: "Café subiu 8% no seu mercado" e não "Preços
   em alta!".
5. **Calma.** Sem alarme, sem culpa, sem exclamação. Estourar uma categoria é informação, não bronca.
6. **Diz o que fazer.** Mensagem de erro ou de limite termina com o próximo passo.

### Exemplos do próprio app

| Situação | Como a vera escreve |
|---|---|
| Promessa principal | "O melhor jeito de saber quanto ainda dá para gastar." |
| Explicar o produto | "Você reserva a renda em categorias, lê a nota do mercado pelo QR Code e a vera diz onde a sua lista sai mais barato hoje — e até que dia o dinheiro dura." |
| Privacidade | "A vera nunca pede a senha da sua conta. Você lança, ou deixa a nota fiscal lançar por você." |
| Erro nosso | "Algo deu errado do nosso lado. Tente de novo." |
| Limite do plano | "O plano grátis permite até 3 metas. Assine o vera+ para ter metas ilimitadas." |
| Algo que a vera ainda não faz | "A Sefaz do seu estado mostrou a nota num formato que a vera ainda não lê. Lance o gasto à mão." |
| Site da rede fora | "o site da rede não respondeu agora" |
| Cancelamento | "Cancelando hoje, o vera+ continua até 25 de dezembro e depois a conta volta para o grátis." |
| Confirmação rápida | "Senha trocada." / "Arroz foi para a lista." |

### Faça e não faça

| Faça | Não faça |
|---|---|
| "Você ainda tem R$ 210 em Comida até dia 5." | "Atenção!!! Seu orçamento está comprometido!" |
| "Criar conta grátis" | "Clique aqui" / "Saiba mais" |
| "Não deu para ler a nota. Tente de novo com mais luz." | "Erro 500" / "Falha na operação" |
| "O preço pode mudar; o que vale é o do caixa." | "Menor preço garantido" |
| "Grátis, sem cartão, não expira." | "Teste grátis*" com letra miúda |
| Botão com o verbo da ação: "Apagar a conta", "Ver a lista" | Botão genérico: "OK", "Confirmar" quando há um verbo melhor |
| Valores e datas no formato brasileiro: R$ 12,90, 26 de novembro, 2 a 15 km | R$12.90, Nov 26, 2-15km |
| Texto sem emoji | Emoji em botão, título ou aviso |

---

## Regras de honestidade

A comparação de preços só vale se as pessoas confiarem nela. Por isso:

1. **Nenhum número inventado.** Nada de "milhares de usuários", "economize até 30%", nota de loja de
   aplicativo, prêmio ou parceria que não existe. Só fatos do produto que dá para conferir no código:
   quantas redes têm preço online (contado da lista, não escrito à mão), raio de 2 a 15 km, histórico
   de 90 dias, plano grátis de R$ 0.
2. **Nenhum depoimento inventado.** Depoimento só de pessoa real, com autorização por escrito.
3. **Imagens ilustrativas.** Tela de celular, print ou exemplo com valores de mentira leva a legenda
   "Imagens ilustrativas." perto da imagem, e o texto alternativo diz que é ilustração.
4. **Sem marca real ao lado de preço de exemplo.** Nos exemplos, os mercados são genéricos
   ("Mercado A", "Mercado Exemplo"). Nome de rede de verdade só aparece com preço de verdade.
5. **Sem vínculo com as redes.** Sempre que o material citar redes de supermercado, vem junto "Sem
   vínculo com as redes citadas." (ou "A vera não tem vínculo com as redes citadas."). Só cite redes
   que têm preço online de verdade (`REDES_COM_PRECO`, em `Frontend/src/lib/site.js`).
6. **Preço com data e origem.** Todo preço diz de onde veio (site da rede ou nota fiscal) e de
   quando. E lembre: o preço que vale é sempre o do caixa.
7. **Economia só calculada.** A vera só fala em economia quando ela foi calculada com os preços e a
   lista da pessoa.
8. **Privacidade só com o que é verdade.** "Não pede senha do banco", "não vende dados", "a nota entra
   sem nome e sem CPF": são frases que o código e a Política de privacidade sustentam. Não acrescente
   promessa (como "criptografia de nível bancário") que ninguém conferiu.
9. **Não prometa o que não existe.** App nas lojas, conexão com banco ou Open Finance, alerta por
   e-mail ou push: a lista do que ainda não existe está no readme. Fale disso só depois de estar no
   ar.
10. **Os mesmos números em todo lugar.** Preço dos planos e limites saem de
    `Backend/src/models/PlanoModel.js`; se mudarem, mudam também a página de planos, as perguntas
    frequentes e o `llms.txt`.
