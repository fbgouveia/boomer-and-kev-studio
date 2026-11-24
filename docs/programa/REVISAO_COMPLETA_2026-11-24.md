# Revisão completa do projeto — 24/11/2026

Pedido do Felipe (24/11): revisar todo o projeto (cada handoff, cada log, git) com a visão
"do assunto viral à angulação profissional, como um estúdio de verdade", personagens e
cenário idênticos para sempre, receita principal = espaço de patrocínio nas TVs do set e,
depois, venda como white label para qualquer personagem.

Fontes: HANDOFF.md (inclui histórico), progress.md, task_plan.md, findings.md, design/LOG.md,
153 commits, docs/*, src/* (rotas, libs, dados). Quatro revisões independentes só de
leitura (histórico, câmera/montagem, pesquisa viral + white label, patrocínio), mais o
estudo da biblioteca Higgsfield. Sem gasto. Linhas citadas valem para o código de 24/11.

## 1. O que o projeto é hoje (fatos)

| Camada | Estado real |
|---|---|
| Pauta | Google News RSS, 7 dias, consultas fixas por região (`api/trends/route.ts:29-41`); nota = nº de veículos (≥5 = quente). Mede abrangência na semana, não notícia explodindo agora; a data mais recente é calculada e não entra na nota |
| Roteiro | Brainstorm Gemini 2.5 Flash (~17-20 s); roteirista Claude com travas de equilíbrio da dupla, limite de 90 s e "loop" gancho→fechamento |
| Storyboard | **Novo (24/11):** quadro-chave por cena, aprovação obrigatória, quadro aprovado vira imagem inicial do Kling |
| Câmera | 6 nomes de plano, **3 imagens reais** (Boomer, Kev, plano aberto). Câmera travada no prompt desde 29/10. 9:16 nunca mostra os dois juntos. Movimentos de câmera da tela (pan, dolly…) **não têm efeito** |
| Vídeo | Kling 2.6 (Replicate), voz nativa do Kling. Higgsfield pronto no código (P0/P1), desligado |
| Montagem | Cortes secos, trilha de comédia com ducking, 2 efeitos por posição, -14 LUFS, legenda queimada (sem sincronia por palavra) |
| Patrocínio | Só texto no prompt ("logo gigante") contra um negativo que proíbe logos. Nenhum patrocinador real inserível |
| Publicação/medição | **Nenhum episódio publicado. Zero dados de audiência** (README:77-87) |
| White label | Elenco virou dado (BK-19 inc.1-2). Cenário, câmera, tom, região, patrocínio e marca ainda fixos; multi-cliente inexistente |

## 2. Câmera: a distância entre a intenção e a realidade

1. **Seis nomes, três imagens.** LOW_ANGLE, OTS e GOPRO são só texto sobre as mesmas 3 fotos;
   o modelo inventa o ângulo a cada render, e o cenário deriva.
2. **As 3 imagens-base não concordam entre si.** TV do logo à direita numa, à esquerda na outra;
   paredes diferentes; marcas reais (QANTAS, VEGEMITE, GUMTREE, OUTBACK, AUSSIE) e um iPad
   com logo da Apple. O "cenário idêntico" não existe nem na referência.
3. **Câmera travada** desde 29/10 (nasceu do Kling inventando cortes). Correto para identidade,
   mas o dinamismo então precisa vir de **mais planos fixos**, não de câmera mexendo.
4. **Sem regra dos 180°, sem olhar, sem plano de reação.** Nada registra quem olha para onde;
   o ouvinte nunca aparece enquanto o outro fala.
5. **Encadeamento apaga o ângulo:** duas falas seguidas do mesmo personagem partem do último
   quadro do clipe anterior, ignorando o plano novo.
6. **Corte decidido só pela posição da cena**, não pelo plano nem pela emoção.

**Proposta — "DNA de câmera" (rig):** um cenário, uma planta baixa, ~10 placas aprovadas:
plano aberto; médio e close de cada um (lado fixo: Boomer à esquerda, Kev à direita);
sobre o ombro nos dois sentidos; contra-plongée de cada um (opcional); inserto frontal da TV;
variantes verticais. Todas com **TVs lisas**. Cada placa guarda: lado do personagem, direção
do olhar, recorte vertical e os **4 cantos de cada TV**. Gramática: plano aberto no gancho e
no fechamento; singles no diálogo; **inserto de reação de 1-2 s do ouvinte** (sem boca, barato);
sobre o ombro no confronto; inserto da TV no bloco do patrocinador. Validador de 180°.
Tudo em JSON (`CameraRig`) ao lado do `CharacterPack` — é o mesmo arquivo que um cliente
white label preencheria.

**O que você talvez não esteja considerando:** gerar 10 ângulos do *mesmo* cenário com IA de
imagem tende a variar detalhes de placa para placa. Para "idêntico para sempre", vale reabrir
a hipótese de **cenário 3D** (rebaixada em 29/03): modelar o estúdio uma vez e renderizar as
placas de câmeras fixas dá geometria exata, TVs com coordenadas exatas e um ativo reutilizável
para white label (troca-se o cenário, não o motor). Personagens continuam por IA.
Decisão a tomar depois do piloto de placas por IA.

## 3. Patrocínio: o que falta para vender

- **Logo real aplicada na montagem** (ffmpeg, perspectiva nos 4 cantos de cada TV), nunca pela
  IA. Troca de patrocinador = troca de um arquivo. Peça padrão: "Your sponsor here".
- **Prova de entrega:** segundos de marca na tela por episódio, recorte e timestamp — o relatório
  que o anunciante pede.
- **Ficha do patrocinador:** nome, logo, frase, alegações permitidas/proibidas, categoria.
- **Rótulos:** "Gerado por IA" sempre; "#ad / parceria paga" quando patrocinado.
- **Segurança de marca na pauta:** hoje há consulta "politics scandal" sem filtro; falta lista de
  categorias evitadas por anunciantes (tragédia, eleição, apostas, álcool, saúde, menores).
- **Conformidade antes do render:** hoje roda no texto, no Gemini, e não bloqueia nada.
- **Pacote comercial (aberto desde 29/07):** entidade legal, nome do programa (Boomer & Kev vs
  Down Under Discourse), tabela de preços, categorias proibidas, reel de 30-45 s, contrato,
  relatórios de 7 e 30 dias.

## 4. Viral: o que falta

- Velocidade da notícia (últimas horas), agrupamento por história, peso de novidade.
- Sinais das plataformas onde o programa vive: TikTok/Instagram/YouTube estão desligados
  (last30days sem fontes; Radar YouTube parado na chave desde 29/10).
- Título, legenda do post, hashtags, capa; corte por plataforma; horário de postagem.
- **Ciclo de aprendizado:** desempenho real voltando para a escolha da pauta (nunca construído).

## 5. White label: o que falta

- `ShowProfile` (cenário + rig + tom + região + patrocínio por programa); ids de plano hoje têm o
  nome dos personagens (`BOOMER_MCU`), o enum do roteiro fixa `boomer|kev`, prompts com sotaque
  e bordões fixos, calendário australiano fixo.
- Multi-cliente: login real, orçamento por cliente, armazenamento e fila isolados, chaves por
  cliente (hoje cai nas suas chaves), cobrança.
- **Jurídico:** termos de uso comercial e revenda de Kling/Higgsfield/ElevenLabs não verificados;
  titularidade dos personagens gerados; consentimento de voz; rotulagem de IA por país.

## 6. O que você pode não estar considerando

1. **Nada foi publicado ainda.** Anunciante compra audiência medida. O histórico mostra o padrão
   "fábrica antes da demanda": muita engenharia, zero episódio no ar. Perfeição e publicação
   precisam andar juntas: publicar cedo, com o melhor possível, e medir.
2. **A voz também precisa ser idêntica para sempre.** A voz nativa do Kling é gerada a cada clipe
   e pode variar. A clonagem fixa do Boomer no ElevenLabs foi decidida em 06/08 e abandonada em
   09/09 sem fechamento. Para personagem "eterno", voz fixa + sincronia labial provavelmente
   vence — precisa de prova em animal (BK-09).
3. **Política das plataformas:** YouTube e TikTok rebaixam ou desmonetizam conteúdo de IA
   repetitivo e sem rótulo. Formato fixo diário fica perto disso: variar estrutura, rotular,
   ter voz editorial forte.
4. **Custo por episódio:** ~US$ 8-11 por 1 min só de vídeo (Kling, extrapolado). Diário ≈
   US$ 250-330/mês por programa, antes de imagem, roteiro e revisão. O preço do white label tem
   de cobrir isso com margem.
5. **Um fornecedor por etapa:** Anthropic, Gemini (bloqueado por cobrança desde 06/08 segundo o
   CLAUDE.md, embora a sentinela tenha respondido verde hoje), ElevenLabs, Kling/Higgsfield,
   Supabase. Uma mudança de preço ou queda para o programa.
6. **Itens que caíram das pendências:** aprovação por Telegram antes do render (para religar o
   n8n), segredos do radar/cron (503), PM2 após reboot, legenda sem sincronia, roteiro perdido no
   F5, B-roll de prova (jornais na tela) fora do render pago, memória de pautas e de personagem.

## 7. Ordem proposta

**Fase 1 — Fundação de identidade (antes de qualquer episódio pago)**
1. Commit do que está pronto (P0/P1 Higgsfield, tela roteiro+storyboard, Identity Lock).
2. DNA de câmera v1: placas limpas, TVs lisas, coordenadas das TVs, lados e olhares; aprovação
   por placa; impressão digital travando o render.
3. Decidir a voz (nativa do Kling vs voz fixa + sincronia labial), com piloto.
4. Identity Lock gravado no projeto e bloqueando o render.

**Fase 2 — Primeiro episódio e publicação**
5. Piloto pago com preço real (Kling 3.0 vs Seedance; sincronia labial), dentro do teto aprovado.
6. Patrocínio na montagem (placeholder "Your sponsor here"), rótulos de IA, reação/insertos.
7. Publicar 10 episódios (BK-10) e medir (BK-22).

**Fase 3 — Venda de patrocínio:** pacote comercial, filtro de segurança de marca, relatório de
entrega, primeiro patrocinador.

**Fase 4 — Motor viral:** velocidade de pauta, sinais de plataforma, títulos/capas, ciclo de
aprendizado.

**Fase 5 — White label:** ShowProfile + CameraRig + tom em dados, multi-cliente, jurídico.

## 8. Decisões pendentes do Felipe

1. Orçamento diário (subir para ~US$ 12 ou manter US$ 5 com episódio de ~40 s).
2. Piloto de preço real (até US$ 5 + créditos Higgsfield).
3. Ângulos do rig v1 (proposta: ~10 placas acima).
4. Voz: nativa do Kling ou voz fixa + sincronia labial (após piloto).
5. Cenário por IA ou 3D (após piloto de placas).
6. Nome comercial do programa e entidade para contratos.

## 9. Pesquisa profunda na web (24/11) — o que muda

Documentos com fontes e datas, fato separado de inferência:
`docs/programa/pesquisa/01-03-camera-luz-atuacao.md`, `04-consistencia-ia.md`,
`05-estudio-virtual.md`, `06-patrocinio-negocio.md`. Muitas cifras vêm de blogs de
fornecedores; os documentos marcam isso.

**Correções ao plano das seções 2 e 7:**
1. **Rig de câmera menor e mais fiel ao padrão profissional.** Dois apresentadores lado a lado =
   3 câmeras: plano aberto + single de cada um (médio e close). **Sobre o ombro sai** (não funciona
   lado a lado). Entram: reação de 1-2 s do ouvinte logo após a piada, inserto da TV, contra-plongée
   opcional. Lentes de referência: close 85 mm, médio 35-50 mm, aberto 24-35 mm (01-03, R01-R25).
2. **9:16 nativo, não recorte** do 16:9 (o recorte do centro perde 2/3 da imagem — é o que o código
   faz hoje).
3. **Cenário: 3D próprio (Blender) com câmeras nomeadas** é o único caminho com geometria idêntica
   em todo ângulo; IA multiângulo dá só consistência aproximada. **Pacotes 3D prontos com tag
   NoAI não podem ser usados** como imagem inicial de IA — cenário próprio ou encomendado sob
   contrato (05).
4. **Personagens:** melhor candidato é Kling 3.0 **Elements** (aceita tipo "Animal", 2-4 imagens);
   Seedance 2.x segundo candidato. Nenhum benchmark independente com mascote animal → só teste
   próprio decide. Deriva aparece em sequências longas: planos curtos, câmera travada, reaproveitar
   clipes aprovados (04).
5. **Voz fixa clonada (ElevenLabs PVC) como ativo do programa**; voz nativa do Kling só rascunho.
   **Sincronia labial pós-processada não serve:** a doc oficial da Sync diz que não suporta animais.
   A fala precisa nascer na própria geração do vídeo (áudio de referência) — testar (04).
6. **Logo do patrocinador:** com câmera travada, cantos fixos no ffmpeg + máscara de oclusão; se
   houver deriva, homografia (OpenCV) (04).

**Novos riscos que sobem de prioridade:**
- **Kling: política de usuário (abr/2026) proíbe uso comercial do vídeo sem permissão escrita; o
  contrato da API proíbe revender/transferir a API.** Higgsfield não restringe uso comercial. Antes
  de vender patrocínio: confirmação escrita de cada fornecedor. White label: cliente traz a própria
  chave (BYOK) ou contrato enterprise, com revisão jurídica (04, 06).
- **YouTube pune conteúdo "inautêntico"/em massa por template** (jul/2025); formato diário fixo
  precisa variar estrutura. Fonte secundária indica limiar de monetização de Shorts mais alto a
  partir de 01/02/2027 (confirmar) (06).
- **Direito autoral:** nos EUA, personagem só por prompt não tem proteção; o white label precisa
  de contribuição humana documentada nos personagens (06).
- **Aviso de publicidade:** UK (CMA multa direta desde out/2026; "Sponsored" sozinho não basta);
  EUA (FTC, aviso dentro do vídeo); Austrália não verificada (06).
- **Patrocínio:** nenhum preço publicado para "logo na TV de cenário animado"; heurística (inferência)
  para abordar o 1º patrocinador: ~60 episódios, 10-30 mil views/episódio, conclusão > 60% (06).

**Piloto revisado (substitui o item 5 da seção 7):** cenário 3D com 2 câmeras (aberto + single) →
1 fala do Boomer e 1 do Kev com Kling 3.0 Elements via Higgsfield, voz ElevenLabs como referência →
mesma cena no Seedance → logo "Your sponsor here" nos cantos da TV → medir deriva do fundo,
identidade, boca e custo real.
