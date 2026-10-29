# Plano de correções da engine — 27/10/2026

Origem: revisão completa da engine (código + Studio aberto + 124/124 testes OK).
Status: **plano aprovado em decisões; nenhuma correção executada.**
Nenhum item exige render pago. Cada item termina com teste ou verificação própria.

## Decisões do Felipe (27/10)

| Tema | Decisão |
|---|---|
| Figurino original do Boomer | **Sem camisa, como a master.** Sem nova arte. |
| 6 campos mortos da aba Production | **Remover da tela.** Religar só se o Higgsfield vencer o teste comparativo. |
| Patrocínio falado | **Opcional, decidido por episódio.** TVs de sponsor continuam permanentes no cenário. |
| Linha editorial | **EUA + mundo + Austrália.** Roteiro usa só fatos da fonte. |

## Prioridade atual (Felipe, 27/10): engine perfeita para Boomer & Kev; white label depois

Ordem revisada após o teste de estresse (2 episódios renderizados, 9:16 e 16:9):

| # | O quê | Por quê | Item |
|---|---|---|---|
| 0 | **Supervisor de qualidade por cena** (fala, imagem; voz depois) | Decide Kling com prova; ver `architecture/qc-supervisor.md` | novo |
| 1 | Tirar marcas reais (Qantas, Vegemite, Gumtree) das masters | Risco jurídico em todo vídeo; arte → Claude Design + aprovação | novo |
| 2 | Kev ganha gravata-borboleta e corte inventado (repetiu nos 2 formatos) | Quebra a identidade do personagem | novo (investigar prompt da cena) |
| 3 | Legendas sincronizadas com a fala real | Erro visível em todo vídeo | novo |
| 4 | Roteiro pela tela passa pelas travas (rota Claude) e não se perde com F5 | Qualidade e trabalho perdido | novo |
| 5 | Boomer: ficha = master; figurino por ocasião; sponsor opcional; TV sem texto gerado | Consistência | 2, 3, 4 |
| 6 | Pauta EUA + mundo + AU com fatos da fonte; regiões do radar | Missão editorial | 6 + novo |
| 7 | Progresso real + animação (arte no Claude Design); estimativa de custo correta | Operação diária | 5, 8 |
| 8 | Campos mortos da aba Production | Tela honesta | 1 |
| — | Voz: decidir Kling × clone × Seedance depois que Felipe ouvir os 2 episódios | Identidade vocal | fora |

**Adiado para o white label:** limite de requisições por IP, vídeos públicos no Supabase,
JSON malformado → 500, rótulos de acessibilidade, mascote por cliente.

## Itens, em ordem de execução original

### 1. Remover os campos mortos da aba Production
- `src/app/page.tsx` (~linhas 1400–1500 e 1671): remover os campos `cameraPreset`,
  `motionWeight`, `soulId`, `motionRefUrl`, `visualPrompt` e `cameraMovement`,
  junto com o tipo correspondente em `src/types` quando não houver outro uso.
- Hoje `runPipelineSchema` descarta esses valores sem aviso.
- **Verificação:** `tsc` + testes; na tela, cada cena mostra só campos que chegam ao render.

### 2. Alinhar a ficha do Boomer com a master
- `src/data/characters.ts`: `defaultOutfit` e `imagePromptContext` passam a descrever
  o Boomer sem camisa, de luvas vermelhas, sem corrente.
- Trocar os gestos impossíveis com luva: "Shaka" → luva batendo no peito;
  "dois dedos para a lente" → luva inteira apontada para a câmera.
- `route.ts:724` e `:791`: tirar `shirtless` e `naked` da lista do que evitar
  (mantendo `missing clothes` só se fizer sentido). Unificar a lista numa constante.
- **Aberto para o painel:** headset do Boomer (presente em `master_boomer`,
  ausente em `master_wide`). Não decidir no código.
- **Verificação:** teste em `prompt-aspect.test.ts` garante que o prompt do Boomer
  não pede camisa e a lista do que evitar não contém "shirtless".

