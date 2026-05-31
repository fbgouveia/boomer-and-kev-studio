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
    referenceImage?: string; // URL to the master reference image for I2V
};

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
        defaultOutfit: "Wearing red boxing gloves (often), gold chain, black 'Bonds style' singlet or just shirtless showing muscles. Always wears large professional studio headphones.",
        voiceStyle: 'Deep, booming Queensland accent. Fast-paced, high energy.',
        imagePromptContext: 'anthropomorphic muscular kangaroo, red boxing gloves, gold chain necklace, black singlet option, professional studio headphones, detailed fur texture, strong studio lighting',
        lightingKey: 'High-contrast rim lighting, warm key light, dramatic shadows to emphasize musculature',
        voiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie - Deep, Confident, Energetic
        referenceImage: 'https://drive.google.com/file/d/160ZOQOxYsAzk6-ftW6rRVccQbBVR8jn1/view?usp=sharing'
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
        imagePromptContext: 'anthropomorphic cute koala, grey fluffy fur, professional studio headphones, holding a microphone, stubby holder on desk, detailed fur texture, soft studio lighting',
        lightingKey: 'Soft-box diffused lighting, cool tones, minimal shadows, gentle top light for fluffiness',
        voiceId: 'CwhRBWXzGAHq8TQ4Fs17', // Roger - Laid-Back, Casual, Resonant
        referenceImage: 'https://drive.google.com/file/d/1Msb2xa_rbAeMlzvuKh9Hi8zCdzw15bQh/view?usp=sharing'
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
    visualDescription: "A high-end, modern podcast studio tailored for an alpha kangaroo and a cynical koala.",
    acousticPanels: "Geometric acoustic foam panels in periodic orange and charcoal grey, creating a high-contrast cinematic backdrop.",
    sponsorScreens: "Dual vertical LED monitors flanking the set, displaying high-contrast 'SPONSORS' logic and dynamic performance metrics.",
    props: [
        "Professional Shure-style boom microphones",
        "Wooden master podcast desk with natural grain",
        "Coffee mugs emitting volumetric steam",
        "Digital mixing console with glowing faders",
        "Tablet device (Kev's reference interface)",
        "Down Under Discourse logo on a central 4K monitor"
    ],
    lighting: "Cinematic teal and orange 'teal-and-orange' color grade. Volumetric rim lighting on fur, dramatic key light, and moody ambient fill.",
    ambience: "Energetic, professional, and slightly chaotic 'Dingo-Logic' podcast atmosphere.",
    promptContext: "professional podcast studio, orange and black acoustic foam, SPONSORS led screens, Down Under Discourse neon, cinematic lighting, 8k, highly detailed fur"
};

export const DEFAULT_STUDIO_REFERENCE = 'https://drive.google.com/file/d/1tqQAsVev8OV2LZ01FkkfQ1Sag94K-IjY/view?usp=sharing';
export const DEFAULT_DNA_FOLDER_URL = 'https://drive.google.com/drive/folders/1BhtSpeBYhTG5TgQmPbqxBK2z1SCQh5Zf';

export const GUIDE_IMAGES: Record<string, string> = {
    WIDE: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&q=80&w=800', // Wide Studio
    BOOMER_MCU: 'https://images.unsplash.com/photo-1590845947847-b8f98ec4e1df?auto=format&fit=crop&q=80&w=800', // Mid shot
    KEV_CU: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800', // Close up
    OTS_BOOMER: 'https://images.unsplash.com/photo-1517504712030-f38b251ce7da?auto=format&fit=crop&q=80&w=800', // OTS
    LOW_ANGLE_BOOMER: 'https://images.unsplash.com/photo-1621252179027-94459d27d3ee?auto=format&fit=crop&q=80&w=800', // Low angle
    GOPRO_FISHEYE: 'https://images.unsplash.com/photo-1445384763658-040093982930?auto=format&fit=crop&q=80&w=800' // Fisheye
};

export const ANGLE_SPECS: Record<string, { label: string, desc: string, requirements: string[] }> = {
    main: { label: 'Primary Anchor', desc: 'Master biological reference.', requirements: ['Neutral Lighting', 'Full Facial Clarity', 'Front-Facing'] },
    wide: { label: 'Environmental Wide', desc: 'Full body & spatial context.', requirements: ['Full Body Visible', 'Background Contrast', 'Static Pose'] },
    side: { label: 'Lateral Profile', desc: 'Depth & silhouette logic.', requirements: ['45-90 Degree Angle', 'Feature Definition', 'Side Textures'] },
    close: { label: 'Macro Feature', desc: 'Emotional & texture anchor.', requirements: ['Eye Detail', 'Micro-Textures', 'Tight Framing'] },
    profile: { label: 'Silhouette Key', desc: 'Pure lateral geometry.', requirements: ['Pure Profile', 'Clean Contours', 'Ear/Nose Tracking'] },
    detail: { label: 'Tactile Data', desc: 'Sub-unit asset focus.', requirements: ['High Texture Res', 'Prop/Hand Focus', 'Macro Detail'] }
};
