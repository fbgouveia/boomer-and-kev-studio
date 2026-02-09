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
            { emotion: 'Power', action: "Pounding the desk with a boxing glove" },
            { emotion: 'Attentive', action: "Doing quick ear twitches" },
            { emotion: 'Vibe', action: "Wide-eyed enthusiastic nodding" },
            { emotion: 'Sweaty', action: "Wiping sweat from brow with a boxing glove" }
        ],
        defaultOutfit: 'Wearing red boxing gloves (often), sometimes a black singlet or just shirtless showing muscles. Always wears large professional studio headphones.',
        voiceStyle: 'Deep, booming Australian accent. Fast-paced, high energy.',
        imagePromptContext: 'anthropomorphic muscular kangaroo, red boxing gloves, professional studio headphones, detailed fur texture, strong studio lighting',
        lightingKey: 'High-contrast rim lighting, warm key light, dramatic shadows to emphasize musculature'
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
            { emotion: 'Cynical', action: "Rubbing his face with a small paw" },
            { emotion: 'Disbelief', action: "Looking away from Boomer with complete boredom" },
            { emotion: 'Passive', action: "Adjusting headphones with one hand" },
            { emotion: 'Exhausted', action: "Slight nasally sighing" },
            { emotion: 'Sleepy', action: "Yawning wide and showing small teeth" }
        ],
        defaultOutfit: 'No shirt, just natural fur. Always wears large professional studio headphones. Sometimes holds a tablet.',
        voiceStyle: 'Slow, nasally, relaxed, deadpan Australian accent.',
        imagePromptContext: 'anthropomorphic cute koala, grey fluffy fur, professional studio headphones, holding a microphone, detailed fur texture, soft studio lighting',
        lightingKey: 'Soft-box diffused lighting, cool tones, minimal shadows, gentle top light for fluffiness'
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

export const GUIDE_IMAGES: Record<string, string> = {
    main: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
    wide: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800',
    side: 'https://images.unsplash.com/photo-1544333346-64e4fe18274b?auto=format&fit=crop&q=80&w=800',
    close: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=800',
    profile: 'https://images.unsplash.com/photo-1550684847-75bdda21cc95?auto=format&fit=crop&q=80&w=800',
    detail: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80&w=800'
};

export const ANGLE_SPECS: Record<string, { label: string, desc: string, requirements: string[] }> = {
    main: { label: 'Primary Anchor', desc: 'Master biological reference.', requirements: ['Neutral Lighting', 'Full Facial Clarity', 'Front-Facing'] },
    wide: { label: 'Environmental Wide', desc: 'Full body & spatial context.', requirements: ['Full Body Visible', 'Background Contrast', 'Static Pose'] },
    side: { label: 'Lateral Profile', desc: 'Depth & silhouette logic.', requirements: ['45-90 Degree Angle', 'Feature Definition', 'Side Textures'] },
    close: { label: 'Macro Feature', desc: 'Emotional & texture anchor.', requirements: ['Eye Detail', 'Micro-Textures', 'Tight Framing'] },
    profile: { label: 'Silhouette Key', desc: 'Pure lateral geometry.', requirements: ['Pure Profile', 'Clean Contours', 'Ear/Nose Tracking'] },
    detail: { label: 'Tactile Data', desc: 'Sub-unit asset focus.', requirements: ['High Texture Res', 'Prop/Hand Focus', 'Macro Detail'] }
};
