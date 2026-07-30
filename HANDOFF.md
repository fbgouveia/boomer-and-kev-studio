# HANDOFF.md — Registro de Continuidade entre Sessões
# Boomer & Kev Studio | Atualizado: 2026-07-30 AEST (v5.0)

> 🔄 **Este arquivo é o primeiro ponto de leitura de QUALQUER agente novo.**
> Ele contém o estado exato do projeto, o que foi feito, o que falta, e as regras
> que nunca podem ser quebradas. Atualize-o ANTES de encerrar sua sessão.
>
> **Hierarquia de leitura:** HANDOFF.md → GEMINI.md → CLAUDE.md → AGENTS.md

---

## 🌐 ESTADO ATUAL DA PRODUÇÃO

| Item | Valor |
|------|-------|
| **URL Produção** | **https://boomerandkev.fgss.io** (LIVE; 401 sem auth, 200 com auth) |
| **VPS** | Hostinger `2.25.182.106`, root SSH, Ubuntu, Nginx 1.24.0 |
| **Processo** | PM2 `boomer-engine` na porta `3001` |
| **Reverse Proxy** | Nginx → `http://127.0.0.1:3001` |
| **SSL** | Let's Encrypt, expira 17/10/2026, auto-renew |
| **Deploy** | `./deploy_studio.sh` (build → verify → rsync → PM2 → health check) |
| **GitHub** | `fbgouveia/boomer-and-kev-studio` branch `restore-engine` |
| **n8n** | `https://n8n.fgss.io` (mesmo VPS, porta 5678) |
| **Supabase** | `ktysmnltubbfbvyjphdq` (Sydney ap-southeast-2) |
| **Nameservers** | Hostinger nativos (SEM API de DNS — só via hPanel) |
| **Acesso Studio** | Basic Auth obrigatório em páginas e APIs internas; credenciais apenas no `.env.local`/VPS |

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

## 🎨 SESSÃO 30/07/2026 — AUDITORIA DE UI/UX + FASE 1 DA REFATORAÇÃO

**Contexto:** Felipe apontou que a interface é o que trava o lançamento — sem confiança de que
todos os botões funcionam, copy sem linguagem clara para usuário final, UX/UI ruim, e a
preocupação de fundo de exportar como white-label. Pedido: medir tudo e refatorar.

### 📊 Medição da interface (números reais, não impressão)

| Eixo | Achado medido |
|---|---|
| Tipografia | **345** ocorrências entre 5px e 11px; apenas 3 em 12px. Interface inteira abaixo do piso legível |
| Contraste | **223** violações WCAG AA sobre `#000`: `white/20` = 1.66:1, `white/30` = 2.45:1, `white/40` = 3.66:1. O laranja `#FF5F1F` passa (6.91:1) |
| Feedback | **9** `alert()` nativos como sistema de erro/sucesso |
| Botões mortos | 2 sem `onClick` (suporte + 3 canais sociais) |
| Idioma | Labels EN + erros PT no mesmo fluxo |
| Monolito | `app/page.tsx` com **2.635 linhas**, 6 abas dentro |
| Nav | Arrays duplicados mobile/desktop com **ícones divergentes** para a mesma aba |
| White-label | **265** referências hardcoded a Boomer/Kev/Aussie/Roo/Koala em `.ts`/`.tsx` |

### 🚨 Descoberta grave: métricas inventadas na UI

A barra de status exibia telemetria **hardcoded**, violando a lei de honestidade do CLAUDE.md:
`RTX-4090 // ACTIVE`, `VRAM_LOAD 14.8GB / 24GB`, `LATENCY 18ms // OPTIMAL`,
`Confidence: 98.4%`, `ENGINE_STATUS: OPTIMAL`, `RENDER_CORE: TURBOPACK`.
Não existe GPU local — o render roda no Kling/Replicate, na nuvem. Turbopack é o bundler do
Next, não motor de render. Numa demo white-label isso é um comprador técnico derrubando o
produto em 30 segundos. **Tudo removido.** Métricas reais mantidas (duração, contagem de
cenas, custo estimado, saldo ElevenLabs via `balanceData`).

