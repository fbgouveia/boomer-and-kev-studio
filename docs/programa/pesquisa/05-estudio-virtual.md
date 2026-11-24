# Frente 5 — Estúdio virtual (3D) vs set só com IA

Data da pesquisa: 24/11/2026. Convenção: **[FATO]** = afirmação com fonte e data; **[INFERÊNCIA]** = conclusão minha, não confirmada por fonte. Quase todas as fontes são blogs e páginas de fornecedores, não documentação oficial; isso está marcado onde importa. Nada foi comprado, assinado ou gerado.

## 0. Resumo executivo

- **[INFERÊNCIA]** Para "o set é geometricamente idêntico em todo ângulo para sempre", só um set 3D (Blender/Unreal) com câmeras fixas garante isso por construção. Geração de imagens por IA só aproxima.
- **[INFERÊNCIA]** O caminho mais seguro é híbrido: set 3D renderizado (plates) + personagens IA por cima, e as TVs como superfícies vazias/verdes com coordenadas conhecidas, preenchidas em pós. Assim o modelo de vídeo nunca "inventa" o conteúdo das telas.
- **[FATO]** Não achei, em fonte pública verificável, um estudo de caso de canal animado/podcast com IA que descreva exatamente esse pipeline (ver seção 3). O caso mais próximo é de estúdio, publicado por fornecedor.

## 1. Opções para plates de set consistentes

### 1a. Set 3D em Blender ou Unreal com câmeras fixas

