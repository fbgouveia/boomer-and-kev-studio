# task_plan.md — V.L.A.E.G. Master Plan
# Projeto: Boomer & Kev Studio
# Iniciado: 2026-03-28 | Piloto: Claude Sonnet 4.6
# Atualizado: 2026-03-29 | Auditor: Antigravity (Gemini)

---

## Visão Geral do Projeto
AI-Powered Podcast Script Production Engine para o podcast australiano "Down Under Discourse".
Personagens: Boomer (canguru musculoso) + Kev (coala deadpan).
Motor de criação: Gemini 2.5 Flash → ElevenLabs (voz) → Replicate Kling v2 (vídeo).

---

## STATUS ATUAL DO PROJETO (atualizado 2026-03-29)
- Stack: Next.js 16 + TypeScript (strict) + Tailwind + Gemini + ElevenLabs + Replicate
- Build: ✅ 0 erros TypeScript | ESLint: 0 erros, 18 warnings (intencionais)
- Progresso: ~40% completo | 13/16 features funcionais
- LOC: 4,800+ | 17 arquivos-fonte | 270KB
- Design: Brutalist Neural Glass 100% conforme ✅
- Bloqueadores: ElevenLabs key, Supabase, APIs sociais
- **Primeiro episódio real estimado: ~Dia 14 (~2 semanas)**

---

## FASES V.L.A.E.G.

### FASE 0 — INICIALIZAÇÃO ✅ CONCLUÍDA
- [x] Criar task_plan.md
- [x] Criar findings.md
- [x] Criar progress.md
- [x] Criar gemini.md (Constituição do Projeto)
- [x] Responder 5 Perguntas de Descoberta
- [x] Confirmar Data Schema em gemini.md
- [x] Blueprint aprovado pelo usuário

### FASE 1 — V (VISÃO) ✅ CONCLUÍDA
- [x] Estrela Guia: Pipeline autônomo Topic → Vídeo Publicado
- [x] Integrações: Gemini + Replicate + ElevenLabs + Supabase + Social APIs
- [x] Fonte da verdade: Supabase (tabelas episodes, render_jobs, publish_jobs)
- [x] Payload: Vídeo 9:16 publicado em TikTok/IG/YT
- [x] Regras: Brutalist Neural Glass, retry 3x, idempotência, falha isolada
- [x] JSON Data Schema definido em gemini.md
- [x] Auditoria integral de 17 arquivos (2026-03-29)

### FASE 2 — L (LINK) ⚠️ PARCIAL
- [x] Verificar conexão Gemini 2.5 Flash (`v1beta`) ✅
- [ ] Verificar conexão ElevenLabs ❌ KEY AUSENTE
- [x] Verificar conexão Replicate Kling v2 ✅
- [x] Verificar chaves em .env.local (Gemini + Replicate OK)
- [x] Scripts de handshake em tools/ (verify_gemini.py, verify_replicate.py)
- [ ] Criar projeto Supabase + configurar keys
- [ ] Candidatura APIs sociais (TikTok/IG/YT)

### FASE 3 — A (ARQUITETURA) ⚠️ EM ANDAMENTO
- [x] Mapeamento de dependências entre arquivos (diagrama Mermaid)
- [x] 23 issues identificadas e priorizadas
- [ ] Refatorar page.tsx monolito → 4 componentes
- [x] Centralizar types em src/types/
- [x] Consolidar fetchWithRetry em src/lib/fetch-retry.ts
- [ ] Criar /api/pipeline/run (orquestrador)
- [ ] Criar /api/assembly (ffmpeg concat)
- [ ] Implementar Supabase Edge Functions (webhooks)

### FASE 4 — E (ESTILO) ✅ CONFORME
- [x] Brutalist Neural Glass: 100% conformidade verificada
- [x] #FF5F1F (Signal Orange) em todos os componentes
- [x] Zero roxo/violeta encontrado
- [x] Animações (neural-sparkle, scanline, stagger-item) ativas
- [ ] Acessibilidade e SEO básico (pendente Sprint 4)

### FASE 5 — G (GATILHO) ❌ PENDENTE
- [ ] Configurar deploy (Vercel)
- [ ] Configurar variáveis de ambiente em produção
- [ ] Configurar domínio/CDN
- [ ] CI/CD (GitHub Actions)
- [ ] Finalizar Log de Manutenção em gemini.md

---

## 📋 SPRINT BREAKDOWN (23 Issues)

### SPRINT 1 — FUNDAÇÃO (Semana 1 | ~20h)
- [ ] #1 Refatorar page.tsx → ScriptTimeline + RenderTerminal + DNAPanel + DirectorTerminal
- [ ] #2 Obter ELEVENLABS_API_KEY (grátis, 10min)
- [ ] #3 Criar projeto Supabase + SQL schemas
- [x] #4 Centralizar ScriptLine + Episode types
- [x] #5 Remover @google/generative-ai (dead weight)
- [x] #17 Corrigir useEffect dependency arrays
- [ ] #18 Migrar API keys do localStorage → env-only

### SPRINT 2 — CONSISTÊNCIA + ASSEMBLY (Semana 2 | ~20h)
- [x] #6 Error boundaries na UI
- [x] #7 Consolidar fetchWithRetry
- [ ] #8 Webhook Replicate (substituir polling)
- [ ] #9 /api/assembly (ffmpeg concat 6 cenas)
- [ ] #10 Testes unitários (validations + script-engine)
- [ ] #11 GDrive → Supabase Storage URLs
- [ ] #12 IP-Adapter (Opção C) → 70-80% consistência

### SPRINT 3 — AUTOMAÇÃO (Semana 3-4 | ~25h)
- [ ] #13 CI/CD GitHub Actions → Vercel
- [ ] #14 localStorage → Supabase DB + Realtime
- [ ] #15 Auto-publish TikTok/IG/YT
- [ ] #16 Supabase Edge Functions webhooks
- [ ] #19 Rate limiting API routes

### SPRINT 4 — POLIMENTO (Semana 4-5 | ~15h)
- [ ] #20 RLS Supabase
- [ ] #21 Structured logging
- [ ] #22 i18n
- [ ] #23 SEO/meta tags

---

## CHECKLIST DE QUALIDADE (Antes de Qualquer Deploy)
- [ ] `python .agent/scripts/checklist.py .` → sucesso
- [ ] `python .agent/scripts/verify_all.py . --url <URL>` → sucesso
- [ ] Security scan limpo
- [ ] Bundle < limite definido
- [ ] E2E Playwright passando