### 3. Figurino por ocasião aprovada, sem invenção da IA
- Lista fixa em `characters.ts`: `original`, `jogo`, `natal`, `halloween`
  (textos vindos da bíblia; Felipe aprova o conteúdo de cada uma no painel).
- `brainstorm/route.ts`: deixa de gerar o objeto `wardrobe`.
- `DraftingTable.tsx` + `page.tsx`: seletor de ocasião no lugar do figurino livre.
  O payload continua usando o campo `wardrobe` já existente (sem mudar o schema).
- **Verificação:** teste de que um episódio sem ocasião usa o figurino original.

### 4. Patrocínio opcional e TV sem texto gerado
- Os três geradores de roteiro tornam o bloco de patrocínio condicional a uma opção
  do episódio: `api/ai/script` (Claude), `api/ai/brainstorm` (Gemini) e
  `lib/script-engine.ts` (templates).
- `route.ts:270`: remover o patrocínio fixo nas cenas 4 e 5. Quando o episódio tiver
  patrocínio, as cenas com beat `sponsor` (de `editing-policy.ts`) recebem os adereços.
- `tvGraphics`: o Kling recebe "tela escura com o brilho do logo, sem texto".
  A manchete entra na montagem como cartão composto pelo ffmpeg, no mesmo passo das legendas.
  ponytail: cartão fixo na tela; encaixe em perspectiva na TV só se o cartão não bastar.
- **Verificação:** teste de `editing-policy` sem bloco de sponsor; teste de que
  `getDetailedPrompt` nunca manda texto do tema para a TV.

### 5. Custo estimado igual ao que o Kling cobra
- `page.tsx:399`: somar por cena 5 s ou 10 s (mesma regra de `klingDurationForAudio`),
  não a duração do roteiro.
- **Pendente de checagem:** o preço de US$0,14/s não foi conferido com o preço atual
  do Kling 2.6 no Replicate (e o áudio nativo pode custar diferente). Conferir antes de
  tratar a estimativa como confiável.
- **Verificação:** 2 cenas de 2 s e 3 s → 10 s cobrados na estimativa.

### 6. Pauta: EUA + mundo + Austrália, com fatos da fonte
- `api/trends/route.ts`: adicionar consultas de grandes acontecimentos dos EUA e do
  mundo; manter as australianas. A regra de veículos medidos continua igual.
- `api/ai/script`: o roteiro recebe as manchetes, veículos e links da pauta e a regra
  "só use fatos presentes nas fontes; piada é reação, não fato novo".
- Uma trava barata, no mesmo padrão do LOOP_GATE já existente: juiz estruturado
  aponta afirmações sem apoio nas fontes; reprovado → nova tentativa, como hoje.
- **Verificação:** teste de `trends-region` cobre as novas consultas; teste da trava
  com um roteiro que inventa um número.

### 7. Ajustes menores
- Library: o selo "PUBLIC" não corresponde ao que visitantes veem (0 episódios).
- Capas quebradas em 2 episódios antigos e um título em português no acervo.
- Legendas distribuídas por tempo igual: anotar; sincronia por palavra fica para
  depois do teste comparativo de voz.

### 8. Render que não parece travado (pedido do Felipe no teste de 27/10)
- Problema medido: a barra só tem 5 pontos fixos (10/25/40/85/100) e fica em 40%
  durante toda a geração do Kling (vários minutos), embora as cenas avancem no job.
- Progresso real por cena ("Cena 2 de 4 pronta"), tempo decorrido e tempo típico,
  lidos do `sceneStates` que o job já grava.
- Animação: canguruzinho e coala andando enquanto o render acontece.
  **Decisão (b):** arte produzida no Claude Design e aprovada pelo Felipe antes do código.
  Em white label, o mascote vem do pack do cliente.

## Fora deste plano
- Teste comparativo Kling 2.6 × Seedance 2.0 (Higgsfield), feito à mão, com custo próprio.
- Alterar arte master, aprovar vozes e o conteúdo das ocasiões: painel + Gestor.
- BK-17, n8n, publicação.
