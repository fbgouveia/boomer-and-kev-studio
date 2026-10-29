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
  type: 'fade';
  dur: number;
};

// Decisão Felipe 27/10: comédia rápida = corte seco entre TODAS as cenas.
// 0,04 s (~1 quadro) só evita estalo no áudio; visualmente é corte.
const HARD_CUT: EditingTransition = { type: 'fade', dur: 0.04 };

export type EditingPlan = {
  beats: EditorialBeat[];
  transitions: EditingTransition[];
  comedyCues: {
    drumsSceneIndex: number;
    laughSceneIndex: number;
  };
};

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

export function buildEditingPlan(script: EditingScene[]): EditingPlan {
  if (!script.length) throw new Error('editing plan exige pelo menos uma cena');
  const beats = script.map((_, index) => beatFor(index, script.length));
  const transitions = script.slice(1).map(() => HARD_CUT);

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

// BK-16 (fala inteira): o Kling aceita clipes de 5s ou 10s. Escolher pela
// ESTIMATIVA do roteiro truncava falas no mux (-shortest corta o áudio quando
// o clipe acaba). Com a duração REAL do áudio já sintetizado, o clipe deve
// acomodá-la: áudio > 5s => clipe de 10s. Sem acelerar fala (decisão editorial).
export function klingDurationForAudio(audioDuration: number | undefined, fallback: 5 | 10): 5 | 10 {
  if (audioDuration === undefined || !Number.isFinite(audioDuration) || audioDuration <= 0) {
    return fallback;
  }
  return audioDuration > 5 ? 10 : 5;
}

// Teste 27/10: toda cena saía com 6-7 s fixos => clipe de 10 s do Kling, e as derivas
// (corte inventado, cenário trocado) apareciam quase sempre depois dos 5 s.
// ~2,5 palavras/s; fala de até ~12 palavras cabe no clipe de 5 s (metade do custo).
export function estimateSpeechSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(10, Math.max(3, Math.ceil(words / 2.5)));
}