A rota `/admin` inteira era falsa: cenas hardcoded, `handleDownloadAssets()` e
`handleGenerateLocalTTS()` que só chamavam `alert()` descrevendo trabalho que não acontecia,
amarelo `#DFE104` violando o design system, e texto afirmando "montagem final é 100% MANUAL no
Adobe Premiere" — contradizendo o produto. Era órfã (nada linkava). **Removida.**

### ✅ Fase 1 executada (mecânica, sem decisão de design pendente)

- Piso tipográfico de 12px (`text-xs`) + degrau de 14px (`text-sm`) — zero abaixo de 12px
- Contraste: `white/10,/20`→`/50` (5.32:1); `/30,/40`→`/60` (7.37:1) — zero reprovações
- `src/components/ui/Toast.tsx` **novo** (~70 linhas, sem dependência nova — ponytail):
  auto-dismiss 5s, `aria-live="polite"`, ícone + cor (nunca só cor), `role="alert"` em erro.
  Montado no `layout.tsx`. Substituiu os 9 `alert()`
- Mensagens de erro traduzidas para inglês com **causa + caminho de recuperação**
- `TABS` como fonte única das abas (corrige ícones divergentes mobile/desktop)
- Rótulo visível no textarea principal (antes só placeholder)
- 4 imports órfãos criados pela mudança, removidos

**Verificação real:** `tsc --noEmit` limpo · build compila · **25/25 testes** · dev server
inspecionado em 1440px e 375px, `hasHorizontalScroll: false`. Ganho lateral: sem a telemetria
falsa, as métricas reais pararam de quebrar em duas linhas.

**Limite da verificação:** só as telas que renderizam sem autenticar em serviço externo foram
navegadas. Production/Library/Engine DNA/Studio Labs/Radar receberam as mesmas mudanças
mecânicas e compilam, mas **não foram inspecionadas visualmente aba por aba**.

### 🚨 A SENTINELA ESTAVA CEGA HÁ 4 DIAS (achado e corrigido 30/07)

Execuções do workflow `CmHQvdzX5Sk23n7y`: **success** até 26/07, **error** em 27, 28 e 29/07.
Erro no nó `Rodar Sondas`: `Authorization failed — Authentication required.`

**Causa-raiz:** o deploy de segurança de 27/07 (`b58f955`) pôs Basic Auth na borda. A sonda
batia em `https://boomerandkev.fgss.io/api/sentinel` **sem credencial** → 401 diário. Nenhum
alerta disparou, porque o alerta depende justamente do nó que morreu. Quatro dias sem
vigilância de contrato. Só apareceu porque o hook de sessão reclamou de "91h sem sonda".

**Duas correções, camadas diferentes:**
1. **n8n:** credencial `httpBasicAuth` criada (`Z9MEMLwSrFzbK6oe`, restrita ao domínio
   `boomerandkev.fgss.io`) e ligada ao nó `Rodar Sondas`. Backup do workflow anterior tirado
   antes do PUT.
2. **Código (`d9d83ab`):** o probe `gemini_roteirista` faz self-call
   `fetch(${SELF}/api/ai/script)` e também tomava 401. Adicionado `selfAuthHeader()` lendo
   `STUDIO_AUTH_USER/PASSWORD` (ambas já presentes no `.env` da VPS). O assert ganhou dica
   explícita no 401 p/ não re-diagnosticar isso.

**O produto NÃO estava afetado** — o único self-call do código é o da própria sonda.

### 🔥 BUG DE DEPLOY QUE APAGAVA O .ENV DE PRODUÇÃO (achado e corrigido 30/07)

O primeiro deploy dos 33 commits **falhou e reverteu sozinho**. Diagnóstico medido:

