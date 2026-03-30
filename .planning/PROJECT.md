# PROJECT — Boomer & Kev Studio
**Protocolo:** GSD-VLAEG | **Iniciado:** 2026-03-31

## Objetivo
Pipeline autônomo de produção de podcast/vídeo: Tópico trending → Vídeo publicado.
Dois personagens australianos (Boomer = canguru, Kev = coala). Formato TikTok/Reels/Shorts.

## Estado Atual
- **80% funcional** — Gemini, Replicate Kling v2, LipSync, trends, TypeScript 0 erros
- **Bloqueador único:** `ELEVENLABS_API_KEY` ausente → sem voz, sem vídeo final

## Stack
- Next.js 16 App Router + TypeScript strict
- Gemini 2.5 Flash (script/brainstorm)
- Replicate Kling v2.6 (render) + LipSync
- ElevenLabs (voz — PENDENTE)
- Design: Brutalist Neural Glass `#FF5F1F` / preto / ZERO roxo

## Personagens
- **Boomer**: voiceId `exT9S2zWNo7lSxSrsD73`
- **Kev**: voiceId `pqHFr7yk3tS6H7G4Umlf`

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
- [ ] ElevenLabs API key configurada
- [ ] Pipeline end-to-end funcionando (tópico → vídeo publicado)
- [ ] RenderTerminal.tsx extraído do page.tsx
- [ ] DNAPanel.tsx extraído do page.tsx
- [ ] Supabase integration (DB + storage)
- [ ] 3 episódios completos como demo

### Out of Scope
- Modelos 3D Blender — luxo, não urgente
- CI/CD — fase posterior
- Deploy social automático — fase posterior
