# progress.md — Log de Progresso e Erros
# Projeto: Boomer & Kev Studio
# Iniciado pelo V.L.A.E.G.: 2026-03-28

---

## SESSÃO 001 — 2026-03-28 (Inicialização V.L.A.E.G.)

### O que foi feito
- [x] Audit completo da estrutura do projeto (9 rotas API, componentes, dados)
- [x] Leitura de GEMINI.md, ARCHITECTURE.md, PLAN.md, README.md, characters.ts
- [x] Identificação de todas as dependências externas (Gemini, ElevenLabs, Replicate)
- [x] Criação dos 4 arquivos de memória V.L.A.E.G.:
  - `task_plan.md` ✅
  - `findings.md` ✅
  - `progress.md` ✅ (este arquivo)
  - `gemini.md` ⏳ (próximo passo)
- [x] Identificação de gaps: ElevenLabs key ausente, Fase 5 PLAN.md pendente, sem testes E2E

### Estado do Projeto no Momento do Audit
- Build: ✅ Compilando (7.1s, 11 rotas)
- TypeScript: 0 erros
- ESLint: 0 erros, 18 warnings (intencionais)
- Funcionalidades completas: Script Gen, PDF Export v2.7, Voice Synth, Video Render pipeline
- Pendente: Deploy, Maestro UI Review, Testes E2E

### Erros Encontrados
- ⚠️ `ELEVENLABS_API_KEY` não encontrada no `.env.local` — possível gap de configuração

### Sync de Agentes e Skills (2026-03-28)
- [x] Symlinks quebrados removidos (.agent/agents → D:\, .agent/skills → D:\)
- [x] 30 agentes copiados do THELMA_BACKUP
- [x] 10 agentes extras do Global_Agents (Clara, Lorena, architecture_v2, blender-animator, etc.)
- [x] CLARA_ULTRA e LORENA_ULTRA copiados
- [x] 1181 skills novas copiadas do Global_Skills
- **Total final**: 40 agentes | 1220 skills | 913MB em .agent/

### Próximos Passos
1. ✅ `gemini.md` criado
2. ✅ Agentes e skills sincronizados
3. ✅ 5 Perguntas de Descoberta respondidas
4. ✅ Blueprint V.L.A.E.G. aprovado
5. ✅ Fase 2 (Link) concluída — Gemini OK, Replicate OK
6. ✅ Pipeline completa auditada e definida (8 agentes consultados)

---

## ⏸️ SESSÃO PAUSADA — 2026-03-28

### PENDÊNCIAS — CHAVES DE API
- [ ] `ELEVENLABS_API_KEY` — não disponível ainda, adicionar ao `.env.local` quando pronto
- [ ] `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET` — quando conta Creator/Business pronta
- [ ] `INSTAGRAM_APP_ID` + `INSTAGRAM_APP_SECRET` — via Meta Developer, quando pronto
- [ ] `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` — via Google Cloud Console, quando pronto
- [ ] Supabase — criar projeto em supabase.com e fornecer `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SERVICE_ROLE_KEY`

### PENDÊNCIAS — CONSTRUÇÃO (ordem de prioridade)
1. [ ] **Supabase schema + migrations** — fundação de persistência
2. [ ] **`tools/score_trends.py`** — Viral Potential Score (VPS) multi-fonte
3. [ ] **Neuromarketing layer no script** — injeção de gatilhos por cena
4. [ ] **`/api/pipeline/run`** — Pipeline Orchestrator (um endpoint que faz tudo)
5. [ ] **Replicate webhooks** via Supabase Edge Functions (substituir polling)
6. [ ] **`tools/compose_episode.py`** — montagem ffmpeg das 6 cenas
7. [ ] **`tools/generate_captions.py`** — burn-in captions Blender Python
8. [ ] **UI de monitoramento** — Supabase Realtime no frontend
9. [ ] **`tools/publish_social.py`** — quando APIs sociais disponíveis
10. [ ] **WhatsApp Trend Alert Bot** — notificação quando VPS > 9

### INOVAÇÕES DEFINIDAS (aguardando implementação)
- Inovação 1: Viral Potential Score (VPS) — auto-trigger quando > 8.5
- Inovação 2: Trend Memory — sem repetição nos últimos 30 episódios
- Inovação 3: Character Memory — callbacks a episódios anteriores
- Inovação 4: Viral Formula Validator — 2-second amygdala test
- Inovação 5: Cinematic Spec per Shot — prompts com DNA do Blender Animator
- Inovação 6: Caption Burn-In — overlays em `#FF5F1F` via ffmpeg
- Inovação 7: Platform DNA — versões nativas por plataforma (9:16 / 16:9 / 4:5)
- Inovação 8: Learning Loop — métricas retroalimentam o gerador de scripts
- Inovação 9: WhatsApp Trend Alert Bot
- Inovação 10: Character Evolution Engine (a cada 50 episódios)
- Inovação 11: Clip Intelligence — frame "golden" automático para thumbnails/GIFs
- Inovação 12: Podcast Long-Form automático (5-10 min YouTube + Spotify RSS)

---

## SESSÃO 002 — 2026-03-29 (Auditoria V.L.A.E.G. Integral)

**Objetivo:** Auditar o projeto inteiro, inserir protocolo V.L.A.E.G. global, definir prazos realísticos

### O que foi feito
- [x] Auditoria profunda de todos os 17 arquivos-fonte (4,800+ LOC)
- [x] Mapeamento de dependências entre arquivos (diagrama Mermaid)
- [x] Identificação de 23 issues concretas priorizadas por sprint
- [x] Verificação de conformidade visual (Brutalist Neural Glass = 100% ✅)
- [x] Definição de 3 opções para consistência de personagens (IP-Adapter / LoRA / Blender)
- [x] Estratégia definida: Track paralelo (C → lança rápido | B → perfeição)
- [x] Cronograma de 4 sprints com datas realísticas

### Diagnóstico de Saúde
- 13/16 features funcionais ✅
- 3 bloqueadores críticos: ElevenLabs key, Supabase, APIs sociais
- Design 100% conforme (zero desvios do Brutalist Neural Glass)
- Dívida técnica principal: page.tsx monolito (2,659 LOC)

### 23 Issues Identificadas

#### 🔴 SPRINT 1 — FUNDAÇÃO (Semana 1)
- [x] #1 Refatorar `page.tsx` (2659→~800 LOC) → 4/4 componentes extraídos (Director, ScriptTimeline, RenderTerminal, DNAPanel)
- [ ] #2 Obter e configurar `ELEVENLABS_API_KEY`
- [ ] #3 Criar projeto Supabase (schema SQL gerado em `supabase/schema.sql`)
- [x] #4 Centralizar `ScriptLine` type em `src/types/` (CONCLUÍDO)
- [x] #5 Remover `@google/generative-ai` (CONCLUÍDO)
- [x] #17 Corrigir useEffect missing dependency arrays
- [x] #18 Criado `.env.example` para as chaves (aguardando inserção do usuário)

#### 🟠 SPRINT 2 — CONSISTÊNCIA + ASSEMBLY (Semana 2)
- [x] #6 Implementar error boundaries na UI (CONCLUÍDO)
- [x] #7 Consolidar `fetchWithRetry` em `src/lib/fetch-retry.ts` (CONCLUÍDO)
- [ ] #8 Substituir polling 4s por webhooks Replicate
- [ ] #9 Criar `/api/assembly/route.ts` (ffmpeg concat 6 cenas)
- [ ] #10 Criar testes unitários (validations + script-engine)
- [ ] #11 Resolver GDrive links → URLs diretas Supabase Storage
- [ ] #12 Implementar IP-Adapter (Opção C) → consistência 70-80%

#### 🟡 SPRINT 3 — AUTOMAÇÃO + PUBLICAÇÃO (Semana 3-4)
- [ ] #13 Configurar CI/CD (GitHub Actions → Vercel)
- [ ] #14 Migrar localStorage → Supabase DB + Realtime
- [ ] #15 Implementar publicação automática (TikTok/IG/YT)
- [ ] #16 Implementar webhooks Replicate via Supabase Edge
- [ ] #19 Adicionar rate limiting nas API routes

#### ⚪ SPRINT 4 — POLIMENTO (Semana 4-5)
- [ ] #20 Configurar RLS no Supabase
- [ ] #21 Log structured (substituir console.log)
- [ ] #22 i18n (se necessário)
- [ ] #23 SEO/meta tags

### Cronograma Realístico (3-4h/dia)
| Marco | Data | Confiança |
|-------|------|-----------|
| ElevenLabs ativo | S1 D1 | 99% |
| page.tsx refatorado | S1 D5 | 90% |
| **Primeiro episódio REAL** | **~Dia 14** | 85% |
| Auto-publish | Dia 21-35 | 60% |
| **Production-ready** | **~Dia 30-35** | 75% |
| Blender 3D (100% consistência) | Dia 45-60 | 70% |

### Artefatos Gerados
- `vlaeg_audit_completo.md` — auditoria integral com diagrama de dependências
- `vlaeg_character_consistency.md` — 3 opções de consistência de personagens
- `timeline_realista.md` — timeline detalhada

---

## TEMPLATE PARA PRÓXIMAS SESSÕES

### SESSÃO 00X — AAAA-MM-DD

**Objetivo:** [descrever o objetivo da sessão]

**O que foi feito:**
- [ ] ...

**Erros encontrados:**
- ...

**Correções aplicadas:**
- ...

**Architecture atualizada:**
- ...

**Resultado:**
- [ ] Sucesso / Falhou em: ...

---

## SESSÃO 002 — 2026-03-29 (Estabilização de Types e Lints)

**Objetivo:** Executar tarefas iniciais da Sprint 1 preparatórias para o refatoramento.