- o standalone do Next não contém `.env`
- `rsync -avz --delete .next/standalone/ → DEST_DIR/` portanto **apaga o `.env` remoto**
- o script antigo compensava reenviando `.env.local` incondicionalmente
- `38ec9bd` tornou o envio condicional a `DEPLOY_ENV_FILE`, **mas manteve o `--delete`**
- com `DEPLOY_ENV_FILE` vazio (o padrão): env apagado, nada enviado, app sobe sem variável
  nenhuma → health check vermelho → rollback

A mensagem `🔐 Ambiente remoto preservado` afirmava o oposto do que acontecia. O rollback de
`c83877c` funcionou exatamente como projetado e é o único motivo do site ter continuado no ar.

**Fix (`d8d8b61`):** `--exclude='.env'` no rsync do standalone + regressão em
`tools/test-deploy-script.mjs`, verificada nas duas direções (falha sem o fix, passa com ele).
O contrato anterior dizia "env seguro" e não pegava isto.

### ✅ DEPLOY CONCLUÍDO — produção agora em `d8d8b61`

Segundo deploy passou no health check na tentativa 1. Produção saiu de `21f09ae` e recebeu
**33 commits** de uma vez: toda a linha de robustez represada desde 27/07 + a Fase 1 de UI.

**Sentinela pós-deploy: GREEN nas 4 sondas** (primeira vez desde 26/07):
- `gemini_roteirista` — 8 cenas, tópico referenciado, balanço boomer/kev 5/3
- `elevenlabs_voz` — 18.4KB de áudio
- `replicate_kling` — kwaivgi/kling-v2.6 acessível, versão b13f36d03049
- `supabase_sydney` — escrita OK, RLS bloqueia anon

Verificado também: `401` sem credencial e `200` com credencial na borda pública; interface nova
confirmada visualmente em produção.

⚠️ **`Boomer & Kev Production Orchestrator` (`n6qm9qMxEFvvkU8C`) segue INATIVO** — confirmado
via API antes do deploy. Por isso o contrato novo das APIs pagas (Idempotency-Key + aprovação)
não quebrou chamador nenhum. **Antes de reativar:** adaptar o chamador n8n para enviar
`Idempotency-Key` + aprovação `n8n_manual` só depois do gate humano no Telegram.

### 🔴 Pendências desta frente

1. **Fase 2 (white-label de verdade):** hex cru → tokens semânticos + migrar os 265 hardcodes
   para consumir `src/data/characters.ts`. A fundação existe: o tipo `Character` já é bem
   modelado (voz, motion, wardrobe, âncora). É migração, não arquitetura nova. Ver [[white-label-vision]].
2. **Fase 3 (copy/IA):** renomear abas para linguagem de usuário — `ENGINE DNA` não diz a um
   comprador que é ali que se configuram os personagens. Idioma definido: **inglês só**.
3. **Fase 4:** quebrar o monolito de 2.635 linhas. Refactor puro, não muda nada para o usuário.
4. **Felipe deve fornecer:** URLs reais dos canais (Discord/YouTube/Instagram) e um contato de
   suporte, para os botões removidos voltarem funcionando.
5. **Passada visual aba por aba** nas 5 abas não inspecionadas.
6. **Deployar `672939d`** (fixes de fidelidade de personagem) — de propósito segurado para subir
   junto com o render de validação.
7. **Unificar `getDetailedPrompt`** (duplicado em `page.tsx`, só p/ PDF, sem os fixes de 30/07).
8. **Segredo dedicado para a sonda:** hoje a sentinela usa a Basic Auth humana do studio. O
   padrão mais limpo — já adotado por Radar e trend cron — é um Bearer próprio que falha fechado.
9. **Dead-man's switch:** o buraco de 27–29/07 não foi a sonda falhar, foi ninguém saber por 4
   dias, porque o alerta dependia do nó morto. Falta um alerta que dispare na AUSÊNCIA de sonda.
10. **Pré-voo obrigatório:** com a sentinela verde, torná-la gate antes de qualquer render pago —
    era exatamente para isso que ela foi criada (`deriva.yml`: `frequencia_sentinela: diaria + pre-voo`).