- **[FATO]** O Blender 5.0 renomeou o identificador do Eevee de BLENDER_EEVEE_NEXT para BLENDER_EEVEE (relevante se houver scripts de render) — [Blender 5.0 Eevee release notes](https://developer.blender.org/docs/release_notes/5.0/eevee/) (2025/26, página oficial).
- **[FATO]** Fornecedores de render farm afirmam que Eevee costuma dispensar nuvem (uma RTX 3060 rodaria sequências quase em tempo real) e que Cycles de 200 frames custou cerca de US$ 10,90–13,10 em um serviço e ~US$ 15 em outro — [Super Renders Farm, custo por frame 2026](https://superrendersfarm.com/article/cloud-rendering-cost-per-frame-2026) (2026, fonte de vendedor, não neutra). Para nós o que importa é: plates estáticos são poucos frames (10 ângulos × 1 imagem), então o custo de render é desprezível. **[INFERÊNCIA]**
- **[FATO]** Existem packs prontos de estúdio de podcast para Unreal: "Podcast Studio 2" no Fab, 58 meshes, nível de exemplo com Lumen, preço exibido **13,56 AUD** (sem impostos), formatos Unreal/UEFN — [Fab: Podcast Studio 2](https://www.fab.com/listings/95824798-d618-4323-9c30-a38d0f94db62) (consultado 24/11/2026). A mesma página declara que o produto "não permite uso com IA".
- **[FATO]** O Fab permite a tag NoAI em ativos sob licença Standard, que proíbe usar o conteúdo como dataset, no desenvolvimento ou como "inputs" de programas de IA generativa; há debate no fórum se "inputs" inclui alimentar um gerador de vídeo, sem resolução oficial — [fórum Unreal, "NoAI content: inputs or training inputs?"](https://forums.unrealengine.com/t/noai-content-inputs-or-training-inputs/2838630) e [documentação Fab de licenças](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab) (consultados 24/11/2026). **[INFERÊNCIA — risco jurídico]** Se o plate renderizado de um asset comprado for usado como start frame em Kling/Veo, convém escolher assets sem restrição de IA ou perguntar ao publisher. Modelar o set do zero (ou contratar com cessão de direitos) elimina o risco.
- **[FATO]** Há um set de podcast para Blender no Superhive (preço não verificado) — [Superhive: Podcast Studio Setup](https://superhivemarket.com/products/podcast-setup-setudio-design/docs) (consultado 24/11/2026).
- **[INFERÊNCIA]** Blender basta para o nosso caso (plates estáticos, câmeras fixas por cena, uma câmera por ângulo). Unreal só compensa se um dia quisermos câmera virtual em tempo real/streaming ao vivo.

### 1b. Geração de imagens por IA de vários ângulos do mesmo ambiente

- **[FATO]** Guias de terceiros dizem que o Nano Banana Pro aceita referências múltiplas (as fontes divergem: 8 ou 14; fidelidade máxima com ~6) e que manter a mesma imagem de referência e variar só a câmera preservou atmosfera em ~20 ângulos — [Medium: 20 ângulos com Nano Banana Pro](https://medium.com/@bmx13/how-i-turned-one-simple-photo-into-20-distinct-camera-angles-using-nano-banana-pro-ffb46824d3d2), [Wentuo](https://blog.wentuo.ai/en/nano-banana-pro-multi-image-reference-best-practices-en.html), [Apiyi](https://help.apiyi.com/en/nano-banana-pro-face-consistency-guide-en.html) (2025–2026, blogs).
- **[FATO]** Os mesmos guias atribuem inconsistência a ângulos sub-representados nas referências e dizem que o modelo não garante 100% de consistência — [Apatero](https://apatero.com/blog/nano-banana-pro-multi-reference-14-images-5-faces-guide-2025) (2025).
- **[FATO]** Não achei fonte que teste especificamente manter o *layout exato* de uma sala em muitos ângulos; os guias tratam sobretudo de personagem. **[INFERÊNCIA]** Isso bate com o problema atual do projeto (plates que "discordam"): consistência por referência é aproximada, não geométrica. Serve para vibe, não para coordenadas de TV.
- **[FATO]** Gaussian splatting a partir de imagens: o World Labs Marble (beta) cria splats via Studio ou API; em 30/10/2026 a criação de splats abriu a todos os clientes; ~US$ 5 por run refinado (~20 min), US$ 0,50 por rascunho; exporta SPZ ou PLY a partir do plano Standard; tarefa `splats2Mesh` converte splat em malha grosseira; direitos comerciais ligados ao plano Pro segundo o artigo — [Maverick Frame, Marble Splats](https://maverickframe.com/blog/world-labs-marble-splats/) (01/11/2026, blog de terceiros; confira preços no site oficial, estão em beta).
- **[FATO]** Pela API, a entrada recomendada é de 8–16 vistas sobrepostas por ambiente, cada uma com imagem, intrínsecos e pose de câmera e profundidade linear em EXR; o modo refinado gera vistas extras, então parte do splat é inventada — mesma fonte acima. **[INFERÊNCIA]** Ou seja, para usar splat com rigor precisamos de poses de câmera conhecidas, que vêm de um render 3D; um splat construído só de imagens de IA herda as discordâncias delas.
- **[FATO]** Um review diz que as malhas derivadas do Marble têm qualidade ruim até agora — [Design4Real, Marble em teste prático](https://design4real.de/en/world-labs-marble-practical-test/) (data não verificada; resultado de busca). Outra fonte descreve renders de flythrough com controle de câmera "pixel-accurate" — [Invideo, Marble, atualizado ago/2026](https://invideo.io/blog/world-labs-marble-3d-worlds/) (blog; não verifiquei o recurso).
- **[INFERÊNCIA]** Splat/Marble é bom para explorar variações de cenário e pré-visualizar câmeras, mas hoje não substitui um modelo 3D com geometria limpa e telas com cantos exatos. Genie e NeRF: **não pesquisei a fundo nesta rodada**; tratar como lacuna.

### 1c. Híbrido: plate 3D/splat + personagens IA

- **[FATO]** O Kling 3.0 / Omni aceita vincular até 3 elementos em start frame e start+end frame, até 7 personagens de referência em vídeo, multi-shot e até 15 s; cada elemento exige ao menos 2 imagens de referência (1 principal + 1 adicional, até 4) — [Kling, guia da Element Library](https://kling.ai/quickstart/klingai-element-library-3-user-guide) (2026, doc oficial via resultado de busca).
- **[FATO]** O Veo 3.1 aceita first/last frame e até 3 imagens de referência (personagem, objeto ou cena); um fórum de desenvolvedores relata requisições com reference_images rejeitadas pela API apesar da doc, e a Vercel nota que referências não são usadas como primeiro frame — [Google Developers Blog](https://developers.googleblog.com/introducing-veo-3-1-and-new-creative-capabilities-in-the-gemini-api/) e [fórum Google AI](https://discuss.ai.google.dev/t/veo-3-1-reference-images-docs-say-available-api-says-not-supported/111853) (2025/26).
- **[FATO]** Runway Gen-4 References: a busca não retornou fonte; **lacuna**.
- **[FATO]** Caso mais próximo de pipeline 3D→IA: a Reallusion publicou (29/10/2026) o caso R.G. Keys, em que um estúdio migrou uma série de Unreal para um fluxo 3D→IA e reaproveita os layouts/visualizações 3D antigos para guiar enquadramento e composição dos shots gerados por IA — [Reallusion Magazine](https://magazine.reallusion.com/2026/10/29/ai-studio-storytellers-r-g-keys-smooth-transition-from-unreal-engine-to-a-faster-3d-to-ai-workflow/) (conteúdo de fornecedor; não consegui abrir a página, li só o resumo da busca).
- **[INFERÊNCIA]** Duas variantes do híbrido: (A) **composição clássica**: render 3D do set com o personagem IA recortado/inserido por cima, em passe separado; o set nunca passa pelo modelo de vídeo, então é imutável. Exige personagem com fundo limpo/alfa (vídeo de IA com chroma ou matte). (B) **start frame**: o render 3D + personagem montados em imagem única vira o primeiro frame do vídeo de IA; mais simples, mas o modelo pode redesenhar o fundo (ver 2).

## 2. Comportamento dos modelos de vídeo com plate 3D como primeiro frame

- **[FATO]** Guias de prompt (blogs, não docs de fornecedor) recomendam, com first frame, descrever só movimento e câmera, e declarar câmera estática ("static locked camera, no motion, subject moves within frame", dado como funcional em Seedance, Kling, Veo, Hailuo, LTX-2); re-descrever a imagem faz o modelo "corrigir" rosto e roupa — [AI Video Bootcamp, 2026](https://aivideobootcamp.com/blog/cinematic-ai-video-prompts-2026/), [DEV Community, fórmula de 6 partes](https://dev.to/setposboy_ea00c0eb450cf3e/how-to-write-prompts-for-ai-video-models-a-six-part-formula-seedance-kling-veo).
- **[FATO]** Causas e remédios de morphing de fundo, segundo guias: o modelo inventa fundo novo quando a câmera se mexe; travar câmera, prompt negativo ("frozen background, static environment, morphing architecture"), simplificar o fundo, usar first+last frame, clipes curtos de 3–5 s emendados — [Pippit](https://www.pippit.ai/blog/stop-unwanted-camera-movement-ai-video), [Scenario, troubleshooting](https://help.scenario.com/articles/1755388979-troubleshooting-video-generations), [Medium, problema de continuidade](https://medium.com/@em07emmawilson/the-continuity-problem-nobody-warns-you-about-in-ai-video-1e302239dc96).
- **[FATO]** Texto, rostos, mãos, tecido estampado e reflexos são redesenhados de forma ligeiramente diferente a cada frame e "tremem/derretem" — fonte: guia de flicker/morphing resultado de busca ([Gemini Omni blog](https://geminiomni-ai.com/blog/fix-ai-video-flicker), 2026, blog). **[INFERÊNCIA]** Isso inclui telas de TV com anúncio: o modelo vai alterar o conteúdo/bordas.
- **[FATO]** Nenhuma fonte encontrada recomenda explicitamente plate sem tela + composição da tela em pós; a técnica é comum em produção, mas **não confirmada aqui**.
- **[INFERÊNCIA]** Práticas para o nosso caso: (1) TV renderizada como painel verde/cinza uniforme com 4 cantos conhecidos, ou melhor, tela preta com marcadores, rastreados em pós; (2) câmera estática em todos os ângulos (não precisa de movimento de câmera, só de movimento do personagem), o que remove a principal causa de morphing; (3) clipes de até ~8–15 s com o mesmo plate como start frame, e validar por diferença de pixels do fundo contra o plate (máscara do personagem fora) — métrica passa/falha automatizável; (4) se o fundo derivar, reaplicar o plate original por baixo usando matte do personagem (variante A). Nenhum desses testes foi feito por mim; precisam de piloto.

## 3. Como VTubers e shows animados constroem e reusam sets

- **[FATO]** VTuber Awards: palco virtual em Unreal Engine; posição, rotação e lente das câmeras rastreadas por stYpe e enviadas ao Unreal; operadores trocavam ângulos no estádio virtual por iPads ligados a câmeras virtuais, dando impressão de uma dúzia de câmeras — [Live Design Online, VTuber Awards](https://www.livedesignonline.com/news/vtuber-awards-how-build-virtual-stage-audience-will-believe) e [Pro Video Coalition, WePlay Studios](https://www.provideocoalition.com/weplay-studios-from-esports-tournaments-to-live-event-productions/) (evento de grande porte, não podcast).
- **[FATO]** Projetos menores: podcast virtual em Unity com estação de câmeras; projeto estudantil em Unreal + OBS via Spout para Twitch — [HackMD, Virtual Podcast Studio](https://hackmd.io/@XR/podcast). A Epic mantém um projeto de exemplo "Virtual Studio" com chroma key em material e integração AJA/Blackmagic — [Epic, Virtual Studio sample](https://dev.epicgames.com/documentation/en-us/unreal-engine/virtual-studio-sample-project-in-unreal-engine). COVER Corp (hololive) iniciou lives em Unreal em nov/2024 — resultado de busca, fonte [Cover Edge](https://coveredge.cover-corp.com/en/?p=2320) (não verifiquei o texto).
- **[FATO]** Lacuna: não encontrei estudo de caso publicado de canal animado de IA (podcast/sátira) com set 3D fixo + câmeras múltiplas. Busca por "faceless channels" retornou só tutoriais de pipeline de roteiro→imagem→clipe sem set 3D reutilizado (ex.: [Medium, nicho YouTube IA 2026](https://medium.com/@theexplainer/this-youtube-niche-is-exploding-in-2026-you-can-create-these-videos-with-ai-bd80076746e7)).
- **[INFERÊNCIA]** O padrão consistente nas fontes de produção real: um set 3D único, câmeras virtuais nomeadas e trocadas por operador/script. O que propomos (10 câmeras nomeadas num arquivo .blend) é o equivalente offline desse padrão.

## 4. Custo e esforço (equipe pequena)

- **[FATO]** Fiverr tem muitos vendedores de "3D podcast/talk show/broadcast studio"; os preços visíveis nos resultados são de gigs gerais de Blender (a partir de US$ 30–100; um ambiente Blender US$ 50–100 em 3 dias), não de set de podcast completo; várias páginas de podcast não mostraram preço, e uma retornou 403 ao abrir — [Fiverr, 3D studio design](https://www.fiverr.com/basharchi/do-3d-studio-design-talk-show-studio-media-studio-podcast-studio), [Fiverr, ambiente Blender](https://fiverr.com/animatedlead/create-beautiful-3d-environment-in-blender) (consultados 24/11/2026). **Não há faixa confiável de preço para um set de podcast sob medida; precisa cotar com 3–5 vendedores.**
- **[FATO]** Asset pronto: ~13,56 AUD no Fab (Podcast Studio 2) — fonte na seção 1a. Preços do Fab terminam em .99 por regra da plataforma — [Fab, licenças e preços](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab) (nota: a página do pack exibiu 13,56 AUD por conversão de moeda).
- **[FATO]** Marble: ~US$ 5 por splat refinado — seção 1b.
- **[INFERÊNCIA — estimativas minhas, sem fonte]** (i) Comprar pack + adaptar no Blender/Unreal para a marca (cores, TVs patrocinadoras, props): 2–5 dias de um 3D generalista. (ii) Set sob medida de freelancer: de dias a poucas semanas conforme detalhe. (iii) Rig de 10 câmeras com lentes nomeadas e render dos plates: ~1 dia depois que o set existe. Validar com cotações reais antes de orçar.
- **[INFERÊNCIA]** Software: Blender é gratuito; o custo real é a mão de obra e a revisão de licença dos assets.

## 5. O que torna isso reutilizável para white label ("show kit")

**[INFERÊNCIA]** — proposta, nada aqui vem de fonte externa:

- `set/` — arquivo .blend (ou glTF + texturas) do estúdio, com versão e licença dos assets registrada (uso com IA permitido: sim/não).
- `cameras.json` — por ângulo: nome (wide, mcu_a, cu_b, ots_a, ots_b, low, tv_insert, vertical_*), posição, rotação, distância focal, sensor, resolução, proporção (16:9 / 9:16). Gerado por script a partir do .blend para nunca divergir.
- `screens.json` — por TV e por ângulo: quatro cantos em pixels (quad) mais a matriz de homografia, e a resolução do conteúdo; gerado pelo mesmo script projetando os cantos da malha da TV pela câmera. Isso dá coordenadas exatas de composição.
- `plates/` — renders por ângulo: plate limpo, plate com tela verde, máscara de telas, passe de profundidade (opcional, útil para oclusão do personagem e para o splat).
- `slots de personagem` — âncoras por cadeira (posição, escala, direção do olhar) por ângulo, para o cliente trocar os personagens sem mexer na câmera.
- `regras de IA` — prompts de câmera estática, parâmetros por modelo (Kling/Veo/Seedance), teste de deriva do fundo.
- **Cliente com cenário próprio:** ele entrega um set 3D (ou escolhe entre templates); se só tiver imagens de IA, fazemos reconstrução (splat/mesh) e aceitamos tolerância menor. **[INFERÊNCIA]**

## 6. Recomendação e plano em etapas

**[INFERÊNCIA]** — recomendação, com riscos.

1. **Etapa 0 (1–2 dias, piloto barato):** montar 1 set mínimo no Blender (mesa, 2 cadeiras, fundo, 2–3 TVs) usando blocos simples ou um pack com licença conferida. Câmeras: wide e 1 CU. Renderizar. Testar com 1–2 modelos de vídeo (start frame + "static locked camera") e medir a deriva do fundo contra o plate. Meta: decidir entre variante A (composição) e B (start frame).
2. **Etapa 1 (~1 semana):** set definitivo da marca (compra + adaptação ou freelancer com cessão de direitos). 10 câmeras nomeadas, `cameras.json`, `screens.json` gerados por script, plates limpos e com tela verde, incluindo variantes 9:16.
3. **Etapa 2:** pipeline de composição: personagem IA sobre plate (matte/chroma), TVs preenchidas em pós via homografia, checagem automática passa/falha (diferença de fundo, posição das telas).
4. **Etapa 3:** empacotar como "show kit" e testar com um segundo cliente fictício.
5. **Opcional:** Marble/splat para pré-visualizar variações de cenário ou clientes sem 3D, só depois que as etapas 0–2 funcionarem.

**Riscos:**
- Licença de assets com restrição a IA (NoAI) — pode inviabilizar o uso de packs prontos como entrada de gerador de vídeo.
- Personagens IA (cangurus/coalas) podem ficar "colados" por cima do set (iluminação, sombras): exige passe de sombra/contato ou iluminação coerente no render. **[INFERÊNCIA]**
- Modelos de vídeo podem redesenhar o fundo mesmo com câmera travada; mitigação é a variante A.
- Competência 3D na equipe: o dono não é dev/3D de carreira; pede freelancer ou agente de pipeline.
- Camada de layout: o `AGENTS.md` do projeto congela o layout do Studio (app). Plates de set são arte, não UI do app, mas qualquer arte nova precisa de linha em `design/LOG.md`. Confirmar com o Felipe.
- Informações de preços e recursos de Marble/Kling/Veo são de 2026 e mudam rápido; conferir nas páginas oficiais antes de decidir.

## Lacunas desta pesquisa

Genie/NeRF e Runway Gen-4 References não foram verificados; Seedance só aparece em guias genéricos; preços de freelancer para set de podcast completo não foram encontrados; caso real de canal IA com set 3D reutilizado não foi encontrado; página da Reallusion não abriu na leitura direta; Fiverr bloqueou leitura de uma página (403).