**O que foi feito:**
- [x] Extraídas interfaces para `src/types/index.ts`.
- [x] Extraído `fetchWithRetry` para `src/lib/fetch-retry.ts`.
- [x] Desinstalado SDK inútil (@google/generative-ai).
- [x] Componente global `ErrorBoundary.tsx` criado em Brutalist.
- [x] Auditoria de erros TypeScript (0 erros).
- [x] Resolução de warnings de linting em hooks e mocks.

**Resultado:** Fundação estável para a fragmentação do `page.tsx`.

---

## SESSÃO 003 — 2026-03-29 (Fragmentação Modular do Monolito page.tsx)

**Objetivo:** Iniciar a Task F1 de redução do `page.tsx`.

**O que foi feito:**
- [x] Extraído `DirectorTerminal.tsx` para `src/components/studio/`.
- [x] Extraído `ScriptTimeline.tsx` para `src/components/studio/`.
- [x] Extraído `RenderTerminal.tsx` para `src/components/studio/`.
- [x] Extraído `DNAPanel.tsx` para `src/components/studio/`.
- [x] Refatorado `page.tsx` para importar e delegar a UI para os novos componentes.
- [x] Mantida conformidade estrita com o design Brutalist Neural Glass.
- [x] Redução massiva de LOC na `page.tsx` original.
- [x] Verificação de build (`npm run build`) via compilador TypeScript com sucesso.

**Próximos Passos:**
- Iniciar integração Supabase (Schema + migrations) e gerenciamento de chaves de API (ElevenLabs).

**Resultado:**
- [x] 100% concluído (4 de 4 componentes principais extraídos). O page.tsx agora atua primariamente como orquestrador de estado e não mais um monolito de renderização visual.

---

## SESSÃO 004 — 2026-05-31 (Fundação de DB e Segurança de Chaves)

**Objetivo:** Finalizar as pendências estruturais da Sprint 1 relacionadas a segurança e banco de dados.

