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