### 🚦 O QUE REALMENTE TRAVA O LANÇAMENTO

Registrado explícito para não se perder entre as tarefas técnicas: **a engine nunca produziu um
episódio validado.** Pastas `Kling_Renders/`, `TikTok_Renders/`, `Instagram_Renders/`, `Scripts/`
e `Storyboards/` estão VAZIAS. Zero renders de validação pagos.

Todo trabalho de código a partir daqui é polir uma máquina não provada. O portão é:
1. Felipe recarrega crédito Replicate (hoje <US$5 → throttle 6/min bloqueia render de 8 cenas)
2. Autoriza ~US$3–6 por render, 2 renders (9:16 + 16:9)
3. Deployar `672939d` junto
4. Comparar frame a frame contra o `oatmilk.mp4` original do T5 EVO
5. Decidir lipsync animal (aceitar sem sync / testar engine que aceite focinho / Kling nativo)

### 📌 Achado do pipeline registrado nesta sessão (não é UI)

Auditoria do render 9:16 a $0: repliquei `reframeAnchorToAspect()` nas três âncoras.
`master_boomer` → ótimo (personagem inteiro, centrado); `master_kev` → passa mas
descentralizado, corpo cortado na borda direita; `master_wide` → **nenhum personagem**, só
mesa e mixer. O código já protege esse caso (`route.ts` linha ~470 só usa o two-shot em 16:9).
Ver [[analise-rigorosa]] e [[formato-selecionavel]].

### ✅ FIDELIDADE DE PERSONAGEM — 2 CAUSAS CORRIGIDAS (`672939d`, ainda NÃO deployado)

O "risco não provado" acima foi confirmado lendo o código e corrigido. Eram **três** defeitos:

**1. Prompt pedia DOIS personagens com âncora de UM (causa provável do que o Felipe percebeu).**
Em 9:16 a âncora é solo, mas o prompt seguia mandando a `cinematicRule` do `SHOT_TYPES`:
`WIDE` = "shows both characters", `OTS_BOOMER` = "over Kev's shoulder at Boomer". O Kling
recebia "os dois" com referência de um só e **inventava o segundo do zero, sem âncora**.
→ `SOLO_SHOTS_IN_VERTICAL` (WIDE / OTS_BOOMER / GOPRO_FISHEYE) + regra de enquadramento solo
vertical explícita: `no second host in frame`, `never cropped at the top`.

**2. `--ar` cravado em 9:16** mesmo com 16:9 selecionado — o formato era "selecionável" e o
prompt afirmava o contrário. → `--ar ${aspect}`.

**3. Âncora do Kev mal recortada.** O recorte 16:9→9:16 era sempre centrado, mas Kev está à
direita na arte: metade do quadro virava TV/Vegemite e a orelha saía cortada. Comparados
visualmente x=472 (atual) / 650 / 730 / 810 → **730** é o único com rosto centrado e as duas
orelhas inteiras.
→ **`Character.anchorFocusX`** (0..1 normalizado, não pixels — sobrevive a troca de arte em
outra resolução e serve white-label, onde a âncora é de outro personagem). `kev: 0.687`;
Boomer fica no default `0.5`, que já estava correto.
→ `anchorCropFilter()` extraído com `clip()` que prende o recorte dentro da imagem.

**Verificação:** expressão ffmpeg == recorte manual x=729 conferido por md5 (1px do alvo, por
arredondamento); **Boomer byte-idêntico** ao anterior (sem regressão); focus 0.99 / `NaN` /
`Infinity` / negativos não estouram. Suíte 25 → **33 testes**, e confirmei que os novos
**falham sem o fix** e passam com ele (`tests/prompt-aspect.test.ts`).

⚠️ **Não deployado de propósito:** muda o comportamento do render pago. Faz mais sentido subir
junto com o render de validação, para o efeito aparecer já na primeira execução.

