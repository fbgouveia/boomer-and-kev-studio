export type EditingScene = {
  characterId: string;
  emotion?: string;
};

export type EditorialBeat =
  | 'hook'
  | 'setup'
  | 'development'
  | 'sponsor'
  | 'climax'
  | 'payoff';

export type EditingTransition = {
  type: 'fade' | 'fadeblack';
  dur: number;
};

export type EditingPlan = {
  beats: EditorialBeat[];
  transitions: EditingTransition[];
  comedyCues: {
    drumsSceneIndex: number;
    laughSceneIndex: number;
  };
};

const INTENSE_EMOTIONS = new Set([
  'INTENSE',
  'EXCITED',
  'ANGRY',
  'SHOCKED',
  'FURIOUS',
  'EXPLOSIVE',
]);

function beatFor(index: number, count: number): EditorialBeat {
  if (index === 0) return 'hook';
  if (index === count - 1) return 'payoff';
  if (count <= 3) return 'climax';
  if (count === 8) {
    if (index === 1) return 'setup';
    if (index === 3 || index === 4) return 'sponsor';
    if (index === 5 || index === 6) return 'climax';
    return 'development';
  }

  const progress = index / Math.max(1, count - 1);
  if (progress < 0.25) return 'setup';
  if (progress < 0.65) return 'development';
  return 'climax';
}

function transitionFor(
  previous: EditingScene,
  next: EditingScene,
  nextBeat: EditorialBeat,
  previousBeat: EditorialBeat,
): EditingTransition {
  // Transição visível somente quando muda o bloco editorial.
  if (nextBeat === 'sponsor' && previousBeat !== 'sponsor') {
    return { type: 'fadeblack', dur: 0.5 };
  }
  if (previousBeat === 'sponsor' && nextBeat !== 'sponsor') {
    return { type: 'fadeblack', dur: 0.5 };
  }

  // Mesmo personagem: continuidade visual; energia alta: corte de TV.
  if (previous.characterId === next.characterId) return { type: 'fade', dur: 0.04 };
  const intense = INTENSE_EMOTIONS.has(String(next.emotion || '').toUpperCase());
  return intense ? { type: 'fade', dur: 0.04 } : { type: 'fade', dur: 0.35 };
}

export function buildEditingPlan(script: EditingScene[]): EditingPlan {
  if (!script.length) throw new Error('editing plan exige pelo menos uma cena');

  const beats = script.map((_, index) => beatFor(index, script.length));
  const transitions = script.slice(1).map((scene, offset) =>
    transitionFor(script[offset], scene, beats[offset + 1], beats[offset]),
  );

  const lastSponsor = beats.lastIndexOf('sponsor');
  const climax = beats.lastIndexOf('climax');
  const last = script.length - 1;

  return {
    beats,
    transitions,
    comedyCues: {
      // Rufo conclui o bloco de sponsor; sem esse bloco, antecede o clímax/payoff.
      drumsSceneIndex: lastSponsor >= 0 ? lastSponsor : Math.max(0, climax),
      // Risada acompanha o pico cômico, deixando o payoff final respirar quando possível.
      laughSceneIndex: climax >= 0 ? climax : last,
    },
  };
}
