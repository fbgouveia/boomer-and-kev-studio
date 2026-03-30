# 🏛️ HANDOFF V.L.A.E.G. — ORDENS DE EXECUÇÃO
# Boomer & Kev Studio | Arquitetado por Antigravity
# Data: 2026-03-29 | Para: Gemini 3.1 (Executor)
# Protocolo: V.L.A.E.G. IMPERATIVO

---

> ⚖️ **ESTE ARQUIVO É LEI.** Gemini 3.1 deve ler este handoff ANTES de tocar qualquer arquivo.
> Hierarquia: gemini.md > HANDOFF_VLAEG.md > task_plan.md > progress.md
> **Ler também:** `findings.md` (inventário de assets e APIs)

---

## 📌 CONTEXTO RÁPIDO

### O que é o projeto
Pipeline autônomo de produção de podcast: **Tópico trending → Vídeo publicado**.
Dois personagens animais australianos (Boomer = canguru energético, Kev = coala preguiçoso).
Formato: TikTok/IG Reels/YT Shorts (9:16, 30-60s).

### O que JÁ EXISTE e FUNCIONA
- 13/16 features operacionais (script gen, render Kling v2.6, lipsync, PDF, trends)
- 2 episódios produzidos + 1 piloto montado
- Referências master (3 ângulos canônicos) em `G:\BOOMER AND KEV\Characters\`
- Consistência de personagens: **85%** com Kling + referências (confirmado pelo Felipe)
- Design Brutalist Neural Glass: **100% conforme**

### O que NÃO funciona (bloqueadores)
1. 🔴 `ELEVENLABS_API_KEY` ausente → Felipe precisa criar conta
2. 🔴 Supabase não existe → Felipe precisa criar projeto
3. 🔴 APIs sociais não candidatadas → Felipe precisa aplicar

### Decisões arquiteturais JÁ TOMADAS (não revisitar)
- ✅ Consistência via Kling + referências (NÃO LoRA, NÃO Blender urgente)
- ✅ Supabase como DB (NÃO Firebase, NÃO SQLite prod)
- ✅ ffmpeg para assembly (NÃO Premiere Pro no pipeline)
- ✅ Next.js 16 App Router (NÃO migrar)
- ✅ Tailwind CSS v4 (NÃO mudar)
- ✅ Brutalist Neural Glass — `#FF5F1F`, preto, ZERO ROXO

---

## 🎖️ LEGIÃO DE AGENTES — ORDENS POR SPRINT

---

### 🔧 @backend-specialist — PRIORIDADE MÁXIMA

**Sprint 1 (imediato — sem dependência do Felipe):**

✅ TAREFA B1: Centralizar Types (CONCLUÍDO)
```
CRIAR: src/types/index.ts
- Centralizados todos os tipos de episódios, script lines, render jobs e social accounts.
- Imports atualizados no page.tsx e routes.
```

✅ TAREFA B2: Consolidar fetchWithRetry (CONCLUÍDO)
```
CRIAR: src/lib/fetch-retry.ts
- Extraído de routes de script e brainstorm.
- Aplica retry exponencial + tratamento de 429 (rate limit).
```

✅ TAREFA B3: Remover dead weight (CONCLUÍDO)
```
EXECUTAR: npm uninstall @google/generative-ai
- Removido do package.json (não era utilizado por nenhuma rota atômica).
```

**Sprint 2 (quando Supabase existir):**

#### TAREFA B4: API Route — Pipeline Orchestrator
```
CRIAR: src/app/api/pipeline/run/route.ts
INPUT: { topic: string, snippet?: string }
FLUXO:
  1. Gerar script via /api/ai/script
  2. Para cada ScriptLine (paralelo): chamar /api/ai/voice
  3. Para cada ScriptLine (sequencial): chamar /api/render
  4. Para cada ScriptLine (sequencial): chamar /api/ai/sync (lipsync)
  5. Chamar /api/assembly (concatenar cenas)
  6. Retornar { episodeId, videoUrl, status }
ERROR HANDLING: falha em 1 cena NÃO bloqueia as outras
IDEMPOTÊNCIA: re-executar step deve detectar "já feito" e pular
```

