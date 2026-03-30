# findings.md — Descobertas, Pesquisas e Restrições
# Projeto: Boomer & Kev Studio
# Atualizado: 2026-03-28

---

## 🔍 DESCOBERTAS DO AUDIT INICIAL (2026-03-28)

### Estrutura do Projeto
- **Framework**: Next.js 16 App Router com Turbopack
- **Runtime**: Node.js ≥ 18 obrigatório
- **Linguagem**: TypeScript strict (0 erros no último audit 2026-02-24)
- **Design System**: Brutalist Neural Glass — Laranja `#FF5F1F` / Preto / Sem roxo (regra absoluta)

### Rotas API Identificadas (9 rotas)
| Rota | Serviço | Status |
|------|---------|--------|
| `POST /api/ai/brainstorm` | Gemini 2.5 Flash | Ativo |
| `POST /api/ai/script` | Gemini 2.5 Flash | Ativo |
| `POST /api/ai/interview` | Gemini 2.5 Flash | Ativo |
| `POST /api/ai/voice` | ElevenLabs | Ativo |
| `POST /api/ai/sync` | Replicate LipSync | Ativo |
| `POST /api/render` | Replicate Kling v2 | Ativo |
| `GET /api/render/status` | Replicate (poll) | Ativo |
| `GET /api/trends` | Google Trends RSS | Ativo |
| `POST /api/keys/balance` | ElevenLabs balance check | Ativo |

### Chaves de API (verificadas no .env.local)
- `GEMINI_API_KEY` — presente ✅
- `REPLICATE_API_TOKEN` — presente ✅
- `ELEVENLABS_API_KEY` — NÃO presente no .env.local ⚠️ (pode estar ausente ou inline)

### Personagens DNA
- **Boomer**: Canguru musculoso, voz profunda Queensland, boxing gloves, `voiceId: exT9S2zWNo7lSxSrsD73`
- **Kev**: Coala deadpan, voz lenta nasal, stubby holder, `voiceId: pqHFr7yk3tS6H7G4Umlf`

### Tipos de Shot
6 tipos: WIDE, BOOMER_MCU, KEV_CU, OTS_BOOMER, LOW_ANGLE_BOOMER, GOPRO_FISHEYE

### Componentes Frontend
- `page.tsx` — UI Principal (3 tabs: Director, Production, Engine DNA)
- `DraftingTable.tsx` — HUD de rascunho com Brutalist Neural Glass
- `TrendsFeed.tsx` — Feed de trends australianas

### Resilência Neural Link
- 3 retries automáticos com backoff exponencial (1s → 2s → 3s) em todas as rotas AI
- Frontend extrai `retryAfter` de respostas 429 e mostra countdown

### PDF Export v2.7
- `downloadScenePromptPDF()` — card por cena
- `exportToPDF()` — manifesto master (6 cenas)
- Proteção contra overflow com `splitTextToSize` e `addPage()` automático

---

## ⚠️ RESTRIÇÕES IDENTIFICADAS

1. **ElevenLabs key ausente no .env.local** — verificar se está em outra variável
2. **Modelo Gemini crítico**: Usar APENAS `v1beta` + `gemini-2.5-flash`. Modelos mais antigos podem retornar 404
3. **Fase 5 PLAN.md pendente**: Maestro Review da UI não concluída
4. **18 warnings ESLint**: Tags `<img>` intencionais (não migradas para `next/image`) — decisão consciente
5. **Sem testes E2E Playwright configurados**: scripts existem mas não há suíte configurada
6. **Sem deploy configurado**: projeto ainda em ambiente local apenas
7. **Google Trends RSS**: dependência de serviço externo não autenticado — pode ser bloqueado

---

## 📁 ARQUIVOS-CHAVE PARA REFERÊNCIA

```
src/data/characters.ts          — DNA dos personagens (FONTE DA VERDADE)
src/lib/script-engine.ts        — Tipos ScriptEngine e DirectorialIntelligence
src/lib/validations.ts          — Schemas Zod
src/app/page.tsx                — UI principal + getDetailedPrompt()
src/app/api/ai/script/          — Motor de geração de script
src/components/Director/DraftingTable.tsx — HUD principal
.agent/rules/GEMINI.md          — Regras do Antigravity Kit
.agent/ARCHITECTURE.md          — Mapa de agentes/skills
```

---

## ✅ FASE 2 — LINK (Verificado 2026-03-28)

| Serviço | Status | Detalhe |
|---------|--------|---------|
| Gemini 2.5 Flash (`v1beta`) | **OK** | Resposta confirmada |
| Replicate `kwaivgi/kling-v2.6` | **OK** | Conta @fbgouveia, version b13f36d... |
| ElevenLabs | **PENDENTE** | Chave não disponível ainda |
| Supabase | **PENDENTE** | Não configurado ainda |
| Social APIs (TikTok/Instagram/YouTube) | **PENDENTE** | Contas não prontas ainda |

**Finding crítico:** Cloudflare bloqueia requests Python sem `User-Agent: replicate-python/1.0.0`. Fix aplicado em `tools/verify_replicate.py`.

---

## 🔬 PESQUISA A FAZER (Fase 1 — Visão)
- [x] ~~Verificar repositórios GitHub com automações para pipelines podcast-to-video~~
- [x] ~~Verificar integrações possíveis com Supabase para persistência de scripts~~
- [ ] Verificar WhatsApp Agent Blueprint (arquivo `whatsapp-agent-blueprint.md` existe no projeto)
- [ ] Verificar `clara-knowledge-base.md` e `clara-triggers-library.md` — indica integração com Clara

---

## 🔍 AUDITORIA V.L.A.E.G. INTEGRAL (2026-03-29)