📌 **Divergência conhecida:** `getDetailedPrompt` está duplicado em `page.tsx`. A cópia de lá só
alimenta a exportação de PDF (quem renderiza é o pipeline) e **não recebeu estes fixes** — os
manifestos em PDF vão mostrar o prompt antigo até alguém unificar as duas.

### 🧹 Nota de processo: CRLF

Scripts Python de reescrita em massa converteram CRLF→LF em `characters.ts`,
`DraftingTable.tsx` e `TrendsFeed.tsx`, inflando o diff (360 linhas para uma mudança de 11).
Restaurado e conferido com `--ignore-all-space`. **Ao editar em lote neste repo, preservar o
final de linha original** — parte dos arquivos é CRLF.

---

## ▶️ RETOMADA IMEDIATA (estado autoritativo em 29/07/2026)

**HEAD de trabalho consolidado em `95d4196` (`restore-engine`). Linha de robustez até `e5f8488`; estratégia e Foundation Pack comercial até `95d4196`. Último workflow remoto `Quality` do código: run `30449855101`, aprovado em 29/07/2026. Produção permanece nos deploys `f983dd7`, `b58f955` e `21f09ae`; nenhum dos aprimoramentos posteriores foi deployado.**

**Código ainda não deployado (`38ec9bd` → `4f011f2`; 29/07):** higiene/rollback do standalone, fail-fast do deploy, idempotência do pipeline pago, CI, integridade/recuperação do job store, gate financeiro, endurecimento da borda HTTP e testes unitários do roteiro/validações. `.tmp` foi excluído do file tracing; o artefato caiu de 713 MB para 90 MB e ganhou `npm run verify:standalone`. O rsync preserva o `.tmp` runtime da VPS. Jobs terminais agora removem somente seus intermediários (`audio/kling/sync/anchor/lastframe`), preservando estado, idempotência e vídeo final; órfãos reconciliados também são limpos. Os 631 MB históricos locais não foram apagados. Antes do upload, `deploy_studio.sh` cria backup da versão+env atuais; a nova versão só é aceita após health check HTTP 200/401. Falha restaura automaticamente backup+env, reinicia e verifica a recuperação, mantendo o comando como falho para não mascarar o incidente. Env remoto é preservado por padrão e só muda com `DEPLOY_ENV_FILE=/caminho`. `POST /api/pipeline/run` exige `Idempotency-Key` e aprovação explícita com até 10 minutos: concorrência/replay com a mesma chave+payload reutiliza o job; chave igual com payload diferente retorna 409; aprovação ausente/expirada retorna 403 antes de persistência/provedores. O mesmo contrato passou a proteger `/api/render`, `/api/video/generate`, `/api/ai/sync`, `/api/ai/voice` e `/api/ai/image`; respostas concluídas são reproduzidas sem nova cobrança e estado incerto falha fechado. O fallback automático entre Higgsfield/Kling/Luma foi removido para não cobrar dois provedores após timeout ambíguo. Registros pagos ficam no máximo sete dias, com teto de mil entradas. As UIs de render e imagem pedem confirmação humana e preservam chave+aprovação em retries incertos. Toda chamada HTTP das APIs/libs passa por timeout centralizado; 429 respeita `Retry-After`, esperas longas voltam ao chamador e erros de rede mutáveis não são repetidos cegamente. Estado de jobs é gravado atomicamente (`temp → rename`), carrega identidade da instância e jobs órfãos após restart são reconciliados para `FAILED/WORKER_RESTARTED` sem retry automático. IDs de job exigem UUID; IDs de cena aceitam apenas caracteres seguros, bloqueando traversal em caminhos intermediários. O pipeline principal rejeita Higgsfield em vez de cobrar Kling silenciosamente; a opção fica desabilitada até existir worker real. O VOICE_GATE checa configuração antes de persistir, evitando episódio fantasma quando a chave ElevenLabs está ausente. O proxy limita APIs a 60 req/min por cliente, mantém no máximo 10 mil clientes em memória, inclui `Retry-After`, cobre `PATCH` no CSRF e rejeita `Origin`/`Referer` inválidos sem crash. O motor usa UUID, aceita lista vazia ao adicionar a primeira fala e evita classificar `ai` dentro de outra palavra como inteligência artificial. Schemas limitam lote/duração/personagem/enquadramento/texto/chaves antes do fan-out de render. `.github/workflows/quality.yml` executa typecheck, 24 testes unitários, contrato do deploy, build e testes standalone de tamanho, segurança e idempotência sem secrets. Actions oficiais estão na versão corrente e fixadas por SHA imutável. O lint global continua vermelho por débitos preexistentes.

