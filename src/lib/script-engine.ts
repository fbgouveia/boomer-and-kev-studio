import { CHARACTERS } from '@/data/characters';
import { ScriptLine } from '@/types';

// ==========================================
// 1. TOPIC CLASSIFICATION SYSTEM
// ==========================================

type TopicCategory = 'TECH' | 'FINANCE' | 'POLITICS' | 'CELEB' | 'SPORTS' | 'NATURE' | 'GENERAL';

const TOPIC_KEYWORDS: Record<TopicCategory, string[]> = {
    TECH: ['AI', 'GPT', 'Crypto', 'Blockchain', 'Robot', 'Cyber', 'Data', 'Algorithm', 'App', 'Phone', 'Neural', 'Tech', 'Digital', 'Quantum', 'Software', 'Hack'],
    FINANCE: ['Stock', 'Market', 'Money', 'Bank', 'Economy', 'Inflation', 'Rates', 'Dollar', 'Bitcoin', 'Trade', 'Wealth', 'Tax', 'Cost', 'Price', 'Gold', 'Asset'],
    POLITICS: ['Vote', 'Election', 'Law', 'Government', 'President', 'Minister', 'Policy', 'War', 'Treaty', 'Right', 'Left', 'Campaign', 'Leader'],
    CELEB: ['Star', 'Movie', 'Song', 'Actor', 'Singer', 'Influencer', 'Viral', 'Drama', 'Scandal', 'Award', 'Fashion', 'Hollywood', 'Music', 'Series', 'Show'],
    SPORTS: ['Game', 'Match', 'Team', 'Player', 'Score', 'Win', 'Lose', 'Cup', 'League', 'Ball', 'Race', 'Fight', 'Champion', 'Sport', 'Coach'],
    NATURE: ['Magpie', 'Shark', 'Snake', 'Spider', 'Croc', 'Drought', 'Flood', 'Rain', 'Storm', 'Fire', 'Climate', 'Ocean', 'Animal', 'Bird', 'Attack', 'Uprising'],
    GENERAL: [] // Fallback
};

