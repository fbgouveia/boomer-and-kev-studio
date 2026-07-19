# 🌅 HANDOFF — PRÓXIMA SESSÃO
# Boomer & Kev Studio | Atualizado: 2026-07-19 (pós Sessão 007)

> ⚠️ **LEIA ISTO PRIMEIRO. Este é o ponto de partida autoritativo.**
> As diretrizes globais do projeto (Karpathy, VLAEG, Ponytail) estão consolidadas em [CLAUDE.md](file:///Users/felipegouveia/Developer/Boomer%20and%20Kev/BOOMER%20AND%20KEV/boomer-and-kev-studio/CLAUDE.md).

---

## 🎯 O QUE É O PROJETO (1 linha)
Pipeline autônomo: tópico em alta na Austrália → roteiro → voz → vídeo → montagem → publicação.
Personagens: Boomer (canguru) + Kev (coala). Formato 9:16, 30–60s, p/ TikTok/IG/YT.

---

## 🟢 ESTADO REAL DO CÓDIGO (verificado em 2026-07-19 — pós Sessão 007)
> Branch: **`restore-engine`**. Build: **✅ VERDE** (18 rotas, 0 erros TSC).

### Motor de Produção (restaurado na Sessão 006, expandido na 007)
- ✅ **18 rotas API compilando**: `script`, `voice`, `sync`, `interview`, `render`, `render/status`, `brainstorm`, `trends`, `keys/balance`, `pipeline/run`, `pipeline/download`, `ai/image`, `ai/compliance`, `ai/callback`, `ai/mitigation`, `video/generate`, `cron/agent`, `cron/trend-hunter`.
- ✅ **Roteiro (Gemini 2.5 Flash)** funciona ao vivo — 6 cenas, HTTP 200, ~15s.
- ✅ **Vídeo (Replicate Kling 2.6)** — token válido, modelo acessível. Custo ~$3–6/vídeo.
- ✅ **Montagem (ffmpeg)** — `tools/assemble.mjs` concat → 1 MP4 9:16 1080×1920 30fps.

### Novidades da Sessão 007
- ✅ **Orquestrador Maestro** (`/api/pipeline/run` + `/api/pipeline/download`) — encadeia script→voz→render→montagem em background. UI integrada com botão de download do MP4 final.
- ✅ **Assets locais** — master images copiadas do Drive para `public/assets/` (Boomer, Kev, Wide). `characters.ts` atualizado. Render converte paths relativos em URLs absolutas via `req.headers.origin`.
- ✅ **Supabase client** (`src/lib/supabase.ts`) — fetch puro, zero deps. Fallback silencioso se credenciais ausentes.
- ✅ **Fallback de voz** — se ElevenLabs billing falhar, injeta buffer de áudio silencioso e a pipeline continua.
- ✅ **Síntese de imagem** (`/api/ai/image`) — Nano Banana Pro (Imagen 3). Botão SYNTHESIZE no DNA Panel.
- ✅ **Compliance & Mitigation** (`/api/ai/compliance`, `/api/ai/mitigation`) — verificação de conteúdo.
- ✅ **Callback system** (`/api/ai/callback`) — tracking de renders em background.
- ✅ **Video generate** (`/api/video/generate`) — rota alternativa com suporte a Higgsfield + Replicate.
- ✅ **Cron Agent** (`/api/cron/agent`) — auto-redação de scripts a partir de trends.
- ✅ **Admin panel** (`/admin`) — storyboard view com `StoryboardView.tsx`.
- ✅ **LabsPanel** (`LabsPanel.tsx`) — componente experimental com Three.js.
- ✅ **Cinematic orchestrator** (`cinematic-orchestrator.ts`) — lib de composição de cenas.
- ✅ **12 imagens geradas** em `public/assets/generated/`.

### 🔴 BLOQUEIOS ATIVOS
- 🔴 **ElevenLabs billing** — fatura pendente. Pipeline usa fallback silencioso, mas voz real precisa do pagamento.
- ⚠️ **voiceId de catálogo vs custom** — código usa Charlie/Roger de catálogo, não vozes clonadas. Decisão pendente.
- ⚠️ **Supabase não deployado** — schema SQL existe (`supabase/schema.sql`) mas nunca foi executado em produção.

### ⏳ PENDÊNCIAS TÉCNICAS
1. **Merge da branch `restore-engine` na `main`** — quando Felipe aprovar.
2. **APIs sociais (TikTok/IG/YT)** — aplicar credenciais no Dia 1 (aprovação leva 1–3 semanas).
3. **Testes E2E** — nenhum teste automatizado existe ainda.
4. **Deploy Supabase** — criar projeto e rodar o schema.
5. **n8n workflow** — desenhado mas não implementado (existe `tools/n8n_boomer_kev_orchestrator.ts` como referência).

---

## ✅ DECISÕES TRAVADAS
| Tema | Decisão |
|------|---------|
| Diretrizes Globais | **Karpathy, VLAEG, Ponytail** (em CLAUDE.md) |
| Orquestração | **Maestro interno** (`/api/pipeline/run`) + n8n futuro |
| Backend | Next.js API Routes atômicas |
| Banco/Estado | **Supabase** (client fetch puro criado) |
| Provedor de vídeo | **Kling 2.6 via Replicate** (Higgsfield como alternativa) |
| Voz | **ElevenLabs** (com fallback silencioso) |
| Roteiro | Gemini 2.5 Flash (`v1beta`) |
| Montagem | ffmpeg (`tools/assemble.mjs`) |
| Assets | **Locais** em `public/assets/` (saiu do Google Drive) |
| Síntese de imagem | **Nano Banana Pro (Imagen 3)** via `/api/ai/image` |
| Estilo | Brutalist Neural Glass (`#FF5F1F`, preto, ZERO roxo) |

---

## 💸 NÚMEROS (referência rápida)
- Custo por vídeo: **~$3–6** (Kling domina o custo).
- Burn mensal a 3–5/sem: **~$150–210**.

---

## 🧭 PRÓXIMOS PASSOS (por prioridade)
1. **Pagar ElevenLabs** → desbloquear voz real.
2. **Testar pipeline end-to-end** com voz + render + montagem.
3. **Deploy Supabase** → persistência real.
4. **Merge `restore-engine` → `main`**.
5. **1º vídeo REAL publicado**.
