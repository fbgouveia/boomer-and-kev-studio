# HANDOFF.md — Registro de Continuidade entre Sessões
# Boomer & Kev Studio | Atualizado: 2026-08-07 AEST (v5.9)

> 🔄 **Este arquivo é o primeiro ponto de leitura de QUALQUER agente novo.**
> Ele contém o estado exato do projeto, o que foi feito, o que falta, e as regras
> que nunca podem ser quebradas. Atualize-o ANTES de encerrar sua sessão.
>
> **Hierarquia de leitura:** HANDOFF.md → GEMINI.md → CLAUDE.md → AGENTS.md

---

## 🚦 COMECE AQUI — estado em 04/09/2026 fim do dia (v6.0)

**Uma linha:** engine reparada e re-deployada (src/ inteira tinha saído do disco, restaurada do
git), 4 defeitos crônicos mortos, Labs honesto. **Continua com zero episódios publicados —
o próximo passo continua sendo escolher 1 dos 8 roteiros e renderizar (US$3–6, seu OK).**

**Estado de infra verificado hoje:**
- `node_modules` estava quebrado (typescript + esbuild com binário de outra plataforma) →
  reparado com `npm install` + `npm rebuild esbuild tsx`. Ritual verde: **tsc limpo, 61/61
  testes, build ok**.
- Deploy executado: **PM2 online, health check HTTP 401 (esperado — Basic Auth)**. Os 33+
  commits pendentes foram à produção.
- Stack de skills instalada em `~/.config/opencode/skills/` (ver bloco 04/09 abaixo):
  holofote AU configurado em `.holofote/`, fact-checker, humanizer v3, Alambique.

**Diffs de hoje (US$0, em produção):**
1. **wav2lip removido** do `pipeline/run/route.ts` — as 8 predictions pagas que falhavam
   sempre em todo episódio não existem mais; áudio TTS multiplexado direto via ffmpeg.
   Economia medida: 8 chamadas + polling + logs de erro por episódio.
2. **`GUIDE_IMAGES` → âncoras reais** (`/assets/master_*.png`) — storyboard não usa mais
   Unsplash quebrada.
3. **Botão pago renomeado**: `RENDER EPISODE · N SCENES · ~US$X` + aria-label explicando que
   renderiza o episódio inteiro (custo vem do total real, não hardcoded).
4. **console.log por tecla removido** (`DirectorTerminal.tsx`) — texto do usuário não vaza
   mais ao console.
5. **Studio Labs com selo obrigatório** `⚠ DEMO — SIMULATED · nothing here is real or
   queued` e header `RENDER: SIMULATED`. **Decisão pendente do Felipe:** remover a aba
   inteira (recomendação) ou torná-la real. Hoje ela não engana mais.

**Honestidade da verificação:** tsc + testes + build + health check verdes; lint segue com
48 erros **preexistentes** (meus diffs reduziram 1 — o console.log era erro). O que o Kling
faz com as âncoras e o comportamento sem wav2lip só o primeiro render real mostra.

## 📋 PLANO DE AMANHÃ — engine para 10/10 (1 sessão por item, em ordem de retorno)

| # | Sessão | Desenho | Critério de aceite |
|---|---|---|---|
| 1 | **Filtro de relevância dos recibos** | No `tools/capture-receipts.mjs`, entre RSS e captura: chamada barata ("esta manchete sustenta esta alegação? sim/não"). Referência de método: skill `fact-checker` | Recibo de afiliado (ex.: 7NEWS "20% off subscription") rejeitado; `MIN_OUTLETS` conta só relevantes |
| 2 | **Loop do roteiro** | Gate na `/api/ai/script`: 2ª chamada barata "a última cena paga a primeira?" | Roteiro NRL que não pagava o hook reprovado |
| 3 | **Checkpoint/retomada** | Persistir estado do job por cena (clipes já salvos em `.tmp/`), permitir "continuar da cena N" | Cena 6 falhando → retoma sem repagar 1–5 |
| 4 | **`aspect` selecionável** | `page.tsx` envia o campo em `/api/pipeline/run` | 16:9 alcançável pela UI (requisito do Felipe de 24/07) |
| 5 | **Pauta real** | Substituir `trend-hunter` teatral pela regra medida: ≥5 veículos confiáveis em 7 dias via Google News RSS | Zero tema `example.com`, zero score inventado |

**Decisões pendentes do Felipe (US$0, uma palavra cada):**
- Studio Labs: **remover a aba** (recomendação) ou torná-la real um dia?
- Escolher 1 dos 8 roteiros (`04_Delivery/script_ab/` — Brisbane Coffee ou NRL) e **renderizar**
  na UI local (US$3–6; tem US$17 no Replicate; gate humano por design).

**Não fazer (registrado):** publicação automática, n8n, P3 exploits — critério de reversão
já gravado (§DECISÃO ARQUITETURAL 05/08).

---

## 🚦 ESTADO 07/08/2026 fim do dia (histórico — supersedido pelo v6.0 acima)

**Uma linha:** a geração de roteiro saiu de morta para verificada, e a camada de prova saiu
do zero para funcionando. **Continua com zero episódios publicados.**

**Commits de hoje (todos em `restore-engine`, remoto sincronizado):**
`dc6b183` migração Gemini→Claude · `ff32a15` cenas livres + RUNTIME_GATE + A/B ·
`8243bd2` desenho da camada de prova · `4528285` captura de recibos funcionando

**O que existe agora e não existia de manhã:**
- Roteiro gerando em `claude-sonnet-5` com structured outputs (zero regex, zero JSON quebrado)
- 8 roteiros aprovados pelo Felipe em `04_Delivery/script_ab/`
- `tools/capture-receipts.mjs` capturando print real de manchete de 5 veículos confiáveis

**PRÓXIMO PASSO, sem rodeio: escolher 1 dos 8 roteiros e renderizar.** O gargalo nunca foi
escrever nem provar — está demonstrado. Candidatos que fecham loop e cabem em qualquer
plataforma: Brisbane Coffee (Opus, 53s) e NRL (Opus, 54s). Render 9:16 custa US$3-6,
há US$17 no Replicate. **Exige OK explícito do Felipe** (incidente de 20-22/07).

**As 3 travas que faltam, em ordem de importância:**
1. **Relevância do recibo** — nada verifica se a manchete sustenta a fala. Hoje captura
   conteúdo de afiliado como se fosse prova. Provável solução: uma chamada barata ao modelo
   ("esta manchete sustenta esta alegação? sim/não") entre a busca e a captura.
2. **Loop do roteiro** — nada verifica se a última cena paga o que a primeira plantou. Foi o
   que separou bom de fraco no A/B.
3. **Pauta real** — `trend-hunter` é teatro (3 temas hardcoded, score inventado). A regra de
   admissão medida já existe no papel: ≥5 veículos confiáveis em 7 dias.

**Não repetir os erros de hoje:** nenhuma URL transcrita à mão (troquei um caractere e quebrou);
`last30days` exige `~/.local/bin/python3.12` e precisa de `--plan`; chamada local à API do
studio exige Basic Auth (401 não é bug).

---

## 🚀 SESSÃO 04/09/2026 (tarde/noite) — MISSÃO 10H: ENGINE DESTRAVADA

**Uma linha:** 4 das 5 travas do handoff morreram em código; primeiro episódio FREE gerado a
US$0; pauta fabricada substituída por sinal medido (44 outlets reais); intel competitiva em docs/.

**Commits:** `2f3e706` episódio FREE · `4588a16` trend agent medido · `69d8674` filtro de
recibos · `e030a64` LOOP_GATE · commit atual (compliance modal + intel doc)

### O que passou a existir
1. **`tools/free-episode.mjs`** — episódio completo US$0: Edge TTS en-AU grátis (Boomer
   WilliamNeural +18%/+12Hz; Kev -14%/-28Hz) + clipes piloto 4K recortados 9:16 + ffmpeg.
   **Prova: .tmp/free_episode/BK_FREE_EPISODE.mp4 — 55s, 8 cenas, 1080×1920, US$0,00.**
2. **`/api/trends` reescrito** — era notícia fabricada (manchetes PT-BR inventadas, domínio
   falso, viralPotential à mão, log "AGENT 24/7 Dynamic" = teatro). Agora: Google News RSS 7d,
   score = contagem REAL de outlets (regra ≥5/7d em código). Prova: housing 44 outlets, fuel 43,
   Coles 42 (ABC/AFR/CommBank reais). Sem dados → 502 honesto, nunca fabrica.
3. **Filtro de relevância dos recibos** (trava nº 1) no capture-receipts: chamada barata
   entre busca e captura. Provado: Bruno Mars → NO; afiliado → NO. 0 relevantes → exit 2
   antes de gastar Playwright.