**Correção do contrato de retenção:** o prazo de sete dias vale somente para registros `COMPLETED`. Reservas `RESERVED`, cujo resultado externo é incerto, nunca expiram automaticamente e permanecem bloqueando a chave até reconciliação manual. Um teste regressivo dedicado eleva a suíte a 25 testes.

**Ponto exato de retomada:** a auditoria seguinte começou pela integridade dos arquivos persistidos de idempotência, sem alteração de código. `paid-operation.ts` e o replay do pipeline fazem `JSON.parse` seguido de coerção de tipo, sem schema runtime do conteúdo lido. A próxima rodada deve adicionar validação fail-closed para registro malformado/adulterado e testes que comprovem ausência de nova reserva/chamada paga; revisar também `jobId`, `payloadHash`, `scope`, `status`, datas e resposta persistida. Não houve áudio, provider pago, limpeza histórica nem deploy.

**Estado comercial atual:** `COMMERCIAL_STRATEGY.md` define Boomer & Kev como propriedade intelectual/audiência, com três motores de receita: media/patrocínio, Commercial Creatives e produtos/licenciamento. O pacote operacional está em `commercial/foundation-pack/`: media kit PowerPoint editável de nove slides, one-page, ofertas, briefing, proposta, rate architecture interno, brand-fit score, matriz de direitos, CRM e três campanhas-conceito. O deck é `pre-launch v0`, não inventa métricas e identifica concepts como demonstrações internas.

**Ponto comercial de retomada:** antes de qualquer envio externo, confirmar email comercial, entidade legal/invoicing, papel público do Felipe, naming canônico (`Boomer & Kev` versus `Down Under Discourse`), preços e métricas verificadas. Ainda faltam reel de 30–45 s, contrato revisado juridicamente e templates de relatório de 7/30 dias. Primeiro case recomendado: `Bushproof Multi-Tool`, por permitir prova física imediata com menor risco de claims.

### ✅ Concluído e em produção

- ✅ **Studio fechado com Basic Auth** — home, admin, sentinel e APIs internas retornam 401 sem credencial; assets de campanha seguem públicos. Radar/trend cron exigem Bearer próprio e falham fechados com 503 enquanto seus segredos não forem configurados. Deploys `b58f955` + `21f09ae`, verificados em produção.
- ✅ **Commercial Creatives formalizado e publicado** — linha de produção interna (não nova subsidiária), schema de briefing, formatos, regras de claims, logo e starter kit em `public/assets/commercial-creatives/`.
- ✅ **Double-fire do brainstorm corrigido** — lock síncrono com `useRef`; deployado.
- ✅ **Mix cômico deployado** — bed, ducking, rufo, risada e `loudnorm -14 LUFS`; teste A/B salvo.
- ✅ **WP 1.6/1.7 deployados** — encadeamento de último frame e transições `xfade`; 1.7 aprovado em teste $0, 1.6 ainda exige validação real paga.
- ✅ **Formato selecionável 9:16/16:9** (`4c0fde8`) — corrige sujeitos decepados (Kling herdava aspect 16:9 da âncora; agora reframe + target por formato). Ver §P0a.
- ✅ **wav2lip 404 corrigido** (`7f6f36a`, version hash) — MAS lipsync não detecta rosto animal → sempre non-lipsynced (§P0, decisão de arquitetura pendente).
- ✅ **Throttle Kling (429) + fallback de prod** (`db5011f`) — §P0b/P0c.
- ✅ **Direção de voz por personagem + emoção** (`78ddeca`) — fim do settings hardcoded (§P0e).
- ✅ **DESCOBERTA: vibe cômica = camada de áudio** (trilha+SFX+master do Premiere), ausente no pipeline. SFX absorvidos (`1262bbf`/`38d632a`): Funny_Song+Joke_Comedy_Drums+Hilarious_Laugh. Receita do original extraída (§DESCOBERTA GRANDE).
- ✅ **n8n cron DESATIVADO** — incidente de gasto autônomo (9 renders 20+22/07). §incidente.

