# Frente 4 — Consistência de personagem, voz e set em vídeo IA

Data da pesquisa: 2026-11-24. Convenção: **[FATO]** = afirmação com fonte e data; **[INFERÊNCIA]** = conclusão minha, não verificada na fonte. Fontes de blog/agregador são marcadas como secundárias; preços de terceiros divergem entre si e devem ser conferidos na página oficial antes de orçar. Nada foi comprado nem gerado.

Limite desta pesquisa: não achei nenhum benchmark independente com mascote animal antropomórfico. Todos os rankings abaixo são de personagens humanos ou genéricos. Portanto, para canguru e coala, **só teste próprio decide** (ver seção 6).

---

## 1. Estado da arte em consistência de personagem (2026)

### 1.1 Mecanismos

| Mecanismo | O que é | Status 2026 |
|---|---|---|
| Imagem-para-vídeo (I2V) com primeiro quadro | O quadro inicial ancora a identidade | O que o Studio usa hoje (Kling 2.6). Identidade boa no quadro 1, deriva depois |
| Elements / subject reference (Kling) | Biblioteca de personagens reutilizáveis, 2–4 imagens ou vídeo de 3–8 s | Oficial no Kling 3.0 / Omni |
| Reference-to-video multimodal (Seedance 2.0) | Até 9 imagens + 3 vídeos + 3 áudios por geração | Oficial ByteDance |
| LoRA de identidade (Wan 2.2) | Treino próprio do personagem | Existe treino por API; sem prova para animais |
| Motion transfer / driving video | Reaproveita atuação com identidade fixa (seção 3) | Maduro para humanos; parcial para não humanos |

### 1.2 Fatos com fonte