const detectTopic = (text: string): { category: TopicCategory, keyword: string } => {
    const lowerText = text.toLowerCase();
    for (const [category, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        const found = keywords.find(k => lowerText.includes(k.toLowerCase()));
        if (found) {
            return { category: category as TopicCategory, keyword: found };
        }
    }
    const words = text.split(' ').filter(w => w.length > 3);
    return { category: 'GENERAL', keyword: words[0] || text };
};

// ==========================================
// 2. CONVERSATION STATE MANAGEMENT
// ==========================================

export interface DirectorialIntelligence {
    take: { character: 'BOOMER' | 'KEV', text: string };
    hooks: string[];
    viralPotential: number;
}


// ==========================================
// 3. DIALOGUE TEMPLATES (THE BRAIN)
// ==========================================

// Helper to replace placeholders
const fill = (template: string, title: string, matchedKeyword?: string) => {
    const keyword = matchedKeyword || title.split(' ').filter(w => w.length > 3)[0] || title;
    return template
        .replace('{{TITLE}}', title.toUpperCase())
        .replace('{{KEYWORD}}', keyword.toUpperCase())
        .replace('{{keyword}}', keyword.toLowerCase());
};

const BOOMER_HOOKS: Record<TopicCategory, string[]> = {
    TECH: [
        "STOP SCROLLIN' MAATE! {{TITLE}} is hotter than a tin roof in January!",
        "Fair dinkum! {{TITLE}} is rewriting the laws of physics right here in the Sunshine State!",
        "If you aren't all over {{TITLE}}, you're getting left behind like a cane toad on a highway!",
        "I've seen the future, and it's cleaner than the Gold Coast surf! It's {{TITLE}}!",
        "This is silicon valley meets the Outback! {{TITLE}} is the alpha predator!"
    ],
    FINANCE: [
        "Sell the ute! Sell the boat! Put every dollar on {{TITLE}}!",
        "We are talking generational wealth, you absolute legends! {{TITLE}} is printing cash!",
        "The suits in Sydney don't want you to know about {{TITLE}}, but I'm leaking the alpha!",
        "This is bigger than the gold rush in Gympie! {{TITLE}} is a rocket to the moon!",
        "My portfolio is pumping harder than a bodybuilder at Muscle Beach! It's {{TITLE}}!"
    ],
    POLITICS: [
        "Can you believe the carry-on about {{TITLE}}? It's absolute typical Canberra nonsense!",
        "The system is cooked, maate! {{TITLE}} is just a distraction from the real agenda!",
        "I'm running for Premier just to fix {{TITLE}}! Who's voting for Boomer?!",
        "They want you to look away from {{TITLE}}, but I'm shining a spotlight brighter than the Gabba lights!",
        "Wake up Queensland! {{TITLE}} is how they control your thoughts!"
    ],
    CELEB: [
        "Did you see {{TITLE}}? My jaw hit the floor harder than a mango in season!",
        "It's over for them! {{TITLE}} just ended their career faster than a summer storm!",
        "I'm calling it, {{TITLE}} is the biggest scandal since the '82 Commonwealth Games!",
        "Hollywood is shaking in its boots! {{TITLE}} is spilling more tea than a CWA meeting!",
        "I need a cold one... {{TITLE}} was too much for my alpha heart to handle!"
    ],
    SPORTS: [
        "Are you blind, ref?! {{TITLE}} was a robbery! Worse than State of Origin '95!",
        "Pure athleticism! {{TITLE}} is what happens when you train in 98% humidity!",
        "I could beat {{TITLE}} with one arm tied behind my back! Challenge accepted!",
        "This is what peak QLD performance looks like! {{TITLE}} is a machine!",
        "Put me in coach! {{TITLE}} needs some real Maroons spirit!"
    ],
    NATURE: [
        "It's man vs beast out there! {{TITLE}} is literally taking over the streets!",
        "This isn't just nature, this is WAR! {{TITLE}} is coordinating an attack!",
        "I've trained for this! {{TITLE}} is the ultimate opponent for the Alpha Roo!",
        "Lock your doors! Use your umbrellas! {{TITLE}} is coming for us all!",
        "This is authentic Australia! {{TITLE}} separates the weak from the strong!"
    ],
    GENERAL: [
        "Holy dooley! {{TITLE}} is the biggest thing to hit this town since the cyclone!",
        "I've seen big crocs, but {{TITLE}} is an absolute monster!",
        "Drop everything! {{TITLE}} is the only news that matters today!",
        "This is bigger than a road train on the Bruce Highway! {{TITLE}} is massive!",
        "Strewth! {{TITLE}} has got me more excited than a possum in a rum distillery!"
    ]
};

const KEV_RESPONSES: Record<TopicCategory, string[]> = {
    TECH: [
        "Mate, it's too humid for high tech. {{TITLE}} will melt by noon.",
        "You're carrying on like a pork chop about {{TITLE}}. It's just an app.",
        "Does {{TITLE}} fix the air-con? No? Then I don't care.",
        "Yeah, nah. Looks like a lot of hard yakka for nothing.",
        "Wake me up when the robots learn to pour a decent XXXX."
    ],
    FINANCE: [
        "Boomer, settle down. You're sweating like a racehorse. {{TITLE}} is a scam.",
        "You're gonna lose your shirt, mate. And it's too hot to be shirtless.",
        "Financial survival? I'll stick to my pension plan, thanks.",
        "I invest in shade and cold drinks. That's real value. Unlike {{TITLE}}.",
        "Yeah, nah. Sounds like a load of old cobblers to me."
    ],
    POLITICS: [
        "Politicians yapping about {{TITLE}}... noise pollution, that is.",
        "They can pass whatever they want in Canberra, doesn't change the weather here.",
        "You running for Premier? God help us all. Stick to boxing.",
        "Bureaucracy is just organized loafing, Boomer. I respect the hustle.",
        "I vote for beer o'clock. Can we pass that motion?"
    ],
    CELEB: [
        "Who gives a toss? {{TITLE}} is just noise, mate.",
        "Oh no, a famous drongo did something. Call the Courier Mail.",
        "I'd rather watch the paint peel off the veranda than hear about {{TITLE}}.",
        "Is there a filter to block {{TITLE}}? I'd pay good money for that.",
        "My ears are closing up. It's too hot for this gossip."
    ],
    SPORTS: [
        "It's just a game of footy, mate. Don't pop a foofer valve over {{TITLE}}.",
        "You couldn't run to the bottle-o without passing out. Settle down.",
        "Robbery? It was a fair call. You've clearly had too many rums.",
        "Peak performance involves a hammock and a breeze. Take notes.",
        "Watching you shadow box is making me sweat. Cut it out."
    ],
    NATURE: [
        "Great, more things trying to kill us. Just another Tuesday in Queensland.",
        "I'm staying inside. {{TITLE}} can have the backyard. I don't need it.",
        "You're gonna fight {{TITLE}}? Mate, you'll be dissected before you land a punch.",
        "It's swooping season on steroids. I'm wearing a helmet to bed.",
        "Yeah, nah. Nature wins. I surrender. Pass the chips."
    ],
    GENERAL: [
        "You're seeing things, mate. {{TITLE}} is probably just heatstroke.",
        "Is it really massive? Or is it just a big cockroach?",
        "I've seen bigger things in the Brisbane River. Usually floating.",
        "Can we wrap this up? The humidity is killing me.",
        "Yeah, nah. Not interested. Next."
    ]
};

const BOOMER_REBUTTALS: Record<TopicCategory, string[]> = {
    TECH: [
        "You're a troglodyte, Kev! I'm surfing the digital wave!",
        "This stick you have won't save you when the AI takes over the cane fields!",
        "It's not hard yakka, it's smart work! Innovation, mate!",
        "Adapt or melt, Kev! That's the QLD way!",
        "The robots will love me! I'll teach them to box!"
    ],
    FINANCE: [
        "Have fun being poor and sweaty! I'm buying air-con for the whole neighbourhood!",
        "You'll be begging for a loan when I own the Big Pineapple!",
        "My blood pressure is just passion, mate! Passion for success!",
        "Sleep doesn't buy beach houses, Kev! Wake up!",
        "It's not a scam, it's a golden opportunity! Like finding a tenner in your boardies!"
    ],
    POLITICS: [
        "I'll run for Premier and make siestas illegal! Get to work!",
        "Apathy is un-Australian, mate! We need to have a go to get a go!",
        "I'm starting the Alpha Roo Party! Our policy is pure adrenaline!",
        "Loafing?! I'm building an empire here!",
        "You can represent the resistance from your couch! I'm leading the charge!"
    ],
    CELEB: [
        "You have the personality of a wet towel! This is culture!",
        "The Courier Mail knows what's up! {{TITLE}} is the news of the century!",
        "Block out the noise? This is the music of life, mate!",
        "Filters are for sissies! We take it raw!",
        "Your ears are just jealous of the truth!"
    ],
    SPORTS: [
        "Foofer valve?! I'm operating at 110% capacity!",
        "I'd run rings around you, mate! Literal rings!",
        "It's not bias, it's passion for the game! UP THE MAROONS!",
        "A hammock? That's where dreams go to die!",
        "Shadow boxing keeps the mosquitoes away! And the haters!"
    ],
    NATURE: [
        "Surrender?! Never! I'll punch {{TITLE}} right in the beak!",
        "Helmet?! I'm using my aura as a shield! Come at me!",
        "The backyard is sovereign territory! I'm deploying countermeasures!",
        "It's not just Tuesday, Kev! It's DOOMSDAY! And I'm the saviour!",
        "Weakness! Pure weakness! I thrive in the chaos of {{TITLE}}!"
    ],
    GENERAL: [
        "Heatstroke?! I'm hallucinating success, mate!",
        "Cockroach?! This is a titan of industry!",
        "The Brisbane River has nothing on this wave!",
        "The humidity fuels me! It keeps the muscles loose!",
        "Next?! There is no next! This is it!"
    ]
};

// ==========================================
// 4. ENGINE LOGIC
// ==========================================

export class ScriptEngine {
    private static getRandom(arr: string[]): string {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    private static getMotion(charId: string, intensity: 'HIGH' | 'LOW' | 'MEDIUM'): { action: string, emotion: string } {
        const char = CHARACTERS.find(c => c.id === charId)!;
        let emotions = [];

        if (charId === 'boomer') {
            if (intensity === 'HIGH') emotions = ['Explosive', 'Power', 'Aggressive'];
            else if (intensity === 'MEDIUM') emotions = ['Enthusiastic', 'Vibe', 'Sweaty'];
            else emotions = ['Attentive']; // Boomer is rarely low energy
        } else {
            if (intensity === 'HIGH') emotions = ['Disbelief', 'Cynical', 'Annoyed']; // Kev gets annoyed at high energy
            else if (intensity === 'MEDIUM') emotions = ['Deadpan', 'Bored', 'Annoyed'];
            else emotions = ['Sleepy', 'Exhausted', 'Passive'];
        }

        const selectedEmotion = this.getRandom(emotions);
        const behavior = char.motionBehaviors.find(b => b.emotion === selectedEmotion) || char.motionBehaviors[0];

        // Fallback if specific emotion not found
        if (!behavior) return { action: "Talking naturally", emotion: "Neutral" };

        return { action: behavior.action, emotion: behavior.emotion };
    }

    public static generateInitialScript(title: string, snippet?: string, intelligence?: DirectorialIntelligence): Record<string, unknown>[] {
        const topicData = detectTopic(title);
        const topic = topicData.category;
        const keyword = topicData.keyword;

        // generated IDs
        const id1 = Math.random().toString(36).substr(2, 9);
        const id2 = Math.random().toString(36).substr(2, 9);
        const id3 = Math.random().toString(36).substr(2, 9);
        const id4 = Math.random().toString(36).substr(2, 9);

        // INTELLIGENCE OVERRIDE
        // If we have a specific 'take' from the trends feed, we should build the script around it.
        // It serves as the 'anchor' moment of the script.

        let hookLine, hypeLine, rebuttalLine, closingLine;

        if (intelligence) {
            // SCENARIO 1: Intelligence provided a BOOMER take
            if (intelligence.take.character === 'BOOMER') {
                hookLine = {
                    text: fill(intelligence.take.text, title, keyword),
                    char: 'boomer',
                    intensity: 'HIGH'
                };
                let cleanSnippet = typeof snippet === 'string' ? snippet : "";
                if (cleanSnippet.includes("Trending in")) cleanSnippet = "The numbers are completely off the charts!";
                if (cleanSnippet.length < 10) cleanSnippet = "This is the signal we've been waiting for!";

                hypeLine = {
                    text: `And that's just the tip of the iceberg! ${cleanSnippet.split('.')[0]}!`,
                    char: 'boomer',
                    intensity: 'MEDIUM'
                };
                rebuttalLine = {
                    text: fill(this.getRandom(KEV_RESPONSES[topic]), title, keyword),
                    char: 'kev',
                    intensity: 'MEDIUM'
                };
                closingLine = {
                    text: fill(this.getRandom(BOOMER_REBUTTALS[topic]), title, keyword),
                    char: 'boomer',
                    intensity: 'HIGH'
                };
            } else {
                hookLine = {
                    text: fill(this.getRandom(BOOMER_HOOKS[topic]), title, keyword),
                    char: 'boomer',
                    intensity: 'HIGH'
                };
                hypeLine = {
                    text: snippet ? `Listen to this: "${snippet.split('.')[0]}"!` : `It's happening everywhere, Kev! Look at the screens!`,
                    char: 'boomer',
                    intensity: 'MEDIUM'
                };
                rebuttalLine = {
                    text: fill(intelligence.take.text, title, keyword),
                    char: 'kev',
                    intensity: 'MEDIUM'
                };
                closingLine = {
                    text: `You just don't get the vision, mate! This is history in the making!`,
                    char: 'boomer',
                    intensity: 'HIGH'
                };
            }
        } else {
            hookLine = {
                text: fill(this.getRandom(BOOMER_HOOKS[topic]), title, keyword),
                char: 'boomer',
                intensity: 'HIGH'
            };
            hypeLine = {
                text: snippet ? `Read the data! "${snippet.split('.')[0]}"!` : `Every metric is flashing red! This isn't just a trend, it's a paradigm shift!`,
                char: 'boomer',
                intensity: 'MEDIUM'
            };
            rebuttalLine = {
                text: fill(this.getRandom(KEV_RESPONSES[topic]), title),
                char: 'kev',
                intensity: 'MEDIUM'
            };
            closingLine = {
                text: fill(this.getRandom(BOOMER_REBUTTALS[topic]), title),
                char: 'boomer',
                intensity: 'HIGH'
            };
        }

        const lines = [hookLine, hypeLine, rebuttalLine, closingLine];
        const ids = [id1, id2, id3, id4];

        return lines.map((line, index) => {
            const motion = this.getMotion(line.char, line.intensity as 'HIGH' | 'LOW' | 'MEDIUM');
            return {
                id: ids[index],
                characterId: line.char,
                text: line.text,
                shotType: line.char === 'boomer' ? (index === 0 ? 'LOW_ANGLE_BOOMER' : (index === 3 ? 'GOPRO_FISHEYE' : 'BOOMER_MCU')) : 'KEV_CU',
                action: motion.action,
                durationEst: index === 1 ? 8 : (index === 0 ? 6 : (index === 3 ? 7 : 5)), // Hype is longest
                emotion: motion.emotion,
                status: 'IDLE',
                visualPrompt: "",
                cameraMovement: "STATIC",
                compositionNotes: "",
                storyboardSketch: ""
            };
        });
    }

    public static generateNextLine(currentScript: ScriptLine[], title: string): ScriptLine {
        const topicData = detectTopic(title);
        const topic = topicData.category;
        const keyword = topicData.keyword;
        const lastLine = currentScript[currentScript.length - 1] as { characterId: string };
        const lastCharId = lastLine.characterId;
        const nextCharId = lastCharId === 'boomer' ? 'kev' : 'boomer';

        let text = "";
        let motion = { action: "", emotion: "" };

        if (nextCharId === 'kev') {
            // Kev responding to Boomer
            const templates = [
                "Right. Whatever helps you sleep at night.",
                "Can you say that again, but with 50% less screaming?",
                "I'm just going to pretend I heard a logical argument there.",
                "Okay, but does it come with a nap mode?",
                `Look, {{keyword}} is fine, but you're making it sound like the apocalypse.`
            ];
            // Add topic specific flavor
            if (topic === 'FINANCE') templates.push("And let me guess, you need 50 bucks?");
            if (topic === 'TECH') templates.push("And when the battery dies, then what?");

            text = fill(this.getRandom(templates), title, keyword);
            motion = this.getMotion('kev', 'LOW');
        } else {
            // Boomer responding to Kev (Escalation)
            const templates = [
                "You're missing the point entirely!",
                "LOGIC?! This is about EMOTION! This is about VICTORY!",
                "Nap mode? We don't sleep until we win!",
                "You treat everything like a joke, but this is serious!",
                `Don't you see?! {{keyword}} is the future of everything!`
            ];
            text = fill(this.getRandom(templates), title, keyword);
            motion = this.getMotion('boomer', 'HIGH');
        }

        return {
            id: Math.random().toString(36).substr(2, 9),
            characterId: nextCharId,
            text: text,
            shotType: nextCharId === 'boomer' ? 'BOOMER_MCU' : 'KEV_CU',
            action: motion.action,
            durationEst: 5,
            emotion: motion.emotion,
            status: 'IDLE',
            visualPrompt: "",
            cameraMovement: "STATIC",
            compositionNotes: "",
            storyboardSketch: ""
        };
    }
}
