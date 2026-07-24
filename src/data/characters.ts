export type Character = {
    id: string;
    name: string;
    species: string;
    visualDescription: string;
    personality: string;
    catchphrases: string[];
    motionBehaviors: {
        emotion: string;
        action: string;
    }[];
    defaultOutfit: string;
    voiceStyle: string;
    imagePromptContext: string;
    lightingKey: string;
    voiceId: string;
    // Direção de voz por personagem (a emoção da cena modula isto em runtime).
    // Boomer hiperativo → stability baixa + style alto; Kev deadpan → stability alta + style baixo.
    voice: {
        modelId: string;
        stability: number;
        style: number;
        similarityBoost: number;
        speakerBoost: boolean;
    };
    referenceImage?: string; // URL to the master reference image for I2V
};

// Emoções "quentes" empurram a entrega (menos estável, mais estilo → mais expressivo/cômico);
// "frias" achatam (mais estável, menos estilo → deadpan). Nomes vêm do roteiro (script.emotion).
const HOT_EMOTIONS = ['FURIOUS', 'EXCITED', 'OUTRAGED', 'ANGRY', 'SHOCKED', 'INTENSE', 'EXPLOSIVE', 'ENTHUSIASTIC', 'EXASPERATED', 'SHAMELESS'];
const COLD_EMOTIONS = ['DEADPAN', 'CYNICAL', 'RESIGNED', 'BORED', 'APATHETIC', 'ANNOYED', 'CALM', 'PASSIVE', 'SLEEPY', 'EXHAUSTED', 'DISBELIEF'];

// voice_settings do ElevenLabs para um personagem, modulado pela emoção da cena.
export function voiceSettingsFor(character: Character, emotion?: string) {
    const e = String(emotion || '').toUpperCase();
    let { stability, style } = character.voice;
    if (HOT_EMOTIONS.includes(e)) { stability -= 0.10; style += 0.15; }
    else if (COLD_EMOTIONS.includes(e)) { stability += 0.06; style -= 0.08; }
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    return {
        stability: clamp(stability),
        similarity_boost: character.voice.similarityBoost,
        style: clamp(style),
        use_speaker_boost: character.voice.speakerBoost,
    };
}

