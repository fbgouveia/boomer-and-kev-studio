import { CHARACTERS, STUDIO_SETTING, type Character } from '@/data/characters';

// Gerador de prompt de CAPA (thumbnail / cover) para o Nano Banana Pro (gemini-3-pro-image).
//
// Método: os 7 pilares do "Nano Banana Pro — Thumbnails com IA" (sujeito, expressão,
// composição, iluminação, cores/contraste, fundo, qualidade técnica), na ordem que o
// ebook prescreve — tokens no início pesam mais.
//
// Duas regras do método que são restrição TÉCNICA, não estilo:
//  1. A IA NÃO escreve o texto. Modelo generativo produz letra deformada; o título entra
//     depois, em composição determinística. Daí o negativo de texto e o espaço negativo.
//  2. Sem âncora, o modelo inventa um canguru diferente a cada geração. É o mesmo erro que
//     quebrou a fidelidade no vídeo (prompt pedindo personagem sem referência). A capa
//     REUSA a âncora mestre do personagem — nunca descreve o personagem do zero.

export type CoverType = 'reaction' | 'versus';
export type CoverAspect = '9:16' | '16:9';

export type CoverSpec = {
  /** `reaction` = 1 personagem, emoção grande (o tipo que mais converte no ebook).
   *  `versus` = split Boomer × Kev — o formato natural de um podcast de debate. */
  type: CoverType;
  /** Personagem em foco. Em `versus`, é quem domina o quadro. */
  characterId: string;
  aspect: CoverAspect;
  /** Tema do episódio — vira o contexto do fundo, nunca texto na imagem. */
  topic: string;
  /** Emoção da cena. Cai no default do tipo quando ausente. */
  emotion?: string;
  /** Personagem do outro lado, só em `versus`. */
  opponentId?: string;
};

// O título entra depois, então a composição precisa reservar onde. Vertical: faixa
// inferior (o feed corta o topo). Horizontal: terço esquerdo, padrão de thumbnail.
const NEGATIVE_SPACE: Record<CoverAspect, string> = {
  '9:16': 'lower third of the frame kept clean and uncluttered as negative space for a title added later',
  '16:9': 'left third of the frame kept clean and uncluttered as negative space for a title added later',
};

const FRAMING: Record<CoverType, Record<CoverAspect, string>> = {
  reaction: {
    '9:16': 'vertical close-up, single subject centered, face filling roughly 55% of the frame, head fully inside the frame and never cropped at the top',
    '16:9': 'horizontal medium close-up, single subject offset to the right, face filling roughly 45% of the frame',
  },
  versus: {
    // Two-shot lado-a-lado não cabe em vertical — mesma lição do pipeline de vídeo.
    '9:16': 'vertical stacked split: the two hosts one above the other, a hard diagonal divide between them, both faces fully visible',
    '16:9': 'horizontal split screen: the two hosts facing each other from opposite sides, a hard vertical divide between them',
  },
};

const DEFAULT_EMOTION: Record<CoverType, string> = {
  reaction: 'FURIOUS',
  versus: 'OUTRAGED',
};

// Negativos: os do ebook (texto/marca d'água/ilustração) + os de anatomia que o pipeline
// de vídeo já aprendeu a precisar.
const NEGATIVES = [
  'no text', 'no letters', 'no words', 'no watermark', 'no logo',
  'no illustration', 'no cartoon', 'no anime', 'no low resolution',
  'no extra limbs', 'no deformed hands', 'no human fingers', 'no bad anatomy',
];

export function findCharacter(id: string): Character {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) throw new Error(`personagem desconhecido: ${id}`);
  return c;
}

