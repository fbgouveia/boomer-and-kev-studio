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

## ▶️ RETOMADA IMEDIATA (sessão 24-25/07 — foco: entregabilidade e VIBE)

**Tudo abaixo está commitado+pushed na `restore-engine` (HEAD `525cedc`) e deployado em produção — EXCETO WP 1.6/1.7 (`4a430ad`), que estão na branch com teste $0 aprovado mas ainda NÃO foram para a VPS.**

**JÁ FEITO nesta sessão:**
- ✅ **Commercial Creatives formalizado** — linha de produção interna (não nova subsidiária), schema de briefing, formatos, regras de claims e logo próprio em `public/assets/branding/`.
- ✅ **Formato selecionável 9:16/16:9** (`4c0fde8`) — corrige sujeitos decepados (Kling herdava aspect 16:9 da âncora; agora reframe + target por formato). Ver §P0a.
- ✅ **wav2lip 404 corrigido** (`7f6f36a`, version hash) — MAS lipsync não detecta rosto animal → sempre non-lipsynced (§P0, decisão de arquitetura pendente).
- ✅ **Throttle Kling (429) + fallback de prod** (`db5011f`) — §P0b/P0c.
- ✅ **Direção de voz por personagem + emoção** (`78ddeca`) — fim do settings hardcoded (§P0e).
- ✅ **DESCOBERTA: vibe cômica = camada de áudio** (trilha+SFX+master do Premiere), ausente no pipeline. SFX absorvidos (`1262bbf`/`38d632a`): Funny_Song+Joke_Comedy_Drums+Hilarious_Laugh. Receita do original extraída (§DESCOBERTA GRANDE).
- ✅ **n8n cron DESATIVADO** — incidente de gasto autônomo (9 renders 20+22/07). §incidente.

**PRÓXIMOS PASSOS (ordem sugerida):**
1. **Felipe ouve** os A/B em `04_Delivery/` (voice_ab, audio_ab) + `voice_clone/candidatos/cand6.mp3`.
2. **Clonar voz ideal do Boomer** (cena4) no ElevenLabs → sample pronto em `04_Delivery/voice_clone/boomer_CLONE_*.wav` (23.6s) → Felipe manda `voice_id` → trocar `boomer.voiceId` em characters.ts → deploy.
3. ✅ **Camada de áudio implementada localmente** (bed+ducking+stingers+loudnorm) — A/B em `04_Delivery/audio_ab/`; ainda NÃO deployada.
4. **2 renders de validação** (9:16 + 16:9) já com voz+áudio+framing certos — exige OK $ do Felipe (~US$3-6 cada).
5. **Decidir estratégia de lipsync** (incompatível com rosto animal — §P0).
**Plano vivo antigo:** artifact `7e32cc32-4b8b-4033-b7fb-259f7247270c`. F1 restante: WP 1.1 (double-fire) e 1.4 (higiene).

## 🎧 DESCOBERTA GRANDE (24/07): a vibe cômica era PÓS-PRODUÇÃO DE ÁUDIO
Drive externo **`/Volumes/T5 EVO/BOOMER AND KEV`** = projeto ORIGINAL (10GB): áudios, arte (`_bk`, Firefly), episódios finalizados (`Videos/1.THE OAT MILK BAN/`, `2.AFL X NRL`), projeto **Adobe Premiere** + pasta **`Epidemic Sound`** (SFX/música licenciada) + `Characters/footy` (SFX de comédia).

**Medição prova:** episódio original (oatmilk.mp4) áudio = **LRA 7.8 / mean -19.8 dB / pico 0dB** (mixado, punchy); nosso gerado = **LRA 1.9 / mean -27.3 dB** (TTS cru, sem trilha). O original tinha **trilha cômica + stingers (rufo/risada) + masterização** feitos à mão no Premiere. O pipeline NÃO faz nada disso → por isso a vibe sai chapada. O fix de voz (feito) é ~20% da vibe; os ~80% são essa camada de áudio.

**Já absorvido (trio completo de SFX):** `Funny_Song.mp3` (bed 73.6s) + `Joke_Comedy_Drums.mp3` (rufo 3s) + `Hilarious_Laugh.mp3` (risada 26.8s, extraída de zip em footy) em `public/assets/audio/`. Demo audível (bed+loudnorm) em `04_Delivery/audio_ab/` — subiu mean pra -16.5dB, mas LRA ainda 2.6 (falta ducking + stingers p/ dinâmica). Toda a arte-âncora no drive é 16:9 (sem vertical) — o fix de reframe por crop já cobre isso.

### 🟡 IMPLEMENTADA LOCALMENTE — Camada de áudio cômico no pipeline
`assembleVideo` agora adiciona: (1) **music bed** sob a voz; (2) **ducking** com `sidechaincompress`; (3) rufo em 42% e risada curta em 72% do episódio; (4) masterização `loudnorm=I=-14:LRA=7:TP=-2`; saída AAC 48 kHz. Teste $0 nos quatro pilotos passou: 30.16s, vídeo+áudio; A = -18.11 LUFS/LRA 3.9, B = -14.01 LUFS/LRA 3.3/pico verdadeiro -0.76 dBTP. A/B em `04_Delivery/audio_ab/`. **Falta Felipe ouvir e falta deploy.**

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

### 🔴 P0d — Lipsync incompatível com rosto animal (ver P0 abaixo) — decidir estratégia

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

### 🔴 P0 — LIPSYNC INCOMPATÍVEL com os personagens (achado 24/07, render de validação)
- **404 corrigido** (era endpoint por nome; community exige `version:` hash — trocado em `pipeline/run` + `ai/sync`, deployado). MAS ao rodar de verdade apareceu a causa REAL, nas 8 cenas:
  `LipSync failed: Face not detected! Ensure the video contains a face in all the frames.`
- **Causa estrutural:** wav2lip detecta rosto HUMANO; Boomer/Kev são canguru/coala (rosto animal) → nunca detecta. **Todo episódio cai no fallback non-lipsynced** (boca vem da articulação do próprio Kling + TTS multiplexado por cima, sem sync).
- **Decisão de arquitetura (não é bug):** (1) aceitar sem lipsync [atual]; (2) trocar por lipsync que aceite rosto estilizado/animal (testar latentsync etc. na detecção do focinho); (3) Kling nativo com fala. Validação prova: 1.6 encadeamento ✅, 1.7 transições ✅, throttle ✅, episódio 8 cenas ✅ (MP4 46.6MB no Supabase, job 393ef799).

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
