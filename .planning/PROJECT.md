# PROJECT — Boomer & Kev Studio
**Protocolo:** GSD-VLAEG | **Iniciado:** 2026-03-31

## Objetivo
Pipeline autônomo de produção de podcast/vídeo: Tópico trending → Vídeo publicado.
Dois personagens australianos (Boomer = canguru, Kev = coala). Formato TikTok/Reels/Shorts.

## Estado Atual
- **85% funcional** — Gemini, Replicate Kling v2, LipSync, trends, TypeScript 0 erros
- **ElevenLabs configurado** ✅ — aguardando teste end-to-end

## Stack
- Next.js 16 App Router + TypeScript strict
- Gemini 2.5 Flash (script/brainstorm)
- Replicate Kling v2.6 (render) + LipSync
- ElevenLabs ✅ (key ativa: `sk_f153dbe3344c19de36be10ed3541c57f3784fb316fffe20c`)
- Design: Brutalist Neural Glass `#FF5F1F` / preto / ZERO roxo

## Personagens
- **Boomer**: voiceId `IKne3meq5aSn9XLyUdCD` (Charlie - Deep, Confident, Energetic)
- **Kev**: voiceId `CwhRBWXzGAHq8TQ4Fs17` (Roger - Laid-Back, Casual, Resonant)

## Valor para Portfolio
Prova de execução de pipeline AI end-to-end. Case B2B para Creative Content & Video Automation.

## Requirements
### Validated
- ✓ Script generation via Gemini — existente
- ✓ Video render via Replicate Kling — existente
- ✓ LipSync via Replicate — existente
- ✓ Trends feed australiano — existente
- ✓ TypeScript 0 erros — existente
- ✓ Error boundaries + retry 3x — existente

### Active
- [x] ElevenLabs API key configurada ✅
- [ ] **PRÓXIMO: Testar pipeline end-to-end** — localhost:3000 → Director tab → script → Generate Voice → render vídeo
- [ ] Confirmar voz Boomer (Charlie) e Kev (Roger) funcionando
- [ ] Testar render vídeo completo via Replicate Kling
- [ ] RenderTerminal.tsx extraído do page.tsx
- [ ] DNAPanel.tsx extraído do page.tsx
- [ ] Supabase integration (DB + storage) — requer criação do projeto Supabase
- [ ] 3 episódios completos como demo para portfolio

### Out of Scope
- Modelos 3D Blender — luxo, não urgente
- CI/CD — fase posterior
- Deploy social automático — fase posterior