export const CHARACTERS: Character[] = [
    {
        id: 'boomer',
        name: 'Boomer',
        species: 'Kangaroo',
        visualDescription: 'A tall, incredibly muscular Red Kangaroo. He has orange-brown fur, large pointed ears, and an intense but friendly expression.',
        personality: 'High energy, alpha-male, enthusiastic, slightly aggressive but lovable. High testosterone, physical, always moving.',
        catchphrases: [
            "G'day legends! You won't believe this one!",
            "Absolute STREWTH! Stop scrolling right now!",
            "OI! Listen up, this is massive!",
            "Fair dinkum, this is a game changer!",
            "Righto, let's get down to brass tacks!"
        ],
        motionBehaviors: [
            { emotion: 'Explosive', action: "Shadow boxing intensely towards the camera" },
            { emotion: 'Enthusiastic', action: "Flexing biceps while talking" },
            { emotion: 'Aggressive', action: "Leaning in aggressively into the microphone" },
            { emotion: 'Power', action: "Pointing two fingers directly at the lens (The 'Listen Here' point)" },
            { emotion: 'Attentive', action: "Rubbing chin thoughtfully with a boxing glove" },
            { emotion: 'Vibe', action: "Throwing a 'Shaka' sign with a gloved hand" },
            { emotion: 'Sweaty', action: "Wiping sweat from brow with a boxing glove" }
        ],
        defaultOutfit: "Wearing large red boxing gloves (NO fingers), gold chain, and a tight black singlet shirt with 'BOOMER' written on the chest. Never shirtless. Always wears large professional studio headphones.",
        voiceStyle: 'Deep, booming Queensland accent. Fast-paced, high energy.',
        imagePromptContext: 'anthropomorphic muscular kangaroo, acting exactly like a human podcast host, human posture, large red padded boxing gloves (no fingers), gold chain necklace, wearing a tight black singlet shirt with BOOMER written on the chest, professional studio headphones, detailed fur texture, strong studio lighting',
        lightingKey: 'High-contrast rim lighting, warm key light, dramatic shadows to emphasize musculature',
        voiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie - Deep, Confident, Energetic
        voice: { modelId: 'eleven_multilingual_v2', stability: 0.30, style: 0.70, similarityBoost: 0.75, speakerBoost: true },
        referenceImage: '/assets/master_boomer.png'
    },
    {
        id: 'kev',
        name: 'Kev',
        species: 'Koala',
        visualDescription: 'A relaxed, fluffy grey Koala with a large round black nose and fluffy white ear tufts.',
        personality: 'Deadpan, low-energy, highly cynical, unimpressed by Boomer. The intellectual but lazy voice of reason.',
        catchphrases: [
            "Yeah, nah. Not today, mate.",
            "Classic Boomer... you're hallucinating again.",
            "Can we wrap this up? I've got a leaf with my name on it.",
            "You're dreaming, mate. Tell him he's dreaming.",
            "Strewth, my ears are bleeding...",
            "Ground control to Boomer. Come in, space cadet."
        ],
        motionBehaviors: [
            { emotion: 'Bored', action: "Slowly chewing on a gum leaf" },
            { emotion: 'Deadpan', action: "Slowly blinks with heavy eyelids" },
            { emotion: 'Cynical', action: "Taking a sip from a stubby holder labeled 'WATER'" },
            { emotion: 'Disbelief', action: "Rolling eyes dramatically upwards" },
            { emotion: 'Passive', action: "Adjusting headphones with one hand" },
            { emotion: 'Exhausted', action: "Slumping forward onto the desk" },
            { emotion: 'Sleepy', action: "Yawning wide and showing small teeth" },
            { emotion: 'Annoyed', action: "Lazily swatting a fly away from his nose" }
        ],
        defaultOutfit: 'No shirt, just natural fur. Always wears large professional studio headphones. Sometimes holds a tablet or a stubby holder.',
        voiceStyle: 'Slow, nasally, relaxed, deadpan Queensland accent.',
        imagePromptContext: 'anthropomorphic cute koala, acting exactly like a human podcast host, human posture, grey fluffy fur, professional studio headphones, holding a microphone, stubby holder on desk, detailed fur texture, soft studio lighting',
        lightingKey: 'Soft-box diffused lighting, cool tones, minimal shadows, gentle top light for fluffiness',
        voiceId: 'CwhRBWXzGAHq8TQ4Fs17', // Roger - Laid-Back, Casual, Resonant
        voice: { modelId: 'eleven_multilingual_v2', stability: 0.82, style: 0.15, similarityBoost: 0.80, speakerBoost: true },
        referenceImage: '/assets/master_kev.png'
    }
];

export type ShotType = {
    id: string;
    label: string;
    description: string;
    cinematicRule: string;
    vibe: string;
};

export const SHOT_TYPES: ShotType[] = [
    { id: 'WIDE', label: 'Wide Establishing', description: 'Shows both characters and the studio environment.', cinematicRule: 'Rule of thirds, deep depth of field, shows the neon sign.', vibe: 'Contextual' },
    { id: 'BOOMER_MCU', label: 'Boomer Medium Close', description: 'Waist up on Boomer to capture energy and boxing gloves.', cinematicRule: 'Tight framing, highlights muscle definition and fur texture.', vibe: 'Energetic' },
    { id: 'KEV_CU', label: 'Kev Close Up', description: 'Tight shot on Kev\'s face and chewing leaf.', cinematicRule: 'Soft bokeh background, focuses on eye expressions and nose.', vibe: 'Deadpan' },
    { id: 'OTS_BOOMER', label: 'Over-the-Shoulder Boomer', description: 'Looking over Kev\'s shoulder at Boomer.', cinematicRule: 'Creates tension and dynamic conversation feel.', vibe: 'Dynamic' },
    { id: 'LOW_ANGLE_BOOMER', label: 'Low Angle Power', description: 'Looking up at Boomer.', cinematicRule: 'Makes Boomer look even more intimidatingly muscular.', vibe: 'Heroic' },
    { id: 'GOPRO_FISHEYE', label: 'GoPro Vlog', description: 'Distorted wide shot from the desk.', cinematicRule: 'High energy, raw, chaotic podcast vibes.', vibe: 'Raw' }
];