export function buildCoverPrompt(spec: CoverSpec): string {
  const char = findCharacter(spec.characterId);
  const emotion = (spec.emotion || DEFAULT_EMOTION[spec.type]).toUpperCase();

  if (spec.type === 'versus' && !spec.opponentId) {
    throw new Error("capa 'versus' exige opponentId");
  }
  const opponent = spec.opponentId ? findCharacter(spec.opponentId) : undefined;
  if (opponent && opponent.id === char.id) {
    throw new Error("capa 'versus' exige dois personagens diferentes");
  }

  // `defaultOutfit` já começa com "Wearing" e as descrições já terminam em ponto —
  // concatenar cru gerava "Wearing Wearing ..." e ponto duplo no prompt real.
  const sentence = (s: string) => s.trim().replace(/\.+$/, '') + '.';

  // Ordem dos pilares = ordem do ebook. O mais importante primeiro.
  const subject =
    `${sentence(char.imagePromptContext)} ${sentence(char.defaultOutfit)} ` +
    `Visual DNA: ${sentence(char.visualDescription)}`;

  const expression =
    `EXPRESSION: ${emotion} — exaggerated and unmistakable at thumbnail size: ` +
    `eyes wide, brow driven, mouth open mid-shout. The emotion must read in under one second.`;

  const secondSubject = opponent
    ? ` SECOND HOST: ${sentence(opponent.imagePromptContext)} Visual DNA: ${sentence(opponent.visualDescription)} ` +
      `Opposing reaction, clearly a different animal from the first — never a duplicate of the same character.`
    : ' Only ONE host in frame. No second character.';

  const composition = `COMPOSITION: ${FRAMING[spec.type][spec.aspect]}, ${NEGATIVE_SPACE[spec.aspect]}.`;

  const lighting = `LIGHTING: ${char.lightingKey}, strong rim light separating the subject from the background.`;

  // Cores da marca. Contraste alto é o que sobrevive ao tamanho de miniatura.
  const colour =
    `COLOUR: high contrast, elevated saturation, signal orange #FF5F1F against near-black #0A0A0A, ` +
    `background deliberately darker than the subject.`;

  const environment =
    `BACKGROUND: ${STUDIO_SETTING.promptContext}, thrown out of focus so it never competes with the host. ` +
    `Context of the episode: ${spec.topic}. Convey the topic through props and set dressing ONLY — never through written words.`;

  const quality =
    `QUALITY: photorealistic, ultra sharp, HDR look, micro contrast, ${spec.aspect} aspect ratio, ` +
    `readable as a small thumbnail on a phone.`;

  return [
    `SOCIAL COVER IMAGE, photorealistic.`,
    subject,
    expression,
    secondSubject,
    composition,
    lighting,
    colour,
    environment,
    quality,
    `NEGATIVE: ${NEGATIVES.join(', ')}.`,
  ].join(' ');
}

/** Âncora a enviar como imagem de referência: sem ela o modelo inventa outro personagem. */
export function coverAnchor(spec: CoverSpec): string | undefined {
  // Em `versus` a âncora do two-shot já traz os dois — é a referência certa.
  if (spec.type === 'versus') return '/assets/master_wide.png';
  return findCharacter(spec.characterId).referenceImage;
}

/** Variações para o passo 4 do workflow do ebook: gerar 4-6, escolher as 3 melhores. */
export function buildCoverVariations(spec: CoverSpec, count = 4): string[] {
  const dials = [
    { emotion: spec.emotion, note: '' },
    { emotion: 'SHOCKED', note: ' Camera slightly below eye level, heroic angle.' },
    { emotion: 'DEADPAN', note: ' Tighter crop, face larger in frame.' },
    { emotion: 'EXPLOSIVE', note: ' Background pushed darker, subject rim light stronger.' },
    { emotion: 'DISBELIEF', note: ' Head turned three-quarters toward camera.' },
    { emotion: 'EXASPERATED', note: ' Warmer key light, higher saturation.' },
  ];
  return dials.slice(0, Math.max(1, Math.min(count, dials.length)))
    .map((d) => buildCoverPrompt({ ...spec, emotion: d.emotion }) + d.note);
}