#### TAREFA B5: API Route — Assembly
```
CRIAR: src/app/api/assembly/route.ts
INPUT: { episodeId: string, scenes: { url: string, order: number }[] }
FLUXO:
  1. Download das cenas para /tmp/
  2. Gerar concat list para ffmpeg
  3. Executar: ffmpeg -f concat -i list.txt -c copy output.mp4
  4. Upload para Supabase Storage
  5. Retornar { videoUrl }
DEPENDÊNCIA: ffmpeg no PATH (verificar com `which ffmpeg`)
```

#### TAREFA B6: Migrar localStorage → Supabase
```
INSTALAR: npm install @supabase/supabase-js
CRIAR: src/lib/supabase.ts (client factory)
MIGRAR:
  - Episódios salvos em localStorage → tabela episodes
  - Status de render → tabela render_jobs
  - API keys do localStorage → REMOVER (env-only)
```

---

### 🎨 @frontend-specialist — SPRINT 1

#### TAREFA F1: Refatorar page.tsx (PARCIALMENTE CONCLUÍDO - 2/4)
```
EXTRAIR 4 COMPONENTES:

1. [v] src/components/studio/ScriptTimeline.tsx (CONCLUÍDO)
2. [ ] src/components/studio/RenderTerminal.tsx (PENDENTE)
3. [ ] src/components/studio/DNAPanel.tsx (PENDENTE)
4. [v] src/components/studio/DirectorTerminal.tsx (CONCLUÍDO)

REGRAS:
- Import types de src/types/index.ts
- ZERO alteração visual — pixel-perfect antes e depois.
- page.tsx está sendo reduzida progressivamente.
```

✅ TAREFA F2: Error Boundaries (CONCLUÍDO)
```
CRIAR: src/components/ErrorBoundary.tsx
- Criado componente de classe robusto com UI Brutalist.
- Logs integrados.
```

#### TAREFA F3: Corrigir useEffect dependency arrays
```
AUDITAR: page.tsx
GREP: useEffect( 
CADA useEffect deve ter dependency array correto ou comment // eslint-disable-next-line
NÃO mudar comportamento — apenas corrigir warnings
```

---

### 🚀 @devops-engineer — SPRINT 3-4

#### TAREFA D1: CI/CD
```
CRIAR: .github/workflows/ci.yml
STEPS:
  1. Checkout
  2. Setup Node 20
  3. npm ci
  4. npm run lint
  5. npm run build
  6. (futuro) npm test
TRIGGER: push to main, PR to main
```

#### TAREFA D2: Vercel Deploy
```
CRIAR: vercel.json (se necessário)
CONFIGURAR:
  - Framework: Next.js
  - Build: npm run build
  - Env vars: GEMINI_API_KEY, REPLICATE_API_TOKEN, ELEVENLABS_API_KEY
  - Region: syd1 (Sydney — mais perto da Austrália, tema do projeto)
```

#### TAREFA D3: Security Hardening
```
AUDITAR:
  1. Nenhuma API key no frontend (grep -r "API_KEY" src/app/ src/components/)
  2. Rate limiting: criar middleware em src/middleware.ts
  3. CORS: verificar headers nas API routes
  4. Input validation: todas as routes devem usar Zod
```

---

### 🎬 @blender-animator — SPRINT FUTURO (Luxo, não urgente)

#### TAREFA BL1: Modelo 3D do Boomer (quando Felipe solicitar)
```
NÃO INICIAR ATÉ FELIPE PEDIR EXPLICITAMENTE
REFERÊNCIAS: G:\BOOMER AND KEV\Characters\master_boomer.png
REQUISITOS:
  - Mesh low-poly otimizado para EEVEE (GTX 1650, 4GB VRAM)
  - Rigging com armature (corpo + rosto)
  - Blend shapes para: falar, raiva, surpresa, boxear
  - Material PBR (pelo do canguru)
  - Setup de câmera para 6 shot types existentes
OUTPUT: G:\BOOMER AND KEV\Characters\3D\boomer.blend
```

