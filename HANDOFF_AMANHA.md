# 🌅 HANDOFF — PRÓXIMA SESSÃO
# Boomer & Kev Studio | Atualizado: 2026-07-19 (pós Sessão 007 + descoberta n8n)

> ⚠️ **LEIA ISTO PRIMEIRO. Este é o ponto de partida autoritativo.**
> As diretrizes globais do projeto (Karpathy, VLAEG, Ponytail) estão consolidadas em [CLAUDE.md](file:///Users/felipegouveia/Developer/Boomer%20and%20Kev/BOOMER%20AND%20KEV/boomer-and-kev-studio/CLAUDE.md).
> Os 26 agentes de produção estão definidos em [AGENTS.md](file:///Users/felipegouveia/Developer/Boomer%20and%20Kev/BOOMER%20AND%20KEV/boomer-and-kev-studio/AGENTS.md).

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
- ✅ **Orquestrador Maestro** (`/api/pipeline/run` + `/api/pipeline/download`) — encadeia script→voz→render→montagem. UI com botão de download.
- ✅ **Assets locais** — master images em `public/assets/`. `characters.ts` atualizado.
- ✅ **Supabase client** (`src/lib/supabase.ts`) — fetch puro, zero deps. Fallback silencioso.
- ✅ **Fallback de voz** — ElevenLabs billing falha → áudio silencioso → pipeline continua.
- ✅ **Síntese de imagem** (`/api/ai/image`) — Imagen 3. Botão SYNTHESIZE no DNA Panel.
- ✅ **Compliance, Mitigation, Callback, Video Generate, Cron Agent, Admin Panel, LabsPanel, Cinematic Orchestrator** — todos criados e compilando.
- ✅ **AGENTS.md** — 26 agentes AI definidos (5 departamentos, system prompts, I/O, critérios).

### 🟢 BLOQUEIOS RESOLVIDOS (2026-07-19, Sessão 008/009)
- ✅ **ElevenLabs billing PAGO** — verificado com TTS real (HTTP 200, MP3 válido, voz Charlie).
- ✅ **Supabase DEPLOYADO em SYDNEY** — projeto **`boomer-kev-sydney`** (`ktysmnltubbfbvyjphdq`, **ap-southeast-2**), 7 tabelas + RLS aplicados. URL + anon key no `.env.local` (Mac) e no `.env.production` (VPS). Leitura verificada do container da VPS. **Região Sydney é deliberada**: este projeto mira a Austrália (o Felipe Portfolio fica em SP porque atende BR/Europa/EUA — bancos são separados por projeto).
- ✅ **n8n JÁ EXISTIA na VPS Hostinger** (`n8n.fgss.io`, compartilhado com o projeto Felipe Portfolio/FGSS) — o container Docker local que eu tinha subido no Mac foi **removido** (redundante). O workflow `Boomer & Kev Production Orchestrator` (`n6qm9qMxEFvvkU8C`) já existia lá, criado numa sessão anterior.
- ✅ **Studio deployado na VPS** — `Dockerfile` (multi-stage, `next.config.ts` com `output: 'standalone'`, ffmpeg no runtime p/ `tools/assemble.mjs`) + container `boomer_kev` rodando na rede Docker `n8n_default` (sem porta pública — só o n8n acessa via `http://boomer_kev:3000`). Código em `/root/boomer-kev-studio` na VPS, env em `.env.production` (mesmas 5 chaves do `.env.local`, exceto service_role).
- ✅ **Workflow corrigido e testado AO VIVO**: URLs trocadas de `localhost:3000`→`boomer_kev:3000` (7 nós) + bug pré-existente achado (nó "Fetch Google Trends" usava POST, rota é GET) e corrigido. **2 nós testados ponta-a-ponta via n8n**: `/api/trends` (Gemini, retornou trend real de Sydney) e `/api/ai/brainstorm` (retornou hooks reais do Boomer/Kev). `versionCounter` do workflow: 3.

### ⚠️ ATENÇÃO RESTANTE
- ✅ ~~SUPABASE_SERVICE_ROLE_KEY~~ **RESOLVIDO** — chave do projeto de Sydney aplicada no `.env.local` (Mac) e no `.env.production` (VPS), container reiniciado. **Escrita provada ao vivo**: INSERT em `episodes` via service_role retornou HTTP 200 com a linha criada; INSERT com anon key retornou **401** (RLS protegendo como esperado). Linha de teste removida — banco limpo (0 linhas nas 7 tabelas).
- ⚠️ **Projeto Supabase órfão em SP** — `boomer-kev` (`fjirjelpkheuflumxbhz`, sa-east-1) ficou vazio e sem uso após a migração p/ Sydney, custando $10/mês. **Só o Felipe apaga** (MCP não tem delete de projeto; pause exige free-tier): [Settings → General → Delete project](https://supabase.com/dashboard/project/fjirjelpkheuflumxbhz/settings/general). Apagar também invalida a service_role dele, que foi exposta em chat.
- ⚠️ **Workflow RECONSTRUÍDO e INATIVO** (`active: false`, versionCounter 4) — o workflow original era esqueleto de IA com todos os payloads errados (auditoria na Sessão 009e); foi refeito como **n8n fino** em 11 nós usando `/api/pipeline/run`. Lógica dos Code nodes e contratos validados sem custo; **falta a execução real** (~$3–6 Kling). Felipe: `n8n.fgss.io` → workflow `n6qm9qMxEFvvkU8C` → "Execute Workflow" (dispara custo), ou ativar o cron Seg/Qua/Sex 8h.
- ⚠️ **Decisão da Sessão 007b REVOGADA** — `/api/pipeline/run` **não** será aposentado agora; ele é o motor que o n8n chama. Quebrar em 6 sub-workflows/nós atômicos só depois que 1 vídeo real existir (exigiria loop por cena na voz + criar rota atômica de montagem ffmpeg, que hoje não existe).
- ⚠️ **voiceId de catálogo vs custom** — código usa Charlie/Roger de catálogo. Decisão pendente (catálogo serve p/ validar o pipeline).
- ⚠️ **Deploy manual, sem CI/CD** — diferente do Felipe Portfolio (que tem GitHub Actions), o studio foi deployado via `rsync`+`docker build` manual direto na VPS. Não há repo git nem pipeline automática ainda para esse subprojeto.

---

## 🧠 DESCOBERTA: n8n COMO CÉREBRO CENTRAL DOS 26 AGENTES

> Decisão arquitetural discutida em 2026-07-19. n8n substitui o `/api/pipeline/run`
> monolítico como orquestrador. As API routes do Next.js permanecem como funções atômicas.

### Por que n8n
| Problema atual | Solução n8n |
|----------------|-------------|
| Pipeline monolítica — falha 1 cena = tudo morre | Error handling + retry por nó individual |
| Vídeo + áudio são sequenciais | Branches paralelos nativos |
| Sem visibilidade do fluxo | Canvas visual — cada agente é um nó |
| Mudar fluxo exige rewrite de código | Drag-and-drop de nós |
| Cron do trend hunter é gambiarra Next.js | Schedule trigger nativo do n8n |
| Sem estado entre etapas | Variáveis de workflow + Supabase |

### Arquitetura: 6 Sub-Workflows

```
n8n (CÉREBRO / DIRETOR GERAL)
├── WF1: 🔍 Pesquisa & Pauta (cron 4x/dia)
│   ├── Pesquisador → HTTP /api/trends + AI Agent (Flash)
│   ├── Diretor de Produção → Code node (budget)
│   └── Diretor Geral → AI Agent (Pro) → GO/NO-GO → trigger WF2
│
├── WF2: 📝 Roteiro (sub-workflow)
│   ├── Roteirista → AI Agent (Flash) → 6 cenas draft
│   ├── Roteirista Chefe → AI Agent (Pro) → review/approve
│   └── IF aprovado → WF3 / Não → loop
│
├── WF3: 🎬 Decupagem (sub-workflow)
│   ├── Diretor de TV → AI Agent → shot list
│   ├── Diretor de Palco → AI Agent → timing sheet
│   ├── Diretor de Foto → AI Agent → visual spec
│   └── Diretor de Arte → AI Agent → art direction
│
├── WF4: 🎨 Pré-Produção (sub-workflow)
│   ├── Cenógrafo + Figurinista + Maquiador + Produtor Objetos (4 nós PARALELOS)
│   ├── Contrarregra → prop placement
│   ├── Iluminador → Code node (lookup)
│   ├── Produtor de Elenco → Code node (cast)
│   └── Camareiro → AI Agent → continuity check
│
├── WF5: ⚡ Geração (sub-workflow)
│   ├── Cinegrafista → AI Agent → 6 prompts finais
│   ├── Branch A (PARALELO): 6× HTTP /api/render (Kling) + Wait
│   ├── Branch B (PARALELO): 6× HTTP /api/ai/voice (ElevenLabs)
│   └── Merge → espera ambos → WF6
│
└── WF6: 🎞️ Pós-Produção & Publicação (sub-workflow)
    ├── Sonoplasta → AI Agent → SFX map
    ├── Operador de TP → Code node → captions
    ├── Operador de Switcher → Code node → timeline
    ├── Editor de Vídeo → HTTP ffmpeg concat
    ├── Finalizador → AI Agent (multimodal) → QA score
    ├── IF score ≥ 7 → publicar / Não → flag revisão
    └── Assistente de Produção → cleanup + log Supabase
```

### Custo n8n
| Opção | Preço | Execuções |
|-------|-------|-----------|
| **Self-hosted (Docker)** | **$0** | ∞ |
| n8n Cloud Starter | $24/mês | 2.500 |
| n8n Cloud Pro | $60/mês | 10.000 |

**Recomendação:** Self-hosted via Docker. Para 3–5 vídeos/semana = ~30 execuções de sub-workflow/semana.

### O que muda no código
| Item | Antes | Depois |
|------|-------|--------|
| `/api/pipeline/run` | Orquestrador monolítico | **Morre** — n8n assume |
| API routes (`/api/ai/*`, `/api/render`) | Chamadas internas | n8n chama via HTTP Request nodes |
| Estado do episódio | In-memory / `.tmp/` | **Supabase** (n8n grava via HTTP) |
| Cron trend hunter | Next.js API route | n8n Schedule Trigger |
| Agentes LLM | Inline no pipeline code | n8n AI Agent nodes (Gemini nativo) |

---

## ⏳ PENDÊNCIAS TÉCNICAS (atualizado 2026-07-19, Sessão 008)

### ✅ Concluídas na Sessão 008
1. ~~Pagar ElevenLabs~~ → **PAGO e verificado** (TTS real HTTP 200).
2. ~~n8n setup (Docker)~~ → **RODANDO** em `localhost:5678`. Falta: conta admin (Felipe) + 6 sub-workflows.
3. ~~Deploy Supabase~~ → **FEITO** (projeto `boomer-kev`, 7 tabelas, credenciais no `.env.local`).

### 🟠 Próximas (ordem)
4. **Felipe:** conta admin n8n (`localhost:5678`) + copiar `SUPABASE_SERVICE_ROLE_KEY` p/ `.env.local`.
5. **Criar WF1 (Pesquisa & Pauta)** → primeiro workflow n8n funcional.
6. **Decidir voiceId** → catálogo (Charlie/Roger) ou treinar custom (catálogo basta p/ validar pipeline).
7. **Testar pipeline end-to-end** → 1 vídeo real (~$3–6 de render — precisa OK de gasto).
8. **Merge `restore-engine` → `main`** → quando pipeline testado.

### 🟡 Futuro (pós 1º vídeo)
7. **APIs sociais (TikTok/IG/YT)** → aplicar credenciais (aprovação 1–3 semanas).
8. **Testes E2E** → automação de QA.
9. **SFX library** → gravar/comprar efeitos sonoros para o Sonoplasta.
10. **Caption burn-in** → ffmpeg ASS com estilo Brutalist (#FF5F1F bold).

---

## ✅ DECISÕES TRAVADAS
| Tema | Decisão |
|------|---------|
| Diretrizes Globais | **Karpathy, VLAEG, Ponytail** (em CLAUDE.md) |
| Orquestração | **n8n self-hosted** como cérebro central (6 sub-workflows) |
| Agentes | **26 agentes** definidos em AGENTS.md (16 LLM + 10 determinísticos) |
| Backend | Next.js API Routes = funções atômicas chamadas pelo n8n via HTTP |
| Banco/Estado | **Supabase** (client fetch puro criado, deploy pendente) |
| Provedor de vídeo | **Kling 2.6 via Replicate** (Higgsfield como alternativa) |
| Voz | **ElevenLabs** (com fallback silencioso) |
| Roteiro | Gemini 2.5 Flash (draft) + Pro (review) |
| Montagem | ffmpeg (`tools/assemble.mjs`) |
| Assets | **Locais** em `public/assets/` |
| Síntese de imagem | **Imagen 3** via `/api/ai/image` |
| Estilo | Brutalist Neural Glass (`#FF5F1F`, preto, ZERO roxo) |
| Custo por vídeo | **~$3–6** (Kling domina) |
| Burn mensal | **~$150–210** a 3–5/semana |

---

## 🧭 PRÓXIMOS PASSOS (por prioridade)
1. 🔴 **Pagar ElevenLabs** → desbloquear voz real.
2. 🟠 **n8n Docker setup** → subir instância local.
3. 🟠 **Criar WF1 (Pesquisa & Pauta)** → primeiro workflow n8n funcional.
4. 🟠 **Deploy Supabase** → persistência real.
5. 🟡 **1º vídeo end-to-end via n8n** → prova de conceito completa.
6. 🟡 **Merge `restore-engine` → `main`**.
7. ⚪ **Publicação automatizada** → APIs sociais + WF6 completo.
