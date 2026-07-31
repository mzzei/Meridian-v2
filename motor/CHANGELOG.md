# Changelog — Motor Meridian

Como saber qual versão você tem:

```js
import { MOTOR_VERSION } from './motor/engine.mjs';
console.log(MOTOR_VERSION);            // "1.0.0"
// ou, em runtime:
const engine = await createEngine({ apiKey });
console.log(engine.version);
```

A versão também aparece no cabeçalho do `motor/MANIFEST.txt` do seu pacote.

**Leia antes de atualizar:** correções marcadas com ⚠ **alteram probabilidades
exibidas ao usuário final**. Se você compara saídas entre versões (testes de
regressão, snapshots), espere diferenças legítimas nesses mercados — os números
antigos estavam errados.

---

## 1.0.0 — 2026-07-31

Primeira versão com carimbo. Pacotes entregues **antes** desta não têm
`MOTOR_VERSION` — se o seu `engine.mjs` não exporta essa constante, você está
numa cópia anterior e deve atualizar: as correções abaixo já estão inclusas.

### ⚠ Probabilidades (números mudam)

- **Mercados de cartão por time saíam com probabilidade de gols.** "Mais de 4.5
  cartões do [time]" era recalculado pela distribuição de gols e chegava ao
  usuário em torno de 2%, carimbado como valor calculado. Mercados disciplinares
  agora ficam fora desse recálculo.
- **"[Time] não marca" vinha invertido.** O mercado devolvia a probabilidade de o
  time marcar, não de não marcar — com média de 1,2 gol, exibia ~70% onde o
  correto é ~30%. Diferença de cerca de 40 pontos percentuais.
- **Mercados de estatística de time eram tratados como gols.** "Chutes ao gol do
  [time] mais de 5.5", "impedimentos", "finalizações de [jogador]" caíam no
  cálculo de gols e saíam próximos de zero. Agora só mercados de gol entram nesse
  recálculo; os demais mantêm a estimativa do modelo.
- **Faixa de probabilidade invertida no empate e no visitante.** A faixa
  "mínimo–máximo" do resultado aparecia com o maior valor primeiro nessas duas
  linhas.
- **Coerência de dupla chance** e **reconciliação por distribuição de Poisson**
  agora usam um descritor estruturado do mercado (tipo, time, linha, direção,
  negação, período) que a análise emite junto do texto, em vez de interpretar a
  descrição escrita. Isso torna o recálculo previsível e elimina a classe de erro
  dos três itens acima.

### Texto e conteúdo da análise

- **Tags de citação da busca não vazam mais para o texto.** Trechos como
  `<cite index="2-5">` apareciam dentro de nomes de jogadores, técnicos e
  estatísticas. Removidas em duas camadas: ao interpretar a resposta do modelo e
  no ponto de exibição.
- **Notas de ajuste automático saem separadas do texto.** Marcações do tipo
  "[probabilidade recalculada…]" ficavam misturadas ao texto de fundamento; agora
  vêm em campo próprio, para você exibir (ou não) como preferir.
- **Técnico de cada time é buscado ativamente.** Quando a coleta inicial não
  retorna o treinador, uma busca dedicada é feita antes de declarar o dado como
  ausente.
- **Mercados quase certos são identificados.** Mercados com probabilidade a partir
  de 80% ou de estrutura trivial ("ambos os times batem ao menos 1 escanteio")
  recebem a marca `_obvio: true` nos itens da análise, e a orientação de geração
  limita quantos desses entram e exige que o fundamento reconheça o baixo valor
  informativo. Use a marca para rotular esses mercados na sua interface.

### Coleta de dados

- **Cobertura de busca não se declara mais coberta sem o dado.** Quando apenas a
  classificação era obtida, resultados e forma recente eram considerados cobertos
  e não eram buscados — a análise seguia sem eles.
- **Placares com separadores variados são reconhecidos** ("3x0", "3X0", "3–0",
  "3:0"), evitando buscas repetidas por dados já disponíveis.
- **Jogadores com nome de prefixo comum não são mais confundidos.** Uma ausência
  de "Silva Jr" marcava "Silva" como indefinido na escalação.

### Integração

- **Respostas de chat não são mais truncadas.** Em conexões que fragmentam a
  transmissão, trechos da resposta podiam ser descartados silenciosamente, e
  acentos partidos entre pacotes viravam caracteres inválidos. Afeta o método
  `chat()`.
- **Texto anterior a uma continuação do modelo era perdido.** Quando a resposta
  passava por continuação de ferramenta, o texto emitido antes dela não entrava no
  retorno de `chat()`.
- `createEngine()` agora devolve também `version`.