### 🔎 Descobertas consolidadas

1. **Segurança:** o Studio estava público e APIs de custo usavam chaves do servidor sem autenticação global. Basic Auth corrigiu a borda; CSRF/rate limit sozinhos não eram autenticação.
2. **Automação fail-closed:** Radar tinha segredo-padrão previsível e `/api/cron/agent` estava público. O padrão foi removido; Radar/trend cron agora retornam 503 sem segredo dedicado.
3. **Áudio é a maior parcela da vibe:** roteiro já tinha estrutura; o salto perceptivo vem de voz dirigida + trilha + SFX + masterização.
4. **Lipsync humano não serve para rostos animais:** Wav2Lip não detecta Boomer/Kev; é decisão de arquitetura, não retry.
5. **Commercial Creatives é capacidade do Studio:** não é nova subsidiária. Os assets são públicos intencionalmente; o painel operacional continua privado.
6. **Deploy inflado:** causa confirmada em `.tmp` (631 MB). Correção local reduz o standalone de 713 MB para 90 MB e preserva separadamente o `.tmp` runtime da VPS; ainda falta deploy.
7. **O ativo comercial é audiência + IP, não “produção com IA”:** tecnologia deve permanecer infraestrutura; o valor público acumula em Boomer & Kev.
8. **Produção e direitos não são o mesmo produto:** publicação, licença de uso, mídia paga e exclusividade precisam ser precificadas separadamente.
9. **Merch deve nascer do conteúdo:** validar bordão/objeto por waitlist e pré-venda antes de estoque.

### 🔴 Pendências reais — ordem atual

1. **Configurar segredos da automação:** criar `N8N_RADAR_SECRET` e `CRON_SECRET` na VPS e nos chamadores; até lá Radar/trend cron ficam 503 por segurança.
2. **Felipe ouvir os A/B:** `04_Delivery/audio_ab/`, materiais de voz e `voice_clone/candidatos/cand6.mp3`.
3. **Clone do Boomer:** Instant Voice Cloning no ElevenLabs usando o sample preparado; enviar `voice_id` para atualizar `characters.ts`.
4. **Galeria Commercial na UI:** assets estão publicados e manifestados, mas ainda não existe aba/tela de visualização no Studio.
5. **Validação paga:** 2 renders (9:16 + 16:9) para validar chaining, enquadramento, wardrobe, áudio e custo real; exige autorização explícita (~US$3–6 cada).
6. **Lipsync animal:** escolher aceitar articulação do Kling ou testar engine compatível com rosto estilizado/animal.
7. **Higiene de deploy/F1:** alteração local já exclui `.tmp` do standalone, preserva o estado runtime e aplica PM2 `--update-env`; falta revisar/configurar PM2 startup, adaptar o chamador n8n para enviar `Idempotency-Key` + aprovação `n8n_manual` somente após o gate humano no Telegram, deployar a mudança, arquivar handoffs antigos e apenas então avaliar tools mortos sem apagá-los silenciosamente.
8. **Plano-mestre antigo:** atualizar artifact `7e32cc32-4b8b-4033-b7fb-259f7247270c` se ele continuar sendo usado.
9. **Foundation Pack — decisões do fundador:** confirmar contato comercial, entidade legal, papel público, naming, preços e categorias proibidas antes de distribuição externa.
10. **Ativos comerciais restantes:** produzir reel, obter revisão jurídica do contrato e criar relatórios 7/30 dias.
11. **Primeiro case demonstrativo:** produzir `Bushproof Multi-Tool` quando a direção autorizar a próxima fase visual; manter disclosure de marca fictícia.

