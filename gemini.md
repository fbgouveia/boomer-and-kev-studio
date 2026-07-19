# gemini.md — Constituição do Projeto
# Boomer & Kev Studio | V.L.A.E.G. Project Constitution
# Criado: 2026-03-28 | Versão: 2.0 (Respostas de Descoberta Incorporadas)

> ⚖️ Este arquivo é a LEI do projeto. Atualiza-se ANTES do código.
> Hierarquia: [CLAUDE.md](file:///Users/felipegouveia/Developer/Boomer%20and%20Kev/BOOMER%20AND%20KEV/boomer-and-kev-studio/CLAUDE.md) > gemini.md > task_plan.md > findings.md > progress.md

---

## 🎬 IDENTIDADE DO PROJETO

**Nome**: Boomer & Kev Studio
**Tipo**: Pipeline Autônomo de Produção de Podcast — Tópico → Vídeo Publicado
**Podcast**: Down Under Discourse — humor australiano + trending topics
**Distribuição**: TikTok + Instagram Reels + YouTube Shorts (publicação automática)
**Problema Central**: O pipeline existe fragmentado em cliques manuais. Precisa ser determinístico e autônomo.

---

## 🏗️ STACK ARQUITETURAL

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| Framework | Next.js 16 App Router | UI + API Routes |
| Linguagem | TypeScript strict | Toda lógica |
| Estilo | Tailwind CSS v4 | Design system |
| AI Engine | Google Gemini 2.5 Flash `v1beta` | Geração de script |
| Voz | ElevenLabs API | Síntese de voz por personagem |
| LipSync | Replicate (modelo lipsync) | Sincronização boca/áudio |
| Vídeo | Replicate Kling v2 | Render final de cenas |
| **Persistência** | **Supabase** (DB + Storage + Edge Functions) | **NOVO — dados + webhooks** |
| **Publicação** | **TikTok Creator API + Instagram Graph + YouTube Data v3** | **NOVO — auto-publish** |
| PDF | jsPDF v2.7 | Export manifesto |
| Icons | Lucide React | UI |

---

## 📊 DATA SCHEMAS — FONTE DA VERDADE

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

```
[Trends Feed] → Topic
      ↓
[Gemini 2.5 Flash] → Script (6 ScriptLines) → SAVE episodes (status: scripted)
      ↓ (paralelo por cena)
[ElevenLabs] → voice_url por cena → UPDATE render_jobs.voice_status = done
      ↓ (sequencial por cena)
[Replicate LipSync] → lipsync_url → webhook → UPDATE render_jobs.lipsync_status = done
      ↓ (sequencial por cena)
[Replicate Kling v2] → video_url → webhook → UPDATE render_jobs.video_status = done
      ↓ (quando todas 6 cenas done)
[Supabase Storage] → upload + ffmpeg assembly → episodes.video_url → status: rendered
      ↓ (paralelo por plataforma)
[TikTok API] → post
[Instagram Graph API] → post    → UPDATE publish_jobs.status = published
[YouTube Data API] → upload
      ↓
episodes.status = published
```

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
1. **Idempotência**: cada step pode ser re-executado sem duplicar dados
2. **Webhooks > polling**: Replicate callbacks via Supabase Edge Functions
3. **Paralelo onde possível**: síntese de voz das 6 cenas em paralelo
4. **Falha isolada**: falha em 1 cena não bloqueia as outras 5
5. **Progresso visível**: UI mostra o status em tempo real via Supabase Realtime

### Segurança
1. **API keys**: NUNCA no frontend
2. **Social tokens**: via Supabase Vault (criptografia at-rest)
3. **Webhooks**: validar assinatura Replicate antes de processar
4. **RLS**: Row Level Security ativo em todas as tabelas Supabase

---

## 🏛️ INVARIANTES ARQUITETURAIS (A.N.T.)

```
Camada 1 (architecture/) — POPs em Markdown — O "Como Fazer"
Camada 2 (Este arquivo)  — Roteamento e Decisão
Camada 3 (tools/)        — Scripts Python determinísticos e atômicos
```

1. **Dados Primeiro**: schema confirmado aqui antes de qualquer código
2. **LLMs são probabilísticos**: lógica de negócio é SEMPRE determinística em tools/
3. **Temporários em .tmp/**: nunca commitar arquivos intermediários
4. **Concluído = publicado na plataforma**: não conta como entregue enquanto não estiver ao vivo
5. **Autocorreção**: falha → analisar stack trace → corrigir tool → atualizar POP

---

## 🔑 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
# Existentes
GEMINI_API_KEY=...
REPLICATE_API_TOKEN=...

# A adicionar
ELEVENLABS_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Publicação Social (OAuth tokens — via Supabase Vault em prod)
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