export const STUDIO_SETTING = {
    name: "Down Under Discourse Studio",
    visualDescription: "A high-end but chaotic modern podcast studio tailored for an alpha kangaroo and a cynical koala. It looks like a real, heavy-duty production set with visible equipment.",
    acousticPanels: "Geometric acoustic foam panels in periodic orange and charcoal grey, creating a high-contrast cinematic backdrop.",
    sponsorScreens: "Dual vertical LED monitors flanking the set, displaying absurd, satirical, or funny 'SPONSOR' logos that contrast with the serious lighting.",
    props: [
        "Heavy-duty overhead boom microphones on massive C-stands",
        "Tangled thick XLR audio cables running across the desk",
        "Camera rigs and holders visible at the edge of the frame",
        "Coffee mugs emitting volumetric steam",
        "Digital mixing console with glowing faders",
        "Tablet device (Kev's reference interface)"
    ],
    lighting: "Cinematic teal and orange 'teal-and-orange' color grade. Volumetric rim lighting on fur, dramatic key light, and moody ambient fill.",
    ambience: "Energetic, professional, yet delightfully chaotic 'Dingo-Logic' podcast atmosphere, filled with heavy studio recording gear.",
    promptContext: "professional podcast studio set, orange and black acoustic foam, hilarious satirical SPONSORS led screens, heavy C-stands and overhead boom microphones, camera rigs visible, chaotic cables, cinematic lighting, 8k, highly detailed fur"
};

export const DEFAULT_STUDIO_REFERENCE = '/assets/master_wide.png';
export const DEFAULT_DNA_FOLDER_URL = 'https://drive.google.com/drive/folders/1BhtSpeBYhTG5TgQmPbqxBK2z1SCQh5Zf';

export const GUIDE_IMAGES: Record<string, string> = {
    main: 'https://images.unsplash.com/photo-1590845947847-b8f98ec4e1df?auto=format&fit=crop&q=80&w=800', // Mid shot (main)
    wide: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&q=80&w=800', // Wide Studio
    side: 'https://images.unsplash.com/photo-1517504712030-f38b251ce7da?auto=format&fit=crop&q=80&w=800', // Side angle
    close: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800', // Close up
    profile: 'https://images.unsplash.com/photo-1621252179027-94459d27d3ee?auto=format&fit=crop&q=80&w=800', // Profile
    detail: 'https://images.unsplash.com/photo-1445384763658-040093982930?auto=format&fit=crop&q=80&w=800', // Detail
    // Keep legacy uppercase keys for safety
    WIDE: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&q=80&w=800',
    BOOMER_MCU: 'https://images.unsplash.com/photo-1590845947847-b8f98ec4e1df?auto=format&fit=crop&q=80&w=800',
    KEV_CU: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800',
    OTS_BOOMER: 'https://images.unsplash.com/photo-1517504712030-f38b251ce7da?auto=format&fit=crop&q=80&w=800',
    LOW_ANGLE_BOOMER: 'https://images.unsplash.com/photo-1621252179027-94459d27d3ee?auto=format&fit=crop&q=80&w=800',
    GOPRO_FISHEYE: 'https://images.unsplash.com/photo-1445384763658-040093982930?auto=format&fit=crop&q=80&w=800'
};

export const ANGLE_SPECS: Record<string, { label: string, desc: string, requirements: string[] }> = {
    main: { label: 'Primary Anchor', desc: 'Master biological reference.', requirements: ['Neutral Lighting', 'Full Facial Clarity', 'Front-Facing'] },
    wide: { label: 'Environmental Wide', desc: 'Full body & spatial context.', requirements: ['Full Body Visible', 'Background Contrast', 'Static Pose'] },
    side: { label: 'Lateral Profile', desc: 'Depth & silhouette logic.', requirements: ['45-90 Degree Angle', 'Feature Definition', 'Side Textures'] },
    close: { label: 'Macro Feature', desc: 'Emotional & texture anchor.', requirements: ['Eye Detail', 'Micro-Textures', 'Tight Framing'] },
    profile: { label: 'Silhouette Key', desc: 'Pure lateral geometry.', requirements: ['Pure Profile', 'Clean Contours', 'Ear/Nose Tracking'] },
    detail: { label: 'Tactile Data', desc: 'Sub-unit asset focus.', requirements: ['High Texture Res', 'Prop/Hand Focus', 'Macro Detail'] }
};
