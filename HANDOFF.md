# HANDOFF.md — Registro de Continuidade entre Sessões
# Boomer & Kev Studio | Atualizado: 2026-07-19T19:38 AEST (v3.1)

> 🔄 **Este arquivo é o primeiro ponto de leitura de QUALQUER agente novo.**
> Ele contém o estado exato do projeto, o que foi feito, o que falta, e as regras
> que nunca podem ser quebradas. Atualize-o ANTES de encerrar sua sessão.
>
> **Hierarquia de leitura:** HANDOFF.md → GEMINI.md → CLAUDE.md → AGENTS.md

---

## 🌐 ESTADO ATUAL DA PRODUÇÃO

| Item | Valor |
|------|-------|
| **URL Produção** | **https://boomerandkev.fgss.io** (LIVE, HTTP 200) |
| **VPS** | Hostinger `2.25.182.106`, root SSH, Ubuntu, Nginx 1.24.0 |
| **Processo** | PM2 `boomer-engine` na porta `3001` |
| **Reverse Proxy** | Nginx → `http://127.0.0.1:3001` |
| **SSL** | Let's Encrypt, expira 17/10/2026, auto-renew |
| **Deploy** | `./deploy_studio.sh` (build → rsync → npx pm2 restart) |
| **GitHub** | `fbgouveia/boomer-and-kev-studio` branch `restore-engine` |
| **n8n** | `https://n8n.fgss.io` (mesmo VPS, porta 5678) |
| **Supabase** | `ktysmnltubbfbvyjphdq` (Sydney ap-southeast-2) |
| **Nameservers** | Hostinger nativos (SEM API de DNS — só via hPanel) |

---

## 📂 MAPA DE ARQUIVOS CRÍTICOS

| Arquivo | Função |
|---------|--------|
| `GEMINI.md` | Constituição do projeto (LEI). Leia inteiro. |
| `CLAUDE.md` | Comandos rápidos e filosofia de dev |
| `AGENTS.md` | 26 agentes de produção de conteúdo |
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

## ▶️ RETOMADA IMEDIATA (sessão Claude interrompida por cota, 19/07 noite)

**Onde parou:** F1 do Plano Mestre (artifact `7e32cc32-4b8b-4033-b7fb-259f7247270c`, conversa Claude Code).
Concluídos hoje: WP 1.2 (action bar), 1.3 (VOICE_GATE), 1.5 (balanceamento Kev 4×4 + two-shot master_wide + sonda de duo).
**Commit `4a430ad` tem 1.6 (last-frame chaining) + 1.7 (xfade) IMPLEMENTADOS com build verde, mas:**
1. ✅ **DEPLOYADOS 24/07** — 1.6+1.7 + fix wav2lip em produção (`boomer-engine` restart #5, sentinela GREEN, HTTP 200). Falta validação com render pago (encadeamento 1.6 + lipsync real) — exige OK do Felipe.
2. ✅ **Teste $0 do 1.7 PASSOU (24/07):** ramo xfade valida contra os 4 pilotos crus (têm áudio → risco (a) OK; offsets corretos → risco (b) OK). Falta o e2e real via dev-server (glue) e a validação do 1.6/encadeamento (só com render pago). Detalhes: `progress.md` §011h.
3. F1 restante: WP 1.1 (double-fire brainstorm) e 1.4 (pm2 startup + `N8N_RADAR_SECRET` + arquivar HANDOFF_AMANHA.md + tools mortos).
**Contexto de decisões:** balanceamento provado 5/5 gerações 4×4; encadeamento SÓ entre cenas do mesmo personagem (troca = corte, correto); B-Roll = prints de notícias reais via HyperFrames (WP 4.2, v1 prova de estilo pendente).

## 🔴 PENDÊNCIAS ABERTAS (por prioridade)

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

### 🔴 P0b — Crédito Replicate < US$5 → throttle 6/min (bloqueia render)
- **Sintoma:** render de validação 24/07 (job b66b3c3b) deu 429 na 2ª cena: "rate limit reduzido a 6/min, burst 1, enquanto <US$5 de crédito". Pipeline dispara 8 em paralelo → estoura.
- **Provável causa:** renders autônomos de 20/07 drenaram o saldo.
- **Ações:** (1) 🔴 **PENDENTE — Felipe recarrega crédito Replicate** (única trava restante p/ validar render); (2) ✅ FEITO 24/07: `createKlingPrediction` com retry no 429 honrando `retry_after` (deployado) — creates sequenciais agora pautam na cadência permitida.

### ✅ P0c — Fallback de prod (CORRIGIDO 24/07, deployado)
- **Era:** ao falhar o Kling em prod, o fallback buscava piloto inexistente → "Pilot video missing" enganoso, job FAILED.
- **Fix:** os 2 fallbacks agora, sem piloto (prod), falham com mensagem acionável nomeando a causa real (crédito/rate-limit Replicate) em vez de mascarar como sandbox. Sandbox segue funcionando em dev (pilotos locais).

### ✅ P0 — Wav2Lip 404 (CORRIGIDO 24/07, deployado)
- **Causa-raiz:** o modelo `devxpy/cog-wav2lip` EXISTE (3.6M runs); o 404 era do endpoint `POST /v1/models/{owner}/{name}/predictions`, que só serve modelos oficiais. Community exige `version:` hash, não `model:` nome.
- **Fix:** trocado `model:` → `version: 8d65e3f4f4298520...ed25eef` em `pipeline/run/route.ts` E `ai/sync/route.ts` (input schema `face/audio/pads/smooth/fps` confere). Build verde, deployado.
- **Pendente:** validação com render pago (lipsync real só se prova gastando). Sem regressão: se falhar, cai no mesmo fallback de antes.

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
