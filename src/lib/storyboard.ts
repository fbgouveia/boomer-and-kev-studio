import { resolveCharacter } from '@/lib/cast-registry';
import { DEFAULT_STUDIO_REFERENCE, STUDIO_SETTING } from '@/data/characters';

// Storyboard integrado (decisão Felipe 27/10): cada cena ganha um quadro-chave NATIVO
// no formato do episódio, aprovado antes do render. O quadro aprovado vira a start_image
// do Kling — substitui o recorte de 432 px da master 16:9, que cortava rosto e orelhas.

export type Aspect = '9:16' | '16:9';
export type Keyframe = { url: string; approved: boolean };

type Line = { characterId: string; shotType: string; action: string; emotion?: string };

// Mesma regra do render (route.ts): two-shot só existe em 16:9; em 9:16 vira solo.
const TWO_SHOTS_16_9 = new Set(['WIDE', 'OTS_BOOMER']);

export const isTwoShot = (line: Line, aspect: Aspect) => aspect === '16:9' && TWO_SHOTS_16_9.has(line.shotType);

/** Referência de identidade enviada ao gerador de imagem. */
export function keyframeAnchor(line: Line, aspect: Aspect): string | undefined {
  return isTwoShot(line, aspect) ? DEFAULT_STUDIO_REFERENCE : resolveCharacter(line.characterId)?.referenceImage;
}

export function keyframePrompt(line: Line, aspect: Aspect, wardrobe?: string): string {
  const char = resolveCharacter(line.characterId);
  const name = char?.name ?? line.characterId;
  const framing = isTwoShot(line, aspect)
    ? 'Horizontal 16:9 two-shot: Boomer the kangaroo on the left and Kev the koala on the right, both seated at the desk, both heads with both ears fully inside the frame.'
    : aspect === '9:16'
      ? `Vertical 9:16 portrait frame of ${name} ALONE, seated at the podcast desk, waist-up, centered, the whole head including both ears fully inside the frame with clear headroom above the ears, both arms visible. No second character.`
      : `Horizontal 16:9 medium shot of ${name} seated at the podcast desk, centered, the whole head including both ears fully inside the frame.`;
  return [
    'Storyboard keyframe for a podcast comedy show. Use the reference image as the EXACT identity of the character(s) and the studio:',
    'same face, fur, ears, nose, body, outfit and accessories; same studio set. Do not add clothing, accessories, props or characters.',
    // Teste 27/10: o Boomer saiu com uma luva na mão e outra solta na mesa (2 de 2 quadros).
    'Worn items stay worn exactly as in the reference: gloves on BOTH hands, headset on the head; nothing lying loose on the desk.',
    framing,
    `Pose and expression: ${line.action}${line.emotion ? `, emotion ${line.emotion}` : ''}.`,
    wardrobe ? `Episode wardrobe for ${name}: ${wardrobe}.` : '',
    `Studio: ${STUDIO_SETTING.acousticPanels}`,
    "Every screen in the background is dark or shows only the 'DOWN UNDER DISCOURSE' logo: no brand logos, no other readable text.",
    'Photorealistic, one single frame, no captions, no borders, no split screen.',
  ].filter(Boolean).join(' ');
}

/** O render só pode começar com todas as cenas aprovadas no formato escolhido. */
export const storyboardApproved = (lines: { keyframes?: Partial<Record<Aspect, Keyframe>> }[], aspect: Aspect) =>
  lines.length > 0 && lines.every(l => l.keyframes?.[aspect]?.approved === true);