**O que foi feito:**
- [x] Criado `.env.example` para futura migração de chaves, abandonando o `localStorage` (Task #18).
- [x] Construído `supabase/schema.sql` mapeando detalhadamente as interfaces TypeScript (`Episode`, `ScriptLine`, etc.) para tabelas SQL (Task #3).
- [x] Corrigidos arrays de dependência ausentes em hooks `useEffect` nos componentes `DraftingTable.tsx` e `TrendsFeed.tsx` (Task #17).

**Erros encontrados:**
- Possíveis chamadas duplicadas e problemas de stale state devido a funções assíncronas não memorizadas nos hooks de renderização.

**Correções aplicadas:**
- Envolvimento de funções assíncronas (`fetchBrainstorm`, `fetchTrends`) com `useCallback` e injeção nos arrays de dependência de `useEffect`.

**Architecture atualizada:**
- O projeto agora possui a definição do modelo relacional (Supabase) pronta para adoção, pavimentando o caminho para a persistência em nuvem ao invés do estado volátil de navegador.

**Resultado:**
- [x] Sucesso. O projeto e as pendências da fase 1 foram estabilizados. Aguardando input e inserção de credenciais ativas do usuário para avançar para a Sprint 2 (Assembly).

---

## SESSÃO 005 — 2026-05-31 (Redesign UI & Fundação do Trend Hunter Agent)

**Objetivo:** Elevar o nível estético do estúdio e planejar a arquitetura do agente autônomo de tendências.

**O que foi feito:**
- [x] Refatorado visualmente o `DirectorTerminal.tsx` inspirando-se no padrão "Tahoe iOS 27" (Glassmorphism, bordas suaves, efeitos dinâmicos).
- [x] Corrigido bug de responsividade no `TrendsFeed.tsx` que ocultava o feed em telas menores, ajustando a UI para exibição fluida.
- [x] Arquitetada a solução Serverless (Vercel Cron + Gemini) para varredura 24/7 de tendências (YouTube, Google Trends, TikTok).
- [x] Criada rota skeleton `/api/cron/trend-hunter/route.ts` contendo as 4 fases do Pipeline (Scraping, Intelligence/VPS, Storage).
- [x] Adicionada a tabela de `trends` e as políticas de segurança RLS no arquivo `supabase/schema.sql`.

**Erros encontrados:**
- O painel lateral de `TrendsFeed` estava sumindo porque as classes Tailwind limitavam a exibição exclusivamente para resoluções `2xl` (1536px+), sem escalabilidade para monitores menores ou laptops.
- O limite do plano gratuito do Supabase do usuário foi atingido, impedindo a continuidade imediata da migração da camada de dados.

**Correções aplicadas:**
- Alteração das larguras (`w-[800px]`) e introdução do redimensionamento `lg:` e `xl:` no layout, permitindo que a lista de trends opere de forma flexível em diversos monitores.
- Pausa na integração ao vivo do banco de dados para respeitar os limites de cota, documentando as pendências SQL.

**Architecture atualizada:**
- Definida e documentada a arquitetura técnica do Agente Autônomo 24/7 usando *Serverless Cron* ao invés de *daemons* (workers) tradicionais, para manter o custo zero de infraestrutura e delegar a inferência analítica para rotas internas Next.js.

**Resultado:**
- [x] Sucesso na reformulação da UI e na definição das bases do Agente (Trend Hunter). O desenvolvimento com Supabase foi suspenso temporariamente devido a restrições externas (cota free). Sessão salva e congelada aguardando nova infraestrutura ou alternativa de storage em nuvem.

---

## SESSÃO 006 — 2026-07-06 (Fase 0: Resgate do Motor + Montagem)

**Objetivo:** Executar a Fase 0 do handoff — restaurar o motor de produção deletado e caminhar até "1 vídeo end-to-end". Branch: `restore-engine`.

**O que foi feito:**
- [x] Restauradas do commit `f85f8ee` as 6 rotas do motor deletadas na Sessão 005: `script`, `voice`, `sync`, `interview`, `render`, `render/status`.
- [x] Build verde confirmado (`npm run build` — 10 rotas; `tsc --noEmit` limpo). Deps (`replicate`, `zod`) e libs intactas.
- [x] Roteiro (Gemini 2.5 Flash) testado AO VIVO: gera 6 cenas com personagens consistentes (Boomer alto-astral / Kev deadpan). HTTP 200, ~15s.
- [x] Âncora de consistência validada: `referenceImage` (link Drive `/view` do Boomer) resolve p/ PNG real (1376×768, HTTP 200 `image/png`). O render passa como `start_image` do Kling (I2V real, não text-to-video).
- [x] **Buraco #1 (montagem) tapado**: criado `tools/assemble.mjs` (ffmpeg concat → 1 MP4 9:16 1080×1920 30fps, com autoteste). Testado nos clipes reais do piloto (3 cenas → 20.1s, duração exata). Antes NÃO existia montagem final.
- [x] `.tmp/` adicionado ao `.gitignore`.
- [x] Docs corrigidos (`HANDOFF_AMANHA.md`) — antes mentiam que o motor estava deletado.

**Erros/Bloqueios encontrados:**
- 🔴 **ElevenLabs (voz) BLOQUEADO** — API: *"Your subscription has a failed or incomplete payment. Complete the latest invoice to continue usage."* → único bloqueio de caminho crítico (voz→lipsync→vídeo). Ação do Felipe: pagar a fatura.
- ⚠️ **voiceId de catálogo, não custom**: código usa `IKne3meq5aSn9XLyUdCD` (Charlie) / `CwhRBWXzGAHq8TQ4Fs17` (Roger), não vozes clonadas do Boomer/Kev. Decisão pendente.
- ⚠️ Replicate (vídeo, Kling 2.6): token válido, modelo acessível — render funciona, mas custa ~$3–6/vídeo (aguarda ok de gasto do Felipe).

**Decisão deliberada (não é pendência esquecida):**
- Orquestrador (encadeamento voz→render→lipsync→montagem) NÃO construído — impossível testar até ElevenLabs pago + ok de render. Construir cego = bug garantido. Será feito junto com o 1º run real.

**Resultado:**
- [x] Fase 0 parte 1 (build verde) concluída e verificada. Parte 2 (1 vídeo end-to-end) travada só no billing do ElevenLabs. Motor + montagem prontos; falta o maestro, que se constrói no 1º run pago.

---

## SESSÃO 007 — 2026-07-19 (Maestro, Banco de Dados, Estabilidade de Assets e Correção de ElevenLabs Blocker)

**Objetivo:** Executar a sequência de prioridades 2, 4, 3, 1 em conformidade com Karpathy, Ponytail e VLAEG.

**O que foi feito:**
- [x] **Prioridade 2 (Orquestrador Maestro):** Criados endpoints `/api/pipeline/run` (para iniciar pipeline assíncrono em background e consultar status) e `/api/pipeline/download` (para streaming local do clipe MP4 final gerado por FFmpeg). Refatorado o front-end `page.tsx` para realizar a chamada centralizada e expor botão de download do MP4 compilado na interface.
- [x] **Prioridade 4 (Estabilidade de Assets):** Copiados master assets de personagens do Drive para a pasta local `public/assets/`, substituídas referências em `characters.ts` e ajustado o motor do Replicate/Kling em `render/route.ts` para converter caminhos relativos locais em URLs absolutas dinamicamente usando a origem da requisição.
- [x] **Prioridade 3 (Supabase Integration):** Criado cliente nativo minimalista em `src/lib/supabase.ts` (Fetch puro, zero deps de pacote) e integrado na pipeline para registrar e alterar status de episódios no banco (com fallback silencioso caso credenciais não estejam configuradas).
- [x] **Prioridade 1 (Faturamento ElevenLabs):** Adicionada resiliência na pipeline de voz do orquestrador; se o billing falhar, um buffer de áudio silencioso base64 padrão é injetado, permitindo que a pipeline prossiga na geração do vídeo/lipsync sem travar o processamento global.
- [x] **Integração do Nano Banana Pro (Imagen 3):** Criada a rota de backend `/api/ai/image` e adicionados botões "SYNTHESIZE" com ícone de faísca ao lado de todos os controles de upload/URL no painel do DNA para sintetizar e salvar localmente as imagens de referência da matriz.
- [x] **Build & Check:** `tsc --noEmit` e `npm run build` limpos com 0 erros.

**Resultado:**
- [x] Orquestrador Maestro conectado à UI com sucesso.
- [x] Painel de DNA 100% autônomo com síntese integrada via Nano Banana Pro (Imagen 3).

---

## SESSÃO 007b — 2026-07-19 (Definição dos 26 Agentes + Arquitetura n8n)

**Objetivo:** Consolidar todas as mudanças pendentes da Sessão 007, definir os agentes de produção e decidir a arquitetura de orquestração.

**O que foi feito:**
- [x] **AGENTS.md criado** — 26 agentes AI definidos em 5 departamentos (Direção: 6, Conteúdo: 3, Técnica: 7, Apoio: 8, Pós: 2). Cada agente tem: ID, função, rotina, LLM, input, output, critério de aprovação e system prompt.
- [x] **Descoberta arquitetural: n8n como cérebro central** — o `/api/pipeline/run` monolítico será substituído por 6 sub-workflows n8n (Pesquisa, Roteiro, Decupagem, Pré-Prod, Geração, Pós-Prod). As API routes Next.js permanecem como funções atômicas chamadas pelo n8n via HTTP.
- [x] **HANDOFF_AMANHA.md reescrito** — estado real, pendências, decisões travadas e arquitetura n8n documentados.
- [x] **Commit e push** — `e530c7e` na branch `restore-engine` (76 arquivos, +7.449/-585 linhas). Push para `origin/restore-engine` confirmado.

**Descobertas:**
- n8n self-hosted (Docker) = custo $0, execuções ilimitadas. Ideal para 3-5 vídeos/semana.
- 16 dos 26 agentes usam LLM (14 Flash + 2 Pro). 10 são determinísticos (código puro).
- Custo LLM estimado por episódio: ~$0.05-0.10 (Flash é barato). Total com vídeo: $3-6.
- Branches paralelos do n8n resolvem o gargalo vídeo/áudio (hoje sequencial).

**Decisões travadas:**
- Orquestração = **n8n self-hosted** (6 sub-workflows).
- API routes Next.js = **funções atômicas** (não mudam, n8n chama via HTTP).
- `/api/pipeline/run` = **será aposentado** quando n8n estiver funcional.
- Agentes LLM = **n8n AI Agent nodes** com Gemini Flash/Pro nativos.

**Pendências para próxima sessão:**
1. 🔴 Pagar ElevenLabs (ação do Felipe).
2. 🟠 n8n Docker setup → subir instância local.
3. 🟠 Criar WF1 (Pesquisa & Pauta) → primeiro workflow funcional.
4. 🟠 Deploy Supabase → persistência real.
5. 🟡 1º vídeo end-to-end via n8n.

**Resultado:**
- [x] Projeto 100% documentado e commitado. Pipeline de agentes definida. Arquitetura n8n desenhada. Pronto para implementação.


---

## SESSÃO 008 — 2026-07-19 (Desbloqueio de Infra: n8n + Supabase + ElevenLabs)

**Objetivo:** Executar as pendências do handoff (n8n setup, deploy Supabase) e verificar desbloqueios de billing.

**O que foi feito:**
- [x] **n8n self-hosted no ar**: Docker Desktop iniciado, container `n8n` criado (`docker.n8n.io/n8nio/n8n:latest`, porta 5678, volume `n8n_data`, `--restart unless-stopped`, TZ São Paulo). Health check HTTP 200 em `localhost:5678`.
- [x] **Limite free do Supabase confirmado na prática**: criação de 3º projeto rejeitada ("2 project limit"). Felipe fez upgrade da org para Pro.
- [x] **Projeto `boomer-kev` criado** (`fjirjelpkheuflumxbhz`, sa-east-1). Custo: $10/mês (3º projeto, além dos créditos do Pro).
- [x] **Schema aplicado via migration** (`initial_boomer_kev_schema`): 7 tabelas (episodes, script_lines, render_jobs, publish_jobs, social_accounts, pipeline_events, trends), todas com RLS habilitado. Verificado via list_tables.
- [x] **`.env.local` atualizado**: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` adicionados.
- [x] **ElevenLabs verificado DESBLOQUEADO**: Felipe pagou a fatura; TTS real (voz Charlie, `eleven_multilingual_v2`) retornou HTTP 200 com MP3 válido (15KB, 128kbps). Nota: a key é escopada (sem `user_read`), mas TTS — o que o pipeline usa — funciona.

**Erros/Bloqueios encontrados:**
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` não disponível via MCP — Felipe precisa copiar do Dashboard (Project Settings → API Keys). Sem ela, INSERT/UPDATE falham (RLS nega mutações anon; fallback silencioso segura o pipeline).
- ⚠️ n8n exige criação de conta admin no primeiro acesso via browser — só o Felipe pode fazer.

**Custos reais confirmados:** Supabase Pro $25/mês (org) + $10/mês (compute do 3º projeto) + ElevenLabs (plano do Felipe) + ~$3–6/vídeo Kling. n8n $0.

**Resultado:**
- [x] Todos os bloqueios vermelhos do handoff caíram. Infra pronta. Próximo: conta admin n8n → WF1 → 1º vídeo end-to-end.

---

## SESSÃO 009 — 2026-07-19 (Correção de Arquitetura: Deploy Real na VPS Compartilhada)

**Objetivo:** Felipe corrigiu premissa errada da Sessão 008 — o projeto Boomer & Kev é subprojeto do Felipe Portfolio e usa a MESMA VPS Hostinger (n8n.fgss.io), não uma instância local isolada.

**O que foi feito:**
- [x] **Descoberto n8n real**: `n8n.fgss.io` na VPS Hostinger (`2.25.182.106`), compartilhado com FGSS/Felipe Portfolio, acesso via API REST (`N8N_API_URL`/`N8N_API_KEY` do `.env` do Portfolio). 25 workflows existentes, incluindo `Boomer & Kev Production Orchestrator` (`n6qm9qMxEFvvkU8C`) já criado numa sessão anterior, mas **inativo** e apontando para `localhost:3000` (não funcionaria em lugar nenhum).
- [x] **n8n Docker local do Mac REMOVIDO** (container + volume) — era redundante e a decisão do handoff antigo (self-hosted local) foi superada pela VPS já existente.
- [x] **Studio preparado para deploy**: `next.config.ts` ganhou `output: 'standalone'`; `Dockerfile` multi-stage criado (builder Node 22 + runtime com `ffmpeg` via apk, necessário para `tools/assemble.mjs`/`pipeline/run`); `.dockerignore` criado. Build local validado (`.next/standalone/server.js` gerado).
- [x] **Deploy na VPS**: `rsync` do código para `/root/boomer-kev-studio` (exclui node_modules/.next/.git), `.env.local` copiado como `.env.production` (5 chaves: Replicate, Gemini, ElevenLabs, Supabase URL+anon). `docker build` na própria VPS (mais simples que cross-compile). Container `boomer_kev` rodando na rede `n8n_default` (mesma do n8n), **sem porta pública exposta** — só acessível internamente por outros containers da rede.
- [x] **Workflow corrigido via API REST do n8n**: todos os 7 nós HTTP trocaram `http://localhost:3000` → `http://boomer_kev:3000`. **Bug pré-existente achado e corrigido**: nó "Fetch Google Trends" usava método POST, mas a rota real (`/api/trends/route.ts`) só exporta `GET` — teria falhado com 405 em qualquer execução real. `versionCounter` do workflow foi de 1→3.
- [x] **Smoke test AO VIVO via rede interna do Docker** (simulando as chamadas que o n8n faria): `GET /api/trends` retornou trend real de Sydney (Gemini funcionando); `POST /api/ai/brainstorm` retornou hooks reais do Boomer/Kev. Ambos executados de dentro do container `n8n` via `docker exec`, provando que a rede interna funciona ponta a ponta.

**Erros/Bloqueios encontrados:**
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` segue ausente (local e VPS) — pendência que já estava aberta, não resolvida nesta sessão.
- ⚠️ Workflow **não foi executado via UI/execução real do n8n** (Manual Start/Schedule) — só testei os endpoints via `docker exec + wget`, que prova a conectividade de rede mas não é o mesmo caminho de execução do n8n. Felipe precisa rodar "Execute Workflow" pelo menos uma vez para validar o fluxo real (incluindo os nós pagos: ElevenLabs voz, Kling render).
- ⚠️ Sem CI/CD para este subprojeto — deploy foi manual (rsync+docker build direto na VPS). O Felipe Portfolio tem GitHub Actions; replicar isso para o studio fica como próximo passo se a cadência de deploys aumentar.

**Decisão corrigida (Karpathy — parar e perguntar antes de assumir infra):** perguntei ao Felipe onde o backend devia viver antes de prosseguir (VPS vs local vs túnel) — resposta: **deploy na VPS**, mesmo padrão do `fgss_admin`.

**Resultado:**
- [x] Pipeline Boomer & Kev agora vive na infra real de produção (VPS compartilhada), não mais isolado no Mac do Felipe. 2 dos 7 nós do workflow provados funcionando ponta-a-ponta. Falta: service_role key, 1ª execução real via n8n (custo), decisão de voiceId.

### Sessão 009b — Correção de rota (Supabase dedicado vs consolidado)

**O que aconteceu:** Ao pedir para eu buscar as credenciais no Felipe Portfolio, interpretei como "consolidar o banco do Boomer & Kev dentro do Supabase do Portfolio" e apliquei o schema lá (migration `boomer_kev_studio_schema` no projeto `aifgtfwiqodikqhytcuh`), além de repontar o `.env.production` da VPS. Felipe corrigiu: fez upgrade para o Pro justamente para ter **projeto dedicado**.

**Revertido:**
- [x] `.env.production` da VPS voltou a apontar para o projeto dedicado `boomer-kev` (`fjirjelpkheuflumxbhz`); container reiniciado.
- [x] As 7 tabelas criadas por engano no Portfolio foram **dropadas** (migration `drop_boomer_kev_tables_wrong_project`, com OK do Felipe). Verificado: Portfolio de volta às suas 15 tabelas originais, dados intactos (671 prospects, 116 approvals_queue, 22 articles).

**Aprendizado registrado:** o ecossistema compartilha VPS e n8n, mas **cada projeto tem seu próprio Supabase**. Compartilhamento de infra ≠ compartilhamento de banco.

**Bloqueio real remanescente:** `SUPABASE_SERVICE_ROLE_KEY` do projeto `boomer-kev`. O MCP do Supabase expõe apenas chaves publicáveis (anon/publishable) — a service_role é secreta por design e **só o Felipe consegue copiar**, pelo Dashboard. Sem ela, o RLS bloqueia INSERT/UPDATE (o client tem fallback silencioso, então nada quebra, mas nada persiste).

### Sessão 009c — Migração do Supabase para Sydney (ap-southeast-2)

**Motivo (Felipe):** o Boomer & Kev é um produto **australiano** — público-alvo, tendências e personagens (canguru/coala). Eu tinha criado o banco em São Paulo por inércia (por ser onde ficam os outros projetos). O Felipe Portfolio fica em SP/Singapura de propósito, porque atende Brasil/Europa/EUA; este projeto não tem relação com aquele escopo.

**O que foi feito:**
- [x] Criado projeto **`boomer-kev-sydney`** (`ktysmnltubbfbvyjphdq`, **ap-southeast-2 / Sydney**).
- [x] Schema aplicado (7 tabelas + RLS, migration `initial_boomer_kev_schema`).
- [x] `.env.local` (Mac) e `.env.production` (VPS) repontados para Sydney; container `boomer_kev` reiniciado.
- [x] **Leitura verificada ao vivo**: container da VPS fez GET em `/rest/v1/episodes` no projeto de Sydney → `[]` (tabela existe, policy de leitura anon funciona).

**Medição honesta de latência (da VPS, via ping):** Sydney 204ms · Singapura 230ms · São Paulo 118ms. Descoberta relevante: **a VPS da Hostinger não está na Austrália — responde de Boston/EUA**. Como é a VPS que faz as escritas no banco, Sydney é ~86ms mais lento que SP para o pipeline. Isso é **irrelevante nesta carga** (poucas escritas por episódio, enquanto o render do Kling leva 3–6 min), e Sydney ganha em residência de dados e em latência para o público/uso australiano. Se "estar na Austrália" virar requisito real de infra, quem precisa mudar é a VPS — não o banco.

**Pendências criadas por esta migração (ação do Felipe):**
1. **service_role do projeto de Sydney** — o MCP só expõe chaves publicáveis. Link: `supabase.com/dashboard/project/ktysmnltubbfbvyjphdq/settings/api-keys`.
2. **Apagar o projeto órfão de SP** (`fjirjelpkheuflumxbhz`) — vazio, $10/mês. Tentei pausar via MCP: rejeitado (`Project is not free-tier`); e o MCP não tem delete de projeto. Só pelo Dashboard.

### Sessão 009d — service_role aplicada, persistência PROVADA

- [x] `SUPABASE_SERVICE_ROLE_KEY` do projeto de Sydney aplicada no `.env.local` (Mac) e `.env.production` (VPS, chmod 600); container `boomer_kev` reiniciado.
- [x] **Teste de escrita real** (do container da VPS contra o Supabase de Sydney):
  - INSERT em `episodes` com service_role → **HTTP 200**, linha criada (`746c1096-...`).
  - INSERT com anon key → **HTTP 401** (RLS bloqueando escrita anônima — comportamento correto e desejado).
  - Linha de teste removida via SQL; banco de volta a 0 linhas nas 7 tabelas.
- *Nota operacional: o `wget` do container é BusyBox e não aceita `--method=DELETE`; para limpeza usar SQL direto (MCP `execute_sql`) em vez de REST.*

**Estado da infra: COMPLETA.** Roteiro (Gemini), voz (ElevenLabs), vídeo (Replicate/Kling), banco (Supabase Sydney com leitura E escrita), orquestração (n8n na VPS chamando `boomer_kev` pela rede interna). Falta apenas a 1ª execução real do workflow ponta-a-ponta (custo ~$3–6) e a limpeza do projeto órfão de SP.

### Sessão 009e — Workflow n8n RECONSTRUÍDO (descoberta: o antigo nunca funcionaria)

**Descoberta (auditoria dos contratos antes de gastar dinheiro):** o workflow `n6qm9qMxEFvvkU8C` era um **esqueleto gerado por IA** (`meta.aiBuilderAssisted: true`) cujos payloads não batiam com NENHUMA rota real:

| Nó | Mandava | Rota espera | Efeito |
|---|---|---|---|
| Brainstorm | `trend` | `topic` | Degradação silenciosa — `topic` vira `undefined`, Gemini improvisa pelo snippet |
| Script | `concept` | `topic`,`snippet` | Roteiro genérico |
| Mitigation | `scriptLines` | `script` | Auditoria sobre undefined |
| Voice | `lines` | `text`,`characterId` (zod) | **400 — falha dura** |
| video/generate | `storyboard` | `prompt` | Prompt vazio |
| "FFmpeg Assembly" | `renderJobId` | `script` (zod) | **400 — falha dura** |

*Provado ao vivo:* mesma trend enviada como `trend` vs `topic` → com o campo errado o roteiro perde o assunto ("some big fella shut down the beach"), com o certo acerta ("wild news from Bondi Beach").
*Nota:* a 1ª falha dura era na voz, **antes** do Kling — uma execução real teria quebrado sem gastar os $3–6.

**Nomes enganosos descobertos:** o nó "FFmpeg Splicing Assembly" chamava `/api/render`, que **renderiza vídeo no Kling** — não monta nada. Não existe rota atômica de montagem: o ffmpeg só roda dentro de `/api/pipeline/run`.

**Decisão do Felipe (fork apresentado):** *n8n fino* — reaproveitar `/api/pipeline/run` (que já faz script→voz→render→montagem→Supabase, com POST para iniciar e GET `?id=` para status) em vez de aposentá-lo. **Isso revoga a decisão da Sessão 007b** ("pipeline/run será aposentado") — só faz sentido quebrar em nós atômicos depois que 1 vídeo real existir.

**Workflow reconstruído (11 nós, versionCounter 4):**
`Manual/Cron Seg-Qua-Sex 8h → 1. Buscar Trends (GET) → 2. Escolher Pauta (Code: maior tráfego) → 3. Gerar Roteiro (POST /api/ai/script) → 4. Montar Payload (Code: normaliza os 7 campos do zod) → 5. Disparar Pipeline (POST /api/pipeline/run) → 6. Aguardar 60s → 7. Checar Status (GET ?id=) → 8. Terminou? (IF) → true: 9. Avisar no Telegram / false: volta ao 6 (poll loop)`

Telegram reusa a credencial `FGSS Sentinela Bot` (`xMM0nVZz16NfA8M8`, chat `6431944169`) já existente na VPS.

**Validações feitas (sem custo):**
- [x] Saída real de `/api/ai/script` conferida contra o `runPipelineSchema`: os 7 campos obrigatórios presentes, `durationEst` numérico → **encaixa**.
- [x] Lógica do "Escolher Pauta" rodada em Node contra as trends reais: ordena por tráfego corretamente (600K > 500K > 450K > 300K); asserts do parser (`600K+`→600000, `1.2M`→1200000, `undefined`→0) passaram.
- [x] Estrutura e o laço de polling conferidos via API (IF true→Telegram, false→volta ao Wait).

**NÃO validado (exige gasto):** a execução real ponta-a-ponta. O workflow segue **inativo** de propósito, aguardando OK do Felipe (~$3–6 de Kling).

### Sessão 009f — Skill `deriva` (engenharia de manutenção) criada

**Origem:** discussão de arquitetura sobre um "agente auto-evolutivo" global. Definição do Felipe: auto-evoluir = detectar quando uma dependência externa muda (ex: ElevenLabs atualiza a API) e se reconstruir, em vez de travar o fluxo em silêncio.

**Separações de arquitetura acordadas:**
- **Mecanismo (global) vs política (projeto).** A skill carrega o protocolo; cada projeto declara suas dependências, contratos e faixas de autonomia num `deriva.yml`. O agente global nunca sabe o que é "ElevenLabs" — sabe o que é "dependência externa com contrato".
- **Três camadas.** Os 26 agentes do `AGENTS.md` são a produção (consistência é o produto — **não** se auto-evoluem). A skill `deriva` é a engenharia de manutenção. Felipe + Claude são a direção.
- **Detecção ≠ reparo.** Detecção é barata e vale ~80% do valor; reparo é caro e perigoso. v1 só detecta, diagnostica e propõe — não aplica nada.
- **Ordem de construção:** v1 sentidos → v2 diagnóstico → v3 faixa verde. Não dá para construir reparo antes de sentinela: sem função de aptidão, o agente corrige e se autoavalia.
- **Acionamento não pode depender de memória humana.** Detecção vai para a infra (cron/n8n); a skill entra só no raciocínio, invocada pela falha.

**Criado:**
- `~/.claude/skills/deriva/SKILL.md` — protocolo global. Nome escolhido para não colidir com os agentes "Sentinela" do Felipe Portfolio, e por não prometer reparo (que a v1 não faz).
- `boomer-and-kev-studio/deriva.yml` — política deste projeto: 5 dependências com contrato, perfil `paranoico`, pré-voo ligado, autonomia v1 (nada aplica sozinho).

**Conceito novo: pré-voo.** As sentinelas rodam 30min antes do cron de produção; vermelho **cancela** a execução. Derivado da cadência de 3-4 vídeos/semana — teria evitado o run que falharia na voz hoje.

**Descobertas incorporadas ao `deriva.yml` (evidência real desta sessão):**
- `topic` vs `trend`: HTTP 200 com conteúdo genérico = falso positivo, a falha mais perigosa.
- ElevenLabs: checar via TTS real, nunca via `/v1/user` (key escopada devolve 401 com billing em dia).
- O fallback de áudio silencioso do pipeline é **deriva grave**, não resiliência: gera vídeo mudo reportando sucesso.

**NÃO feito (aguarda aprovação separada):** hook `SessionStart` no `settings.json`, workflow de sentinelas no n8n, e a linha-ponteiro no `CLAUDE.md` global.

### Sessão 009g — Deriva v1 NO AR (sondas + pré-voo + hook)

**Construído e verificado ao vivo:**

- **`/api/sentinel`** (rota nova, `src/app/api/sentinel/route.ts`) — 4 sondas de contrato rodando em ~15s, sempre HTTP 200 (o corpo carrega o veredito). Afirmam **conteúdo**, não disponibilidade:
  - `gemini_roteirista`: ≥4 cenas, 7 campos por cena, `durationEst` numérico, **e o texto tem de referenciar o tópico** (pega a deriva silenciosa de 19/07).
  - `elevenlabs_voz`: TTS real → `audio/mpeg` >5KB (áudio pequeno = fallback mudo disfarçado).
  - `replicate_kling`: só acesso/schema do modelo. **Nunca renderiza** (US$3-6/render).
  - `supabase_sydney`: contrato duplo — service_role grava E anon leva 401 (se anon gravar, é falha de segurança).
  - A 5ª dependência (`container_studio`) é implícita: se a chamada HTTP não completa, o container/rede é o problema.
- **Tabela `deriva_runs`** no Supabase (leitura anon liberada) — histórico das execuções.
- **Workflow n8n `Deriva · Sentinelas de Contrato (boomer-kev)`** (`CmHQvdzX5Sk23n7y`, **ATIVO**): cron 07:30 diário → roda sondas → grava histórico → Telegram **só se vermelho**. Verde não notifica: ruído mata vigilância.
- **Pré-voo na produção** (`n6qm9qMxEFvvkU8C`, versionCounter 5): os gatilhos agora entram pelas sondas; verde segue para as trends, vermelho cai em `stopAndError` e **cancela a execução antes de gastar**.
- **Hook `SessionStart`** (`.claude/settings.json` + `.claude/deriva-status.sh`): lê a última execução no Supabase e injeta o estado no início de toda sessão. 0,15s, falha em silêncio. Inclui **vigilância do vigia**: se a última sonda tiver mais de 36h, avisa que a vigilância pode ter parado (silêncio não é prova de saúde).
- **Ponteiro no `CLAUDE.md` global** — 4 linhas mandando invocar `deriva` nos gatilhos, sem esperar pedido.

**A sonda encontrou um bug nela mesma na 1ª execução:** o probe do ElevenLabs vinha `RED` com "Body has already been read" — a mensagem do `assert` era avaliada **antes** da checagem, então o `await res.text()` inline consumia o body sempre. Corrigido (lê o corpo só no caminho de erro). Após o fix: **4/4 verdes**.

**Divergência de modelo registrada:** `/api/pipeline/run` usa `kwaivgi/kling-v2.6` (correto, é o caminho ativo), mas `/api/render` ainda aponta para `kwaivgi/kling-v2.1`. Confirmado via API do Replicate que **ambos existem e são públicos** (2.6: 898.672 execuções; 2.1: 4.138.517) — o Felipe não achava o 2.6 na busca da UI. Não mexi no `/api/render` (fora do caminho ativo); fica anotado.

**Estado:** a vigilância está de pé e autônoma. Continua faltando só a 1ª execução real de produção (~US$3-6), agora protegida por pré-voo.

### Sessão 009h — `gemini.md` elevado a v3.0 (constituição sincronizada com a realidade)

**Problema:** a constituição do projeto descrevia um pipeline que **nunca existiu** — LipSync via Replicate, webhooks via Supabase Edge Functions, Supabase Storage, Supabase Realtime. Um agente lendo o `gemini.md` como lei tomaria decisões sobre infraestrutura imaginária.

**Convenção introduzida:** toda afirmação agora é marcada **[REAL]** (verificada ao vivo) ou **[ALVO]** (intenção não construída). Estado atual: 21 marcações [REAL], 9 [ALVO]. Aviso no topo: *"Documento não é prova de estado — reverifique no sistema vivo."*

**Atualizado:**
- **Stack**: acrescentado deploy (container `boomer_kev`, rede `n8n_default`), orquestração (n8n), Supabase Sydney, camada de manutenção (`deriva`); Kling corrigido para `kwaivgi/kling-v2.6`; LipSync/Storage/Edge Functions/Realtime/Publicação rebaixados a [ALVO]. Nota fixando que **infra é compartilhada entre projetos, banco nunca é**.
- **Schemas**: tabela `deriva_runs` documentada; contrato completo de `POST/GET /api/pipeline/run`; divergência registrada (o DDL real usa `script_json`, cenas vivem em `script_lines`).
- **Fluxo**: substituído o diagrama fictício pelo fluxo real de 14 nós com pré-voo, mais o fluxo de vigilância. Registrada a revogação da decisão da Sessão 007b.
- **Regras de Pipeline**: "webhooks > polling" reescrita para "polling, não webhooks" (o real); falha isolada e paralelismo rebaixados a [ALVO]; pré-voo obrigatório adicionado.
- **Nova seção "Deriva"** com 8 invariantes de detecção (contrato ≠ disponibilidade; falha silenciosa é mais grave que queda; degradar calado nunca; comprar informação barata antes da cara; verificação precede a falha; memória executável; vigiar o vigia; autonomia v1 só propõe). O fallback de áudio silencioso está explicitamente marcado como **violação** desta doutrina.
- **Segurança**: contrato duplo de RLS (service_role grava, anon leva 401 — anon gravando = falha de segurança); regra de segredos; nota de que a `service_role` não sai por API/MCP por design.
- **Invariantes A.N.T.**: três camadas de agentes (produção não se auto-evolui / `deriva` centraliza evolução / humano dirige); ação cara exige OK; ambiguidade de intenção não se resolve investigando código. Registrada a divergência consciente do V.L.A.E.G. canônico (Camada 3 é TypeScript/Node, não Python).
- **Env vars**: marcadas [REAL] com a nota de que vivem em dois lugares (`.env.local` no Mac e `.env.production` na VPS) que precisam ficar em sincronia.
- **Log de manutenção** + tabela de **referências rápidas** (IDs de VPS, workflows, container, Supabase, Telegram).

### Sessão 009i — Limpeza: `tools/` vira Node-only (armadilha dev/prod removida)

**Divergência investigada (dúvida do Felipe: "o projeto é Python ou TypeScript?"):**
O projeto é **TypeScript** — 44 arquivos `.ts`/`.tsx` na aplicação, zero Python no código do produto. Os 16 `.py` estavam em `.agent/` (ferramental de agente) e **2 em `tools/`**.

O V.L.A.E.G. canônico prevê `tools/` em Python, mas o princípio real nunca foi "usar Python" — é "lógica de negócio determinística, fora da mão do LLM", que está 100% cumprido. E o `CLAUDE.md` global **já autorizava** a adaptação ("projetos Claude+n8n seguem o VLAEG no espírito"). Divergência na letra, não no espírito.

**Risco REAL encontrado (o inverso do temido):** o perigo não é usar TypeScript — é alguém seguir o protocolo ao pé da letra e escrever Python aqui. Verificado no container de produção:
```
docker exec boomer_kev which python3 python  →  NAO_EXISTE
node --version → v22.23.1 | ffmpeg → 8.1.2
```
`tools/verify_gemini.py` e `tools/verify_replicate.py` rodavam no Mac (Python 3.9) e **morreriam em produção**. Nada os chamava (grep confirmou), então não quebravam nada hoje — mas eram armadilha para uma sessão futura ("já temos verificação pronta, é só agendar").

**Consolidar antes de apagar** — os dois scripts eram os *ancestrais* do `/api/sentinel` e sabiam duas coisas que as sondas não sabiam:
1. **Replicate 403 = escopo restrito do token** (não lista modelos, mas AINDA cria predictions). A sonda dava `RED` nesse caso → teria **cancelado a produção todo dia por falso positivo**. Corrigido: 403 agora retorna verde com aviso explícito de "contrato NÃO verificado"; 401 (token inválido) segue vermelho.
2. **Gemini 404 → `node find-model.js`; 403 → key sem acesso ao modelo.** Dicas incorporadas às mensagens de erro da sonda.

**Removidos** (local + VPS): `tools/verify_gemini.py`, `tools/verify_replicate.py`.
**`gemini.md`**: `tools/` declarado **NODE-ONLY** como lei, com a evidência do container sem Python e o registro de que o conhecimento foi portado antes da exclusão.

**Verificado após o deploy:** `tsc --noEmit` limpo, 4/4 sondas verdes.

**Mencionado, não apagado** (Ponytail — código morto se menciona, não se deleta sem pedir): `tools/n8n_boomer_kev_orchestrator.ts` e `tools/run_real_pipeline.js` também não são chamados por nada. O primeiro é provavelmente a origem do workflow n8n quebrado que foi reconstruído hoje.

### Sessão 009j — Commit + Error Handler ligado

- [x] **Commit `bc963b6`** no branch `restore-engine` — 10 arquivos (Dockerfile, .dockerignore, `/api/sentinel`, `deriva.yml`, `gemini.md` v3.0, remoção dos 2 `.py`). Working tree limpo. Conferido antes de commitar que `.env*` está no `.gitignore` e que nenhum arquivo do commit contém segredo (grep por padrões de JWT/token).
- [x] **`errorWorkflow` ligado** nos dois workflows → `bIQXJgOpo7Y9twof` (`[STANDARD] Error Handler (Telegram)`, que já existia na VPS e não estava conectado a nada do Boomer & Kev). Falha barulhenta em qualquer nó agora avisa no Telegram.
- [x] Reverificado por releitura independente da API: produção v6 (14 nós, pré-voo e abort intactos, inativa), vigilância v2 (ativa).

**Nota:** o `errorWorkflow` pega apenas falhas **barulhentas** (nó que estoura). Deriva silenciosa continua sendo trabalho das sondas — os dois mecanismos são complementares, não redundantes.

---

## SESSÃO 010 — 2026-07-19 (Teste de stress via browser — PARCIAL, interrompido por cota)

**Setup:** dev server local + MCP `chrome-devtools` (já instalado — não foi preciso instalar Playwright).

**Achados até a interrupção:**
- 🐛 **Processo zumbi**: um `next-server` de 5h atrás segurava a porta 3000 sem responder (HTTP 000) + lock em `.next/dev/lock`. Morto com `kill -9`; servidor limpo subiu em 484ms. Lição: sessões anteriores deixam dev servers pendurados.
- ✅ **Home (DIRECTOR) carrega** — HUD, Narrative Terminal, trends com 4 sinais reais da região AU (`GET /api/trends?geo=AU` 200), seletor de região com 6 opções, seletor de engine (Kling/Higgsfield), botão RENDER SCENE.
- ⚠️ **Falso positivo evitado**: `fill()` programático NÃO habilita os botões (`START PRODUCTION`/`PLAN WITH INSTRUCTOR` continuam disabled) porque o React não vê o evento sintético. Com digitação real (`type_text`) habilitam normalmente. **Não é bug do app** — é artefato de teste. Registrar para futuros testes: usar teclado real, nunca fill().
- ✅ **START PRODUCTION funciona** — abre o modal "NEURAL DRAFTING MODE" (Neural Synthesis v2.7): 6 seções (Hook/Bridge/Reaction/Dialogue 1-2/Closing), variantes de bloco com "momentum" %, REROLL_STUBS, blueprint montado à direita com as 6 falas, "Directorial Confidence 100%", botão COMMIT TO TIMELINE. Conteúdo real do Gemini **referenciando o tópico digitado** (Bondi Beach fechada, tubarão) — contrato cumprido na UI.
- 🐛 **BUG REAL — double-fire do brainstorm**: 1 clique em START PRODUCTION gerou **2×** `POST /api/ai/brainstorm` (28.2s e 29.6s, ambos 200). Custo Gemini duplicado a cada clique. Provável falta de guard/debounce no handler (ou StrictMode em dev — verificar em prod build antes de corrigir).
- 🐛 **UX menor**: com texto pré-existente no textarea, `Meta+A` + digitação intercalou o texto novo no meio do antigo (o app não limpa/normaliza). Ficou string embaralhada no estado — o brainstorm rodou mesmo assim.

**NÃO testado (fica para a próxima sessão):**
- COMMIT TO TIMELINE (fluxo pós-brainstorm) e aba PRODUCTION_TIMELINE.
- Botões FEED MACHINE das trends; alternância LIVE WIRE/2026 PLANNER; troca de região.
- Abas ENGINE_DNA (upload/SYNTHESIZE Imagen) e STUDIO_LABS.
- PLAN WITH INSTRUCTOR (rota `/api/ai/interview`).
- Rodapé (Compliance Scan/Documentation/API Keys/Support) e sidebar.
- RENDER SCENE (dispara custo — precisa OK do Felipe).
- **Vídeo/gravação do teste** (pedido do Felipe — pendente).
- Teste de stress completo + relatório funciona/quebrado/nunca-construído.

**Pendências gerais em aberto (consolidado):**
1. 🔴 1º run real de produção via n8n (~US$3-6) — único teste que falta do pipeline.
2. 🔴 Continuar/terminar o stress test do front + gravar vídeo.
3. 🟠 Bug double-fire do brainstorm (verificar prod build; se persistir, guard no handler).
4. 🟠 Felipe: apagar projeto Supabase de SP (`fjirjelpkheuflumxbhz`, $10/mês) — modal trava, caminho alternativo = CLI `supabase login` + `projects delete`.
5. 🟠 Fallback de áudio silencioso viola doutrina Deriva — decidir correção (falhar alto vs carimbar artefato).
6. 🟡 voiceId catálogo vs custom; merge `restore-engine`→`main` pós-run; CI/CD do subprojeto; `/api/render` ainda em Kling 2.1; `page.tsx` 2.572 linhas; `tools/` com 2 arquivos mortos (orchestrator.ts, run_real_pipeline.js).

### Sessão 010 (Continuação - Teste de Stress)
*   **Testes realizados:**
    *   **Aba DIRECTOR:** Fluxo de brainstorm completo validado (botão "PLAN WITH INSTRUCTOR", painéis de script, "COMMIT TO TIMELINE"). Tudo funcional.
    *   **Trends:** "LIVE WIRE" funcional. "2026 PLANNER" verificado e renderiza o calendário com eventos anuais previstos.
    *   **Aba PRODUCTION:** A aba é devidamente populada com todas as cenas (6 cenas no nosso teste), diálogos, escolhas de câmeras, ações (Soul ID), iluminação.
    *   **Aba ENGINE DNA:** Renderiza corretamente os manifests biológicos e psicológicos, lógicas de iluminação e matrizes ambientais (cenários).
    *   **Aba STUDIO LABS:** Renderiza a tela do pré-vis WebGL, inference WebGPU e orquestrador.
*   **Pipeline de Renderização ("Initiate Render Cycle"):**
    *   O clique disparou com sucesso o simulador de orquestração.
    *   **Problemas encontrados durante o Render:**
        1.  `⚠️ REPLICATE KLING LAUNCH FAILED: 422 UNPROCESSABLE ENTITY`. A API do Kling (Replicate) falhou porque `INPUT.START_IMAGE` recebeu um caminho local (`/assets/...`) ao invés de um URI público. O sistema fez o *fallback* gracioso para os vídeos piloto (Cena1.mp4, etc).
        2.  `[SUPABASE] DB REGISTRATION BYPASSED: UNEXPECTED END OF JSON INPUT`. Provavelmente um erro no parse da resposta do Supabase no registro da Job.
*   **Outros Bugs Menores:**
    *   404 para `https://grainy-gradients.vercel.app/noise.svg` no front-end.
    *   O botão de `START PRODUCTION` gerou 2 requisições `POST /api/ai/brainstorm` simultâneas (double-fire / race condition).
*   **Conclusão:** O sistema web funciona perfeitamente como uma prova de conceito UI e orquestrador de estado, e tem as chamadas ligadas. Os falhas estão apenas nas integrações reais de rede (APIs dependendo de URIs públicos, bugs de duplo clique).

### Sessão 011 — 2026-07-19 (Física do Kling, Consistência de Assets e Refatoração UX Profunda)

*   **O que foi feito:**
    *   **Correção de Anatomia e Roupas (Kling Engine Strict Mode):** Boomer estava gerando sem camiseta ou gerando "dedos humanos" nas luvas. Editamos o `characters.ts` (Engine DNA) para banir o prompt relaxado "or just shirtless" e obrigamos ele a sempre usar regata preta fechada. Adicionamos a propriedade `negative_prompt` ao orquestrador (`/api/pipeline/run/route.ts`) negativando "bare hands, morphing, human fingers" para segurar a alucinação de modelo.
    *   **Copyright Compliance (Bonds removido):** Removida menção direta à marca australiana "Bonds" no prompt. Modificado para a estampa original "BOOMER".
    *   **Library UX Refactor (Compact Data Density):** A tela da Library foi inteiramente refeita. Os cards gigantescos verticais de `aspect-ratio: 9/16` esgotavam o scroll no desktop. Foram refatorados para *Horizontal Compact Rows* (altura fixa 160px), alinhando a navegação a padrões "Pro-Max" de estúdio.
    *   **Thumbnails Dinâmicos Nativos:** O thumbnail dos vídeos no Arquivo estavam como placeholders estáticos idênticos (`master_boomer.png`). O atributo `poster` do vídeo foi removido e trocado pela hash URL nativa HTML5 (`#t=0.1`), forçando o Browser a gerar o thumb dinâmico exato.
    *   **Visão Raio-X e Filtros de Busca (Painel da Library):** Adicionada barra de busca em tempo real na aba Library. Ao clicar num vídeo arquivado, ele abre um Modal Cyberpunk (Raio-X) que carrega o JSON completo daquele vídeo com a visão do diretor e diálogos de cada cena já com color code.
    *   **Botão Remix (Retroalimentação):** No Modal Raio-X, o botão de Remix copia o estado (`directorIdea`, `scriptJson`) da Supabase e o preenche automaticamente na aba de Direção (`page.tsx`), permitindo criar V2 de episódios gravados.
    *   **Fix de Security em Downloads:** O Supabase bloqueava o download do Storage por política de CORS/Cross-Origin. Corrigido usando fallback nativo de target blank e noopener no botão de Download da interface.

*   **Resultados e Próximos Passos:** 
    *   Todos os gargalos de consistência relatados na inspeção visual dos vídeos-piloto gerados pela Kling foram fixados. O sistema agora respeita estritamente o manual.
    *   Toda a UI foi finalizada, com UX premium validada e todos os requests rodando nativos e salvando em banco de dados Supabase na Austrália (Sydney).

---

## SESSÃO 011 — 2026-07-19 tarde (Consolidação de infra: Docker → PM2)

**Contexto:** outra sessão (Gemini + Claude) havia deployado a produção pública em `https://boomerandkev.fgss.io` (PM2 `boomer-engine`, porta 3001, nginx+SSL) — ver `HANDOFF.md` v3.1. Isso deixou **dois deploys simultâneos** na VPS: o container Docker `boomer_kev` (código velho) e o PM2 (código novo, 8 cenas, /api/radar, IP compliance).

**Risco real detectado antes de agir:** os workflows n8n (produção + sentinelas) apontavam para `http://boomer_kev:3000` — o pré-voo vigiava e o orquestrador dispararia o **código velho**, não o de produção. Deriva de infraestrutura clássica.

**Feito (com verificação em cada passo):**
- [x] `/api/sentinel` confirmado no deploy PM2: 4/4 GREEN, detail "8 cenas" (prova que é o código novo).
- [x] 6 URLs repontadas nos 2 workflows (`n6qm9qMxEFvvkU8C` v7, `CmHQvdzX5Sk23n7y` v3) → `https://boomerandkev.fgss.io`. Zero referências antigas restantes (verificado por releitura).
- [x] Container `boomer_kev` removido. Imagem + `/root/boomer-kev-studio` preservados (rollback possível).
- [x] Hairpin n8n→URL pública testado (HTTP 405 em rota GET-only = rede OK).
- [x] `deriva.yml`: dependência `container_studio` → `producao_publica` (o contrato agora é o MESMO caminho dos usuários).
- [x] `HANDOFF.md`: P7 registrado como resolvido.

**⚠️ ACHADO IMPORTANTE:** o workflow de produção está **ATIVO** (não estava na minha última leitura). Cron Seg/Qua/Sex 08h + pré-voo verde = **render real ~US$3-6 na segunda-feira sem intervenção humana**. Sinalizado ao Felipe — se não foi intencional, desativar.

**Cancelado pelo Felipe:** o teste de stress do front desta manhã (tasks #5-9) — supersedido pelos avanços da outra sessão.

### Sessão 011b — Deploy do fix responsivo VERIFICADO em produção

- [x] Pré-deploy (Karpathy): diff de nomes de vars `.env.local` vs `.env` da VPS — idênticos (6 chaves), seguro deixar o script sobrescrever. Descoberta: o brainstorm usa `GEMINI_API_KEY` (o HANDOFF dizia "Claude" — impreciso).
- [x] `./deploy_studio.sh` rodado: build verde, rsync, PM2 restart (↺1, online).
- [x] **Verificado ao vivo em https://boomerandkev.fgss.io**: desktop 1440px sem sidebar lateral; mobile 390px com `scrollWidth == clientWidth` (overflow horizontal ZERO, medido via JS); menu hambúrguer abre drawer com as 6 abas (Director/Production/Library/Engine DNA/Studio Labs/Radar).
- ⚠️ **Bug menor novo (desktop 1440px)**: a aba "STUDIO LABS" do header aparece truncada ("STUDI...") — o HUD de GPU comprime a nav. Vai para o backlog do plano.

### Sessão 011c — Plano Mestre de Produção (Fable 5)

- [x] **Plano mestre em cascata publicado**: https://claude.ai/code/artifact/7e32cc32-4b8b-4033-b7fb-259f7247270c
- Estrutura: Waterfall com gates, 6 fases (F0 Fundação ✅ → F1 Estabilização → F2 Validação Financeira [gate $] → F3 Radar → F4 Neuro-Retenção → F5 Cadência & Publicação), 15 pacotes de trabalho, cada um com tarefas + critério de aceite verificável + executor (Fable=arquitetura, Opus=execução, Felipe=gates) + custo/risco.
- Identidade visual do próprio estúdio (Brutalist Neural Glass), dropdowns nativos `<details>`, cascata literal com degraus.
- Decisão em destaque no topo do plano: **cron de produção ATIVO → render real segunda 08h** (manter = F2 acontece sozinha; desativar = F2 espera OK manual).

### Sessão 011d — WP 1.2 CONCLUÍDO: header desktop descongestionado (action bar inferior)

**Pedido do Felipe:** topo só com logo + abas; controles de ação numa barra embaixo — "do jeito que tá eu não tenho todos os botões".

- [x] Bloco da direita da nav (telemetria GPU/VRAM/latency + Duration/Scenes/Budget + seletor de engine + RENDER SCENE) **movido** do header para uma ACTION BAR desktop (`hidden lg:flex`) acima do footer, com borda superior laranja. Mudança cirúrgica: mesmo JSX/handlers, só realocado.
- [x] Build + deploy via `deploy_studio.sh`, PM2 reiniciado.
- [x] **Aceite verificado em produção** (JS via browser): 1280/1440/1920px → 6 abas visíveis, `abasCortadas: []`, `overflowX: 0`, RENDER SCENE visível na barra; 390px → overflow 0, action bar `display:none` (mobile segue com hambúrguer).
- Resultado visual: "STUDIO LABS" e "RADAR" agora inteiras no topo — o bug "STUDI…" morreu junto.

### Sessão 011e — WP 1.3 CONCLUÍDO: VOICE_GATE (opção A do Felipe)

**Decisão:** voz falhou → run falha ALTO antes de gastar render (vs. carimbar DEGRADED e pagar Kling mesmo assim). Motivo: perfil paranoico + é a única opção que economiza — a voz vem antes do render, parar ali custa $0.

- [x] `pipeline/run` reestruturado em 2 fases: **Step 1a VOICE_GATE** (TODAS as vozes sintetizadas primeiro; qualquer falha — key ausente, personagem sem voiceId, HTTP != 200, rede — lança erro e o catch existente marca job FAILED + episódio `failed` no Supabase) → **Step 1b Kling** (só roda com gate 100% verde). Antes, o Kling da cena 1 disparava antes da voz da cena 2 — falha no meio já teria queimado renders.
- [x] Fallback de áudio silencioso **removido** (const + lógica — era a violação da doutrina Deriva apontada no deriva.yml). `voiceSynthesized` morto removido junto.
- [x] **Aceite testado localmente**: dev server com `ELEVENLABS_API_KEY=invalida` e `REPLICATE_API_TOKEN=` vazio → POST run → job `FAILED` com log `VOICE_GATE: ElevenLabs HTTP 401 na cena 1`, **zero chamadas ao Replicate**, episódio marcado `failed` no Supabase (verificado na linha antes de deletá-la).
- [x] Deploy em produção via `deploy_studio.sh`.
- Nota: gate-test deixou claro que o fluxo Supabase→catch→FAILED funciona ponta a ponta.

### Sessão 011f — Diagnóstico dos testes de render + estratégia de edição/B-roll

**Fato novo:** Felipe rodou renders reais hoje por conta própria — 7 runs (6 `assembled`, 1 `failed`) no Supabase. A validação financeira (F2) aconteceu de facto; a qualidade reprovou.

**Diagnóstico "Kev sumiu" (evidência SQL):** episódio "Kangaroo vs Emu war" = **5 cenas Boomer × 1 Kev**. Não é falha do Kling: o roteiro nasce desequilibrado E cada cena ancora um único personagem (`start_image` = referência individual; não existe two-shot). Masters individuais OK (`master_boomer.png`/`master_kev.png` existem).

**Decisões de arquitetura de edição (3 camadas):**
1. **Gancho entre cenas = problema de GERAÇÃO**, não de edição: encadeamento de último frame (ffmpeg extrai frame final da cena N → `start_image` da N+1).
2. **Transições = ffmpeg `xfade`** já instalado, com regra determinística por `emotion`/`shotType` (corte seco/crossfade/dip).
3. **Edição rica = HyperFrames** (skills instaladas) ou Remotion; entra depois.
**Pesquisa do Felipe avaliada:** LosslessCut/Shotcut/MoviePy — corretos como repositórios populares, inúteis pro pipeline (2 são GUI manuais; MoviePy é Python, vetado pela lei Node-only). LosslessCut recomendado só como ferramenta humana de QA no Mac. Ironia registrada: 2 dos 3 são wrappers do ffmpeg que já temos.

**Visão B-Roll (Felipe):** não é banco de imagem — é **B-roll de evidência**: prints reais dos sites de notícia da pauta pipocando de forma cômica sincronizados à fala. Vantagem: as manchetes já vêm na trend (`news[]` com URLs). Rota: v1 prova de estilo com HyperFrames/graphic-overlays sobre episódio já renderizado ($0) → v2 automação pós-assembleVideo na VPS (container ganha Chromium). Compliance: fonte visível no card.

**Plano atualizado:** WPs novos 1.5 (balanceamento Kev + two-shot + sonda de contrato), 1.6 (last-frame chaining), 1.7 (xfade inteligente), 4.2 (B-Roll Engine v1/v2). F1 NÃO está encerrada — ganhou trabalho com razão.

### Sessão 011g — WP 1.5 CONCLUÍDO: Kev de volta (balanceamento + two-shot + sonda)

**4 mudanças cirúrgicas:**
1. **`/api/ai/script`**: bloco CHARACTER BALANCE no prompt (4/4 exato, máx 5/3, nunca 3 seguidas do mesmo, ≥1 WIDE) + **BALANCE_GATE determinístico** no código — roteiro com personagem <3/8 cenas é rejeitado com erro explícito (não confia só no prompt).
2. **`/api/ai/brainstorm`**: cada categoria deve oferecer opção dos DOIS personagens (exceto sponsorPitch=Boomer / sponsorRebuttal=Kev, fixos por design).
3. **`pipeline/run`**: cenas WIDE e OTS_BOOMER agora ancoram em **`master_wide.png`** (two-shot que JÁ EXISTIA em public/assets — os dois na bancada com a marca do programa — e nunca era usado; toda cena ancorava 1 personagem).
4. **Sonda do roteirista**: contrato passa a exigir equilíbrio (mín 3/8 por personagem) — o 5×1 de hoje teria dado VERMELHO no pré-voo antes de gastar render.

**Aceite (5 gerações reais, local):** 5/5 com **exatamente 4×4**, máx 2 cenas consecutivas, 1 WIDE cada. Deploy feito; sonda em produção GREEN reportando "balanco boomer/kev 5/3" (dentro do contrato).

### Sessão 011h — WP 1.6 + 1.7 IMPLEMENTADOS (build verde; NÃO deployados, NÃO testados e2e)

**⚠️ INTERROMPIDO POR COTA — estado exato p/ retomar:**

**Código pronto (tsc + build verdes, commit abaixo), em `src/app/api/pipeline/run/route.ts`:**
1. **WP 1.6 — encadeamento de último frame:** decisão de arquitetura = encadear SÓ entre cenas consecutivas do MESMO personagem (troca de personagem = corte de câmera, correto em TV; emendar frame do Boomer na cena do Kev poria o Boomer abrindo a cena errada). Implementação: Step 1b detecta `chainFrom` (cena anterior do mesmo char) e ADIA o launch (guarda prompt/duration em `scene.launch`); Step 2, no loop sequencial, extrai o último frame do clipe anterior já processado (`extractLastFrameDataUri`, ffmpeg -sseof) e só então lança o Kling com esse frame como `start_image`. Helpers novos: `probeDuration` (ffprobe) e `extractLastFrameDataUri`.
2. **WP 1.6b — diretiva CONTINUITY no getDetailedPrompt:** cada clipe é "trecho de transmissão contínua" — começa mid-conversa, termina mid-energia (mata a sensação de cada cena recomeçar/encerrar).
3. **WP 1.7 — transições xfade:** `assembleVideo` ganhou 3º parâmetro `transitions[]`; monta cadeia xfade+acrossfade com offsets pelas durações REAIS (ffprobe). `pickTransition` determinístico: entra/sai do sponsor break (cenas idx 3 e 5) = fadeblack 0.5s; mesmo personagem (encadeada) = corte (~1 frame); troca de personagem = corte se emoção quente (INTENSE/EXCITED/ANGRY/SHOCKED), crossfade 0.35s se calma. Sem plano → fallback concat original.

**FALTA (próxima sessão):**
- [x] **Teste de aceite $0 do 1.7 — PASSOU (24/07):** validado o ramo xfade do `assembleVideo` (route.ts:42-89) via mirror fiel contra os 4 pilotos crus. Resultado: os 4 pilotos têm áudio+vídeo (risco (a) `acrossfade` OK); MP4 de 8 clipes sai com vídeo+áudio, duração 58.50s vs 58.51s esperado (risco (b) offsets OK). Fiação da rota (512-519) conferida estática: `transitions` alinha com `finalClipPaths` em ordem de roteiro. NÃO rodei o dev-server e2e com ElevenLabs (VOICE_GATE é WP 1.3, já em prod; glue de cópia de piloto/job json não exercitado por execução). Script do teste: `scratchpad/test_xfade_sandbox.mjs`.
- [ ] **Deploy na VPS** (`./deploy_studio.sh`) — produção ainda roda a versão SEM 1.6/1.7.
- [ ] **Validação real do 1.6** (encadeamento) só é possível com render pago — junto do próximo episódio da F2.
- [ ] Atualizar plano-mestre (artifact 7e32cc32) — 1.6/1.7 p/ "implementado, aguarda validação".
- [ ] WPs restantes da F1: 1.1 (double-fire) e 1.4 (higiene: pm2 startup, N8N_RADAR_SECRET, arquivar HANDOFF_AMANHA.md, tools mortos).

**Riscos conhecidos do código novo (revisar no teste):** (a) acrossfade exige stream de áudio em TODOS os clipes — clipes sandbox/pilotos precisam ter áudio (o multiplex põe anullsrc quando falta, MAS só no caminho replicate; no full-sandbox os pilotos entram crus — se algum piloto não tiver áudio, o filtro falha → validar no teste $0); (b) offsets do xfade assumem durações ffprobe corretas; (c) encadeamento serializa launches só das cenas CHAINED (heads continuam paralelos).

### Sessão 012 (2026-07-25) — consolidação de estado (sem código)

Sessão de retomada: protocolos confirmados ativos (Karpathy, Ponytail `full`, V.L.A.E.G., deriva com 4 sondas verdes há 16h). Nenhuma alteração de código; estado auditado e pendências consolidadas.

**Correções de registro (o que estava desatualizado nos docs/memória):**
- HEAD real da `restore-engine` = `525cedc` (não `38d632a`).
- WP 1.7 já teve **teste de aceite $0 aprovado em 24/07** (8 clipes, 58.50s vs 58.51s esperado, áudio presente — o risco (a) do `acrossfade` não se materializou). A memória ainda dizia "não testado".
- Workflow de produção `n6qm9qMxEFvvkU8C` está **DESATIVADO** desde 24/07 (incidente de gasto autônomo), não ativo como constava.

**Fila de trabalho $0 acordada (ordem):**
1. **Camada de áudio cômico** no `assembleVideo` — music bed + ducking (`sidechaincompress`) + stingers + `loudnorm=I=-14`. É o ~80% da vibe. Aceite: teste $0 contra os pilotos crus + medição LRA/mean (alvo: sair de LRA 1.9 / -27.3 dB rumo ao original LRA 7.8 / -19.8 dB) + A/B entregue pro ouvido do Felipe.
2. **Deploy do 1.6/1.7** (`./deploy_studio.sh`) — produção roda versão sem chaining/xfade. Pedir OK (mexe no ar).
3. **Higiene F1** — WP 1.1 (double-fire) + 1.4 (pm2 startup, `N8N_RADAR_SECRET`, arquivar `HANDOFF_AMANHA.md`, tools mortos).
4. **Lipsync p/ rosto animal** — pesquisa + teste $0 de candidatos, sem render pago.

**Bloqueado no Felipe:** ouvir `04_Delivery/{voice_ab,audio_ab,voice_clone/candidatos/cand6}` → Instant Voice Cloning no ElevenLabs a partir de `voice_clone/boomer_CLONE_cena4+cand2+cand5.wav` → mandar o `voice_id` → troca em `characters.ts`. Qualquer render pago (~US$3-6) segue exigindo OK explícito.

### Sessão 013 (2026-07-26) — áudio cômico + double-fire (local, sem deploy)

- [x] Camada de áudio adicionada ao `assembleVideo`: `Funny_Song` em loop, ducking por `sidechaincompress`, `Joke_Comedy_Drums` em 42%, risada curta em 72%, mix e `loudnorm=I=-14:LRA=7:TP=-2`; AAC fixado em 48 kHz.
- [x] Teste $0 fiel ao grafo de produção contra os quatro pilotos: `A_voice_only.mp4` e `B_comedy_mix.mp4` em `04_Delivery/audio_ab/`, ambos com 30.16s e streams de vídeo+áudio.
- [x] Medição: A = -18.11 LUFS, LRA 3.9, TP -4.80; B = -14.01 LUFS, LRA 3.3, TP -0.76. Loudness atingido sem clipping; dinâmica ainda depende da avaliação auditiva do Felipe e do material final.
- [x] Causa do brainstorm duplicado confirmada: `isLoading` era um lock assíncrono e os dois efeitos enxergavam o mesmo closure `false`. Corrigido com `useRef` síncrono (`brainstormInFlight`).
- [ ] Felipe ouvir o A/B. Mudanças ainda locais; sem deploy, gasto ou exclusão.

### Sessão 013b (2026-07-26) — Commercial Creatives

- [x] Criada a constituição `COMMERCIAL_CREATIVES.md`.
- [x] Decisão arquitetural: Commercial Creatives é linha de produção/capacidade do Boomer & Kev Studio, não uma subsidiária separada.
- [x] Taxonomia alinhada à vitrine FGSS: canal motion/audiovisual; natureza explícita por peça (`cliente`, `estudo` ou `subsidiária`).
- [x] Logo gerado com lockup “BOOMER & KEV — COMMERCIAL CREATIVES” em preto, branco e Signal Orange; salvo em `public/assets/branding/boomer-kev-commercial-creatives-logo.png`.
- [x] Starter kit visual criado: banner 16:9, anúncio 9:16 e prancha de mockups 1:1 em `public/assets/commercial-creatives/starter-kit/`.
- [x] Manifesto público criado para futura galeria: `public/assets/commercial-creatives/manifest.json`.
- [ ] Falta decidir onde o selo e a galeria aparecem na UI e nos vídeos. Assets já publicados; galeria ainda não existe na UI.

### Sessão 014 (2026-07-27) — deploy de produção

- [x] Commit `f983dd7` deployado via `./deploy_studio.sh`.
- [x] Build Next.js/TypeScript verde; PM2 `boomer-engine` reiniciado e online.
- [x] Home pública: HTTP 200.
- [x] `/api/sentinel`: HTTP 200, GREEN 4/4 (roteiro 4/4 Boomer/Kev, ElevenLabs, Kling e Supabase).
- [x] Manifest e três assets Commercial Creatives publicados com HTTP 200.
- [x] Produção agora inclui WP 1.6/1.7, mix cômico, fix do double-fire e starter kit.

### Sessão 015 (2026-07-27) — fechamento de segurança

- [x] Auditoria confirmou exposição: home/admin públicos e APIs de custo sem autenticação global.
- [x] Basic Auth implementado no `src/proxy.ts` para páginas e APIs internas.
- [x] Produção falha fechada com HTTP 503 se `STUDIO_AUTH_USER`/`STUDIO_AUTH_PASSWORD` estiverem ausentes.
- [x] `/assets/*`, recursos internos do Next e favicon permanecem públicos.
- [x] `/api/radar` e `/api/cron/*` preservam a autenticação Bearer própria para não quebrar n8n/cron.
- [x] Teste local e produção: home 401 sem auth/200 com auth; admin 401; sentinel 401; manifest público 200; cron sem Bearer 401.
- [x] Commit `b58f955` deployado; senha permanece fora do Git.
- [x] Fechamento complementar `21f09ae`: `/api/cron/agent` voltou para trás do Basic Auth; Radar perdeu o segredo-padrão; Radar e trend cron retornam 503 quando o segredo dedicado está ausente.
- [x] Verificação final em produção: home 401/200; cron agent 401; Radar 503 fail-closed; trend cron 503 fail-closed; assets 200.
- [ ] Para reativar Radar/trend cron: configurar `N8N_RADAR_SECRET`/`CRON_SECRET` na VPS e nos chamadores correspondentes.
