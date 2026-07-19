import { CHARACTERS, SHOT_TYPES, STUDIO_SETTING } from '@/data/characters';

interface SceneData {
  characterId: string;
  text: string;
  shotType: string;
  action?: string;
  emotion?: string;
  cameraPreset?: string;
  motionWeight?: number;
}

/**
 * Directorial Board Orchestrator
 * Automatically expands and refines raw scene data into a cinematic prompt for Kling.
 */
export function expandToCinematicPrompt(scene: SceneData, clientPrompt: string): string {
  const char = CHARACTERS.find(c => c.id === scene.characterId);
  const shot = SHOT_TYPES.find(s => s.id === scene.shotType);

  if (!char) return clientPrompt;

  // Clean base prompt from Midjourney-specific flags
  let cleanBase = clientPrompt
    .replace(/--ar\s+\d+:\d+/gi, '')
    .replace(/--v\s+[\d.]+/gi, '')
    .replace(/CINEMATIC MASTERPIECE\./gi, '')
    .trim();

  // 1. DIRETOR DE CENA (Scene Director)
  // Ensures anatomical accuracy, facial/jaw sync, and default outfit consistency
  const sceneDirectorInstruction = scene.characterId === 'boomer'
    ? `Boomer the muscular red kangaroo has highly detailed orange-brown fur, moving mouth syncing with the speech. He is wearing red boxing gloves on his paws, a gold chain necklace, and a black singlet. Large professional headphones are clamped onto his pointed ears.`
    : `Kev the grey koala has fluffy grey fur, white ear tufts, and a large black nose. His mouth moves naturally with his speech. Large professional headphones are clamped onto his head, sitting comfortably.`;

  // 2. DIRETOR DE FOTOGRAFIA (Director of Photography - DP)
  // Controls lens characteristics, camera presets, and framing composition rules
  const cameraMovement = scene.cameraPreset 
    ? `Camera motion: ${scene.cameraPreset}.` 
    : `Subtle, slow push-in shot.`;
  
  const dpInstruction = `Cinematic composition. Shot on Arri Alexa LF, 35mm anamorphic lens, shallow depth of field with beautiful background blur (bokeh). Camera tracking: ${shot?.cinematicRule || 'rule of thirds composition'}. ${cameraMovement}`;

  // 3. DIRETOR DE ILUMINAÇÃO (Lighting Director)
  // Sets cinematic color grade, contrast, and light direction
  const lightingInstruction = scene.characterId === 'boomer'
    ? `Warm key light highlighting his muscle structure, sharp volumetric rim lighting on his fur, dark background contrast.`
    : `Soft diffused lighting, cool ambient tones, gentle overhead light emphasizing the soft texture of his fur.`;

  // 4. EDITOR DE MOVIMENTO (Motion Editor)
  // Regulates the physical weight, gravity, and speed of character movements
  const motionWeightValue = scene.motionWeight !== undefined ? scene.motionWeight : 5;
  const physicsModifier = scene.characterId === 'boomer'
    ? `Intense, high-energy physical movements with anatomical weight. Motion level: ${motionWeightValue}/10.`
    : `Slow, heavy-lidded, deadpan and relaxed movements. Motion level: ${motionWeightValue - 2}/10.`;

  const motionInstruction = `Physical performance: ${scene.action || 'gesturing and talking'} with ${scene.emotion || 'neutral'} expression. ${physicsModifier} Natural breathing and muscle contractions.`;

  // Merge the directorial decisions into a unified, high-fidelity prompt for Kling
  const expandedPrompt = `A photorealistic cinematic video. ${sceneDirectorInstruction} ${motionInstruction} ${dpInstruction} ${lightingInstruction} Background environment is a professional podcast studio with orange and black acoustic panels, sponsor LED screens, and podcast microphones. Volumetric lighting, 8k resolution, photorealistic, masterpiece.`;

  console.log(`[CINEMATIC_ORCHESTRATOR] Expanded prompt for ${scene.characterId} (${scene.shotType}):`, expandedPrompt);

  return expandedPrompt;
}