## 🎧 DESCOBERTA GRANDE (24/07): a vibe cômica era PÓS-PRODUÇÃO DE ÁUDIO
Drive externo **`/Volumes/T5 EVO/BOOMER AND KEV`** = projeto ORIGINAL (10GB): áudios, arte (`_bk`, Firefly), episódios finalizados (`Videos/1.THE OAT MILK BAN/`, `2.AFL X NRL`), projeto **Adobe Premiere** + pasta **`Epidemic Sound`** (SFX/música licenciada) + `Characters/footy` (SFX de comédia).

**Medição prova:** episódio original (oatmilk.mp4) áudio = **LRA 7.8 / mean -19.8 dB / pico 0dB** (mixado, punchy); nosso gerado = **LRA 1.9 / mean -27.3 dB** (TTS cru, sem trilha). O original tinha **trilha cômica + stingers (rufo/risada) + masterização** feitos à mão no Premiere. O pipeline NÃO faz nada disso → por isso a vibe sai chapada. O fix de voz (feito) é ~20% da vibe; os ~80% são essa camada de áudio.

**Já absorvido (trio completo de SFX):** `Funny_Song.mp3` (bed 73.6s) + `Joke_Comedy_Drums.mp3` (rufo 3s) + `Hilarious_Laugh.mp3` (risada 26.8s, extraída de zip em footy) em `public/assets/audio/`. Demo audível (bed+loudnorm) em `04_Delivery/audio_ab/` — subiu mean pra -16.5dB, mas LRA ainda 2.6 (falta ducking + stingers p/ dinâmica). Toda a arte-âncora no drive é 16:9 (sem vertical) — o fix de reframe por crop já cobre isso.

### ✅ IMPLEMENTADA E DEPLOYADA — Camada de áudio cômico no pipeline
`assembleVideo` agora adiciona: (1) **music bed** sob a voz; (2) **ducking** com `sidechaincompress`; (3) rufo em 42% e risada curta em 72% do episódio; (4) masterização `loudnorm=I=-14:LRA=7:TP=-2`; saída AAC 48 kHz. Teste $0 nos quatro pilotos passou: 30.16s, vídeo+áudio; A = -18.11 LUFS/LRA 3.9, B = -14.01 LUFS/LRA 3.3/pico verdadeiro -0.76 dBTP. A/B em `04_Delivery/audio_ab/`. **Falta Felipe ouvir.**

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

### Sessão 2026-07-30 (v4.0 → v5.0)
**Agente:** Claude Opus 5
**Foco:** Auditoria medida da engine + auditoria de UI/UX + Fase 1 da refatoração de interface
**Entregue:** medição do pipeline (pastas de produção vazias, zero renders de validação pagos,
fix de aspecto existe mas nunca foi provado); auditoria de UI com números (345 fontes < 12px,
223 violações de contraste, 9 `alert()`, 265 hardcodes de marca); Fase 1 executada e verificada
(build + 25/25 testes + inspeção visual 1440/375px); remoção de toda métrica inventada da UI e
da rota `/admin` falsa.
**Também nesta sessão:** sentinela estava cega há 4 dias (401 desde o deploy de Basic Auth) —
corrigida no n8n e no código; bug de deploy que apagava o `.env` de produção — achado por um
deploy real que falhou e reverteu sozinho, corrigido com regressão; 3 causas de infidelidade de
personagem corrigidas (`672939d`).
**Deployado em 30/07** — produção saiu de `21f09ae` para `d8d8b61` (33 commits).
Sentinela GREEN nas 4 sondas pós-deploy. `672939d` fica NÃO deployado de propósito, para subir
junto com o render de validação. Ver seção "SESSÃO 30/07/2026" acima.
**Suíte de testes:** 25 → 33.

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
