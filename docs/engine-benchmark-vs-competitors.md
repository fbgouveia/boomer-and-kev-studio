# Engine Benchmark — B&K vs Concorrentes (04/09/2026)

> Medições reais da engine (mesmo dia) cruzadas com a intel competitiva (docs/competitive-intel-2026-09.md).
> Notas 0-10 baseadas em evidência, não impressão.

## Scorecard por dimensão

| Dimensão | B&K | Nobody Sausage | Glorb | Betoota/Shovel | HeyGen/Captions | Melhor da classe |
|---|---|---|---|---|---|---|
| **Pauta/inteligência** | **8** (RSS medido, 44 outlets, 1,5s) | 0 (sem notícia) | 2 (trend de formato) | 9 (editorial humano) | 0 | Betoota |
| **Roteiro (qualidade+gates)** | **8** (LOOP_GATE rejeita roteiro ruim, 21s, US$0,02) | n/a (sem diálogo) | 5 (letra de música) | 9 (humanos) | 3 (corporate) | Betoota |
| **Prova documental** | **10** (único com prints de jornal + filtro de relevância) | 0 | 0 | 5 (cita inventado) | 0 | **B&K único** |
| **Consistência de personagem** | **7** (âncoras+testes; Kling não provado em render real) | 9 (design simples, nunca erra) | 7 | 0 (sem personagens) | 8 (avatar fixo) | Sausage |
| **Custo por episódio** | **9** (FREE US$0 / pago US$3-6) | alto (estúdio 3D) | baixo | baixo (texto) | assinatura | B&K FREE |
| **Velocidade** | **7** (roteiro 21s; render 15-40min) | lenta | rápida | rápida (texto) | rápida (1-5min) | HeyGen |
| **Lipsync** | **2** (removido; POC Kling Avatar V2 pendente) | n/a | n/a | n/a | 9 (humanos) | HeyGen |
| **Publicação** | **2** (manual; APIs mapeadas, TikTok = gargalo) | 10 (manual expertise) | 10 | 8 | 8 (API) | Glorb |
| **Analytics real** | **3** (schema pronto; ingest não existe; métricas falsas mortas) | 7 (nativo das plataformas) | 8 | 7 | 7 | Glorb |
| **Compliance** | **8** (scanner substantivo; EU AI Act flagged) | 5 | 5 | 10 (humano) | 7 | Betoota |
| **Universo/IP** | **6** (DNA+lore desenhado; 0 episódios públicos) | 10 | 6 | 8 | 2 | Sausage |
| **TOTAL ponderado** | **6,4** | 6,8 | 5,8 | 7,3 | 5,9 | — |

**Leitura honesta:** o B&K perde para quem tem audiência instalada (Betoota 7,3 / Sausage 6,8) e
**ganha de todos nas dimensões que ninguém pode copiar rápido**: prova documental (10, único),
custo FREE (9), pauta medida (8). As duas notas que travam o total — lipsync 2 e publicação 2 —
têm caminho desenhado (POC Kling Avatar V2 + auditorias de API). **O vazio de mercado confirmado:
sátira da manchete do dia em vídeo-curto com personagens não existe na AU.**

## Melhorias INTERNAS (da engine, priorizadas pelo teste)

| # | Melhoria | Efeito | Esforço |
|---|---|---|---|
| I1 | **Checkpoint/retomada** (única queima-dinheiro restante) | render à prova de falha parcial | 1 sessão core |
| I2 | **POC Kling Avatar V2** (lipsync animal) | nota 2→8; o concorrente nenhum tem duo animal falando | POC US$1-2 |
| I3 | **Captions burn-in no free-episode** (ffmpeg subtitles) | o episódio FREE fica publish-ready | 1-2h |
| I4 | **Analytics ingest** (W6): schema pronto, falta puxar métricas reais | nota 3→8 pós-10 episódios | 2 sessões |
| I5 | **Avaliador visual** (agente de visão no render) | blinda a nota 7 de consistência | 1 sessão |
| I6 | **Prompt do roteirista**: injetar as 10 táticas (estrutura fixa 0-2s/20-45s, punchline a cada 8-12s) | retenção por desenho | 1h |
| I7 | **Nav**: tab COMMERCIAL corta em 1440px (visto no teste) | polimento | 30min |

## Melhorias EXTERNAS (de mercado, do playbook dos concorrentes)

| # | Tática (de quem) | Ganho |
|---|---|---|
| E1 | **Reatividade <24h à manchete** (vazio Betoota) | o B&K vira o primeiro vídeo-sátira do dia |
| E2 | **Formato replicável fixo** (Glorb): manchete 0-2s → debate → prova 20-45s → punchline | audiência aprende o formato e volta |
| E3 | **Rotular IA dia 1** (regra TikTok 2026) e virar piada de marca ("mais honestos que o jornal") | alcance + anti-slop |
| E4 | **Escassez de sponsor** (Sausage): 1 integração/mês a preço alto | margem máxima sem saturar |
| E5 | **Lore serializada** (Superplastic): rivais/opiniões fixas entre Boomer e Kev | seguem o mundo, não o vídeo |
| E6 | **Estratégia por plataforma** (Miquela): TikTok bruto / Reels preço / Shorts evergreen | nunca repostar |
| E7 | **Hiperlocalidade como fosso**: Woolies, Centrelink, Myki, Opal | contas globais não conseguem copiar |
| E8 | **Modelo Betoota das duas casas**: canal + white-label | 2ª receita sobre a mesma engine |

## Veredito

**A engine vence onde é única (prova, custo, pauta medida) e perde onde é jovem (lipsync,
publicação, analytics, audiência).** Nenhum concorrente tem o pacote completo: personagens
consistentes + notícia real + prova documental + comédia de duo + custo FREE. O caminho para
primeiro lugar na AU não é melhorar o que já é único — é fechar I1/I2/I4 (as três notas 2-3)
e publicar os 10 episódios que nenhuma dessas notas mede: **retenção real**.
