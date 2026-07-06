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

## 🟢 ESTADO REAL DO CÓDIGO (verificado em 2026-07-06 — motor RESTAURADO)
> Fase 0 (resgate) executada nesta sessão. Branch: **`restore-engine`** (ainda NÃO commitado/mergeado — aguardando ok do Felipe).
- ✅ **Motor restaurado do `f85f8ee`**: `/api/ai/script`, `/api/ai/voice`, `/api/ai/sync`, `/api/ai/interview`, `/api/render`, `/api/render/status` de volta.
- ✅ **Build verde** (`npm run build` — 10 rotas compilam, `tsc --noEmit` limpo). Deps (`replicate`, `zod`) e libs (`fetch-retry`, `validations`) intactas.
- ✅ **Roteiro (Gemini) FUNCIONA** — testado ao vivo: gera 6 cenas com personagens consistentes. HTTP 200, ~15s.
- ✅ **Vídeo (Replicate `kwaivgi/kling-v2.6`)**: token válido (conta `fbgouveia`), modelo acessível. Render funciona — só custa (~$3–6/vídeo) e depende de ordem do Felipe.
- 🔴 **VOZ (ElevenLabs) BLOQUEADA** — API retorna: *"Your subscription has a failed or incomplete payment. Complete the latest invoice to continue usage."* → **Felipe precisa pagar a fatura.** É o ÚNICO bloqueio de caminho crítico (voz → lipsync → vídeo).
- ⚠️ **Discrepância de voiceId**: o código usa vozes de CATÁLOGO (`IKne3meq5aSn9XLyUdCD` = Charlie, `CwhRBWXzGAHq8TQ4Fs17` = Roger), **não** as customizadas `exT9S2.../pqHFr7...` que este doc chamava de "ativo de identidade". Decidir: treinar/plugar vozes custom OU assumir as de catálogo.
- ✅ **Âncora de consistência FUNCIONA**: `characters.ts` aponta `referenceImage` p/ links `/view` do Google Drive; testado — resolvem p/ PNG real (Boomer 1376×768, HTTP 200 `image/png`). O render passa isso como `start_image` do Kling (I2V). Ressalva: frágil se o arquivo virar privado ou passar do limite de vírus-scan do Drive.
- ✅ **Buraco #1 (montagem) TAPADO**: criado `tools/assemble.mjs` (ffmpeg concat → 1 MP4 9:16 1080×1920 30fps). Testado nos clipes reais do piloto (3 cenas → 20.1s, duração exata). Antes NÃO existia montagem — o pipeline gerava clipes soltos.
- 🔴 **Buraco #2 (orquestrador) AINDA ABERTO — de propósito**: o encadeamento script→voz→render→lipsync→montagem não existe (era o monolito deletado; "n8n" é plano, não código). NÃO foi construído porque não dá p/ testar até o ElevenLabs ser pago + ok de gasto no render — construir cego = bug garantido. Construir junto com o 1º run real.
- ⚠️ **Fraquezas de consistência conhecidas** (fonte das "falhas"): 1 referência por cena (cenas WIDE com os 2 ancoram só um); sem encadeamento último-frame→primeiro-frame; sem portão de QA/rejeição. O QA é o que entrega "sem falha".
- ⏳ **Ainda pendente** (não tocado): `page.tsx` monolito (2.003 LOC), `supabase/schema.sql` nunca deployado, `trend-hunter` é STUB mockado. `getDetailedPrompt` está acoplado ao `page.tsx` (cliente) — orquestrador headless vai precisar dela server-side.
- Verificar a verdade a qualquer momento: `git ls-files 'src/app/api/**'` e `git branch`.

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
