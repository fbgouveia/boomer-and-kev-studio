# Inteligência Competitiva — Boomer & Kev (set/2026)

> Fonte: deep web research 04/09/2026 (agente de pesquisa). Itens sem fonte exata = estimativa.
> Uso: guiar W1-W6. As "top táticas" alimentam o backlog do universo.

## Concorrentes por vertente

| Vertente | Quem | Tamanho | O que fazem de melhor | Fraqueza explorável |
|---|---|---|---|---|
| Personagem animal IA | **Nobody Sausage** | 22M TikTok / ~33M cross | Humor físico sem diálogo (viraliza sem idioma); escassez de ad (1/ano, ~US$33.8k/post); token de comunidade | **Sem ponto de vista** — sem opinião, sem notícia, sem prova |
| Virtual influencer | **Janky & Guggimon** (Superplastic) | 11,6M TikTok | Lore entre personagens; collabs (Nike, Prime Video, Fortnite); agência própria | Custo de estúdio alto; zero relevância AU |
| Virtual influencer | **Lil Miquela** | 3,3M TikTok / 2,3M IG | Estratégia DIFERENTE por plataforma; serialização; deals CAA/Calvin Klein | Formato estático; engajamento IG caindo |
| IA music/rap | **Glorb** (TheSoul) | ~932K TikTok, 1 vídeo = 60M views | **Formato replicável e memeável** — o público remixa | Sem identidade AU, sem prova documental |
| Newsroom satírico | **_compiler_uk** [est.] | ~1-2M | "âncora fictícia" que parece newsroom real | Um personagem só, sem duo |
| Sátira AU texto | **The Betoota Advocate** | Maior sátira AU (>The Onion na AU) | Manchete em formato de notícia legítima; brand placements; PR paralela; Betoota Bitter; Paramount+ | **É texto** — ninguém satiriza a manchete do dia em VÍDEO na AU |
| Sátira AU texto | **The Shovel** | Grande | Paródia de marca/consumismo ("Jetstar $39.95 Same-Day-Arrival™"); live shows; Wankernomics | Formato artigo — **as manchetes deles são roteiros prontos do B&K** |
| Ferramentas rivais | HeyGen / Captions / Argil | US$25-149/mês | Volume, API, n8n integrations | Talking-head genérico, zero comédia, zero lore, zero notícia. B&K compete como **agência de IP**, não como SaaS |

## As 10 táticas (por impacto) — backlog do universo

1. **Formato replicável** (lição Glorb): estrutura fixa — manchete real na tela 0-2s + grito do Boomer → debate 2-20s → print de prova 20-45s → punchline do Kev
2. **Jornal-print como assinatura visual** — nenhum concorrente de personagem IA usa prova documental; diferencia e blinda contra "AI slop"
3. **Reatividade <24h à manchete do dia** — Betoota/Shovel são texto; ser o primeiro a satirizar em vídeo
4. **Duo de contraste como retention engine** — punchline alternada a cada 8-12s
5. **Monetizar escasso** (Sausage): 1 integração/mês a preço alto > 10 posts patrocinados
6. **Modelo Betoota de "duas casas"**: canal público + white-label para marcas (precedente validado na AU)
7. **Merch com catchphrases** (Shovel/Betoota Bitter model)
8. **Multi-stream nativo TikTok**: Shop (5-20%), LIVE gifts (1K seg.), Creator Fund (10K) — contas IA rodam live 24/7
9. **Estratégia por plataforma** (Miquela): TikTok = comédia bruta; Reels = preço/política; Shorts = evergreen. Nunca repostar
10. **Lore serializada** (Superplastic/pseudônimos Betoota): followers seguem o MUNDO, não o vídeo

## Ondas 2026 short-form AU
- Faceless marketing mainstream (engajamento IA ~8,7% vs 4,5% humano)
- "Fake newsroom" IA crescendo no mundo anglo — **vazio total na AU com personagens**
- Disclosure de IA obrigatório no TikTok (não rotulado perde alcance) — rotular dia 1 e virar piada de marca ("somos IA e ainda assim mais honestos que o jornal")
- Sátira de consumismo é o formato que mais compartilha na AU
- Hiperlocalidade como fosso: Woolies, Centrelink, Betoota — contas globais não conseguem

## Técnico (pesquisa 2)
- **Lipsync em animal/cartoon**: **Kling Avatar V2** (kwaivgi/kling-avatar-v2, Replicate) — documentado para "humans, cartoons, animals". É o POC (US$1-2, aguarda OK). Sync.so NÃO suporta não-humanos (FAQ oficial). LatentSync: provável falha em focinho (face-parser humano). Fallback: Hedra Character-3.
- **POST automático**: TikTok = app não-auditado publica PRIVADO (auditoria leva semanas — gargalo real); YouTube = 100 uploads/dia, app não-auditado pode nascer privado; Instagram = App Review Meta (dias-semanas). Plano: começar manual, auditorias em paralelo.
- **TTS grátis en-AU**: Edge TTS (NatashaNeural/WilliamNeural) — já em produção no `tools/free-episode.mjs`. Piper `en_AU-amy-medium` como alternativa MIT.