4. **LOOP_GATE** (trava nº 2) no /api/ai/script. Provado: roteiro REJEITADO ("just vague
   slogans"), regenerado e aprovado com payoff real. Fail-open se juiz indisponível.
5. **Compliance modal consertado** (defeito 06/08): overflow medido (h2 69px fora do painel),
   fix flex-wrap/min-w-0, verificado ao vivo. Scanner devolve análise substantiva
   (EU AI Act: WATERMARK_REQUIRED; right of publicity HIGH).
6. **Métricas inventadas mortas**: sparkline Math.random(), "92% MOMENTUM", "RETENTION GOAL
   90%+" → placeholders honestos.
7. **`docs/competitive-intel-2026-09.md`** — Nobody Sausage (22M, escassez de ad US$33.8k),
   Betoota/Shovel (sátira AU é TEXTO = vazio em vídeo), Glorb (formato replicável), 10
   táticas acionáveis, ondas 2026, análise de ferramentas rivais (HeyGen/Captions/Argil).

### Descobertas
- **Lipsync em animal existe**: Kling Avatar V2 (kwaivgi/kling-avatar-v2) documenta "humans,
  cartoons, animals" — wav2lip falhava por não detectar rosto animal. POC US$1-2 aguarda OK.
- **TikTok é o gargalo do POST**: app não-auditado publica PRIVADO (auditoria = semanas).
  Plano: publicar manual enquanto as auditorias correm em paralelo.
- n8n: `tools/n8n_boomer_kev_orchestrator.ts` (cron seg/qua/sex) e o schema Supabase
  (publish_jobs/social_accounts/pipeline_events) JÁ EXISTEM — POST perfeito = construir
  sobre fundação pronta.
- Edge TTS en-AU = TTS do modo FREE; Piper en_AU-amy-medium (MIT) para comercial.
- **Lição de processo**: `git restore .` com docs não-committados apagou o bloco de handoff
  da sessão anterior. Nunca restaurar sem stash/commit prévio.

### Trava restante (única de código): CHECKPOINT/retomada
- Cenas salvas em `.tmp/sync_*.mp4`; falta manifest por job + "continuar da cena N"
  (último frame via ffmpeg = start_image da retomada). Único buraco que queima dinheiro.

### Próximos passos (ordem)
1. Checkpoint/retomada (core — 1 sessão dedicada)
2. POC lipsync Kling Avatar V2 (US$1-2) — **exige OK do Felipe**
3. n8n gates Telegram + auditorias TikTok/YouTube/IG em submissão
4. Analytics ingest real + avaliador visual
5. Pendências do Felipe: Labs remover vs real; OK do POC; contas sociais existem?

---


**Resumo em uma linha:** a geração de roteiro foi migrada de `gemini-2.5-flash` (morto por
cobrança GCP desde 06/08) para Claude com structured outputs, e a busca de pauta ganhou uma
regra escrita. **Nada foi testado contra a API real — falta a chave.**

### Atualizações desta sessão

1. **`src/app/api/ai/script/route.ts` migrado para Claude.** Saiu o `fetch` cru no Gemini,
   entrou o SDK oficial `@anthropic-ai/sdk@0.115.0` com `output_config.format` +
   `json_schema`. Modelo padrão `claude-sonnet-5`, sobrescrevível por `SCRIPT_MODEL` no env
   ou pelo campo `model` no body (existe só para o A/B cego contra `claude-opus-5`).
2. **Morreu o regex que raspava JSON.** A linha `content.match(/\[[\s\S]*\]/)` era ponto de
   falha silenciosa: qualquer variação de formatação quebrava ou entregava lixo. O schema
   agora impede o modelo de sair do formato, e `shotType` virou `enum` derivado de
   `SHOT_TYPES` — validado pela API, não pedido em prosa.
3. **`JSON ONLY. NO MARKDOWN. NO EXPLANATIONS.` removido do prompt** — virou lixo com o
   schema no lugar. O resto do prompt (personagens, slang, gancho, patrocinador falso) ficou
   **intacto de propósito**.
4. **`BALANCE_GATE` preservado.** Structured outputs garante o *formato*, não a contagem 4/4
   Boomer/Kev. A trava do incidente de 19/07 (5x1, Kev sumiu do vídeo) continua necessária.
5. **Regra de pauta escrita** no `CLAUDE.md` do studio: skill `last30days` antes de qualquer
   pauta entrar na fila, com a forma de busca (conflito, não assunto) e o filtro dos 3.

### Descobertas (o que não estava escrito em lugar nenhum)

- **`last30days` pelo CLI cru roda em modo degradado.** A saída avisa: *"If you are the
  reasoning model hosting this skill, YOU ARE the planner"* — sem `--plan` ele cai no
  fallback determinístico (caminho headless/cron). Invocar como skill de verdade, com o
  modelo montando o plano de busca. A medição de cobertura de 07/08 foi feita no modo pior.
- **`last30days` é instável entre execuções.** Mesma query (`Brisbane coffee prices`),
  minutos de diferença: primeira rodada reportou `Reddit: 6 threads / 1.054 upvotes`,
  as seguintes `0 threads`, `Sources: none`, zero URLs extraíveis. Fonte gratuita
  intermitente não sustenta pipeline que precisa de recibo em todo episódio.
- **Chamada local à API do studio exige Basic Auth.** `src/proxy.ts` protege tudo menos
  `/api/radar` e `/api/cron/trend-hunter`. Um 401 em teste local **não é bug** — falta o
  header. Receita: `AUTH=$(printf '%s:%s' "$STUDIO_AUTH_USER" "$STUDIO_AUTH_PASSWORD" | base64)`.
- **Sonnet 5 gera em 15-19s; Opus 5 em 24-27s.** Diferença de latência real, não de preço.

- **A skill `last30days` exige Python 3.12+ e o `python3` do sistema é 3.9.6** — ela nem
  inicia. Rodar com `~/.local/bin/python3.12`. Sem isso parece quebrada.
- **Cobertura real do `last30days` sem chave** (medido pelo `doctor` em 07/08): vivos =
  reddit (público), hackernews, github, web. **Quebrado = polymarket.** Desligados = tiktok,
  instagram, threads, youtube, x, linkedin, pinterest. Ou seja: as plataformas onde o B&K
  vive estão **mudas**. Serve para achar tema de notícia, **não** para ler tendência de
  short-form. Destravar é grátis: `brew install yt-dlp` e `last30days.py setup --github`.
- **Sonnet 5 e Opus 5 rejeitam `temperature`/`top_p`/`top_k` com erro 400.** O código antigo
  não mandava temperature (o Gemini usava o padrão alto dele), então a migração não quebra —
  mas o botão de variedade não existe mais. Para gerar N variantes do MESMO tema, a variação
  tem que ser pedida no prompt ("três ângulos distintos"), não sorteada.
- **O roteiro custa ~1% do episódio.** ~2.500 tokens de entrada + ~1.500 de saída: US$0,02 em
  Sonnet 5, US$0,05 em Opus 5, contra US$3–6 de render. Escolher modelo por preço aqui
  economiza centavos e coloca o risco na única etapa criativa do pipeline.

### ✅ RESOLVIDO ainda em 07/08 — a rota está VERIFICADA de verdade

O commit `dc6b183` foi feito quando a rota ainda era não-verificada. **Isso mudou.** Felipe
adicionou `ANTHROPIC_API_KEY` no `.env.local` e a rota rodou de ponta a ponta:
**8 gerações reais, HTTP 200 em todas, ~US$0,26 no total.**

- Primeira tentativa deu **401** — não era bug: é o Basic Auth do próprio studio
  (`src/proxy.ts`). Toda chamada local à API precisa do header
  `Authorization: Basic base64(STUDIO_AUTH_USER:STUDIO_AUTH_PASSWORD)`.
- Segunda deu **400 "credit balance is too low"** — a chave autenticava, a conta é que não
  tinha crédito. Felipe resolveu e rotacionou a chave.
- **Structured outputs confirmado:** 8 roteiros, zero campo faltando, zero `shotType`
  inválido, zero JSON malformado. Nenhum regex envolvido.

### Resultado do A/B — o modelo NÃO é a variável

4 temas × 2 modelos, julgamento cego (ordem sorteada por tema; gabaritos em
`04_Delivery/script_ab/gabarito*.json`). **Felipe aprovou os 8.**

**Conclusão: fica em `claude-sonnet-5`.** Se os dois são indistinguíveis para o único juiz que
importa, vence o mais barato e mais rápido — US$0,02 vs US$0,05, e 15-19s vs 24-27s por
roteiro. Opus continua a um `SCRIPT_MODEL=claude-opus-5` de distância.
**O que faz o trabalho é o prompt do Felipe, não o modelo.** Não gastar mais tempo comparando
modelo sem dado de retenção.

Artefatos preservados em **`04_Delivery/script_ab/`** (mesmo padrão do `audio_ab`): os 8 JSON,
os dois gabaritos, `roteiros.html` para leitura humana e `build-page.mjs` que o regenera.

### ⚠️ ACHADO GRAVE — `trend-hunter` é teatro, igual à aba Studio Labs

`src/app/api/cron/trend-hunter/route.ts` **não caça tendência nenhuma**:

- Os temas são um **array fixo no código** (linhas 25-29): NRL Grand Final, Aussie Housing
  Crisis, Brisbane Coffee Price. Três, sempre os mesmos.
- As fontes são comentários `TODO`: "Implement Google Trends RSS fetch", "Implement YouTube
  API search", "Implement TikTok Hashtag scrape". Nada implementado.
- O **"Viral Potential Score" é inventado** — `signal: 85 / 70 / 92` digitados à mão. A linha
  diz "INTELLIGENCE PHASE (Gemini 2.5 Flash)" e o código logo abaixo admite: `// Mock
  processing block`.
- URLs são `https://example.com/...`; o `supabase.from('trends').insert(...)` está comentado.
- **E responde `success: true, hunted: 3`.**

**Não existe banco de pautas no projeto.** A regra de pauta gravada hoje no `CLAUDE.md`
pressupõe uma fonte que não existe — é o buraco que o `last30days` deveria tapar.

### Decisão do Felipe: contagem de cenas é LIVRE

7, 8, 9 ou 10 não importa — o critério é **segurar o espectador** e ficar nas boas práticas de
vídeo viral. Consequências já aplicadas:

- Prompt trocou `exactly 8 scenes` por faixa livre (típico 7-10) + alvo de 35-75s.
- **`RUNTIME_GATE` novo**: rejeita acima de **90s** somando `durationEst`. A trava passou a ser
  duração, não contagem. Os 8 roteiros medidos ficaram entre 42s e 58s.
- O 4/4 estrito caiu por consequência. O `BALANCE_GATE` (mínimo 3 por personagem) continua —
  garante que o Kev não vire figurante (incidente 5x1 de 19/07).
- **Nada a jusante quebra com contagem variável** — verificado. Os índices fixos
  (`index === 7 → GOPRO_FISHEYE`) vivem no gerador de template offline do `script-engine.ts`,
  que não toca a saída da IA.
- **Custo:** cada cena é um clipe no Kling. 10 cenas ≈ 40% mais render que 7.

### 🧾 V2 DEFINIDA — CAMADA DE PROVA (recibos de jornal na tela)

**Pedido do Felipe (07/08):** durante a fala, entram na tela **prints de 5-6 veículos
conhecidos e confiáveis** cobrindo o mesmo assunto, **em ordem aleatória a cada vídeo**.
Um print é alegação; cinco veículos é consenso — o espectador não precisa confiar, ele vê.

Já estava registrado como lacuna em `docs/editing-retention-constitution.md`:
*"Captions, B-roll e publicação continuam pendentes"*. Agora tem desenho.

**MECANISMO ENCONTRADO E TESTADO — RSS de busca do Google News (grátis, sem chave):**

```
https://news.google.com/rss/search?q=<tema>&hl=en-AU&gl=AU&ceid=AU:en
```

Teste real com `brisbane coffee price`: **77 matérias, 34 veículos distintos** — SMH,
News.com.au, Nine.com.au, The Courier Mail, Time Out, BeanScene, ABC. Manchetes reais,
mesmo assunto. É exatamente o que o Felipe descreveu.

**ISSO RESOLVE DOIS PROBLEMAS COM UM MECANISMO.** A contagem de veículos **é** a detecção
de viral: 34 veículos cobrindo o tema é sinal **medido**, ao contrário do `signal: 92`
digitado à mão no `trend-hunter`. O mesmo RSS entrega a pauta validada **e** os recibos.
Confirma o instinto do Felipe: pauta vem de jornal, não de rede social.

**CORREÇÃO REGISTRADA:** eu havia recomendado ligar TikTok/Instagram/Threads via
`last30days.py setup --github`. **Não serve para isto** — aquilo traz post de rede social,
não manchete de veículo. Recomendação riscada.

**Atritos reais (medidos, não supostos):**

1. **Paywall.** SMH e Courier Mail (News Corp) são pagos — o print sairia com o muro.
   Livres e famosos, testados com HTTP: The Guardian AU (200), News.com.au (200),
   SBS (200), ABC (301→ok), Nine (301→ok), Time Out, The Conversation. **Allowlist resolve** —
   dá 6 fontes confiáveis sem tocar em paywall.
2. **Link do Google News é redirect** (`news.google.com/rss/articles/CBM...`), não a URL do
   artigo. Precisa resolver antes de printar. **Único risco técnico ainda não verificado.**
3. **Banner de cookie e detecção de bot** sujam o print. Mitigação: printar o **seletor da
   manchete**, não a página — já sai enquadrado para 9:16 e o banner fica fora.

**Desenho:**
```
tema → Google News RSS → filtra allowlist → escolhe 5-6 veículos
     → resolve redirect → print do seletor da manchete
     → embaralha ordem → overlay FFmpeg nos beats do roteiro
```
Embaralhar é uma linha: sorteia a ordem a cada vídeo, dois episódios nunca repetem sequência.

**Uso:** manchete + logo por poucos segundos, como citação em vídeo de comentário, é a
prática padrão do gênero; reproduzir a matéria inteira não é. Ninguém aqui é advogado.

### 🛠️ CONSTRUÍDO E FUNCIONANDO — `tools/capture-receipts.mjs`

```
node tools/capture-receipts.mjs "<tema>" [dias]
```

Playwright + Chromium instalados. Teste real (`"coffee price australia"`, 400d):
**5 de 6 veículos capturados** — Nine, Time Out, ABC, Guardian, 7NEWS.
Saída em `.tmp/receipts/<tema>/` + `receipts.json`.

**Decisões travadas no código, todas medidas e não supostas:**

1. **Recorte do TOPO, não do `<h1>`.** Printar só o h1 devolve **texto pelado** — sem logo,
   sem assinatura, sem data. Vira o mesmo cartão tipografado que a camada de prova existe
   para substituir. O recorte `{0,0,1000,560}` pega masthead + manchete + byline + data.
   **É a diferença entre prova e citação.**
2. **Bloqueio de anúncio na rede** (`page.route` + regex de ad hosts). Sem isso o Nine trouxe
   um banner dos Wallabies colado no logo. Anúncio no recibo confunde o que é a matéria.
3. **Data real do artigo, nunca o `pubDate` do feed.** Extraída da URL (`/2025-01-20/`) ou do
   `article:published_time`. Ver descoberta abaixo — o Google mente na data.
4. **`MIN_OUTLETS = 5`**: abaixo disso o script sai com código 2 e a mensagem "SEM PAUTA".

### ⚠️ DESCOBERTAS QUE MUDAM O DESENHO

**O `pubDate` do Google News não é confiável.** O feed datou como **março/2026** uma matéria
do ABC cuja URL é `/2025-01-20/` — **19 meses mais velha**. Montar recibo pelo `pubDate`
colocaria manchete de um ano e meio atrás na tela como se fosse notícia de hoje.
**Isso é pior que não ter prova.** Por isso a data sai do artigo, não do feed.

**"Várias fontes" e "notícia atual" estão em conflito direto:**

| Busca | Itens | Veículos |
|---|---|---|
| `brisbane coffee price` (sem filtro) | 77 | **34** |
| `brisbane coffee price when:7d` | **1** | **1** |

Os 34 veículos existem porque a busca varreu mais de um ano. **Isso vira a regra de admissão
de pauta, e é o sinal de viral MEDIDO** que substitui o `signal: 92` inventado:

> Se ≥5 veículos confiáveis cobriram o mesmo assunto nos últimos 7 dias, o assunto está
> quente e sustenta camada de prova. Se é preciso voltar 18 meses para achar 5, é tema
> perene, não notícia.

**O café de Brisbane REPROVA nesse critério.** Os 3 temas hardcoded provavelmente reprovam
todos.

### Falhas conhecidas da ferramenta (não resolvidas)

- **News.com.au falha** (`h1` timeout 15s) — provável detecção de bot. 5/6 é o número real.
- **Relevância não é verificada.** O RSS devolve matéria vagamente relacionada: o 7NEWS
  capturado é *"Best coffee subscription service: take 20 per cent off"* (conteúdo de
  afiliado) e o Guardian é um teste às cegas de café moído. **Nenhum dos dois corrobora
  "café está caro".** Recibo que não sustenta a fala é enfeite, não prova — falta um filtro
  de relevância entre a busca e a captura.
- **Espaço vazio do anúncio** fica no recorte depois do bloqueio (placeholder "Advertisement").
- **Nenhuma URL pode ser transcrita à mão.** Copiei um ID do Google News manualmente, troquei
  um caractere e recebi "invalid web address". Tudo por script.

**NÃO CONSTRUIR PROVA PARA PAUTA FALSA.** Os 3 temas do `trend-hunter` têm URL
`https://example.com/...`. Overlay de "prova" sobre notícia inexistente é fabricar
evidência — custo é a credibilidade do canal inteiro. A ordem é: pauta real → print → overlay.

### Pendências / próximos passos

- **A trava que mais importa para retenção não existe:** nada verifica se a última cena
  **paga** o que a primeira plantou. No A/B isso separou bom de fraco — o NRL do Sonnet abriu
  com "os refs roubaram a final" e fechou com "...wait, he said WHAT?", sem pagar nada. Exige
  julgar sentido, não contar campo: ou uma segunda chamada barata ao modelo, ou olho humano
  antes de renderizar.
- **PRÓXIMO PASSO ÓBVIO: escolher 1 dos 8 roteiros e renderizar.** O gargalo nunca foi
  escrever — está provado. Candidatos que fecham loop e cabem em qualquer plataforma:
  Brisbane Coffee (Opus, 53s) e NRL (Opus, 54s). Render 9:16 custa US$3-6; há US$17 no
  Replicate.
- **As outras rotas Gemini seguem no Gemini e seguem mortas**: `brainstorm`, `interview`,
  `mitigation`, `compliance`, `trend-hunter`, `image`, `cover-prompt`. Migrar é decisão do
  Felipe — não foi pedido nesta sessão.
- Continua valendo tudo da sessão 06/08 abaixo: **zero episódios publicados** é a pendência
  real.

---

## 🚀 SESSÃO 06/08/2026 — DUAS TRAVAS CAÍRAM; A ÚNICA PENDÊNCIA REAL É PUBLICAR

**Resumo em uma linha:** o projeto não tem problema técnico de bloqueio — tem **zero episódios
publicados**. Crédito e lipsync saíram do caminho nesta sessão; sobrou o P0a e a falta de
distribuição.

### Atualizações desta sessão

1. **P0b morreu** — Felipe tem **US$17** no Replicate. O handoff dizia "< US$5" desde 24/07 e eu
   repeti isso como fato atual. Era registro datado, não medição. Corrigido em 3 pontos do arquivo.
2. **P0 decidido** — lipsync: **opção 1, aceitar sem** (ver §P0). Decisão fundamentada em frames,
   custo US$0. P0d fechado junto.
3. **Nenhuma chamada paga** foi feita nesta sessão. Nenhum código de engine tocado.

### 🔎 Descobertas desta sessão (o que não estava escrito em lugar nenhum)

1. **A API do Replicate NÃO expõe saldo.** `GET /v1/account` devolve só identidade
   (`{type,username,name,avatar_url,github_url}`) — verificado 06/08, HTTP 200, sem campo de
   crédito. Saldo só no dashboard ou perguntando ao Felipe. **Nunca inferir crédito de documento.**
2. **O episódio original NUNCA teve lipsync.** `oatmilk.mp4` (drive T5 EVO, 3840×2160, 29.8s) —
   a régua de qualidade do Felipe — amostrado inteiro a 1fps: boca praticamente fechada o tempo
   todo, personagens quase estáticos. Nossos clipes crus do Kling **articulam mais** que a régua.
   Isso mata o P0 por evidência, não por opinião.
3. **Não existe rota de publicação.** `src/app/api/` = `ai, cron, episodes, keys, pipeline, radar,
   render, sentinel, trends, video`. Zero TikTok/YouTube/Instagram. Publicar hoje = **upload manual**.
4. **`getDetailedPrompt` (alvo do P3) só existe em `page_legacy_2024.tsx_backup`** — não está no
   código vivo. O P3 como escrito aponta para função morta; precisa ser reancorado antes de valer.
5. **Contradição do próprio handoff:** P0a estava 🔴 numa seção e ✅ em outra. Código confere
   (`4c0fde8`, `aspect` presente em `pipeline/run`, `render`, `video/generate`, `page.tsx`) — está
   **implementado e nunca validado com render pago**. Não é "não feito".

### 🔴 PENDÊNCIAS NOVAS — caminho até vídeo no ar (recomendação 06/08)

**Premissa honesta gravada:** "perfeitamente viral" não é parâmetro ajustável. Viralização é
resultado lido *depois* de publicar, não configuração aplicada antes. A engine hoje está calibrada
contra **zero pontos de dados reais** — todo refinamento adicional é validado contra intuição, não
contra retenção de audiência.

| # | Pendência | Custo | Quem |
|---|---|---|---|
| ~~V0~~ | ✅ **Billing do Google Cloud regularizado em 06/08** — sentinelas GREEN nas duas pontas. Ver §P0f. | — | feito |
| **V1** | **Render de validação, 9:16, 1 episódio.** 9:16 porque é onde o conteúdo vive (TikTok/Reels/Shorts). Valida P0a + encadeamento + wardrobe + camada de áudio de uma vez. **DESTRAVADO.** Autorizado pelo Felipe em 06/08; dispara pela UI local (o gate de aprovação é humano por design, e a produção não tem o fix da âncora do Boomer). | ~US$3–6 | Felipe dispara na UI |
| **V2** | **Felipe assiste e julga se é engraçado.** Limite real: Claude avalia enquadramento, LUFS, continuidade — **não avalia timing cômico**. Se não fizer rir, nenhuma métrica salva. | US$0 | Só Felipe |
| **V3** | **Confirmar se as contas sociais existem** (TikTok/YouTube/Instagram do Down Under Discourse). Se não existirem, isso bloqueia "hoje" e vem ANTES do render. | US$0 | Só Felipe |
| **V4** | **Upload manual dos primeiros ~10 episódios.** Não construir pipeline de publicação ainda. | US$0 | Felipe |
| **V5** | **Cadência > perfeição.** 10 episódios medianos em 2 semanas ensinam e performam mais que 1 perfeito em 2 meses. Custo marginal por episódio já é só US$3–6 + minutos. | — | Política |

### ⛔ O que foi DESRECOMENDADO de propósito (não fazer agora)

1. **Pipeline de publicação automática** — YAGNI. Automatizar distribuição de zero conteúdo é o
   VLAEG ao contrário: automatiza-se o determinístico *depois* de saber que o processo funciona.
   E com o histórico de gasto autônomo de 20/07, é a última coisa que deveria rodar sozinha.
2. **Reativar o n8n** — só depois do gate Telegram PRÉ-render.
3. **P3 (exploits neurológicos nos prompts)** — aplicar teoria de retenção antes de ter **um único
   dado de retenção** é otimizar no vácuo. Vale depois dos primeiros episódios, com números reais.
   (E o alvo está morto — ver Descoberta 4.)
4. **Deploy dos 33 commits** — não bloqueia publicar. Pode esperar.

### ✅ EXECUTADO 06/08 — P0a verificado visualmente pela 1ª vez (US$0) e um buraco fechado

A correção do formato (`4c0fde8`) nunca tinha sido **olhada**, só codada. Renderizei os recortes
reais das 3 âncoras com o filtro de produção (`anchorCropFilter`) e inspecionei:

| Âncora | 9:16 | Veredito |
|---|---|---|
| `master_kev.png` (focus 0.687) | rosto inteiro, centrado, orelhas encostando na borda | ✅ passa |
| `master_boomer.png` (era default **0.5**) | luva esquerda FORA do quadro, terço direito = TV vazia | ❌ **era bug** |
| `master_wide.png` | **decapita os dois** — sobra ombro do Boomer e pata do Kev, meio é TV/mesa | ✅ nunca usado em 9:16 (guarda confirmada) |

- **Buraco fechado:** `characters.ts` → Boomer ganhou `anchorFocusX: 0.44`. Em 30/07 só o Kev foi
  corrigido porque o desvio dele era gritante; o do Boomer é menor e passou batido. Testados
  0.40 (corta a luva direita) e 0.44 (cabeça centrada, as duas luvas inteiras) → **0.44**.
- **Guarda do two-shot CONFIRMADA no código:** `pipeline/run/route.ts:501` só usa `master_wide`
  quando `aspect === '16:9'`; `SOLO_SHOTS_IN_VERTICAL` (linha 200) converte WIDE/OTS/GOPRO em
  enquadramento solo no vertical. O two-shot nunca chega ao 9:16.
- **Regressão protegida:** novo teste em `tests/prompt-aspect.test.ts` exige que **todo** personagem
  declare `anchorFocusX` — cair no centro é o bug, não o padrão seguro (nenhuma âncora tem o
  sujeito centrado). Teste **provado**: removendo o campo do Boomer ele falha com
  `boomer: sem anchorFocusX, cai no centro e deceps`. Suíte 60 → **61**, typecheck limpo.
- **O que isso significa pro V1:** o render pago deixou de ser o primeiro lugar onde o
  enquadramento seria testado. Um defeito que custaria US$3–6 pra descobrir foi achado a US$0.
- **Limite honesto:** validei o recorte da ÂNCORA. O que o Kling faz com ela a partir daí só o
  render real mostra.

### ✅ P0f — GEMINI NEGADO POR COBRANÇA (achado E RESOLVIDO em 06/08, mesma sessão)

**RESOLVIDO:** Felipe regularizou o faturamento no console do Google Cloud. Verificado logo depois:
`GET /v1beta/models` → **HTTP 200**, `gemini-2.5-flash` acessível. Sentinelas **GREEN nas duas
pontas** (local e produção), e a sonda do roteirista valida conteúdo, não só status:
`8 cenas, topico referenciado, balanco boomer/kev 4/4`. **V1 destravado.**
Tempo entre a descoberta e o conserto: minutos. Histórico do incidente abaixo.



**Sintoma:** clicar em START PRODUCTION no Studio devolve `NEURAL_LINK_SEVERED`. No servidor:

```
BRAINSTORM_API_FAIL: Error: Lightning dunning decision is deny
for project: projects/271640987369
   at POST (src/app/api/ai/brainstorm/route.ts:88)
POST /api/ai/brainstorm 500
```

- **Causa: NÃO é bug do Studio.** "Dunning" é cobrança de dívida — o projeto Google Cloud
  `271640987369` está com **faturamento suspenso/inadimplente** e a API do Gemini responde DENY.
- **Impacto: bloqueia tudo.** Brainstorm e roteiro morrem juntos; sem roteiro não há 8 cenas, logo
  não há o que renderizar. **A trava do V1 nunca foi o Replicate** (esse está com US$17 e a sonda
  do Kling está GREEN).
- **Atinge local E produção.** Sentinela local: `RED`. Sentinela de produção verificada em
  06/08 00:18 UTC: `RED` em `gemini_roteirista` (HTTP 500); as outras 3 (ElevenLabs, Kling,
  Supabase) seguem GREEN. Ou seja: só o roteirista caiu, e caiu **dentro das últimas ~11h** —
  o hook de abertura desta sessão ainda reportava as 4 sondas verdes.
- **A sentinela FUNCIONOU.** Não foi deriva silenciosa: a sonda `gemini_roteirista` existe desde
  19/07 exatamente para isso e pegou. O que faltou foi alguém olhar o RED entre a quebra e agora.
- **🔴 AÇÃO — só o Felipe resolve:** regularizar o faturamento do projeto Google Cloud
  `271640987369` (console.cloud.google.com → Billing). Nenhuma mudança de código conserta isso;
  trocar de key só resolve se a key nova estiver em OUTRO projeto com billing em dia.

### ✅ Teste de estresse E2E via browser (06/08) — o que passou e o que não

Percorrido o Studio real no navegador, do login ao gate pago. **Nenhuma chamada paga disparada.**

| Etapa | Resultado |
|---|---|
| Basic Auth + carga da home | ✅ |
| Navegação entre as 7 abas | ✅ |
| Aba COMMERCIAL (nova) | ⚠️ passou depois de corrigida — ver abaixo |
| Botão START PRODUCTION com campo vazio | ✅ corretamente **desabilitado** (não era no-op silencioso) |
| Medidor SIGNAL ao digitar o tema | ✅ |
| Brainstorm / geração de roteiro | 🚨 **HTTP 500 — Gemini negado (§P0f)** |
| Render pago | ⛔ inalcançável: sem roteiro não há cenas |

**Defeito achado e corrigido na galeria:** o preview usava o aspect NATIVO de cada asset, então o
card 9:16 virava uma coluna gigante e o grid saía desalinhado; e `object-cover` **cortava** a arte
— banner cortado não é o banner. Trocado por caixa de proporção fixa (4/3) + `object-contain`.
Continua sem layout shift (a caixa fixa também reserva altura). **Isto só apareceu porque a tela
foi OLHADA:** build, typecheck, 61 testes e lint estavam todos verdes com o grid quebrado.

### 🔎 Achados do E2E conduzido no navegador (06/08, 2ª passada — pós-billing)

Fluxo percorrido inteiro: tema → brainstorm → 8 seções → COMMIT TO TIMELINE → timeline com 8 blocos.
GIF da sessão: `boomer-kev-pipeline-e2e.gif`. **Nada foi gasto.**

1. **🔴 `aspect` NÃO é selecionável na UI.** `page.tsx` nunca envia o campo em `/api/pipeline/run`
   (grep: só há `aspect-video`/`aspect-[9/16]` de CSS). O backend aceita `9:16|16:9`, mas sem
   controle na tela sempre cai no default do schema. **O requisito do Felipe de 24/07 ("formato
   deve ser SELECIONÁVEL, não hardcoded") está METADE feito** — o handoff marcava ✅ cedo demais.
   Não bloqueia hoje (o default 9:16 é o desejado), mas 16:9 é inalcançável pela UI.
2. **🔴 Rótulo perigoso: o botão diz "RENDER SCENE" (singular) e renderiza o EPISÓDIO INTEIRO.**
   `aria-label="Initiate Render Cycle"`, chama `/api/pipeline/run` com as 8 cenas — **US$6.72**
   no orçamento exibido. Um rótulo no singular num botão que gasta 8 cenas é convite a engano.
3. **🟡 Vanity metrics voltaram por outra porta.** No Drafting Mode: "92% MOMENTUM",
   "DIRECTORIAL CONFIDENCE 100%", "RETENTION GOAL 90%+", "ENGAGEMENT VELOCITY: EXTREME",
   "ALGORITHM BIAS: FAVORABLE". São números inventados — não medem nada. Mesmo padrão da "nota
   viral" removida em 30/07 (§"O que foi DESCARTADO do vídeo, de propósito").
4. **🟡 Brainstorm leva ~28s** com esqueleto e sem indicador de progresso — parece travado.
5. **✅ O gate de aprovação usa `window.confirm()`** (`page.tsx:885`). Diálogo NATIVO bloqueia
   automação de navegador: **um agente não consegue atravessar a fronteira paga sozinho.** Isso é
   o gate funcionando como projetado depois do incidente de 20/07 — o clique que gasta é humano
   por construção. Registrado como propriedade desejada, não como limitação.
6. **✅ Qualidade do roteiro gerado (tema: regra sagrada da fila da padaria em Bondi):** on-topic e
   em personagem. Hook = *"Mate, you just don't cut in front of someone eyeing off the sourdough!
   That's a sacred rule at the Bondi bakery, fair dinkum!"*; sponsor falso = "Line Dominator 3000";
   Kev cético no lugar certo. 8 blocos, 0:48.

### 🧪 TESTE DE ESTRESSE DE USUÁRIO — varredura de TODAS as funcionalidades (06/08, via browser)

Percorridas as 7 abas e os controles principais. **Nenhuma chamada paga disparada.**

#### ✅ Funciona como deveria
- **DIRECTOR:** botão desabilitado com campo vazio; medidor SIGNAL; brainstorm gera 8 seções
  coerentes e no tema.
- **PRODUCTION:** timeline com 8 blocos; combos de enquadramento, personagem, ação, movimento de
  câmera e dinâmica de storyboard; orçamento ao vivo (US$6.72).
- **DOWNLOAD FULL SCRIPT (PDF):** exporta de verdade (`BK-MANIFEST-*.pdf`, 41KB).
- **E-KONTE:** layout de storyboard japonês com CUT/PICTURE/ACTION/AUDIO/TIME e durações por cena.
- **LIBRARY:** lista do Supabase, busca filtra corretamente, thumbnails e download.
- **ENGINE DNA:** specs dos personagens e link do repositório.
- **RADAR:** benchmarks com filtro por categoria.
- **COMMERCIAL:** ok após a correção de grid desta sessão.
- **Compliance Scanner:** roda de verdade e devolve análise substantiva (direito de imagem US/BR
  citando Código Civil art. 20, marca d'água do EU AI Act, recomendações).

#### 🚨 STUDIO LABS É INTEIRAMENTE SIMULADO — capacidade fabricada apresentada como real
`LabsPanel.tsx` — os próprios comentários dizem `// Simulated WebGPU Compilation` e
`// Simulated Autonomous Agent logs`:
- **"Compilação WebGPU"** finge carregar pesos do Llama-3-2-3B, compilar shaders e alocar VRAM.
  São `setTimeout` com texto. O header ainda exibe `RENDER: WEBGL_ACTIVE`.
- **"Diálogo local"** sorteia uma de **3 frases hardcoded** (linhas ~197-203).
- **"Orquestrador de agentes autônomos"** imprime logs falsos de caçador/roteirista/jurídico e
  termina com **`[Orquestrador] Enviando storyboard compilado para a fila de renderização no
  Replicate (Kling v2.6)`** — afirma ter enfileirado um render que **não existe**. Confirmado no
  navegador: zero requisições de rede.
- **Por que é grave:** viola a regra de honestidade do projeto (mesma família da "nota viral" e da
  rota `/admin` falsa, removidas em 30/07). Pior: um log que afirma ter enfileirado render no
  Replicate é desinformação perigosa num projeto que **já teve incidente de gasto autônomo**.
- **Decisão pendente do Felipe:** remover a aba, ou rotulá-la explicitamente como DEMO/MOCKUP na
  própria UI. Não corrigido nesta sessão — é escopo de produto, não bug.

#### 🔴 Outros defeitos encontrados
1. **Storyboard usa fotos de banco de imagem quebradas.** `GUIDE_IMAGES` (`characters.ts:167`)
   aponta para **Unsplash** — fotos genéricas que não têm nada a ver com Boomer & Kev, e que no
   teste apareceram **quebradas** (ícone de imagem falha no E-KONTE). O projeto tem as âncoras
   reais (`master_boomer/kev/wide.png`) que deveriam estar ali. Resto de scaffold.
2. **Modal do Compliance estoura horizontalmente.** Título vira "RIO / IANCE / ER" e o
   **nível de risco fica cortado** — uma ferramenta de compliance cujo veredito não se lê. O botão
   `RUN SCANNER` também nasce fora do campo de visão.
3. **Log de cada tecla digitada.** `DirectorTerminal.tsx:191` faz `console.log` a cada caractere
   ("Stream detected: B / Bo / Boo..."). 121 mensagens no console numa sessão curta; o texto do
   usuário vai inteiro para o console.
4. **Brainstorm leva ~28s** sem indicador de progresso (só esqueleto) — parece travado.
5. **Dois controles de câmera com o mesmo propósito** na mesma cena: "MOVIMENTO DE CÂMERA (PRESET)"
   e "DINÂMICA DE CÂMERA (STORYBOARD)", com opções equivalentes. Não verificado qual prevalece.

#### ⛔ Não testado, de propósito
Os 3 caminhos guardados por `window.confirm` nativo — render pago (`page.tsx:885`), síntese de
imagem paga (`DNAPanel.tsx:67`) e deletar episódio (`LibraryViewer.tsx:51`). Diálogo nativo
bloqueia automação; e os dois primeiros gastam. **Isso é o gate funcionando.**

### 🔴 Consequência de código pendente de permissão

`pipeline/run/route.ts:576-598` ainda dispara wav2lip nas 8 cenas de todo episódio — 8 predictions
pagas que **falham sempre** (queimam compute + latência de polling) antes de cair no fallback que
agora é o comportamento oficial. Remover é diff pequeno (apagar o `try/catch`, usar `klingVideoUrl`
direto). **Não aplicado:** regra inviolável #1 exige permissão explícita para tocar no core.

---

## ⚖️ DECISÃO ARQUITETURAL 05/08/2026 — NÃO reescrever o pipeline em n8n

Felipe perguntou se seria mais prudente escrever o projeto inteiro como pipeline n8n para ter
"fluxos robustos de execução". **Decisão: NÃO. Manter a divisão A.N.T. atual.** Registrado aqui
porque decisão de *não fazer* precisa ficar gravada — senão a pergunta volta em dois meses.

### O fato que decide (achado no código, 05/08)

`pipeline/run/route.ts:551` — `for (const scene of scenesToProcess)`. As cenas são **encadeadas**:
a cena N usa o último frame da cena N−1 como `start_image` (WP 1.6). É **dependência de dados
estrita**, não dívida técnica. Paralelizar quebra a continuidade visual.

→ O principal ganho de um orquestrador de fluxo (fan-out paralelo) **não tem onde ser aplicado**.
O pipeline é uma corrente de 8 elos, não um grafo.

### O teste aplicado: das 6 falhas reais documentadas, quantas o n8n teria evitado?

| Falha | n8n evitaria? |
|---|---|
| Sujeitos decepados (âncora 16:9) | ❌ é prompt/âncora |
| Lipsync: wav2lip não detecta rosto animal | ❌ é incompatibilidade de modelo |
| 429 do Replicate (job `b66b3c3b`) | ❌ já corrigido em código |
| `.env` apagado no deploy | ❌ é o rsync do `deploy_studio.sh` |
| Sentinela tomando 401 | ❌ é auth |
| **Render não-autorizado (20/07 e 22/07, US$3–6)** | ❌ **o n8n CAUSOU** |

**Zero de seis.** A mais cara foi causada pela camada n8n rodando com autonomia.

### O que se perderia

- **60 testes unitários + `tsc`**. `editing-policy.ts` é função pura, testável em ms e a $0. Em
  nodes n8n vira JSON de workflow: fora do `npm run test:unit`, fora do CI, **só validável
  executando — e executar custa dólar**. Pior trade possível para um projeto travado em crédito.
- **Visão white-label** ([[white-label-vision]]): um codebase parametrizado escala pra N marcas;
  workflow visual vira N workflows pra manter.

### O que fica valendo (já é o invariante A.N.T. deste arquivo)

```
Camada 2 (n8n) — gatilho, roteamento, APROVAÇÃO HUMANA
Camada 3 (API routes + tools/) — motor determinístico e testável
```

### O que realmente falta de robustez — é código, não orquestrador

1. **🔴 Checkpoint / retomada da cadeia.** Hoje, cena 6 de 8 falhando em produção → `throw`
   derruba o job e as cenas 1–5 **já pagas** vão pro lixo; repaga tudo do zero. Os clipes já
   existem em `.tmp/sync_<jobId>_<sceneId>.mp4`; falta persistir estado do job e permitir
   "continuar da cena 6". **Este é o único buraco de robustez que custa dinheiro de verdade** — e
   não some com n8n: erro no meio da corrente exige a mesma decisão de retomada em qualquer stack.
2. **🔴 Gate de aprovação Telegram PRÉ-render** (hoje o approve é pós — foi assim que gastou
   sozinho). **Esse sim é trabalho de n8n**, pequeno e específico. Condição pra reativar o
   workflow `n6qm9qMxEFvvkU8C`.

### O que reverteria esta decisão (critério falsificável)

- jobs que atravessem **dias** com espera humana no meio (estado durável do n8n ganha do processo Node);
- alguém **não-dev** precisando editar o fluxo;
- muitos episódios concorrentes de clientes distintos, com fila e prioridade.

Nenhum é verdade hoje: **zero episódios validados** e um único usuário.

### Correção de fato

`GEMINI.md` v3.2 invariante 5 dizia "as 8 cenas já disparam em paralelo". **Estava desatualizado** —
foram paralelas, estouraram o 429, e o fix de 24/07 as tornou sequenciais. Reescrito para descrever
o encadeamento como propriedade estrutural.

---

## 🔍 SESSÃO 05/08/2026 — A LACUNA DO VERIFICADOR (só doutrina, zero código)

Felipe trouxe um vídeo sobre *graph engineering* (harness → loop → grafos). Absorvido **apenas o
que sobrevive ao cruzamento com o estado real do projeto**. Nenhum código tocado, nenhuma chamada
paga, nenhum deploy.

### A descoberta

> **A sentinela verifica se a máquina está viva. Nada verifica se o resultado presta.**

Prova, dentro do próprio projeto: **19/07 a sonda deu 4/4 GREEN** contra produção. **24/07 o render
de validação saiu com os personagens decepados e zero lipsync nas 8 cenas.** Verde de infra e
produto quebrado coexistiram — e sempre coexistiram, porque medem coisas diferentes.

O mecanismo da falha tem nome: **quem produziu, conferiu.** O pipeline validou o formato pelo
**container** (`ffprobe` disse 9:16 ✅) — o metadado que ele mesmo tinha produzido — enquanto o
conteúdo dentro do frame estava destruído. Um avaliador sem esse contexto, olhando o frame, pegaria
na primeira cena. Reforça [[analise-rigorosa]]: provar a FONTE, criticar a COMPOSIÇÃO.

### A regra que entrou na constituição (GEMINI.md v3.2)

Bloco novo **"Verificação — produtor ≠ verificador"**, cujo item central é a **fronteira paga**:

| Faixa | O que | O loop de nota pode |
|---|---|---|
| **Acima da linha ($0)** | roteiro, prompt de cena, âncora, plano editorial, prompt de capa | **iterar à vontade** — reprovar e refazer quantas vezes precisar |
| **Abaixo da linha (pago)** | Kling, Replicate, ElevenLabs | **avaliar e PARAR** — dá nota, aponta defeito, devolve pro Felipe. Nunca re-dispara |

**Por quê:** o corte ≥85 com loop automático pressupõe iteração barata. Aqui cada ciclo custa
US$3–6 (o crédito hoje é US$17 — §P0b). Loop automático sobre render pago é incinerador de
dinheiro. Vale o ≥90 do protocolo global ("quando o erro é caro") — aqui o erro é sempre caro.

### O que foi DESCARTADO do vídeo, de propósito

1. **"Nota viral"** — vanity metric inventada. Foi removida da UI em 30/07; não volta por porta
   de trás. Nota só sobre critério observável no artefato.
2. **Escalar paralelismo ("100 de uma vez")** — as 8 cenas **já** disparam em paralelo e foi isso
   que estourou o 429 do Replicate (job `b66b3c3b`). Abaixo da fronteira paga, mais concorrência
   agrava o problema que já existe. O projeto não sofre de lentidão, sofre de **zero episódios
   reais validados** — paralelizar zero validações continua dando zero.
3. **`/ultracode` como comando** — não confirmado neste setup. Adotado o conceito, não o nome.
4. **Reconstruir metodologia** — ~80% do vídeo (loop com nota 0–100, corte ≥85, subagentes em
   paralelo sem contexto compartilhado) **já está** no `CLAUDE.md` global do Felipe, táticas 1 e 3.
   Era confirmação, não novidade.

### Limite honesto — isto NÃO destrava o projeto

Um avaliador de episódio precisa de um episódio. Sobrou **uma** trava na frente crítica:
**validação paga do formato selecionável (P0a — implementado em `4c0fde8`, nunca validado com
render real)**. Crédito deixou de ser trava (§P0b, US$17 em 06/08) e lipsync foi decidido
(§P0, opção 1 em 06/08). Esta sessão impede o *próximo* 24/07; não produz o primeiro episódio bom.

### Próximo passo derivado (não construído)

**Avaliador de episódio** — agente separado, contexto zero, recebe só o MP4 + âncoras dos
personagens e responde: fidelidade Boomer/Kev, algum sujeito cortado no frame, continuidade entre
cenas, e se rufo/risada caem nos beats prometidos pelo `editing-policy.ts`. Nota, defeitos, **e
para**. Só faz sentido depois do primeiro render real.

### Prova

Nenhum teste rodado — mudança é 100% documental (`GEMINI.md`, `HANDOFF.md`). Nenhum arquivo de
código tocado.

---

## 🎬 SESSÃO 31/07/2026 — EBOOKS INTERNALIZADOS COMO CONTRATOS

Felipe aprovou a incorporação complementar dos dois materiais:

1. `Ebook - Criando Thumbnail com IA [Pack Prompts]` → embalagem/capa.
2. `Ebook - Entenda a Estrutura e Como editar Vídeos Virais` → montagem, ritmo e retenção.

O primeiro já estava materializado no gerador de capa (ver seção própria abaixo), mas ainda não
ligado à UI/pipeline e não deployado. O segundo foi incorporado agora sem copiar alegações não
referenciadas como fatos.

### O que mudou

- `docs/editing-retention-constitution.md`: fonte operacional adaptada. Gancho, open loop,
  contraste, mudança de bloco, pico e payoff são princípios; quotas rígidas de cortes/efeitos não.
- `GEMINI.md`: constituição atualizada antes do código. Deadpan do Kev passa a ser explicitamente
  um pattern interrupt; áudio segue beats narrativos.
- `src/lib/editing-policy.ts`: plano puro e determinístico que converte posição da cena,
  personagem e emoção em `beats`, transições e cues de comédia.
- `/api/ai/script`: remove linguagem pseudocientífica/rigidez de “amygdala hijack” e “tom muda
  a cada 4 segundos”; preserva gancho imediato, contraste e payoff.
- `/api/pipeline/run`: substitui percentuais fixos de 42%/72% para rufo/risada por cenas
  escolhidas pelo plano editorial. Transições usam a mesma fonte de verdade. Logs do job agora
  mostram beats, transições e cenas dos SFX.

### Limites honestos

- Nenhuma chamada Gemini/ElevenLabs/Replicate, nenhum render pago e nenhum deploy.
- Captions, B-roll e publicação continuam não construídos; o ebook não altera esse estado.
- O fallback percentual do mix permanece apenas para chamadores sem plano editorial; o pipeline
  normal fornece o plano.
- A qualidade perceptiva ainda exige o primeiro render real e comparação com `oatmilk.mp4`.

### Descobertas duráveis

1. **O segundo ebook não exigia uma nova arquitetura:** roteiro, transições e mix já existiam.
   A menor mudança causal era criar uma fonte de verdade para a intenção editorial e ligar os
   componentes existentes a ela.
2. **O mix estava semanticamente cego:** rufo e risada entravam em 42% e 72% da duração,
   independentemente do que acontecia nessas cenas. Agora seguem sponsor beat e clímax.
3. **Pattern interrupt não significa hiperatividade:** a troca Boomer→Kev, uma pausa ou o
   deadpan já quebram o padrão. Efeito visual sem função pode reduzir clareza e identidade.
4. **Estrutura é contrato; timing é hipótese:** a sequência gancho→payoff é reutilizável, mas
   números universais de segundos/cortes sem fonte devem ser validados em episódios reais.
5. **Os ebooks são complementares:** thumbnail resolve embalagem/clique; edição resolve a
   experiência depois que o espectador entra. Nenhum dos dois substitui roteiro, personagem ou
   medição real de retenção.

### Próximos passos — ordem causal

1. **Ligar o gerador de capa à UI e ao pipeline**, preenchendo `thumbnailUrl` sem ainda gerar
   texto dentro do modelo.
2. **Escolher a composição determinística do título da capa:** recompilar ffmpeg com `drawtext`
   ou aprovar uma dependência Node (`sharp`/canvas). Não escolher silenciosamente.
3. **Adicionar um manifesto de edição ao job/episódio** com beats, transições e cues efetivamente
   usados, para auditoria posterior contra retenção.
4. **Validar o montador a $0 com clipes locais**, verificando no arquivo final se rufo/risada
   coincidem com as cenas planejadas e se os overlaps de transição não deslocam os cues.
5. **Preparar o primeiro render pago de validação 9:16**, somente após crédito Replicate e
   autorização explícita do Felipe; deployar antes os fixes locais já acumulados.
6. **Comparar frame a frame e por áudio com `oatmilk.mp4`**, registrando fidelidade dos
   personagens, enquadramento, continuidade, ritmo, punchline e qualidade do mix.
7. **Só depois do primeiro episódio real:** decidir captions, B-roll e regras de publicação.
   Não construir essas camadas com base apenas no ebook.
8. **Após publicação e dados suficientes:** confrontar as heurísticas do ebook com retenção
   observada; promover para regra apenas o que os resultados sustentarem.

### Prova

`npm run test:unit`: **60/60** · `npx tsc --noEmit`: limpo · `npm run build`: compilou ·
`git diff --check`: limpo.

---

## 🌐 ESTADO ATUAL DA PRODUÇÃO

| Item | Valor |
|------|-------|
| **URL Produção** | **https://boomerandkev.fgss.io** (LIVE; 401 sem auth, 200 com auth) |
| **VPS** | Hostinger `2.25.182.106`, root SSH, Ubuntu, Nginx 1.24.0 |
| **Processo** | PM2 `boomer-engine` na porta `3001` |
| **Reverse Proxy** | Nginx → `http://127.0.0.1:3001` |
| **SSL** | Let's Encrypt, expira 17/10/2026, auto-renew |
| **Deploy** | `./deploy_studio.sh` (build → verify → rsync → PM2 → health check) |
| **GitHub** | `fbgouveia/boomer-and-kev-studio` branch `restore-engine` |
| **n8n** | `https://n8n.fgss.io` (mesmo VPS, porta 5678) |
| **Supabase** | `ktysmnltubbfbvyjphdq` (Sydney ap-southeast-2) |
| **Nameservers** | Hostinger nativos (SEM API de DNS — só via hPanel) |
| **Acesso Studio** | Basic Auth obrigatório em páginas e APIs internas; credenciais apenas no `.env.local`/VPS |

---

## 📂 MAPA DE ARQUIVOS CRÍTICOS

| Arquivo | Função |
|---------|--------|
| `GEMINI.md` | Constituição do projeto (LEI). Leia inteiro. |
| `CLAUDE.md` | Comandos rápidos e filosofia de dev |
| `AGENTS.md` | 26 agentes de produção de conteúdo |
| `COMMERCIAL_CREATIVES.md` | Constituição da linha de anúncios e conteúdo comercial |
| `HANDOFF.md` | **Este arquivo** — estado entre sessões |
| `deploy_studio.sh` | Script de deploy para Hostinger VPS |
| `src/app/page.tsx` | Frontend principal (tabs: Studio, DNA, Library, Labs, Radar) |
| `src/app/api/ai/brainstorm/route.ts` | **Cérebro** — gera roteiros de 8 cenas com compliance/IP |
| `src/app/api/pipeline/run/route.ts` | Motor de renderização (voz → vídeo → ffmpeg) |
| `src/app/api/radar/route.ts` | Receptor de webhook do n8n (benchmarks/tendências) |
| `src/app/api/sentinel/route.ts` | Pré-voo — verifica saúde antes de gastar $ |
| `src/components/studio/IntelligenceRadar.tsx` | UI do radar de benchmarks |
| `src/components/studio/DNAPanel.tsx` | Painel de DNA dos personagens |
| `src/components/studio/LibraryViewer.tsx` | Biblioteca de episódios + X-Ray modal |
| `src/components/studio/LabsPanel.tsx` | Laboratório experimental |
| `src/components/Director/DraftingTable.tsx` | Mesa de direção (roteiro → render) |
| `src/data/radar.json` | Banco de benchmarks do mercado |
| `next.config.ts` | Config Next.js (`output: 'standalone'`) |
| `.env.local` | Chaves de API (dev local) |

---

## 🎨 SESSÃO 30/07/2026 — AUDITORIA DE UI/UX + FASE 1 DA REFATORAÇÃO

**Contexto:** Felipe apontou que a interface é o que trava o lançamento — sem confiança de que
todos os botões funcionam, copy sem linguagem clara para usuário final, UX/UI ruim, e a
preocupação de fundo de exportar como white-label. Pedido: medir tudo e refatorar.

### 📊 Medição da interface (números reais, não impressão)

| Eixo | Achado medido |
|---|---|
| Tipografia | **345** ocorrências entre 5px e 11px; apenas 3 em 12px. Interface inteira abaixo do piso legível |
| Contraste | **223** violações WCAG AA sobre `#000`: `white/20` = 1.66:1, `white/30` = 2.45:1, `white/40` = 3.66:1. O laranja `#FF5F1F` passa (6.91:1) |
| Feedback | **9** `alert()` nativos como sistema de erro/sucesso |
| Botões mortos | 2 sem `onClick` (suporte + 3 canais sociais) |
| Idioma | Labels EN + erros PT no mesmo fluxo |
| Monolito | `app/page.tsx` com **2.635 linhas**, 6 abas dentro |
| Nav | Arrays duplicados mobile/desktop com **ícones divergentes** para a mesma aba |
| White-label | **265** referências hardcoded a Boomer/Kev/Aussie/Roo/Koala em `.ts`/`.tsx` |

### 🚨 Descoberta grave: métricas inventadas na UI

A barra de status exibia telemetria **hardcoded**, violando a lei de honestidade do CLAUDE.md:
`RTX-4090 // ACTIVE`, `VRAM_LOAD 14.8GB / 24GB`, `LATENCY 18ms // OPTIMAL`,
`Confidence: 98.4%`, `ENGINE_STATUS: OPTIMAL`, `RENDER_CORE: TURBOPACK`.
Não existe GPU local — o render roda no Kling/Replicate, na nuvem. Turbopack é o bundler do
Next, não motor de render. Numa demo white-label isso é um comprador técnico derrubando o
produto em 30 segundos. **Tudo removido.** Métricas reais mantidas (duração, contagem de
cenas, custo estimado, saldo ElevenLabs via `balanceData`).

A rota `/admin` inteira era falsa: cenas hardcoded, `handleDownloadAssets()` e
`handleGenerateLocalTTS()` que só chamavam `alert()` descrevendo trabalho que não acontecia,
amarelo `#DFE104` violando o design system, e texto afirmando "montagem final é 100% MANUAL no
Adobe Premiere" — contradizendo o produto. Era órfã (nada linkava). **Removida.**

### ✅ Fase 1 executada (mecânica, sem decisão de design pendente)

- Piso tipográfico de 12px (`text-xs`) + degrau de 14px (`text-sm`) — zero abaixo de 12px
- Contraste: `white/10,/20`→`/50` (5.32:1); `/30,/40`→`/60` (7.37:1) — zero reprovações
- `src/components/ui/Toast.tsx` **novo** (~70 linhas, sem dependência nova — ponytail):
  auto-dismiss 5s, `aria-live="polite"`, ícone + cor (nunca só cor), `role="alert"` em erro.
  Montado no `layout.tsx`. Substituiu os 9 `alert()`
- Mensagens de erro traduzidas para inglês com **causa + caminho de recuperação**
- `TABS` como fonte única das abas (corrige ícones divergentes mobile/desktop)
- Rótulo visível no textarea principal (antes só placeholder)
- 4 imports órfãos criados pela mudança, removidos

**Verificação real:** `tsc --noEmit` limpo · build compila · **25/25 testes** · dev server
inspecionado em 1440px e 375px, `hasHorizontalScroll: false`. Ganho lateral: sem a telemetria
falsa, as métricas reais pararam de quebrar em duas linhas.

**Limite da verificação:** só as telas que renderizam sem autenticar em serviço externo foram
navegadas. Production/Library/Engine DNA/Studio Labs/Radar receberam as mesmas mudanças
mecânicas e compilam, mas **não foram inspecionadas visualmente aba por aba**.

### 🚨 A SENTINELA ESTAVA CEGA HÁ 4 DIAS (achado e corrigido 30/07)

Execuções do workflow `CmHQvdzX5Sk23n7y`: **success** até 26/07, **error** em 27, 28 e 29/07.
Erro no nó `Rodar Sondas`: `Authorization failed — Authentication required.`

**Causa-raiz:** o deploy de segurança de 27/07 (`b58f955`) pôs Basic Auth na borda. A sonda
batia em `https://boomerandkev.fgss.io/api/sentinel` **sem credencial** → 401 diário. Nenhum
alerta disparou, porque o alerta depende justamente do nó que morreu. Quatro dias sem
vigilância de contrato. Só apareceu porque o hook de sessão reclamou de "91h sem sonda".

**Duas correções, camadas diferentes:**
1. **n8n:** credencial `httpBasicAuth` criada (`Z9MEMLwSrFzbK6oe`, restrita ao domínio
   `boomerandkev.fgss.io`) e ligada ao nó `Rodar Sondas`. Backup do workflow anterior tirado
   antes do PUT.
2. **Código (`d9d83ab`):** o probe `gemini_roteirista` faz self-call
   `fetch(${SELF}/api/ai/script)` e também tomava 401. Adicionado `selfAuthHeader()` lendo
   `STUDIO_AUTH_USER/PASSWORD` (ambas já presentes no `.env` da VPS). O assert ganhou dica
   explícita no 401 p/ não re-diagnosticar isso.

**O produto NÃO estava afetado** — o único self-call do código é o da própria sonda.

### 🔥 BUG DE DEPLOY QUE APAGAVA O .ENV DE PRODUÇÃO (achado e corrigido 30/07)

O primeiro deploy dos 33 commits **falhou e reverteu sozinho**. Diagnóstico medido:

- o standalone do Next não contém `.env`
- `rsync -avz --delete .next/standalone/ → DEST_DIR/` portanto **apaga o `.env` remoto**
- o script antigo compensava reenviando `.env.local` incondicionalmente
- `38ec9bd` tornou o envio condicional a `DEPLOY_ENV_FILE`, **mas manteve o `--delete`**
- com `DEPLOY_ENV_FILE` vazio (o padrão): env apagado, nada enviado, app sobe sem variável
  nenhuma → health check vermelho → rollback

A mensagem `🔐 Ambiente remoto preservado` afirmava o oposto do que acontecia. O rollback de
`c83877c` funcionou exatamente como projetado e é o único motivo do site ter continuado no ar.

**Fix (`d8d8b61`):** `--exclude='.env'` no rsync do standalone + regressão em
`tools/test-deploy-script.mjs`, verificada nas duas direções (falha sem o fix, passa com ele).
O contrato anterior dizia "env seguro" e não pegava isto.

### ✅ DEPLOY CONCLUÍDO — produção agora em `d8d8b61`

Segundo deploy passou no health check na tentativa 1. Produção saiu de `21f09ae` e recebeu
**33 commits** de uma vez: toda a linha de robustez represada desde 27/07 + a Fase 1 de UI.

**Sentinela pós-deploy: GREEN nas 4 sondas** (primeira vez desde 26/07):
- `gemini_roteirista` — 8 cenas, tópico referenciado, balanço boomer/kev 5/3
- `elevenlabs_voz` — 18.4KB de áudio
- `replicate_kling` — kwaivgi/kling-v2.6 acessível, versão b13f36d03049
- `supabase_sydney` — escrita OK, RLS bloqueia anon

Verificado também: `401` sem credencial e `200` com credencial na borda pública; interface nova
confirmada visualmente em produção.

⚠️ **`Boomer & Kev Production Orchestrator` (`n6qm9qMxEFvvkU8C`) segue INATIVO** — confirmado
via API antes do deploy. Por isso o contrato novo das APIs pagas (Idempotency-Key + aprovação)
não quebrou chamador nenhum. **Antes de reativar:** adaptar o chamador n8n para enviar
`Idempotency-Key` + aprovação `n8n_manual` só depois do gate humano no Telegram.

### 🔴 Pendências desta frente

1. **Fase 2 (white-label de verdade):** hex cru → tokens semânticos + migrar os 265 hardcodes
   para consumir `src/data/characters.ts`. A fundação existe: o tipo `Character` já é bem
   modelado (voz, motion, wardrobe, âncora). É migração, não arquitetura nova. Ver [[white-label-vision]].
2. **Fase 3 (copy/IA):** renomear abas para linguagem de usuário — `ENGINE DNA` não diz a um
   comprador que é ali que se configuram os personagens. Idioma definido: **inglês só**.
3. **Fase 4:** quebrar o monolito de 2.635 linhas. Refactor puro, não muda nada para o usuário.
4. **Felipe deve fornecer:** URLs reais dos canais (Discord/YouTube/Instagram) e um contato de
   suporte, para os botões removidos voltarem funcionando.
5. **Passada visual aba por aba** nas 5 abas não inspecionadas.
6. **Deployar `672939d`** (fixes de fidelidade de personagem) — de propósito segurado para subir
   junto com o render de validação.
7. **Unificar `getDetailedPrompt`** (duplicado em `page.tsx`, só p/ PDF, sem os fixes de 30/07).
8. **Segredo dedicado para a sonda:** hoje a sentinela usa a Basic Auth humana do studio. O
   padrão mais limpo — já adotado por Radar e trend cron — é um Bearer próprio que falha fechado.
9. **Dead-man's switch:** o buraco de 27–29/07 não foi a sonda falhar, foi ninguém saber por 4
   dias, porque o alerta dependia do nó morto. Falta um alerta que dispare na AUSÊNCIA de sonda.
10. **Pré-voo obrigatório:** com a sentinela verde, torná-la gate antes de qualquer render pago —
    era exatamente para isso que ela foi criada (`deriva.yml`: `frequencia_sentinela: diaria + pre-voo`).
11. **Marca em SVG:** a do header é raster. Felipe decide entre vetorizar no Illustrator e passar
    o arquivo, ou autorizar redesenho do símbolo. Sem isso, a cor da marca não vira token na Fase 2.
12. **Deployar `c68569e`** (marca) — pode ir junto com `672939d` no próximo deploy.
13. **Marca ainda é hardcoded no JSX** (`<img src="/assets/branding/...">`). Em white-label, logo
    fixo no componente é o mesmo problema dos 265 hardcodes de personagem: precisa entrar na
    camada de dados junto com a Fase 2, não virar mais um caminho fixo.
14. **Camada de texto da capa** (passo 6 do workflow do ebook): o título sobre a imagem. **Decisão
    pendente do Felipe** — o ffmpeg desta máquina **não tem o filtro `drawtext`** (descoberto em
    30/07 tentando rotular testes). Ou recompila com libfreetype, ou faz por `sharp`/canvas em
    Node, que seria **dependência nova**. Sem isso a capa sai sem título.
15. **Ligar o gerador de capa na UI e no pipeline.** Ele está pronto e testado, mas ninguém o
    chama. De propósito: plugar junto com o render de validação, para o episódio sair com vídeo
    e capa no mesmo ciclo. Custo marginal baixo (Nano Banana é barato perto do Kling).
16. **Deployar `3eaefff` + `36be9e8`** junto com `672939d` e `c68569e` no próximo deploy.

### 🚦 O QUE REALMENTE TRAVA O LANÇAMENTO

Registrado explícito para não se perder entre as tarefas técnicas: **a engine nunca produziu um
episódio validado.** Pastas `Kling_Renders/`, `TikTok_Renders/`, `Instagram_Renders/`, `Scripts/`
e `Storyboards/` estão VAZIAS. Zero renders de validação pagos.

Todo trabalho de código a partir daqui é polir uma máquina não provada. O portão é:
1. Felipe recarrega crédito Replicate (hoje <US$5 → throttle 6/min bloqueia render de 8 cenas)
2. Autoriza ~US$3–6 por render, 2 renders (9:16 + 16:9)
3. Deployar `672939d` junto
4. Comparar frame a frame contra o `oatmilk.mp4` original do T5 EVO
5. Decidir lipsync animal (aceitar sem sync / testar engine que aceite focinho / Kling nativo)

### 📌 Achado do pipeline registrado nesta sessão (não é UI)

Auditoria do render 9:16 a $0: repliquei `reframeAnchorToAspect()` nas três âncoras.
`master_boomer` → ótimo (personagem inteiro, centrado); `master_kev` → passa mas
descentralizado, corpo cortado na borda direita; `master_wide` → **nenhum personagem**, só
mesa e mixer. O código já protege esse caso (`route.ts` linha ~470 só usa o two-shot em 16:9).
Ver [[analise-rigorosa]] e [[formato-selecionavel]].

### ✅ FIDELIDADE DE PERSONAGEM — 2 CAUSAS CORRIGIDAS (`672939d`, ainda NÃO deployado)

O "risco não provado" acima foi confirmado lendo o código e corrigido. Eram **três** defeitos:

**1. Prompt pedia DOIS personagens com âncora de UM (causa provável do que o Felipe percebeu).**
Em 9:16 a âncora é solo, mas o prompt seguia mandando a `cinematicRule` do `SHOT_TYPES`:
`WIDE` = "shows both characters", `OTS_BOOMER` = "over Kev's shoulder at Boomer". O Kling
recebia "os dois" com referência de um só e **inventava o segundo do zero, sem âncora**.
→ `SOLO_SHOTS_IN_VERTICAL` (WIDE / OTS_BOOMER / GOPRO_FISHEYE) + regra de enquadramento solo
vertical explícita: `no second host in frame`, `never cropped at the top`.

**2. `--ar` cravado em 9:16** mesmo com 16:9 selecionado — o formato era "selecionável" e o
prompt afirmava o contrário. → `--ar ${aspect}`.

**3. Âncora do Kev mal recortada.** O recorte 16:9→9:16 era sempre centrado, mas Kev está à
direita na arte: metade do quadro virava TV/Vegemite e a orelha saía cortada. Comparados
visualmente x=472 (atual) / 650 / 730 / 810 → **730** é o único com rosto centrado e as duas
orelhas inteiras.
→ **`Character.anchorFocusX`** (0..1 normalizado, não pixels — sobrevive a troca de arte em
outra resolução e serve white-label, onde a âncora é de outro personagem). `kev: 0.687`;
Boomer fica no default `0.5`, que já estava correto.
→ `anchorCropFilter()` extraído com `clip()` que prende o recorte dentro da imagem.

**Verificação:** expressão ffmpeg == recorte manual x=729 conferido por md5 (1px do alvo, por
arredondamento); **Boomer byte-idêntico** ao anterior (sem regressão); focus 0.99 / `NaN` /
`Infinity` / negativos não estouram. Suíte 25 → **33 testes**, e confirmei que os novos
**falham sem o fix** e passam com ele (`tests/prompt-aspect.test.ts`).

⚠️ **Não deployado de propósito:** muda o comportamento do render pago. Faz mais sentido subir
junto com o render de validação, para o efeito aparecer já na primeira execução.

📌 **Divergência conhecida:** `getDetailedPrompt` está duplicado em `page.tsx`. A cópia de lá só
alimenta a exportação de PDF (quem renderiza é o pipeline) e **não recebeu estes fixes** — os
manifestos em PDF vão mostrar o prompt antigo até alguém unificar as duas.

### 🎨 MARCA — o logo nunca tinha sido colocado (`c68569e`, NÃO deployado)

**Descoberta:** não era logo errado, era ausência de logo. Os dois pontos de marca ainda
tinham placeholder do scaffold:
- header: ícone genérico `BrainCircuit` da Lucide dentro de um quadrado laranja
- favicon: o **padrão do Next.js** (círculo preto com triângulo), arquivo datado de **04/02** —
  o dia em que o projeto foi criado. Seis meses no ar assim.

O único ativo de marca do projeto era `boomer-kev-commercial-creatives-logo.png`, que traz o
lockup da sub-linha comercial (símbolo + "BOOMER & KEV" + "COMMERCIAL CREATIVES").

**Como a variante Studio foi extraída.** Uma primeira tentativa por crop levou à conclusão
FALSA de que os colchetes de moldura estavam entrelaçados com as orelhas — as coordenadas do
recorte é que estavam erradas. Rotulagem de **componentes conectados** desfez o engano: são 7
componentes, e as 4 molduras são blocos isolados nos cantos, separáveis sem tocar no canguru
(70.566 px), no coala (83.497 px) e no play (19.739 px). Molduras e textos removidos por
componente, não por crop → fidelidade preservada, não é redesenho.

**Dois assets, decisões diferentes:**
- `public/assets/branding/boomer-kev-studio-mark.png` — fundo transparente. O quadrado laranja
  do header saiu junto: a marca já carrega o laranja, o container duplicava.
- `src/app/icon.png` — fundo **preto**, não transparente: o coala é branco e sumiria numa aba
  de tema claro.
- `src/app/favicon.ico` (padrão do Next) removido — tinha precedência sobre o `icon.png`.

**Verificado:** marca renderiza a 40px no header, `<link rel="icon">` emitido para `icon.png`,
build compila, 33/33 testes. Testado a 32px: legível sem as molduras, que eram o ruído.

⚠️ **Limitação:** é **raster**. Para logo, SVG seria melhor (escala e troca de cor por token,
que a Fase 2 vai exigir). Não há vetorizador nesta máquina (sem potrace/imagemagick/inkscape) e
recortar não separa as curvas do tufo do coala com fidelidade — um SVG honesto exigiria
redesenhar o símbolo, o que muda a marca. Decisão do Felipe: vetorizar no Illustrator e passar
o arquivo, ou autorizar redesenho.

### 🖼️ GERADOR DE CAPA / THUMBNAIL (`3eaefff` + `36be9e8`, NÃO deployado, $0 gasto)

**Origem:** Felipe pediu para internalizar o ebook `Ebook - Criando Thumbnail com IA
[Pack Prompts]` (74 páginas, método "Nano Banana Pro") e propor próximos passos.

**Descoberta que mudou a conversa:** `/api/ai/image` **já roda `gemini-3-pro-image`** — o
código tem a string literal `"Nano Banana Pro model"`. O ebook foi escrito exatamente para o
modelo que a engine já tem ligado. E **não existia passo de capa**: `thumbnailUrl` estava em
`src/types/index.ts` mas nada o preenchia. O fluxo ia roteiro → voz → Kling → montagem e parava.
Sem capa não há episódio publicável.

**O que o método entrega, e o que dele NÃO se aplica.** O valor não são os 50 prompts — é a
arquitetura, que é quase idêntica à que o pipeline de vídeo já implementa (`characters.ts` ↔
`subject`, `SHOT_TYPES`/`ANGLE_SPECS` ↔ `camera`, `lightingKey` ↔ `lighting`, `negative_prompt`,
`aspect`). Não se aplica: o ebook é **YouTube-cêntrico** (CTR, clique, 16:9) e o B&K é vertical —
no TikTok/Reels não existe thumbnail nesse sentido, o vídeo já começa tocando. Vale de fato para
YouTube e para a **Commercial Creatives** (peça estática de cliente). E os 50 prompts são para
sujeitos **humanos**: copiar sem ancorar produziria outro canguru a cada capa.

⚠️ **Dois números do ebook não devem ser repetidos como fato:** "90% da decisão de clique" e
"3-5 versões = 35% mais views". Sem fonte citada. Direção plausível, precisão de marketing.

**`src/lib/cover-prompt.ts`** (puro, testável a $0):
- 7 pilares na ordem do método (tokens no início pesam mais)
- personagem SEMPRE de `characters.ts` + âncora mestre como `inlineData`
- tipos `reaction` (1 personagem) e `versus` (Boomer × Kev, formato natural de podcast de debate)
- 9:16 **empilha** o versus — split lado a lado não cabe em vertical, mesma lição do vídeo
- espaço negativo p/ o título: faixa inferior no vertical, terço esquerdo no horizontal
- negativo de texto: modelo generativo escreve letra deformada
- `buildCoverVariations()` p/ o passo "gere 4-6, escolha as 3 melhores"

**`/api/ai/image`:** `aspectRatio` ganhou `9:16` (faltava, bloqueava capa vertical) e
`anchorAsset`, enviado como `inlineData` ANTES do texto.

**🔒 Furo de segurança que eu mesmo escrevi e fechei.** `anchorAsset` vem do cliente e vira
leitura de disco no servidor. O regex inicial **aceitava** `/assets/../../etc/passwd.png` — eu
só havia barrado traversal *sem* extensão de imagem. Fechado com lookahead contra `..` + a
checagem de caminho resolvido como segunda camada. Verificado nas duas direções: sem o
lookahead o teste falha nomeando o payload aceito.

**🐛 Defeito que só apareceu imprimindo o output real.** `defaultOutfit` já começa com "Wearing"
e as descrições já terminam em ponto → o prompt saía com `Wearing Wearing large red boxing
gloves` e `friendly expression..`. Os asserts de presença passavam. **Lição:** para gerador de
prompt, imprimir a saída real é parte do teste — asserção de presença não vê repetição.

Testes: 33 → **54**. Nenhuma chamada paga feita.

### 🧹 Nota de processo: CRLF

Scripts Python de reescrita em massa converteram CRLF→LF em `characters.ts`,
`DraftingTable.tsx` e `TrendsFeed.tsx`, inflando o diff (360 linhas para uma mudança de 11).
Restaurado e conferido com `--ignore-all-space`. **Ao editar em lote neste repo, preservar o
final de linha original** — parte dos arquivos é CRLF.

---

## ▶️ RETOMADA IMEDIATA (estado autoritativo em 29/07/2026)

**HEAD de trabalho consolidado em `95d4196` (`restore-engine`). Linha de robustez até `e5f8488`; estratégia e Foundation Pack comercial até `95d4196`. Último workflow remoto `Quality` do código: run `30449855101`, aprovado em 29/07/2026. Produção permanece nos deploys `f983dd7`, `b58f955` e `21f09ae`; nenhum dos aprimoramentos posteriores foi deployado.**

**Código ainda não deployado (`38ec9bd` → `4f011f2`; 29/07):** higiene/rollback do standalone, fail-fast do deploy, idempotência do pipeline pago, CI, integridade/recuperação do job store, gate financeiro, endurecimento da borda HTTP e testes unitários do roteiro/validações. `.tmp` foi excluído do file tracing; o artefato caiu de 713 MB para 90 MB e ganhou `npm run verify:standalone`. O rsync preserva o `.tmp` runtime da VPS. Jobs terminais agora removem somente seus intermediários (`audio/kling/sync/anchor/lastframe`), preservando estado, idempotência e vídeo final; órfãos reconciliados também são limpos. Os 631 MB históricos locais não foram apagados. Antes do upload, `deploy_studio.sh` cria backup da versão+env atuais; a nova versão só é aceita após health check HTTP 200/401. Falha restaura automaticamente backup+env, reinicia e verifica a recuperação, mantendo o comando como falho para não mascarar o incidente. Env remoto é preservado por padrão e só muda com `DEPLOY_ENV_FILE=/caminho`. `POST /api/pipeline/run` exige `Idempotency-Key` e aprovação explícita com até 10 minutos: concorrência/replay com a mesma chave+payload reutiliza o job; chave igual com payload diferente retorna 409; aprovação ausente/expirada retorna 403 antes de persistência/provedores. O mesmo contrato passou a proteger `/api/render`, `/api/video/generate`, `/api/ai/sync`, `/api/ai/voice` e `/api/ai/image`; respostas concluídas são reproduzidas sem nova cobrança e estado incerto falha fechado. O fallback automático entre Higgsfield/Kling/Luma foi removido para não cobrar dois provedores após timeout ambíguo. Registros pagos ficam no máximo sete dias, com teto de mil entradas. As UIs de render e imagem pedem confirmação humana e preservam chave+aprovação em retries incertos. Toda chamada HTTP das APIs/libs passa por timeout centralizado; 429 respeita `Retry-After`, esperas longas voltam ao chamador e erros de rede mutáveis não são repetidos cegamente. Estado de jobs é gravado atomicamente (`temp → rename`), carrega identidade da instância e jobs órfãos após restart são reconciliados para `FAILED/WORKER_RESTARTED` sem retry automático. IDs de job exigem UUID; IDs de cena aceitam apenas caracteres seguros, bloqueando traversal em caminhos intermediários. O pipeline principal rejeita Higgsfield em vez de cobrar Kling silenciosamente; a opção fica desabilitada até existir worker real. O VOICE_GATE checa configuração antes de persistir, evitando episódio fantasma quando a chave ElevenLabs está ausente. O proxy limita APIs a 60 req/min por cliente, mantém no máximo 10 mil clientes em memória, inclui `Retry-After`, cobre `PATCH` no CSRF e rejeita `Origin`/`Referer` inválidos sem crash. O motor usa UUID, aceita lista vazia ao adicionar a primeira fala e evita classificar `ai` dentro de outra palavra como inteligência artificial. Schemas limitam lote/duração/personagem/enquadramento/texto/chaves antes do fan-out de render. `.github/workflows/quality.yml` executa typecheck, 24 testes unitários, contrato do deploy, build e testes standalone de tamanho, segurança e idempotência sem secrets. Actions oficiais estão na versão corrente e fixadas por SHA imutável. O lint global continua vermelho por débitos preexistentes.

**Correção do contrato de retenção:** o prazo de sete dias vale somente para registros `COMPLETED`. Reservas `RESERVED`, cujo resultado externo é incerto, nunca expiram automaticamente e permanecem bloqueando a chave até reconciliação manual. Um teste regressivo dedicado eleva a suíte a 25 testes.

**Ponto exato de retomada:** a auditoria seguinte começou pela integridade dos arquivos persistidos de idempotência, sem alteração de código. `paid-operation.ts` e o replay do pipeline fazem `JSON.parse` seguido de coerção de tipo, sem schema runtime do conteúdo lido. A próxima rodada deve adicionar validação fail-closed para registro malformado/adulterado e testes que comprovem ausência de nova reserva/chamada paga; revisar também `jobId`, `payloadHash`, `scope`, `status`, datas e resposta persistida. Não houve áudio, provider pago, limpeza histórica nem deploy.

**Estado comercial atual:** `COMMERCIAL_STRATEGY.md` define Boomer & Kev como propriedade intelectual/audiência, com três motores de receita: media/patrocínio, Commercial Creatives e produtos/licenciamento. O pacote operacional está em `commercial/foundation-pack/`: media kit PowerPoint editável de nove slides, one-page, ofertas, briefing, proposta, rate architecture interno, brand-fit score, matriz de direitos, CRM e três campanhas-conceito. O deck é `pre-launch v0`, não inventa métricas e identifica concepts como demonstrações internas.

**Ponto comercial de retomada:** antes de qualquer envio externo, confirmar email comercial, entidade legal/invoicing, papel público do Felipe, naming canônico (`Boomer & Kev` versus `Down Under Discourse`), preços e métricas verificadas. Ainda faltam reel de 30–45 s, contrato revisado juridicamente e templates de relatório de 7/30 dias. Primeiro case recomendado: `Bushproof Multi-Tool`, por permitir prova física imediata com menor risco de claims.

### ✅ Concluído e em produção

- ✅ **Studio fechado com Basic Auth** — home, admin, sentinel e APIs internas retornam 401 sem credencial; assets de campanha seguem públicos. Radar/trend cron exigem Bearer próprio e falham fechados com 503 enquanto seus segredos não forem configurados. Deploys `b58f955` + `21f09ae`, verificados em produção.
- ✅ **Commercial Creatives formalizado e publicado** — linha de produção interna (não nova subsidiária), schema de briefing, formatos, regras de claims, logo e starter kit em `public/assets/commercial-creatives/`.
- ✅ **Double-fire do brainstorm corrigido** — lock síncrono com `useRef`; deployado.
- ✅ **Mix cômico deployado** — bed, ducking, rufo, risada e `loudnorm -14 LUFS`; teste A/B salvo.
- ✅ **WP 1.6/1.7 deployados** — encadeamento de último frame e transições `xfade`; 1.7 aprovado em teste $0, 1.6 ainda exige validação real paga.
- ✅ **Formato selecionável 9:16/16:9** (`4c0fde8`) — corrige sujeitos decepados (Kling herdava aspect 16:9 da âncora; agora reframe + target por formato). Ver §P0a.
- ✅ **wav2lip 404 corrigido** (`7f6f36a`, version hash) — MAS lipsync não detecta rosto animal → sempre non-lipsynced (§P0, decisão de arquitetura pendente).
- ✅ **Throttle Kling (429) + fallback de prod** (`db5011f`) — §P0b/P0c.
- ✅ **Direção de voz por personagem + emoção** (`78ddeca`) — fim do settings hardcoded (§P0e).
- ✅ **DESCOBERTA: vibe cômica = camada de áudio** (trilha+SFX+master do Premiere), ausente no pipeline. SFX absorvidos (`1262bbf`/`38d632a`): Funny_Song+Joke_Comedy_Drums+Hilarious_Laugh. Receita do original extraída (§DESCOBERTA GRANDE).
- ✅ **n8n cron DESATIVADO** — incidente de gasto autônomo (9 renders 20+22/07). §incidente.

### 🔎 Descobertas consolidadas

1. **Segurança:** o Studio estava público e APIs de custo usavam chaves do servidor sem autenticação global. Basic Auth corrigiu a borda; CSRF/rate limit sozinhos não eram autenticação.
2. **Automação fail-closed:** Radar tinha segredo-padrão previsível e `/api/cron/agent` estava público. O padrão foi removido; Radar/trend cron agora retornam 503 sem segredo dedicado.
3. **Áudio é a maior parcela da vibe:** roteiro já tinha estrutura; o salto perceptivo vem de voz dirigida + trilha + SFX + masterização.
4. **Lipsync humano não serve para rostos animais:** Wav2Lip não detecta Boomer/Kev; é decisão de arquitetura, não retry.
5. **Commercial Creatives é capacidade do Studio:** não é nova subsidiária. Os assets são públicos intencionalmente; o painel operacional continua privado.
6. **Deploy inflado:** causa confirmada em `.tmp` (631 MB). Correção local reduz o standalone de 713 MB para 90 MB e preserva separadamente o `.tmp` runtime da VPS; ainda falta deploy.
7. **O ativo comercial é audiência + IP, não “produção com IA”:** tecnologia deve permanecer infraestrutura; o valor público acumula em Boomer & Kev.
8. **Produção e direitos não são o mesmo produto:** publicação, licença de uso, mídia paga e exclusividade precisam ser precificadas separadamente.
9. **Merch deve nascer do conteúdo:** validar bordão/objeto por waitlist e pré-venda antes de estoque.

### 🔴 Pendências reais — ordem atual

0.5 **🧪 DEFEITOS DO TESTE DE ESTRESSE (06/08)** — em ordem de gravidade:
   - **D1 🚨 STUDIO LABS simulado** — decidir: remover a aba OU rotular DEMO/MOCKUP na UI.
     Decisão de produto do Felipe; o log falso "enviando para a fila do Replicate" é o pior item.
   - **D2 🔴 `GUIDE_IMAGES` são fotos do Unsplash e estão quebradas** — trocar pelas âncoras reais
     (`master_boomer/kev/wide.png`), que já existem em `public/assets/`.
   - **D3 🔴 `aspect` não é selecionável na UI** — requisito de 24/07 está metade feito.
   - **D4 🔴 Botão "RENDER SCENE" (singular) renderiza o episódio inteiro por US$6.72** — renomear.
   - **D5 🟡 Modal de Compliance estoura horizontal** e corta o nível de risco; `RUN SCANNER`
     nasce fora da vista.
   - **D6 🟡 Vanity metrics no Drafting Mode** (92% MOMENTUM, CONFIDENCE 100%, RETENTION GOAL 90%+,
     ENGAGEMENT VELOCITY EXTREME) — números inventados, mesma família da "nota viral".
   - **D7 🟡 `console.log` de cada tecla** em `DirectorTerminal.tsx:191`.
   - **D8 🟢 Brainstorm ~28s sem indicador de progresso.**
   - **D9 🟢 Dois controles de câmera redundantes** na mesma cena — verificar qual prevalece.
0. **🚀 PUBLICAR (V1–V5, sessão 06/08 no topo deste arquivo)** — render de validação 9:16 → Felipe
   julga → contas sociais → upload manual → cadência. É a frente que importa; o resto é secundário
   enquanto o número de episódios no ar for zero.
1. **Configurar segredos da automação:** criar `N8N_RADAR_SECRET` e `CRON_SECRET` na VPS e nos chamadores; até lá Radar/trend cron ficam 503 por segurança.
2. **Felipe ouvir os A/B:** `04_Delivery/audio_ab/`, materiais de voz e `voice_clone/candidatos/cand6.mp3`.
3. **Clone do Boomer:** Instant Voice Cloning no ElevenLabs usando o sample preparado; enviar `voice_id` para atualizar `characters.ts`.
4. ~~**Galeria Commercial na UI:**~~ ✅ **FEITO 06/08** — aba `COMMERCIAL` no Studio
   (`src/components/studio/CommercialGallery.tsx`). Lê o `manifest.json` de `public/` em runtime
   (o manifest é a fonte da verdade de quem publica, então não virou import estático).
   `aspect-ratio` vindo do campo `format` reserva a altura antes da imagem carregar (sem CLS),
   `loading="lazy"`, `alt` descritivo, estados de carregando/erro/vazio, e o `disclosure`
   ("concept — demonstração interna, não trabalho de cliente") em destaque, não em rodapé.
   Tipo da aba passou a ser derivado de `TABS` — a união estava escrita à mão em 2 lugares.
   **⚠️ Não confirmado visualmente:** build, typecheck, 61 testes e lint passam, e manifest +
   3 assets + home servem 200 no dev; mas ninguém OLHOU a tela renderizada ainda.
5. **Validação paga:** 2 renders (9:16 + 16:9) para validar chaining, enquadramento, wardrobe, áudio e custo real; exige autorização explícita (~US$3–6 cada).
6. ~~**Lipsync animal:**~~ ✅ **DECIDIDO 06/08** — aceitar a articulação do Kling (opção 1). Ver §P0. Falta só a consequência de código: remover a chamada wav2lip que falha sempre (pende permissão).
7. **Higiene de deploy/F1:** alteração local já exclui `.tmp` do standalone, preserva o estado runtime e aplica PM2 `--update-env`; falta revisar/configurar PM2 startup, adaptar o chamador n8n para enviar `Idempotency-Key` + aprovação `n8n_manual` somente após o gate humano no Telegram, deployar a mudança, arquivar handoffs antigos e apenas então avaliar tools mortos sem apagá-los silenciosamente.
8. **Plano-mestre antigo:** atualizar artifact `7e32cc32-4b8b-4033-b7fb-259f7247270c` se ele continuar sendo usado.
9. **Foundation Pack — decisões do fundador:** confirmar contato comercial, entidade legal, papel público, naming, preços e categorias proibidas antes de distribuição externa.
10. **Ativos comerciais restantes:** produzir reel, obter revisão jurídica do contrato e criar relatórios 7/30 dias.
11. **Primeiro case demonstrativo:** produzir `Bushproof Multi-Tool` quando a direção autorizar a próxima fase visual; manter disclosure de marca fictícia.

## 🎧 DESCOBERTA GRANDE (24/07): a vibe cômica era PÓS-PRODUÇÃO DE ÁUDIO
Drive externo **`/Volumes/T5 EVO/BOOMER AND KEV`** = projeto ORIGINAL (10GB): áudios, arte (`_bk`, Firefly), episódios finalizados (`Videos/1.THE OAT MILK BAN/`, `2.AFL X NRL`), projeto **Adobe Premiere** + pasta **`Epidemic Sound`** (SFX/música licenciada) + `Characters/footy` (SFX de comédia).

**Medição prova:** episódio original (oatmilk.mp4) áudio = **LRA 7.8 / mean -19.8 dB / pico 0dB** (mixado, punchy); nosso gerado = **LRA 1.9 / mean -27.3 dB** (TTS cru, sem trilha). O original tinha **trilha cômica + stingers (rufo/risada) + masterização** feitos à mão no Premiere. O pipeline NÃO faz nada disso → por isso a vibe sai chapada. O fix de voz (feito) é ~20% da vibe; os ~80% são essa camada de áudio.

**Já absorvido (trio completo de SFX):** `Funny_Song.mp3` (bed 73.6s) + `Joke_Comedy_Drums.mp3` (rufo 3s) + `Hilarious_Laugh.mp3` (risada 26.8s, extraída de zip em footy) em `public/assets/audio/`. Demo audível (bed+loudnorm) em `04_Delivery/audio_ab/` — subiu mean pra -16.5dB, mas LRA ainda 2.6 (falta ducking + stingers p/ dinâmica). Toda a arte-âncora no drive é 16:9 (sem vertical) — o fix de reframe por crop já cobre isso.

### ✅ IMPLEMENTADA E DEPLOYADA — Camada de áudio cômico no pipeline
`assembleVideo` agora adiciona: (1) **music bed** sob a voz; (2) **ducking** com `sidechaincompress`; (3) rufo em 42% e risada curta em 72% do episódio; (4) masterização `loudnorm=I=-14:LRA=7:TP=-2`; saída AAC 48 kHz. Teste $0 nos quatro pilotos passou: 30.16s, vídeo+áudio; A = -18.11 LUFS/LRA 3.9, B = -14.01 LUFS/LRA 3.3/pico verdadeiro -0.76 dBTP. A/B em `04_Delivery/audio_ab/`. **Falta Felipe ouvir.**

**RECEITA EXATA do original** (extraída do `boomer and kev.prproj` do OAT MILK BAN — Premiere): bed = **Rhodes.mp3 + Percussion.mp3**; stingers = **Double Hits.mp3 + Logo 01.mp3**; transição = **Transition Complex 14.wav** (whoosh); ambiência = **Flickering Torches.mp3**; voz = **monitor.show.audio.wav**. ⚠️ Esses arquivos NÃO estão no drive (bibliotecas externas Epidemic Sound / Premiere Composer) — re-sourciar equivalentes (temos Funny_Song + Joke_Comedy_Drums absorvidos como começo). Isso é o VLAEG puro: pipeline faz sozinho o que o Premiere fazia à mão.

**CONFIRMADO:** o roteiro NÃO é o problema da vibe — o `ai/script` + `ai/brainstorm` atuais já têm Hook→Conflito→Payoff turbinado (Amygdala Hijack, Anticipation Loops, Payoff Ending). A vibe chapada é 100% ÁUDIO (voz + falta da camada trilha/SFX). Doc criativo original absorvido em `docs/from-original/` (magnetic-storytelling, masterpiece-ui, production-export).

### 🔴 PENDENTE — Clonar a voz ideal do Boomer (ElevenLabs)
cena4 (`Piloto/`) = **voz ideal do Boomer** (confirmado Felipe). Sample de clone montado: **`04_Delivery/voice_clone/boomer_CLONE_cena4+cand2+cand5.wav`** (23.6s, normalizado). Falta: (a) Felipe ouvir `candidatos/cand6.mp3` e dizer se é voz limpa (se sim, adiciono → ~34s); (b) Felipe faz Instant Voice Cloning no ElevenLabs → manda o `voice_id` → troco em `characters.ts` `boomer.voiceId` → deploy. Conta tem eleven_v3 (audio tags) p/ A/B futuro. Ver [[capacidade-audio]].

## 🔴 PENDÊNCIAS ABERTAS (por prioridade)

### 🔴 P0a — SUJEITOS DECEPADOS: Kling sai 16:9, montagem corta p/ 9:16 (achado 24/07, render 393ef799)
- **Cadeia da causa-raiz (confirmada por ffprobe):** âncoras `master_boomer/kev/wide.png` são **16:9 (1376×768)**. Kling é image-to-video → **herda o aspect da `start_image`**, ignora `aspect_ratio:"9:16"` do payload → clipes crus saem **1928×1072 (16:9)**. `assembleVideo` faz `scale ...force_original_aspect_ratio=increase, crop=1080:1920` do CENTRO → mantém só a faixa central (tela/mesa) e **deceps os personagens** nas bordas.
- **Two-shot é impossível em 9:16 lado-a-lado:** `master_wide.png` tem Boomer à esquerda e Kev à direita — crop vertical nunca segura os dois.
- **REQUISITO do Felipe (24/07):** formato deve ser **SELECIONÁVEL** (9:16 **ou** 16:9), não hardcoded. Implementar flexibilidade:
  1. Param de formato no `runPipelineSchema` (ex: `aspect: '9:16'|'16:9'`, default a definir).
  2. Kling: passar `aspect_ratio` correto E usar `start_image` no mesmo aspect (âncora vertical p/ 9:16, landscape p/ 16:9), OU padding/reframe dinâmico da âncora.
  3. `assembleVideo`: `TARGET` derivado do formato escolhido (sem crop que deceps).
  4. 9:16: shots WIDE/OTS (two-shot lado-a-lado) precisam virar solo/OTS/empilhado — não cabem.
- **Lição de processo:** validar aspecto pelo container final é insuficiente — probar a FONTE (clipes crus) e criticar a composição. Ver [[analise-rigorosa]].

### ✅ P0e — Vibe da voz chapada (CORRIGIDO 24/07) — falta A/B com áudio
- **Sintoma (Felipe, ouvindo):** personagens sem ritmo cômico/alegre — entrega morna.
- **Causa:** pipeline + `ai/voice` mandavam `voice_settings` HARDCODED e IGUAIS pros dois (stability 0.5/style 0.5), ignorando o `emotion` da cena. O contraste cômico (Boomer maníaco × Kev deadpan) era apagado.
- **Fix:** `voice` config por personagem em `characters.ts` (Boomer stability 0.30/style 0.70; Kev 0.82/0.15) + `voiceSettingsFor(char, emotion)` que modula (quentes empurram, frias achatam). Pipeline e frontend usam. Build verde, check $0 OK.
- **Próximo nível (opcional):** conta tem **eleven_v3** (audio tags `[excited]`/`[sarcastic]`/`[laughs]`) — alavanca mais forte, mas precisa A/B ouvindo p/ tunar. Eu não ouço áudio → validação é do Felipe.

### ✅ P0d — Lipsync incompatível com rosto animal — DECIDIDO 06/08 (opção 1, aceitar sem lipsync). Ver §P0.

### P1 — Automação n8n → Radar (🔴 ALTA)
- **O quê:** Workflow no n8n que a cada 3 dias busca novas ferramentas/tendências de IA para vídeo
- **Fluxo:** Schedule Trigger → Pesquisa IA → Telegram (preview + aprovação) → POST `https://boomerandkev.fgss.io/api/radar`
- **Blocker:** Precisa configurar `N8N_RADAR_SECRET` no `.env` da VPS
- **Regra:** NADA é adicionado sem aprovação explícita do Felipe via Telegram

### P2 — Validação Financeira do Ciclo de Render (🔴 ALTA)
- **O quê:** Disparar 1 episódio completo (8 cenas) para validar custo real e qualidade
- **Valida:** Atuação antropomórfica, harmonia visual, custo por episódio (Kling + Replicate)
- **Status:** ZERO renderizações de validação foram executadas até agora

### P3 — Refinamento de Prompts com Neurological Exploits (🟡 MÉDIA)
- **O quê:** Aplicar pesquisa de retenção (hooks, pacing, Straight vs Funny Man) ao `getDetailedPrompt`
- **Status:** Relatório de pesquisa já gerado por subagente, NÃO aplicado ao código ainda
- **Referência:** Subagente `77d329fd-73d6-4f28-9d4f-6f55b7278260` (pesquisa de retenção)

### P4 — Wardrobe System E2E (🟡 MÉDIA)
- **O quê:** Pipeline já passa `wardrobe` metadata frontend → backend
- **Falta:** Testar com renderização real se roupas aparecem consistentes entre cenas

### P5 — Verificar .env de Produção na VPS (🟢 BAIXA)
- **O quê:** Confirmar que API keys (Anthropic, Kling, Replicate, Supabase, ElevenLabs) estão corretas
- **Adicionar:** `N8N_RADAR_SECRET` com valor forte
- **Local:** `/var/www/boomerandkev.fgss.io/.env`

### P6 — PM2 Startup Auto-restart (🟢 BAIXA)
- **O quê:** Rodar `npx pm2 startup` na VPS para sobreviver a reboots
- **Comando:** `ssh root@2.25.182.106 "cd /var/www/boomerandkev.fgss.io && npx pm2 startup && npx pm2 save"`

### ✅ P7 — RESOLVIDO (19/07 tarde): infra duplicada Docker vs PM2
- **Problema:** dois deploys do studio rodavam ao mesmo tempo na VPS — o container Docker
  `boomer_kev` (rede `n8n_default`, código VELHO, 6 cenas, sem /api/radar) e o PM2
  `boomer-engine` (produção pública, código novo). Os workflows do n8n (produção
  `n6qm9qMxEFvvkU8C` e sentinelas `CmHQvdzX5Sk23n7y`) apontavam para o container velho —
  o pré-voo vigiava código que não era o de produção.
- **Resolução:** 6 URLs repontadas nos 2 workflows para `https://boomerandkev.fgss.io`
  (mesmo caminho de usuários reais — nginx+SSL); container removido (imagem
  `boomer-kev-studio:latest` + `/root/boomer-kev-studio` preservados p/ rollback);
  sonda verificada 4/4 GREEN contra a produção (confirma código novo: "8 cenas");
  hairpin n8n→URL pública testado OK.
- **🔴 CONFIRMADO (24/07): gasto NÃO-autorizado aconteceu.** O workflow ATIVO disparou
  renders pagos sozinho — exec #122 (20/07): episódio de 8 cenas via Kling v2.6/Replicate
  (~US$3-6); exec #135 (22/07): também disparou o pipeline (n8n errou no Telegram, mas
  disparo é assíncrono → possível 2º gasto). **Workflow DESATIVADO via API 24/07 08:56 UTC**
  (`active:False`), ~3h antes do cron das 12:00 UTC de sexta. Valor exato: dashboard Replicate.
  **Antes de reativar:** por gate de aprovação Telegram PRÉ-render (hoje o approve é pós). Ver [[incidente-render-autonomo]].

### ✅ P0b — Crédito Replicate (RESOLVIDO 06/08 — Felipe confirmou US$17)
- **Era (24/07):** render de validação (job b66b3c3b) deu 429 na 2ª cena: "rate limit reduzido a 6/min, burst 1, enquanto <US$5 de crédito". Pipeline dispara 8 em paralelo → estourava.
- **Estado atual:** Felipe confirmou **US$17 em saldo (06/08)** — acima do limiar de US$5, throttle não se aplica. Deixa de ser trava.
- ✅ FEITO 24/07: `createKlingPrediction` com retry no 429 honrando `retry_after` (deployado) — creates sequenciais pautam na cadência permitida.
- ⚠️ **A API do Replicate NÃO expõe saldo.** `GET /v1/account` retorna só identidade (verificado 06/08, HTTP 200, sem campo de crédito). Saldo só no dashboard ou perguntando ao Felipe — **nunca afirmar nível de crédito a partir deste handoff**, que é registro datado, não medição.

### ✅ P0c — Fallback de prod (CORRIGIDO 24/07, deployado)
- **Era:** ao falhar o Kling em prod, o fallback buscava piloto inexistente → "Pilot video missing" enganoso, job FAILED.
- **Fix:** os 2 fallbacks agora, sem piloto (prod), falham com mensagem acionável nomeando a causa real (crédito/rate-limit Replicate) em vez de mascarar como sandbox. Sandbox segue funcionando em dev (pilotos locais).

### ✅ P0 — LIPSYNC: DECIDIDO 06/08 — aceitar sem lipsync (opção 1), definitivo
- **404 corrigido** (era endpoint por nome; community exige `version:` hash — trocado em `pipeline/run` + `ai/sync`, deployado). MAS ao rodar de verdade apareceu a causa REAL, nas 8 cenas:
  `LipSync failed: Face not detected! Ensure the video contains a face in all the frames.`
- **Causa estrutural:** wav2lip detecta rosto HUMANO; Boomer/Kev são canguru/coala (rosto animal) → nunca detecta. **Todo episódio cai no fallback non-lipsynced** (boca vem da articulação do próprio Kling + TTS multiplexado por cima, sem sync).
- **DECISÃO (Felipe, 06/08): opção 1 — aceitar sem lipsync.** Não é concessão; é paridade com a régua, por cima. Descartadas: (2) latentsync — gasto para resolver problema que a régua prova não existir, e a detecção de focinho tem o mesmo risco (modelos treinados em rosto humano); (3) Kling nativo com fala — custaria o ElevenLabs e o clone do Boomer, ou seja, trocaria o ativo bom (voz, ~80% da vibe) pelo problema falso.
- **EVIDÊNCIA que fundamentou a decisão (US$0, 06/08 — frames, não opinião):**
  - **Clipes crus do Kling** (`.tmp/kling_97b50c39-..._scene-...-0.mp4`, contact sheet de 18 frames do focinho): a boca **abre e fecha visivelmente**, mandíbula ampla, dentes à mostra. O Kling articula — não é boca parada.
  - **Episódio original** (`/Volumes/T5 EVO/.../1.THE OAT MILK BAN/artwork/final/oatmilk.mp4`, 3840×2160, 29.8s — a régua de qualidade do Felipe): amostrado inteiro a 1fps + detalhe no focinho. Boca **praticamente fechada o tempo todo**, personagens quase estáticos. **O original NUNCA teve lipsync.**
  - **Conclusão:** nossa articulação atual é *mais* viva que a do episódio que serve de régua. O P0 era trava documental, não técnica. O que separava nosso output do original sempre foi ÁUDIO (já corrigido), nunca sincronia de boca.
- **Ressalva registrada:** foi avaliada **articulação**, não **sincronia** — o Kling abre a boca fora dos fonemas do TTS. Se incomodar em tela cheia, o ajuste é de ENQUADRAMENTO (planos fechados no ouvinte durante a fala do outro), custo US$0, sem lipsync. Quem julga é o Felipe assistindo.
- **🔴 CONSEQUÊNCIA DE CÓDIGO AINDA NÃO APLICADA:** `pipeline/run/route.ts:576-598` continua disparando wav2lip nas 8 cenas por episódio — 8 predictions pagas que **falham sempre** (queimam compute + latência de polling) antes de cair no fallback. Aceitar a opção 1 implica remover essa chamada. **Não removido:** exige permissão explícita do Felipe (regra inviolável #1 — core da engine).
- Validação prova: 1.6 encadeamento ✅, 1.7 transições ✅, throttle ✅, episódio 8 cenas ✅ (MP4 46.6MB no Supabase, job 393ef799).

---

## ⛔ REGRAS INVIOLÁVEIS (O Felipe disse, está gravado)

1. **"Nenhuma atualização no core da engine (Kling, Replicate, ou dependências) será feita ou aplicada sem a minha permissão."**

2. **"Não estarmos literalmente trazendo os personagens das outras pessoas para dentro desse projeto."** → IP compliance guardrails injetados no brainstorm system prompt.

3. **"O canguru e o coala agirem como seres humanos, porém continuando ser animais."** → Filosofia central dos personagens.

4. **Ação cara ou irreversível exige OK explícito:** render (~US$3-6), publicação, exclusão, credenciais. Reversível e barato → age; caro ou irreversível → pergunta.

---

## 🏗️ ARQUITETURA EM PRODUÇÃO

```
                    ┌─────────────────────────────────────────┐
                    │         https://boomerandkev.fgss.io     │
                    │              (Nginx + SSL)                │
                    └──────────────────┬──────────────────────┘
                                       │ reverse proxy
                                       ▼
                    ┌─────────────────────────────────────────┐
                    │    Node.js PM2 (porta 3001)              │
                    │    Next.js 16 Standalone                 │
                    ├─────────────────────────────────────────┤
                    │  FRONTEND                                │
                    │  └─ page.tsx (Studio/DNA/Library/Labs/   │
                    │     Radar tabs)                           │
                    ├─────────────────────────────────────────┤
                    │  API ROUTES                               │
                    │  ├─ /api/ai/brainstorm (Claude → 8 cenas)│
                    │  ├─ /api/pipeline/run (voz→vídeo→ffmpeg) │
                    │  ├─ /api/radar (n8n webhook receiver)    │
                    │  ├─ /api/sentinel (pré-voo de saúde)     │
                    │  ├─ /api/render (Kling video gen)        │
                    │  ├─ /api/trends (Google Trends)          │
                    │  └─ /api/keys/balance (saldo APIs)       │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────────┐
                    │                  │                      │
                    ▼                  ▼                      ▼
              ┌──────────┐    ┌──────────────┐     ┌──────────────┐
              │ Supabase │    │  Kling/       │     │  n8n          │
              │ (Sydney) │    │  Replicate    │     │  (fgss.io)   │
              └──────────┘    └──────────────┘     └──────────────┘
```

---

## 🔍 DESCOBERTAS TÉCNICAS (para não repetir erros)

| Descoberta | Contexto |
|------------|----------|
| `pm2` global NÃO funciona via SSH remoto | PATH não carrega em sessão não-interativa. Usar `npx pm2`. |
| Hostinger não tem API de DNS | Registros DNS DEVEM ser criados manualmente no hPanel. |
| `AnimatedAgentList` era import morto | Componente nunca existiu. Removido. |
| Imports duplicados de `lucide-react` | `page.tsx` tinha a mesma lib importada em 2 linhas. |
| ElevenLabs key é escopada | `/v1/user` retorna 401 mesmo com billing OK. Só TTS prova o contrato. |
| Replicate 403 = escopo, não falha | Modelo restrito, não erro de auth. |
| Áudio silencioso = deriva grave | `pipeline/run` pode gerar vídeo MUDO e reportar sucesso. |
| `.env.local` foi copiada para VPS | Verificar se precisa de ajustes para produção. |

---

## 📅 HISTÓRICO DE SESSÕES

### Sessão 2026-07-30 (v4.0 → v5.0)
**Agente:** Claude Opus 5
**Foco:** Auditoria medida da engine + auditoria de UI/UX + Fase 1 da refatoração de interface
**Entregue:** medição do pipeline (pastas de produção vazias, zero renders de validação pagos,
fix de aspecto existe mas nunca foi provado); auditoria de UI com números (345 fontes < 12px,
223 violações de contraste, 9 `alert()`, 265 hardcodes de marca); Fase 1 executada e verificada
(build + 25/25 testes + inspeção visual 1440/375px); remoção de toda métrica inventada da UI e
da rota `/admin` falsa.
**Também nesta sessão:** sentinela estava cega há 4 dias (401 desde o deploy de Basic Auth) —
corrigida no n8n e no código; bug de deploy que apagava o `.env` de produção — achado por um
deploy real que falhou e reverteu sozinho, corrigido com regressão; 3 causas de infidelidade de
personagem corrigidas (`672939d`); marca do Studio colocada no header e no favicon (`c68569e`)
— até então eram placeholders do scaffold, o favicon era o padrão do Next desde 04/02.
**Deployado em 30/07** — produção saiu de `21f09ae` para `d8d8b61` (33 commits).
Sentinela GREEN nas 4 sondas pós-deploy. `672939d` fica NÃO deployado de propósito, para subir
junto com o render de validação. Ver seção "SESSÃO 30/07/2026" acima.
**Em 31/07:** marca do Studio (`c68569e`) e gerador de capa pelo método Nano Banana Pro
(`3eaefff` + `36be9e8`), este último com $0 gasto — nenhuma chamada paga.
**Suíte de testes:** 25 → **54**.

### Sessão 2026-07-19 (v3.0 → v3.1)
**Agente:** Gemini (Antigravity CLI) + Claude Opus 4.6
**Foco:** Deploy para produção + Intelligence Radar

**Feito:**
- Criada rota `/api/radar` (POST, Bearer token auth)
- Criado `deploy_studio.sh` (build + rsync + PM2)
- Deploy completo para VPS Hostinger (2.090 arquivos)
- PM2 `boomer-engine` rodando porta 3001
- Nginx reverse proxy configurado via SSH
- SSL Let's Encrypt gerado via Certbot
- **https://boomerandkev.fgss.io** → LIVE
- Corrigidos 3 erros de build (imports mortos/duplicados)
- Atualizado `GEMINI.md` v3.0 → v3.1

**Não feito:** P1-P6 listados acima.