### Inventário Atualizado
- **17 arquivos-fonte** auditados | **4,800+ LOC** | **270KB**
- **7 API routes** operacionais (voice bloqueada por key)
- **3 componentes** UI (page.tsx monolito + DraftingTable + TrendsFeed)
- **2 libs** (script-engine.ts + validations.ts)
- **2 data files** (characters.ts + calendar.ts)
- **2 tools Python** (verify_gemini.py + verify_replicate.py)

### Estado das APIs (atualizado 2026-03-29)
| Serviço | Credencial | Status |
|---------|-----------|--------|
| Gemini 2.5 Flash | `GEMINI_API_KEY` | 🟢 ATIVO |
| Replicate Kling v2.6 | `REPLICATE_API_TOKEN` | 🟢 ATIVO |
| ElevenLabs | `ELEVENLABS_API_KEY` | 🔴 AUSENTE |
| Supabase | Todas keys | 🔴 NÃO EXISTE |
| TikTok Creator | OAuth | 🔴 NÃO EXISTE |
| Instagram Graph | OAuth | 🔴 NÃO EXISTE |
| YouTube Data v3 | OAuth | 🔴 NÃO EXISTE |

### Dívida Técnica Crítica
1. **`page.tsx` Monolito** — Originalmente 2,659 LOC. Sendo fragmentado progressivamente (Fase 1 Sprint 1).
   - [x] `DirectorTerminal.tsx` extraído ✅
   - [x] `ScriptTimeline.tsx` extraído ✅
   - [ ] `RenderTerminal.tsx` (Pendente)
   - [ ] `DNAPanel.tsx` (Pendente)
2. **`@google/generative-ai`** — REMOVIDO do package.json ✅
3. **`fetchWithRetry`** — Centralizado em `src/lib/fetch-retry.ts` ✅
4. **API keys no localStorage** — PENDENTE migração para env/Supabase
5. **Polling 4s** — PENDENTE substituição por webhooks Replicate

### Consistência de Personagens — Decisão (ATUALIZADO 2026-03-29 23:05)
- **Resultado dos testes do Felipe:** ~85% consistência com Kling + referências ✅
- **Mudança de estratégia:** Consistência NÃO é mais o problema principal
- **Foco agora:** Automatizar o pipeline ao redor do que já funciona
- **Blender 3D:** Rebaixado para upgrade de luxo futuro (não urgente)
- **LoRA:** Descartada — desnecessária (85% já supera a estimativa de LoRA)
- **IP-Adapter:** Já funciona nativamente via `subject_reference` no Kling v2.6

### Conformidade Visual
- **Brutalist Neural Glass: 100% conforme** ✅
- `#FF5F1F` usado em todos os componentes
- Zero presença de roxo/violeta
- Background `#000000` / `#0d0d0d` / `#050505` correto
- Typography ALL-CAPS, tracking-widest, italic, font-black consistente

---

## 📦 INVENTÁRIO DE ASSETS (G:\BOOMER AND KEV) — 2026-03-29

### Referências Master (`Characters/`)
| Arquivo | Descrição | Tamanho |
|---------|-----------|---------|
| `master_boomer.png` | MCU Boomer — referência canônica | 1.7MB |
| `master_kev.png` | CU Kev — referência canônica | 1.9MB |
| `master_wide.png` | WIDE (os dois juntos) — referência canônica | 1.7MB |
| `master_boomer_bk.jpeg` | Backup Boomer | 130KB |
| `master_kev_bk.jpeg` | Backup Kev | 206KB |
| `master_wide_bk.jpeg` | Backup Wide | 182KB |

### Variante Temática (`Characters/footy/`)
| Arquivo | Descrição | Tamanho |
|---------|-----------|---------|
| `master_boomer.png` | Boomer NRL jersey "AFL SUCKS" | 3.4MB |
| `master_kev.png` | Kev AFL scarf | 14.5MB |
| `master_scenario.png` | Cenário footy completo | 12.6MB |

### Episódios Produzidos
| Episódio | Status | Vídeo Final | Assets |
|----------|--------|-------------|--------|
| **Piloto** | ✅ MONTADO | `Piloto/piloto.mp4` (48MB) | 4 cenas + Premiere Pro |
| **Ep.1 "The Oat Milk Ban"** | ✅ MONTADO | `Videos/1.../final.mp4` (13MB) | 5 renders Replicate + Premiere |
| **Ep.2 "AFL X NRL"** | ⚠️ PARCIAL | `Videos/2.../cena1.mp4` (22MB) | Outfits PSD + master refs |

### Premiere Pro Projects
- `Piloto/boomer and kev.prproj` (57KB)
- `Videos/1.../boomer and kev.prproj` (73KB)
- `Characters/footy/video/boomer and kev.prproj` (40KB)

### Sound FX Library (`Characters/footy/video/`)
- `funny-song-2025-01-16` — música de comédia
- `hilarious-laugh-1-2025-08-27` — risada
- `joke-drumroll-2025-08-27` — drumroll

### PDFs/Manifestos Gerados
- `Piloto/BK-MANIFEST-*.pdf` — manifesto do piloto
- `Videos/1.../BK-MANIFEST-*.pdf` — manifesto ep.1
- `Videos/2.../BK-MANIFEST-*.pdf` — manifesto ep.2
- `Videos/2.../PROMPT-SCENE-1-BOOMER.pdf` — prompt de cena

> **CONCLUSÃO:** O projeto já tem 2 episódios produzidos + 1 piloto montado.
> As referências master (3 ângulos canônicos) estão prontas e organizadas.
> O pipeline funciona — o gargalo é automação, não produção.