- **[FATO]** Kling 3.0 Elements: o guia oficial diz que um element multi-imagem usa uma imagem principal frontal + 1 a 3 imagens de outros ângulos (2–4 no total), ou um clipe de 3–8 s para elementos de vídeo. Fonte: [Kling Element Library User Guide](https://kling.ai/quickstart/klingai-element-library-3-user-guide) (acessado 2026-11-24).
- **[FATO]** **Animais são um tipo de element suportado** (realista, anime ou CG). **Voz só pode ser vinculada a elementos do tipo "Character"** (humanos, figuras fantasia, anime/CG), não ao tipo "Animal". Mesma fonte oficial.
  - **[INFERÊNCIA]** Isso cria uma decisão de cadastro: se cadastrarmos canguru/coala como "Character" (estilo CG/antropomórfico) para poder vincular voz, ou como "Animal" (melhor para o corpo, sem voz). Precisa de teste; a documentação não diz qual classificação o sistema aceita para animais antropomórficos.
- **[FATO]** Limite por geração: Video 3.0 Omni / O1 aceita 7 elements sem vídeo de entrada e 4 com vídeo; Video 3.0 (quadro inicial) aceita até 3 elements adicionais ligados ao quadro inicial/final. Elementos podem ser criados sem custo. Mesma fonte oficial.
- **[FATO]** Seedance 2.0 (ByteDance): até 9 imagens, 3 vídeos e 3 áudios + instrução em texto; a página oficial afirma "subject consistency" estável em histórias complexas. Fontes: [ByteDance Seed, lançamento oficial](https://seed.bytedance.com/en/blog/seedance-2-0-%25E6%25AD%25A3%25E5%25BC%258F%25E5%258F%2591%25E5%25B8%2583), [arXiv 2604.14148](https://arxiv.org/pdf/2604.14148), [BytePlus](https://www.byteplus.com/blog/dreamina-seedance2-0). Afirmação do próprio fornecedor, sem número.
- **[FATO]** Restrição: Seedance 2.0 pode bloquear imagens/vídeos com rostos humanos realistas identificáveis ([Luma, Seedance 2.0 Basics](https://lumalabs.ai/learning-center/articles/seedance-2.0-basics)). Para animais cartoon isso tende a não incomodar, **[INFERÊNCIA]** a testar.
- **[FATO, secundária]** Reviews práticos de Kling 3.0: consistência mantida em sequência de 3 planos; "character cloning holds well for clips under 30 seconds; drift appears in longer sequences"; nota 8,0/10 em consistência (Veo 3.1: 8,5; Sora 2: 9,0 nesse review); áudio nativo 7,5/10 contra 9,5/10 do Veo 3.1. Fonte: [findaivideo.com, publicado 2026-03-13, atualizado 2026-04-30](https://findaivideo.com/reviews/kling-3-0-deep-review-ai-director-2026). Review hands-on, nota subjetiva.
- **[FATO, secundária]** Elements reduz mas não elimina a deriva em muitos clipes; recomendação: segmentos curtos, vários ângulos de referência, encadeamento primeiro/último quadro. Fonte: [Lorphic, Kling AI Review 2026](https://lorphic.com/kling-ai-review-full-comparison/).
- **[FATO, secundária]** Um benchmark de blog pontua Seedance 2.0 em 9/10 de estabilidade de personagem contra 8/10 do Kling 3.0 e 7/10 do Veo 3.1 ([AI Journal, benchmark 2026](https://aijourn.com/seedance-2-0-vs-kling-3-0-vs-veo-3-1-ai-video-benchmark-test-for-2026/)); outro relata deriva de identidade no Kling em close com interação física. Metodologia dos blogs não é auditável. Wan 2.6 aparece só como "Good" e uso máximo de ~25 s ([neural4d comparação](https://blog.neural4d.com/comparisons/best-ai-video-generator-for-consistent-characters/)).
- **[FATO]** LoRA em Wan 2.2: a fal oferece treino por API (`wan-22-trainer` t2v/i2v) a US$ 0,004 por passo (data da página: 2026-10-15), 400 passos por padrão; treina só o transformer de baixo ruído. Fonte: [fal, How to Fine-Tune Wan 2.2](https://fal.ai/learn/devs/how-to-fine-tune-wan-with-the-api). Guias de comunidade dizem que o dataset pesa mais que o rank ([WaveSpeed, jan/2026](https://wavespeed.ai/blog/posts/blog-wan-2-2-lora-training-settings)). Nada específico para mascote animal.

### 1.3 Ranking para o nosso caso

**[INFERÊNCIA]** com base nos fatos acima:

1. **Kling 3.0 / Omni com Elements** — melhor encaixe: element do tipo Animal documentado, voz vinculável (mas só em Character), mesma família do Kling 2.6 já usado.
2. **Seedance 2.0 reference-to-video** — mais referências (9 imagens), segue com vídeo de referência de movimento; candidato forte para o plano de set + personagens. Preço e termos pelo Higgsfield precisam de verificação.
3. **Wan 2.2/2.x com LoRA** — única via de **posse real da identidade** (o LoRA é nosso), relevante para white label; custo de engenharia alto e sem prova em animais.
4. Veo, Runway Gen-4.5, Hailuo, Pika, Luma: não pesquisados a fundo nesta rodada; só há a nota 8,5/10 do Veo 3.1 acima. Não recomendo sem teste.

---

## 2. Identidade de voz e lip sync

### 2.1 Voz nativa do modelo vs voz clonada fixa

- **[FATO]** Kling 3.0 gera áudio e vídeo juntos; vincular voz ao element exige 5–30 s de áudio de um único falante, ou escolha na Voice Library ([guia oficial Kling](https://kling.ai/quickstart/klingai-element-library-3-user-guide)). Segundo um blog, a vinculação só funciona com a opção "Character Orientation Matches Video" ([PromptsRush](https://promptsrush.com/blog/how-to-keep-characters-consistent-in-kling-ai)) — fonte única, verificar na interface.
- **[FATO]** Não achei teste independente que meça a estabilidade da voz do Kling entre muitos clipes. "Consistente" é afirmação do fornecedor ([fal, Kling 3.0](https://blog.fal.ai/kling-3-0-is-now-available-on-fal/)).
- **[FATO]** Existe um truque de comunidade para voz consistente no Kling 3.0 usando ElevenLabs ([vídeo no YouTube](https://www.youtube.com/watch?v=b9uvXLvWL08)); não verificado.
- **[INFERÊNCIA]** Para "idêntico para sempre" e para white label, voz clonada fixa (ElevenLabs ou similar) em arquivo de áudio próprio é mais segura: o ativo é um arquivo/voz que controlamos, não um comportamento de modelo que muda a cada versão. A voz nativa do Kling deve ser tratada como rascunho.
- **[FATO]** ElevenLabs: Professional Voice Clone disponível a partir do Creator (1 voz), Pro (1), Scale (3), Business (10); licença comercial inclusa de Starter para cima. Fonte: [ElevenLabs Pricing](https://elevenlabs.io/pricing) (acessado 2026-11-24).

### 2.2 Lip sync em boca de animal/cartoon

- **[FATO] A própria Sync diz:** "You can lipsync human-like faces, but our models don't currently support animals or non-humanoid characters." Também: lipsync-2 e lipsync-2-pro precisam de movimento natural de fala no vídeo (trechos parados não sincronizam); sync-3 consegue abrir lábios parados, mas de forma genérica. Fonte: [Sync, Lipsync models](https://sync.so/docs/models/lipsync) (acessado 2026-11-24). Um artigo de suporte da Sync diz que o modelo funciona melhor em humanos fotorrealistas e pode falhar em CGI/cartoon estático ([Sync support](https://support.sync.so/articles/7908962494-no-lipsync-on-my-ai-generated-character)).
  - **[INFERÊNCIA]** O Sync lipsync **provavelmente não serve** para focinho de canguru/coala, a não ser que o personagem tenha rosto bem "humanoide". Só teste de 1 clipe barato confirma; não gastar em lote antes.
- **[FATO, secundária]** Listicles apontam Hedra como opção flexível para personagens/animais, mas "não substituto de motor dedicado quando a precisão da boca é prioridade" ([aitools.omeka.net](https://aitools.omeka.net/lip-sync-animals-ai)); a maior parte é conteúdo de vendor. Para focinho/linha única de boca, ferramentas de timing/rig (Rhubarb, Papagayo-NG) dão mais controle, segundo a mesma família de guias ([Percify, 2026](https://percify.io/blog/5-free-tools-for-perfect-character-lip-syncing-animation-in-2026)).
- **[FATO]** Falha conhecida: boca que começa totalmente fechada não abre em lipsync-2/2-pro (relatado em review de terceiro, ver resultados em [Sync docs](https://sync.so/docs/models/lipsync) para a regra de movimento natural).
- **[INFERÊNCIA]** Mais robusto para nós: **gerar o vídeo com a fala já embutida** (Kling nativo/Omni ou Seedance com áudio de referência, que sincroniza boca na geração) e depender menos de lip sync pós-processado. Higgsfield Speak/Intone, Kling lip sync, Hailuo e Runway Act não foram verificados com fonte nesta rodada: tratar como **não confirmados para animais**.

---

## 3. Biblioteca de atuação (motion transfer)

- **[FATO]** Runway Act-Two: pega uma performance de referência + personagem (imagem ou vídeo); a ajuda oficial diz funcionar com "non-human characters, and styles". Fonte: [Runway Help, Act-Two](https://help.runwayml.com/hc/en-us/articles/42311337895827-Performance-Capture-with-Act-Two) via resumo de busca (a página retornou 403 no fetch direto; confirmar manualmente).
- **[FATO]** Wan-Animate (Alibaba): modos Move (anima imagem do personagem com vídeo guia) e Mix (substitui personagem em vídeo); o paper diz que a abordagem por esqueleto generaliza melhor para personagens não humanoides e que o Act-Two tem dificuldade em movimentos complexos — comparação feita pelos próprios autores. Fonte: [arXiv 2509.14055](https://arxiv.org/html/2509.14055v1) (set/2025, **fonte com mais de 12 meses**; há menção a um sucessor "Wan-Animate-2" em guias, não verificado). Um guia nota que Wan Animate fixa no maior rosto do quadro.
- **[FATO]** Runway Aleph 2.0 custa 28 créditos/s e Gen-4.5 12 créditos/s ([Runway Pricing](https://runway.com/pricing), 2026-11-24); Act-Two não consta na página.
- Viggle, Higgsfield Motion Transfer/Genjutsu: **não pesquisados com fonte** nesta rodada. Higgsfield aparece na API disponível ao projeto, por isso entra no teste.
- **[INFERÊNCIA]** Para a biblioteca de atuação: gravar (ou gerar uma vez e aprovar) um clipe-guia por "emoção/gesto" (concordar, rir, apontar para TV) e reaplicar com identidade fixa. Risco: o driving video humano precisa mapear em corpo de canguru musculoso/coala; focinhos têm pouca expressão facial transferível. Testar Wan-Animate e Act-Two com 1 clipe cada.

---

## 4. Substituição de tela (sponsor nas TVs do set)

- **[FATO]** Fluxo padrão de mercado: rastreamento planar (Mocha) exportado como Corner Pin com motion blur para uma pre-comp com o criativo; Mocha segue a superfície inteira, melhor que o tracker de pontos do After Effects para telas. Fontes: [Boris FX, screen replacement](https://borisfx.com/blog/screen-replacement-screen-tracking-in-after-effects-borisfx/), [fórum Adobe](https://community.adobe.com/t5/after-effects-discussions/tracking-with-mocha-for-screen-replacement/m-p/9652789). Erros comuns de desvio vêm da configuração (camada do corner pin com tamanho diferente da composição). Oclusões (mão/personagem na frente da TV) exigem máscara/track separado do oclusor.
- **[FATO]** O filtro `perspective` do ffmpeg existe (seção 11.195 da [documentação oficial](https://ffmpeg.org/ffmpeg-filters.html#perspective)); não consegui ler os parâmetros nesta rodada. Do meu conhecimento prévio, aceita 4 cantos (x0..y3) e `eval=frame` permite expressões por quadro — **[INFERÊNCIA]**, verificar na documentação.
- **[INFERÊNCIA] Estratégia mais barata:** como o set é fixo, o melhor é **eliminar a deriva na origem**: câmera travada (prompt "locked-off, static camera, no camera movement") e as TVs ficam sempre no mesmo lugar. Com câmera estática, os 4 cantos da TV são constantes: um único `perspective`/overlay em ffmpeg por TV, sem tracking, com máscara de oclusão só quando alguém passa na frente. Se houver leve deriva: estabilizar o clipe (vidstab/OpenCV) antes e depois aplicar o mesmo corner pin, ou rastrear 4 pontos com OpenCV (homografia por quadro). Mocha só se a câmera se mover.
- **[INFERÊNCIA] Mais robusto ainda:** gerar as TVs com tela **verde/cor chroma uniforme** (ou alfa) no plano do set e fazer chroma-key; reflexo e brilho da tela entram como overlay multiplicado. Risco: modelos reinterpretam a tela de uma geração para outra; por isso a tela deve ser tratada como "buraco" por prompt e, melhor, por composição: gerar personagens separados do fundo quando possível.
- **[INFERÊNCIA]** Não achei ferramenta automática com fonte pesquisada; não afirmo que exista uma.

---

## 5. Preços e termos (verificados em 2026-11-24 quando oficiais)

### 5.1 Preços

| Item | Preço | Fonte / observação |
|---|---|---|
| Kling 3.0 API oficial | unidade pré-paga a US$ 0,14; 3.0 em 1080p com áudio ≈ 1,2 unidade/s (US$ 0,168/s) | Citado por [pesquisa agregada sobre a página de preços do Kling](https://kling.ai/dev/pricing); o fetch direto não retornou tabela. **Conferir manualmente.** |
| Kling 3.0 via revendedores | US$ 0,07 a 0,18/s (std), US$ 0,09 a 0,24/s (pro); áudio +50% | [fal via RenderCents](https://rendercents.com/pricing/kling-3-0-api), [Runway Dev](https://dev.runway.com/learn/kling-3-0-api), [cheap.dev](https://cheap.dev/blog/kling-3-0-video-api-pricing), [Krea](https://www.krea.ai/blog/kling-3-0-api-access-guide-pricing-code-examples-for-multi-shot-ai-video). Conflitam entre si |
| Kling 3.0 pelo Higgsfield API | a partir de US$ 0,084/s em 720p (promo de 50% registrada em 2026-09-23); outro post cita US$ 0,112/s | [Higgsfield blog](https://higgsfield.ai/blog/ai-video-api-pricing-vs-subscriptions), [ModelsLab](https://modelslab.com/higgsfield-alternative). Verificar com o estimador da API |
| Seedance 2.0 BytePlus (oficial) | tokens: ~US$ 7,00/M (480/720p sem vídeo), 4,30/M com vídeo de referência; Fast 5,60/M. ~US$ 0,15/s em 720p (set/2026) | Via agregadores citando a ModelArk: [novoads](https://novoads.ai/en/blog/seedance-2-0-pricing), [kingy.ai](https://kingy.ai/news/byteplus-review-seedance-2-0-turns-byteplus-into-a-serious-ai-video-platform/). Secundário |
| Seedance 2.0 fal | US$ 0,3034/s (720p), Fast US$ 0,2419/s | [fal vs Kling](https://fal.ai/learn/tools/seedance-2-0-vs-kling-3-0) via busca |
| Seedance 2.0 no Higgsfield | posts oficiais citam US$ 0,20/s e US$ 0,9332/s (inconsistentes) | [Higgsfield blog](https://higgsfield.ai/blog/seedance-2-0-pricing-2026). Não confiável sem estimador |
| Runway | Gen-4.5: 12 créditos/s; Aleph 2.0: 28 créditos/s; planos Standard US$ 15, Pro US$ 35, Max US$ 95/mês | [Runway Pricing](https://runway.com/pricing), 2026-11-24 |
| Sync lipsync (API) | lipsync-2 US$ 0,05/s; lipsync-2-pro US$ 0,083/s; sync-3 US$ 0,133/s; react-1 US$ 0,167/s (planos Hobbyist/Creator; Scale -20%) | [Sync Pricing](https://sync.so/pricing), 2026-11-24 |
| ElevenLabs | Creator US$ 22/mês (121k créditos, 1 PVC); Pro US$ 99 (600k, 1 PVC); Scale US$ 299 (1,8M, 3 PVC, 3 assentos); TTS 1 crédito/caractere | [ElevenLabs Pricing](https://elevenlabs.io/pricing), 2026-11-24. Promoção Black Friday até 1/dez |
| Treino LoRA Wan 2.2 | US$ 0,004/passo | [fal](https://fal.ai/learn/devs/how-to-fine-tune-wan-with-the-api), 2026-10-15 |

**[INFERÊNCIA] Conta para um episódio de 60 s** (≈ 12–15 clipes de 5 s com refugos): Kling 3.0 a US$ 0,084–0,17/s → 60 s úteis ≈ US$ 5–10 sem refugo; com 2 tentativas por clipe, US$ 10–20. Isso estoura a faixa de US$ 5–12/dia se a taxa de refugo for alta. Conclusão: **reduzir a quantidade de segundos gerados** (planos estáticos reutilizados, ver receita) importa mais que trocar de modelo.

### 5.2 Termos comerciais e white label

- **Kling (API Paid Service, vigente desde 2026-04-21)** — [kling.ai/document-api/guides/protocols/paid-service](https://kling.ai/document-api/guides/protocols/paid-service.md):
  - **[FATO]** §6.4: uso comercial do conteúdo gerado "não é restrito", com alerta de risco de infração; §6.3: propriedade do output é do usuário se tiver direitos sobre os inputs, sem garantia de proteção autoral.
  - **[FATO]** §8.2.3 e §10.3: proibido vender, transferir ou licenciar os serviços de API ou direitos pagos, e ceder a conta sem consentimento escrito; §3.3: licença não exclusiva, intransferível/não sublicenciável; §3.5: suspensão se criar produtos derivados "para competir conosco"; §3.8: chave de API não pode ser repassada a terceiros.
  - **[FATO]** Não há cláusula explícita de white label/rebranding.
  - **[INFERÊNCIA — risco alto]** Vender a ferramenta white label **com chave Kling da gente repassando acesso** conflita com §8.2.3/§3.8. Modelo seguro: o cliente traz a própria chave (BYOK), ou contrato comercial/enterprise com a Kling. Consultar advogado.
- **Higgsfield** ([Help Center](https://higgsfield.ai/creator-hub/help-center/account-and-privacy/who-owns-my-generations-and-can-i-use-them-commercially); [Terms 2026-07-23](https://higgsfield.ai/terms-of-use-agreement-23-07-2026)):
  - **[FATO]** Higgsfield declara não reivindicar propriedade de inputs/outputs nem restringir uso comercial; restrições da §5.2 valem para explorar o próprio serviço; proíbe usar saídas para treinar modelos de IA; limites de uso de API podem variar. Acordo Enterprise prevalece sobre os Termos.
  - **[FATO, conflito]** Reportagem de jul/2026 diz que os termos dão licença perpétua e sublicenciável para treino/marketing ([Startup Fortune](https://startupfortune.com/higgsfield-ai-tells-creators-they-own-their-videos-but-quietly-claims-a-perpetual-worldwide-license-to-train-on-them/)); o material oficial descreve licença mais estreita. Ler os Termos vigentes.
  - **[FATO]** Não achei cláusula de revenda/white label da API. Os termos de Seedance/ByteDance via Higgsfield **não foram lidos** (lacuna).
- **ElevenLabs** — **[FATO]** planos pagos permitem uso comercial sujeito à Prohibited Use Policy; **sublicenciar/embutir o serviço em solução própria cai nos "OEM Terms"**, que não consegui ler ([Terms of Use](https://elevenlabs.io/terms-of-use)). Para white label, precisa de acordo OEM/enterprise. Clonar voz exige direito sobre a voz (voz própria ou autorizada).
- **Runway** e **Sync**: **[FATO]** a página de preços não trata de licença comercial; Sync: Hobbyist leva marca d'água, Creator em diante não ([Sync Pricing](https://sync.so/pricing)). Termos completos não lidos.

---

## 6. Receita de produção recomendada (para Boomer & Kev)

Premissa **[INFERÊNCIA]**: a identidade é mais barata e mais segura quando **gera-se menos e reaproveita-se mais**. O set é fixo, então o fundo e as TVs não devem ser regenerados a cada plano.

1. **Ativos-mestre (uma vez):** sheet de cada personagem (frente, 3/4, perfil, costas, expressões, boca aberta/fechada) + plate do set (imagem sem personagens, com as TVs). Congelar versão e hash. Isso é o "cânone".
2. **Cadastrar Elements no Kling 3.0** (canguru e coala: 4 imagens cada, nomes únicos) e testar as duas classificações (Animal vs Character) para ver qual deixa vincular voz e segura melhor o corpo. Medir com um checklist passa/falha: cor do pelo, luvas, headset, proporção, fones.
3. **Voz:** clonar/fixar a voz de cada personagem no ElevenLabs (PVC, plano Creator/Pro) e guardar o áudio de cada fala como arquivo do episódio. Usar a voz nativa do Kling só como guia de timing.
4. **Planos:** gerar com câmera travada, planos curtos de 3–5 s, quadro inicial = quadro-chave aprovado (encadear último→primeiro quadro quando necessário). Preferir planos de dois personagens já no set (menos costura entre clipes). Um banco de **clipes de atuação aprovados** (concordar, rir, reação) reutilizáveis entre episódios reduz custo diário.
5. **Fala:** (a) Kling/Seedance com áudio de referência já sincroniza boca na geração; (b) só se necessário, passar um teste curto em Sync **e em Hedra** para ver se a boca de animal funciona (Sync diz que não suporta animais). Se falhar nos dois, aceitar boca "de bonecos" e cobrir com cortes/reações.
6. **TVs:** câmera estática → corner pin fixo em ffmpeg (4 cantos constantes) com máscara de oclusão; se houver deriva, estabilizar antes ou rastrear com OpenCV; Mocha só como último recurso. Aplicar o criativo do patrocinador em pós, nunca na geração.
7. **QA automático barato:** comparar cada clipe com o element/sheet (similaridade de embedding + checagem de cor) e rejeitar antes de gastar mais renderização. Sonnet/Haiku fazem a revisão contra o checklist.
8. **Plano B de identidade própria:** se Elements/referências derivarem, treinar LoRA Wan 2.2 (custo de treino baixo: 400 passos × US$ 0,004 ≈ US$ 1,60 segundo a tabela da fal) e comparar. É o caminho de longo prazo para posse do ativo no white label.

### Riscos

| Risco | Probabilidade/impacto | Mitigação |
|---|---|---|
| Deriva de identidade em sequências longas (relatada em reviews) | alta, média | planos curtos, refs multiângulo, checklist |
| Lip sync não funciona em focinho (doc oficial da Sync) | alta, alta | fala na geração; teste Hedra; cobrir com cortes |
| Voz nativa muda entre versões do modelo | média, alta | voz clonada fixa em arquivo |
| Termos Kling/ElevenLabs bloqueiam revenda white label | alta, **crítica** para o produto | BYOK ou contrato enterprise/OEM; revisão jurídica |
| Preços divergentes por revendedor | alta, média | usar estimador da API; orçar com margem |
| Modelo depreciado/atualizado (Kling 2.6 → 3.x, Seedance 2.x → 2.5) muda a "cara" | média, alta | ativos-mestre próprios, versão fixa, LoRA próprio |
| Fontes desta pesquisa majoritariamente blogs/agregadores | alta | tudo marcado; validar com testes próprios |

### Lacunas desta pesquisa (não confirmei)

Veo, Hailuo, Pika, Luma; Higgsfield Speak/Intone/Motion Transfer; Viggle; Kling lip sync nativo em animais; termos de Seedance via Higgsfield; OEM Terms da ElevenLabs; preço oficial exato do Kling (página dinâmica sem tabela no fetch); parâmetros do filtro `perspective` do ffmpeg. Recomendo uma rodada curta de teste prático (1 clipe por candidato, mesmo prompt) antes de decidir.