#### TAREFA BL2: Modelo 3D do Kev (quando Felipe solicitar)
```
MESMA estrutura que BL1
REFERÊNCIAS: G:\BOOMER AND KEV\Characters\master_kev.png
DIFERENÇAS: blend shapes para dormir, bocejar, deadpan, beber cerveja
OUTPUT: G:\BOOMER AND KEV\Characters\3D\kev.blend
```

---

### 🎮 @game-developer — SPRINT FUTURO (Expansão)

#### TAREFA G1: Clip Intelligence (quando pipeline estiver autônomo)
```
CRIAR: tools/clip_intelligence.py
INPUT: vídeo final do episódio
OUTPUT:
  - Frame "golden" (thumbnail) baseado em motion + expressão
  - GIF de 3s do momento mais engraçado
  - Variantes por plataforma (9:16, 16:9, 4:5)
DEPENDÊNCIA: opencv-python, ffmpeg
```

---

## 📋 ORDEM DE EXECUÇÃO (IMPERATIVA)

```
FASE 1 — SEM DEPENDÊNCIA DO FELIPE (pode rodar agora):
  ├── B1: Centralizar types
  ├── B2: Consolidar fetchWithRetry  
  ├── B3: Remover @google/generative-ai
  ├── F1: Refatorar page.tsx → 4 componentes
  ├── F2: Error boundaries
  └── F3: Corrigir useEffect deps

FASE 2 — PRECISA DO FELIPE (quando ele fornecer keys):
  ├── B6: Supabase integration
  ├── B4: Pipeline orchestrator
  └── B5: Assembly route

FASE 3 — DEPLOY (quando pipeline funcionar end-to-end):
  ├── D1: CI/CD
  ├── D2: Vercel deploy
  └── D3: Security hardening

FASE FUTURA — LUXO (quando Felipe pedir):
  ├── BL1: Boomer 3D
  ├── BL2: Kev 3D
  └── G1: Clip Intelligence
```

---

## ⚠️ INVARIANTES — NUNCA VIOLAR

1. **ZERO ROXO** — nenhum tom de violeta/purple em CSS ou UI
2. **#FF5F1F** é a cor primária — usar em todos os elementos de destaque
3. **Background #000000 / #0d0d0d** — nunca cinza claro
4. **ALL-CAPS, tracking-widest, italic, font-black** — tipografia
5. **bg-black/40 backdrop-blur-xl** — overlays HUD
6. **API keys NUNCA no frontend** — apenas process.env no server
7. **Retry 3x com backoff** — em todas as chamadas externas
8. **Falha isolada** — falha em 1 cena não bloqueia as outras
9. **Idempotência** — qualquer step pode ser re-executado sem duplicar
10. **Build DEVE compilar** — zero erros TypeScript após cada tarefa

---

## 📁 ARQUIVOS DE REFERÊNCIA OBRIGATÓRIA

| Arquivo | O que contém |
|---------|-------------|
| `gemini.md` | Constituição do projeto (schemas, regras, stack) |
| `findings.md` | Inventário de assets, APIs, dívida técnica |
| `progress.md` | Log de sessões + 23 issues priorizadas |
| `task_plan.md` | Fases V.L.A.E.G. + sprint breakdown |
| `src/data/characters.ts` | DNA dos personagens (FONTE DA VERDADE) |
| `src/lib/script-engine.ts` | Motor de scripts local |
| `G:\BOOMER AND KEV\Characters\` | Imagens de referência master |

---

## 📋 LOG

| Data | Ação |
|------|------|
| 2026-03-29 | Handoff criado por Antigravity para Gemini 3.1 |
