# gemini.md — Constituição do Projeto
# Boomer & Kev Studio | V.L.A.E.G. Project Constitution
# Criado: 2026-03-28 | Versão: 3.2 (Infra real + doutrina Deriva + verificação independente)

> ⚖️ Este arquivo é a LEI do projeto. Atualiza-se ANTES do código.
> Hierarquia: [CLAUDE.md](file:///Users/felipegouveia/Developer/Boomer%20and%20Kev/BOOMER%20AND%20KEV/boomer-and-kev-studio/CLAUDE.md) > gemini.md > task_plan.md > findings.md > progress.md

> 🚨 **CONVENÇÃO DE HONESTIDADE (desde v3.0):** itens marcados **[REAL]** foram verificados
> ao vivo no sistema; **[ALVO]** é intenção não construída. Auditoria de 2026-07-19 mostrou que
> boa parte desta constituição descrevia um pipeline que nunca existiu (LipSync, webhooks de Edge
> Function, Realtime, Storage). **Documento não é prova de estado — reverifique no sistema vivo.**

---

## 🎬 IDENTIDADE DO PROJETO

**Nome**: Boomer & Kev Studio
**Tipo**: Pipeline Autônomo de Produção de Podcast — Tópico → Vídeo Publicado
**Podcast**: Down Under Discourse — humor australiano + trending topics
**Distribuição**: TikTok + Instagram Reels + YouTube Shorts (publicação automática)
**Problema Central**: O pipeline existe fragmentado em cliques manuais. Precisa ser determinístico e autônomo.

---

## 🏗️ STACK ARQUITETURAL

| Camada | Tecnologia | Função | Estado |
|--------|-----------|--------|--------|
| Framework | Next.js 16 App Router (`output: standalone`) | UI + API Routes | [REAL] |
| Linguagem | TypeScript strict | Toda lógica | [REAL] |
| Estilo | Tailwind CSS v4 | Design system | [REAL] |
| AI Engine | Google Gemini 2.5 Flash `v1beta` | Geração de script | [REAL] |
| Voz | ElevenLabs API (vozes de catálogo Charlie/Roger) | Síntese por personagem | [REAL] |
| Vídeo | Replicate `kwaivgi/kling-v2.6` | Render de cenas (~US$3-6/vídeo) | [REAL] |
| Montagem | ffmpeg (dentro de `/api/pipeline/run` e `tools/assemble.mjs`) | Concat 9:16 1080×1920 30fps | [REAL] |
| **Orquestração** | **n8n self-hosted em `n8n.fgss.io`** (VPS compartilhada com FGSS) | Cron, retry, pré-voo, Telegram | [REAL] |
| **Deploy** | **Next.js Standalone + PM2** em `/var/www/boomerandkev.fgss.io` porta 3001, Nginx reverse proxy + SSL Let's Encrypt | Runtime de produção | [REAL] |
| **Persistência** | **Supabase** projeto `boomer-kev-sydney` (`ktysmnltubbfbvyjphdq`, **ap-southeast-2**) | Dados | [REAL] |
| **Radar** | Rota `/api/radar` (POST, Bearer token) recebe benchmarks via n8n webhook | Intelligence feed | [REAL] |
| **Manutenção** | **Skill `deriva`** + `/api/sentinel` + `deriva.yml` | Sondas de contrato, pré-voo | [REAL] |
| LipSync | Replicate (modelo lipsync) | Sincronização boca/áudio | [ALVO] — nunca construído |
| Supabase Storage / Edge Functions / Realtime | — | Webhooks e progresso ao vivo | [ALVO] — nunca construído |
| **Publicação** | TikTok Creator API + Instagram Graph + YouTube Data v3 | Auto-publish | [ALVO] — credenciais não solicitadas |
| PDF | jsPDF | Export manifesto | [REAL] |
| Icons | Lucide React | UI | [REAL] |

> **Região Sydney é decisão deliberada:** este projeto mira a Austrália. O Felipe Portfolio fica em
> SP/Singapura porque atende Brasil/Europa/EUA. **Infra (VPS + n8n) é compartilhada entre projetos;
> banco NUNCA é** — cada projeto tem seu próprio Supabase.

---

## 📊 DATA SCHEMAS — FONTE DA VERDADE

> **[REAL] 8 tabelas aplicadas** em `ktysmnltubbfbvyjphdq` (Sydney), todas com RLS ativo:
> `episodes`, `script_lines`, `render_jobs`, `publish_jobs`, `social_accounts`, `pipeline_events`,
> `trends`, `deriva_runs`. Fonte canônica do DDL: `supabase/schema.sql` + migrations aplicadas.
> ⚠️ Divergência conhecida: o DDL real usa **`script_json`** em `episodes` (não `script`), e as
> cenas vivem em `script_lines` — o bloco abaixo é histórico e não foi atualizado à risca.

### Tabela: `deriva_runs` (Supabase) — [REAL, novo em v3.0]
```sql
CREATE TABLE deriva_runs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project    TEXT NOT NULL,
  status     TEXT NOT NULL,      -- 'GREEN' | 'RED'
  probes     JSONB NOT NULL,     -- [{id, status, detail, ms}]
  checked_at TIMESTAMPTZ DEFAULT now()
);
-- Escrita via service_role (n8n). Leitura anon LIBERADA: o hook SessionStart
-- do Claude Code lê daqui sem precisar de segredo na máquina do Felipe.
```

### Contrato de `/api/pipeline/run` — [REAL] o motor que o n8n aciona
```typescript
// POST -> { status: "QUEUED", jobId, statusUrl }
// GET ?id=<jobId> -> { status, progress, logs[], finalVideoUrl }
{
  script: Array<{            // TODOS obrigatórios (zod). durationEst é number.
    id: string; characterId: string; text: string;
    shotType: string; action: string; emotion: string; durationEst: number;
  }>;
  directorIdea?: string; directorSnippet?: string; engine?: string; // default 'kling'
}
```

### Tabela: `episodes` (Supabase)
```sql
CREATE TABLE episodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic       TEXT NOT NULL,
  snippet     TEXT,
  director_idea     TEXT,
  director_snippet  TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  -- status: 'draft' | 'scripted' | 'voiced' | 'lipsync' | 'rendered' | 'assembled' | 'published'
  script      JSONB,       -- ScriptLine[]
  video_url   TEXT,        -- URL do vídeo final montado
  thumbnail_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);
```

### Tabela: `render_jobs` (Supabase)
```sql
CREATE TABLE render_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id      UUID REFERENCES episodes(id),
  scene_index     INTEGER NOT NULL,  -- 0-5
  script_line     JSONB NOT NULL,    -- ScriptLine snapshot
  -- Fase 1: Voz
  voice_url       TEXT,
  voice_status    TEXT DEFAULT 'pending',  -- 'pending'|'processing'|'done'|'failed'
  -- Fase 2: LipSync
  lipsync_prediction_id TEXT,
  lipsync_url     TEXT,
  lipsync_status  TEXT DEFAULT 'pending',
  -- Fase 3: Vídeo Kling
  video_prediction_id TEXT,
  video_url       TEXT,
  video_status    TEXT DEFAULT 'pending',
  -- Geral
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);
```

### Tabela: `publish_jobs` (Supabase)
```sql
CREATE TABLE publish_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id      UUID REFERENCES episodes(id),
  platform        TEXT NOT NULL,  -- 'tiktok' | 'instagram' | 'youtube'
  video_url       TEXT NOT NULL,
  status          TEXT DEFAULT 'pending',  -- 'pending'|'uploading'|'published'|'failed'
  platform_post_id TEXT,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  published_at    TIMESTAMPTZ
);
```

### Tabela: `social_accounts` (Supabase)
```sql
CREATE TABLE social_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT NOT NULL,  -- 'tiktok' | 'instagram' | 'youtube'
  access_token  TEXT NOT NULL,  -- armazenado criptografado via Vault do Supabase
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  channel_id    TEXT,
  channel_name  TEXT,
  active        BOOLEAN DEFAULT true
);
```

### TypeScript: ScriptLine (existente, não muda)
```typescript
interface ScriptLine {
  id: string;
  characterId: 'boomer' | 'kev';
  text: string;
  shotType: string;
  action: string;
  durationEst: number;
  emotion: string;
  status: 'IDLE' | 'PROCESSING' | 'DONE' | 'ERROR';
}
```

### TypeScript: PipelineStatus (novo)
```typescript
type EpisodeStatus =
  | 'draft'       // Rascunho — script não confirmado
  | 'scripted'    // Script gerado e confirmado
  | 'voiced'      // Todas as vozes sintetizadas
  | 'lipsync'     // LipSync de todas as cenas concluído
  | 'rendered'    // Todos os vídeos de cenas prontos
  | 'assembled'   // Vídeo final montado (concatenado)
  | 'published';  // Publicado em todas as plataformas

interface PipelineEvent {
  episodeId: string;
  step: EpisodeStatus;
  sceneIndex?: number;
  payload?: Record<string, unknown>;
  timestamp: string;
}
```

---

## ⚡ PIPELINE AUTÔNOMO — FLUXO DETERMINÍSTICO

### [REAL] Fluxo em produção (n8n `n6qm9qMxEFvvkU8C`, 14 nós)

```
[Manual] ou [Cron Seg/Qua/Sex 08h]
      ↓
[0. PRÉ-VOO] GET /api/sentinel ──── VERMELHO → stopAndError (CANCELA antes de gastar)
      ↓ VERDE
[1. GET /api/trends] → [2. Escolher Pauta (maior tráfego)]
      ↓
[3. POST /api/ai/script {topic, snippet}] → [4. Montar Payload (normaliza os 7 campos do zod)]
      ↓
[5. POST /api/pipeline/run] → jobId
      ↓
[6. Wait 60s] → [7. GET /api/pipeline/run?id=] → [8. Terminou?] ──não──┐
      ↓ sim                                              └──────────────┘
[9. Telegram]
```

**Dentro de `/api/pipeline/run` (assíncrono):** roteiro → voz (ElevenLabs) → render por cena
(Kling 2.6) → ffmpeg concat → grava em `episodes`. **Sem LipSync, sem webhooks, sem Storage.**

### [REAL] Vigilância (n8n `CmHQvdzX5Sk23n7y`, ATIVO)
```
[Cron 07:30 diário] → GET /api/sentinel → grava deriva_runs → SE VERMELHO: Telegram
                                                            → SE VERDE: silêncio
```

### [ALVO] Publicação automática — não construída
`publish_jobs` e `social_accounts` existem no banco, mas nenhuma rota publica. Requer credenciais
de TikTok/Instagram/YouTube (aprovação de 1–3 semanas), ainda não solicitadas.

> **Decisão revogada (era da Sessão 007b):** "aposentar `/api/pipeline/run` e n8n orquestra rotas
> atômicas". Revogado em 2026-07-19 — `pipeline/run` **é** o motor. Quebrar em nós atômicos exigiria
> loop por cena na voz e uma rota atômica de montagem ffmpeg que não existe. Só depois de 1 vídeo real.

---

## ⚖️ REGRAS COMPORTAMENTAIS (INVARIANTES)

### Design — Brutalist Neural Glass
1. **Primary**: `#FF5F1F` (Signal Orange) — OBRIGATÓRIO
2. **Background**: `#000000` / `#0d0d0d`
3. **Bordas**: 4px sólido laranja
4. **Tipografia**: ALL-CAPS, tracking-widest, italic, font-black
5. **PROIBIDO**: Qualquer tom de roxo/violeta
6. **HUD**: `bg-black/40 backdrop-blur-xl`

### AI — Gemini
1. **Endpoint**: `v1beta/models/gemini-2.5-flash:generateContent`
2. **Rate limit**: 3 retries, backoff exponencial 1s → 2s → 3s
3. **Fallback de modelo**: `node find-model.js` se 404

### Pipeline
1. **Idempotência**: cada step pode ser re-executado sem duplicar dados — [ALVO, não garantido]
2. **Polling, não webhooks** — [REAL] o n8n faz poll de `GET /api/pipeline/run?id=` a cada 60s, e
   o `pipeline/run` faz poll das predictions do Replicate. *(A regra anterior dizia "webhooks >
   polling via Edge Functions" — nunca foi construída. Reescrita para refletir o real.)*
3. **Paralelo onde possível**: síntese de voz das cenas em paralelo — [ALVO]
4. **Falha isolada**: falha em 1 cena não bloqueia as outras — [ALVO] hoje a falha derruba o job
5. **Progresso visível**: [REAL] via `logs[]`/`progress` do job em `.tmp/job_<id>.json`, lidos pelo
   `GET`. Supabase Realtime é [ALVO], não usado.
6. **Pré-voo obrigatório antes de gastar** — [REAL] toda execução passa por `/api/sentinel`;
   vermelho aborta antes do primeiro dólar.

### Deriva — detecção e manutenção [novo em v3.0, doutrina da skill `deriva`]
1. **Contrato, não disponibilidade**: "respondeu 200" NÃO é prova de saúde. Prova é a resposta
   *conter o que se depende dela*. Um 200 com campo `undefined` é falso positivo — e falso
   positivo é pior que erro. *(Origem: 19/07, o workflow mandava `trend` onde a rota lê `topic`;
   o roteiro saía genérico com HTTP 200 e ninguém perceberia.)*
2. **Falha silenciosa é mais grave que queda**: saída bem-formada com conteúdo vazio, genérico
   ou default é severidade ALTA.
3. **Degradar é permitido; degradar calado, NUNCA**: todo fallback anuncia-se e carimba o
   artefato como degradado. ⚠️ O fallback de áudio silencioso do `pipeline/run` viola esta regra
   hoje — gera vídeo MUDO reportando sucesso. É **deriva grave**, não resiliência. A sonda
   `elevenlabs_voz` existe para pegá-lo.
4. **Compre informação barata antes do caro**: existe quase sempre uma sonda que revela a maior
   parte do risco por fração do custo. Daí o **pré-voo** — vermelho cancela a produção das 08h.
5. **A verificação precede a falha**: só confie em oráculo escrito ANTES de quebrar. Quem escreve
   o conserto e o teste do conserto não verificou nada — fez os dois concordarem.
6. **Memória executável > memória escrita**: se um aprendizado pode virar sonda, vira sonda, não
   parágrafo. Registre **evidência, não conclusão** ("rota X devolveu 400 em 19/07", não "X é instável").
7. **Vigiar o vigia**: silêncio não é prova de saúde. O hook avisa se a última sonda tem +36h.
8. **Autonomia v1**: a `deriva` diagnostica e PROPÕE; não aplica nada sozinha. Faixa verde só
   depois que as sondas provarem, em uso real, que pegam deriva verdadeira.

### Verificação — produtor ≠ verificador [novo em v3.2]

1. **Quem produziu não avalia** — [ALVO]. A avaliação de um artefato roda em agente separado,
   **sem o contexto de quem o produziu**. Quem tomou as decisões justifica as decisões: conhece
   o motivo de cada atalho e pontua o esforço, não o resultado. O avaliador recebe só o artefato
   e o critério.
2. **Avaliar o artefato, não o metadado** — [ALVO]. Container, código HTTP e campo de duração
   são prova de que a máquina rodou, não de que o produto presta. *(Origem: 24/07 — `ffprobe`
   confirmou 9:16 enquanto os personagens saíam decepados no frame. Ver P0a no HANDOFF.)*
3. **A sonda vigia a infra; nada vigia o produto** — [REAL, é a lacuna]. Em 19/07 a sentinela deu
   4/4 GREEN; em 24/07 o episódio saiu com sujeitos cortados e zero lipsync nas 8 cenas. Verde de
   infra e produto quebrado **coexistem** e sempre coexistiram. Sentinela não substitui avaliador.
4. **A FRONTEIRA PAGA define onde o loop pode iterar** — [LEI].
   - **Acima da linha (custo $0):** roteiro, prompt de cena, âncora, plano editorial, prompt de
     capa. O avaliador reprova e manda refazer **quantas vezes precisar**. Iterar aqui é grátis.
   - **Abaixo da linha (render pago, irreversível):** Kling, Replicate, ElevenLabs. O avaliador
     **dá a nota, aponta o defeito e PARA**. Nunca re-dispara sozinho. Retry de render é decisão
     humana, sempre.
   - **Razão:** o corte ≥85 com loop automático pressupõe iteração barata e retentável. Aqui cada
     ciclo custa US$3–6 e o crédito é finito. Loop automático sobre render pago é incinerador de
     dinheiro, não controle de qualidade. Vale o corte do protocolo global: **≥90 quando o erro
     é caro** — e aqui o erro é sempre caro.
5. **Paralelismo NÃO se aplica à geração de cenas** — [REAL, estrutural]. As cenas são
   **encadeadas**: a cena N usa o último frame da cena N−1 como `start_image` para manter
   continuidade visual (WP 1.6, `for (const scene of scenesToProcess)` em `pipeline/run`). Isso é
   uma **dependência de dados estrita**, não uma escolha de implementação — paralelizar quebra a
   continuidade. *(Histórico: os `create` do Kling já foram paralelos e estouraram o 429 do
   Replicate no job `b66b3c3b`; a correção de 24/07 os tornou sequenciais com retry honrando
   `retry_after`.)* Ganho de paralelismo, se houver, pertence à faixa de $0 — nunca à cadeia de cenas.
6. **Sem métrica inventada no avaliador** — [LEI]. Nota só sobre critério observável no artefato
   (fidelidade de personagem, enquadramento, continuidade, coincidência de cue com beat planejado).
   "Nota viral" e afins são vanity metric e estão proibidos — foram removidos da UI em 30/07.

### Segurança
1. **API keys**: NUNCA no frontend
2. **RLS**: Row Level Security ativo em TODAS as tabelas Supabase
3. **Contrato duplo de RLS [REAL, sondado diariamente]**: `service_role` GRAVA e `anon` recebe
   **401** ao tentar gravar. Se o anon algum dia conseguir gravar, isso é **falha de segurança**,
   não sucesso — a sonda `supabase_sydney` trata como VERMELHO.
4. **Segredos**: nunca imprimir, nunca commitar, nunca inventar. Escrever apenas valor fornecido
   pelo humano. `.env.production` na VPS é `chmod 600`. A `service_role` NÃO sai por API/MCP
   (só pelo Dashboard) — é propriedade de segurança da plataforma, não limitação a contornar.
5. **Social tokens**: via Supabase Vault — [ALVO]
6. **Webhooks**: validar assinatura Replicate — [ALVO], não há webhooks em uso

---

## 🏛️ INVARIANTES ARQUITETURAIS (A.N.T.)

```
Camada 1 (architecture/) — POPs em Markdown — O "Como Fazer"
Camada 2 (n8n + este arquivo) — Roteamento e Decisão
Camada 3 (API routes + tools/) — Código determinístico e atômico
```

1. **Dados Primeiro**: schema confirmado aqui antes de qualquer código
2. **LLMs são probabilísticos**: lógica de negócio é SEMPRE determinística
3. **Temporários em .tmp/**: nunca commitar arquivos intermediários
4. **Concluído = publicado na plataforma**: não conta como entregue enquanto não estiver ao vivo
5. **Autocorreção**: falha → analisar stack trace → corrigir → atualizar POP
6. **Três camadas de agentes [novo em v3.0]**: os 26 agentes do `AGENTS.md` são **produção**
   (consistência é o produto — NÃO se auto-evoluem); a skill `deriva` é **engenharia de manutenção**
   (centraliza a evolução, versionada e rastreável); Felipe + Claude são a **direção**. Evolução
   distribuída em 26 prompts mutando sozinhos é entropia com nome bonito.
7. **Ação cara ou irreversível exige OK explícito**: render (~US$3-6), publicação, exclusão,
   credenciais. Reversível e barato → age; caro ou irreversível → pergunta.
   **[LOCAL — aguarda deploy]** `/api/pipeline/run` materializa essa regra: exige aprovação
   confirmada há no máximo 10 minutos; a UI usa confirmação humana nativa. Chamadores n8n só podem
   enviar `source: n8n_manual` depois do gate humano no Telegram.
8. **Ambiguidade de intenção não se resolve investigando código**: pare e pergunte.

> ⚠️ **Camada 3 diverge do V.L.A.E.G. canônico — e a divergência é LEI aqui:**
> o protocolo prevê `tools/` em Python; neste projeto a lógica determinística vive nas API routes
> (TypeScript) e em `tools/assemble.mjs` (JavaScript). O `CLAUDE.md` global já autoriza isso
> ("projetos Claude+n8n seguem o VLAEG **no espírito**"). O princípio real do VLAEG nunca foi
> "usar Python" — é "lógica de negócio é determinística, não fica na mão do LLM". Cumprido.
>
> 🚫 **`tools/` NESTE PROJETO É NODE-ONLY. Não introduzir Python.**
> O container de produção (`node:22-alpine`) **não tem Python** — verificado em 2026-07-19:
> `which python3 → NAO_EXISTE`. Um script `.py` funcionaria no Mac do Felipe e **morreria em
> produção** (divergência dev/prod, a classe silenciosa de falha).
> Por isso `tools/verify_gemini.py` e `tools/verify_replicate.py` foram **removidos em 19/07** —
> eram os ancestrais do `/api/sentinel`, faziam a mesma coisa na linguagem errada e nunca rodavam
> automatizados. O conhecimento útil deles (403 do Replicate = escopo restrito, não falha;
> 404 do Gemini → `node find-model.js`) foi **portado para as sondas antes de apagar**.

---

## 🔑 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

> **[REAL]** Configuradas em DOIS lugares que precisam ficar em sincronia:
> `boomer-and-kev-studio/.env.local` (Mac, dev) e `/root/boomer-kev-studio/.env.production`
> (VPS, produção — `chmod 600`, lido pelo container via `--env-file`).
> Ao mudar qualquer chave: alterar nos dois e `docker restart boomer_kev`.

```env
# [REAL] — todas verificadas ao vivo em 2026-07-19
GEMINI_API_KEY=...
REPLICATE_API_TOKEN=...
ELEVENLABS_API_KEY=...              # key ESCOPADA: /v1/user devolve 401 mesmo com billing OK.
                                    # Só TTS real prova o contrato.
NEXT_PUBLIC_SUPABASE_URL=...        # https://ktysmnltubbfbvyjphdq.supabase.co (Sydney)
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...       # sem ela o RLS bloqueia escrita e nada persiste

# [ALVO] Publicação Social (OAuth tokens — via Supabase Vault em prod)
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
```

---

## 🎨 REGRAS CRIATIVAS E DE PRODUÇÃO (FILOSOFIA MKBHD)

### ✍️ 1. Roteirização e Storytelling
1. **Ter uma Tese:** Cada episódio deve ter um ponto central claro. Toda linha e piada deve apoiar essa tese.
2. **Contexto Completo:** Dar contexto suficiente para que a audiência se importe tanto quanto os criadores.
3. **Detalhes Ricos:** A narrativa vive nos detalhes primários. Usar dados reais de tendências em vez de generalismos.

### 🎙️ 2. Engenharia de Áudio (Diálogo)
1. **Sempre em Mono:** Diálogos de podcast/vídeo devem ser estritamente gravados/mixados em MONO. Áudio estéreo para falas confunde a mente do ouvinte.
2. **Efeito de Proximidade:** Microfones de proximidade para voz encorpada/quente (estilo NPR/Boomer agressivo).
3. **Direcionalidade Frequencial:** Frequências altas direcionam em feixe; frequências baixas se espalham. Ajustar o ângulo do microfone (off-axis) para controlar sibilo e aspereza.

### 📐 3. Iluminação, Cenário e Enquadramento
1. **Esquema de Cores Bow House:** Utilizar a tríade de cores primárias (Vermelho, Azul, Amarelo) nos elementos do cenário como marca registrada.
2. **Exposição em Xadrez:** Compor o plano mesclando hotspots (zonas claras) e dark zones (zonas escuras) distribuídas para guiar o olhar.
3. **Flags para Controle:** Usar flags físicas ou virtuais para evitar vazamento (spill) de luzes coloridas RGB sobre o rosto dos personagens.

### 🎬 4. Edição e Transições
1. **Livre de Distrações:** Edições limpas, música leve, sem abuso de legendas piscantes ou efeitos frenéticos.
2. **Marcação de Capítulos:** Usar transições visuais claras para definir capítulos e gerenciar as expectativas do público.
3. **Saída Subliminar:** No final de um capítulo ou cena, o elemento em destaque (ex: carro ou personagem) deve sair fisicamente do quadro para sinalizar o fim daquele bloco.
4. **Retenção sem quota:** Gancho, contraste, mudança de energia e payoff orientam a montagem; não existe obrigação de cortar ou aplicar efeito a cada N segundos.
5. **Deadpan é edição:** A pausa e a baixa energia do Kev são pattern interrupts deliberados, não trechos a serem automaticamente acelerados.
6. **Áudio segue beats:** Trilha, ducking, rufo, risada e silêncio são posicionados pela estrutura do roteiro, nunca por percentuais arbitrários da duração.

Fonte operacional: `docs/editing-retention-constitution.md`. Números sem fonte do material de
referência são hipóteses para teste, não fatos do produto nem gates determinísticos.

### 🖼️ 5. Thumbnails e Identidade Visual
1. **Foco no Centro/Terços:** O objeto principal deve estar centralizado ou nos terços para reduzir o esforço ocular.
2. **Paleta Limitada e Complementar:** Usar cores complementares puras (ex: fundo violeta se o produto é amarelo).
3. **Contraste Fore/Back:** Bordas de contraste bem definidas separando primeiro plano do plano de fundo.
4. **Flechas e Preços:** Flechas indicativas e etiquetas de preço em destaque geram maior engajamento.

---

## 📋 LOG DE MANUTENÇÃO

| Data | Versão | O que mudou | Motivo |
|------|--------|-------------|--------|
| 2026-03-28 | 1.0 | Criação inicial via V.L.A.E.G. | Inicialização |
| 2026-03-28 | 2.0 | Data Schema completo, Pipeline autônomo, integrações sociais | Respostas de Descoberta incorporadas |
| 2026-07-18 | 2.1 | Inclusão de regras criativas MKBHD | Transcrição de produção incorporada |
| 2026-07-19 | 3.0 | Convenção [REAL]/[ALVO]; infra de produção; doutrina Deriva; contrato duplo de RLS; três camadas de agentes | Auditoria ao vivo revelou pipeline inexistente |
| 2026-08-05 | 3.2 | Invariantes de **Verificação (produtor ≠ verificador)**: avaliação sem contexto compartilhado, artefato acima de metadado, e a **fronteira paga** que delimita onde o loop de nota pode iterar sozinho | Lacuna nomeada: sentinela vigia infra, nada vigia o produto (GREEN 19/07 × episódio quebrado 24/07) |
| 2026-07-19 | 3.1 | Deploy de produção: Docker → PM2 standalone; `deploy_studio.sh` criado; Nginx reverse proxy + SSL Let's Encrypt em `boomerandkev.fgss.io`; rota `/api/radar` para n8n webhook; `IntelligenceRadar.tsx` + `radar.json` (benchmark feed); IP compliance guardrails no brainstorm; wardrobe metadata no pipeline; X-Ray modal na Library | Migração para produção pública. Engine acessível via HTTPS. |

### Referências rápidas [REAL, 2026-07-19]
| Recurso | Identificador |
|---------|---------------|
| VPS (Hostinger) | `2.25.182.106`, SSH root, Nginx 1.24.0 (Ubuntu) |
| **Produção** | **https://boomerandkev.fgss.io** — PM2 processo `boomer-engine` porta 3001 |
| Deploy script | `./deploy_studio.sh` (build + rsync + npx pm2 restart) |
| Nameservers | `athena.dns-parking.com` / `apollo.dns-parking.com` (Hostinger, sem API de DNS) |
| n8n | `n8n.fgss.io` — creds em `Felipe Portfolio/.env` |
| Workflow produção | `n6qm9qMxEFvvkU8C` — **inativo** (aguarda 1º run pago) |
| Workflow vigilância | `CmHQvdzX5Sk23n7y` — **ativo**, cron 07:30 |
| Radar API | `POST https://boomerandkev.fgss.io/api/radar` (Bearer `N8N_RADAR_SECRET`) |
| Supabase | `ktysmnltubbfbvyjphdq` (Sydney) |
| Telegram | chat `6431944169`, cred n8n `xMM0nVZz16NfA8M8` |
| Política de manutenção | `deriva.yml` na raiz |
| GitHub | `fbgouveia/boomer-and-kev-studio` branch `restore-engine` |
