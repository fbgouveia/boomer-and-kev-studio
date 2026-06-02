# 🌅 HANDOFF — PRÓXIMA SESSÃO
# Boomer & Kev Studio | Preparado: 2026-06-02 (sessão de revisão estratégica)

> ⚠️ **LEIA ISTO PRIMEIRO. Este é o ponto de partida autoritativo.**
> Os docs antigos (`task_plan.md`, `progress.md`, `findings.md`, `README.md`, `HANDOFF_VLAEG.md`)
> estão **DESATUALIZADOS / INCORRETOS** sobre o estado do código. Não confie neles até serem corrigidos (ver Fase 0).

---

## 🎯 O QUE É O PROJETO (1 linha)
Pipeline autônomo: tópico em alta na Austrália → roteiro → voz → vídeo → montagem → publicação.
Personagens: Boomer (canguru) + Kev (coala). Formato 9:16, 30–60s, p/ TikTok/IG/YT.

---

## 🔴 ESTADO REAL DO CÓDIGO (verificado via git em 2026-06-02)
- O commit `96601cd` ("Sessão 005: Redesign UI") **DELETOU o motor de produção inteiro**:
  `/api/ai/script`, `/api/ai/voice`, `/api/ai/sync`, `/api/ai/interview`, `/api/render`, `/api/render/status`.
- **Restam só 4 rotas**: `/api/ai/brainstorm`, `/api/trends`, `/api/keys/balance`, `/api/cron/trend-hunter` (este último é STUB com dados mockados).
- `page.tsx` ainda é monolito de **2.003 LOC** (docs dizem que foi refatorado — NÃO foi).
- `supabase/schema.sql` existe (4 tabelas) mas **nunca foi deployado**.
- ✅ O motor deletado está VIVO no commit pai **`f85f8ee`** — recuperável com `git checkout f85f8ee -- <rota>`.
- Verificar a verdade a qualquer momento: `git ls-files 'src/app/api/**'`.

---

## ✅ DECISÕES TRAVADAS (acordadas nesta sessão — não revisitar sem motivo)
| Tema | Decisão |
|------|---------|
| Próximo passo do código | **Restaurar do git** (`f85f8ee`), NÃO reescrever |
| Orquestração | **n8n como cérebro central** (substitui o `/api/pipeline/run` monolítico) |
| Backend | Next.js API Routes = funções atômicas (1 tarefa cada), chamadas pelo n8n |
| Banco/Estado | **Supabase** (DB + Storage + Realtime) — mata o localStorage |
| Provedor de vídeo | **Higgsfield** (agregador estilo Replicate) — engine default **Kling 2.6** (= os 85% de consistência já validados). Seedance 2.0 / Kling 3.0 = candidatos a upgrade via bake-off |
| Voz | **ElevenLabs** (voiceIds Boomer `exT9S2...` / Kev `pqHFr7...` = ativo de identidade). NÃO usar áudio nativo dos modelos de vídeo |
| Roteiro | Gemini 2.5 Flash (`v1beta`) |
| Montagem | ffmpeg (concat das 6 cenas) |
| Cadência alvo | **3–5 vídeos/semana** |
| Princípio white-label | Show parametrizado por `showPack` (dado), não hardcode. Semente: `src/data/characters.ts` |
| Estilo | Brutalist Neural Glass (`#FF5F1F`, preto, ZERO roxo) |

---

## 🔲 ITENS ABERTOS (resolver antes ou durante a execução)
1. **Confirmar se Higgsfield expõe API HTTP pública** para o n8n chamar em produção (o MCP é só conveniência da sessão). ← decide a viabilidade da troca. Read-only, sem custo.
2. **Créditos Higgsfield**: conta está free/10 créditos. Felipe põe créditos só na hora de executar.
3. **Desenhar o workflow do n8n nó-a-nó** (webhooks Replicate/Higgsfield, gravação de estado no Supabase, erro de 1 cena não derruba as outras). Usar a skill `n8n-production`.
4. **APIs sociais (TikTok/IG/YT)**: aprovação leva 1–3 semanas → aplicar no Dia 1 em paralelo (gargalo externo).

---

## 🚀 ORDEM DE EXECUÇÃO PARA AMANHÃ
### Fase 0 — Resgate (Dias 1–3) — COMEÇAR POR AQUI
1. `git checkout f85f8ee -- src/app/api/ai/script src/app/api/ai/voice src/app/api/ai/sync src/app/api/ai/interview src/app/api/render`
2. Reintegrar as rotas com a UI nova (resolver conflitos de tipos/imports).
3. **Parametrizar por `showPack`** ao restaurar (não re-chumbar "Boomer & Kev"/`#FF5F1F`/voiceIds).
4. **Corrigir os docs mentirosos** (`task_plan.md`, `progress.md`, `findings.md`) p/ refletir a realidade.
5. ✓ **Critério de aceite:** build verde + **1 vídeo gerado local end-to-end** com qualidade igual ao piloto.

### Depois (não amanhã): Fase 1 Fundação → 2 n8n → 3 Publicação → 4 Endurecimento
(Cronograma completo: ~6 semanas até cadência estável de 3–5/semana. Primeiro vídeo autônomo: semana 3–4.)

---

## 💸 NÚMEROS (referência rápida)
- Custo por vídeo: **~$3–6** (Kling domina o custo).
- Burn mensal a 3–5/sem: **~$150–210**.
- Monetização: patrocínio (personagens já têm "sponsors" nas cenas) > Creator Funds. White-label = receita ano 2+.

---

## 🧭 PRIMEIRA AÇÃO DE AMANHÃ
Decidir entre: **(A)** verificar a API HTTP do Higgsfield primeiro, ou **(B)** desenhar o workflow do n8n nó-a-nó, ou **(C)** executar a Fase 0 (resgate do motor) direto. Recomendação: **(A) → (C)** — confirma o provedor, depois resgata.
