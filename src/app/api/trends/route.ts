import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser();

const getCharacterTake = (_title: string) => {
    const isBoomer = Math.random() > 0.5;
    const character = isBoomer ? 'BOOMER' : 'KEV';

    const boomerTakes = [
        `OI! This is absolutely massive! Imagine the views if we shadow-box this topic!`,
        `Fair dinkum, this is a game changer. I'm already feeling the testosterone spike just reading this!`,
        `Listen up legends! This is the kind of gear that makes a channel go nuclear!`,
        `Absolute STREWTH! We need to get this into production before the algorithm shifts!`,
    ];

    const kevTakes = [
        `Yeah, nah. It's just another distraction from my eucalyptus break.`,
        `Boomer is going to have a brain aneurysm over this one. Tell him he's dreaming.`,
        `Strewth... can we just stick to talking about bark? It's less complicated.`,
        `Classic distraction logic. Ground control to Boomer, come in space cadet.`,
    ];

    return {
        character,
        text: isBoomer ? boomerTakes[Math.floor(Math.random() * boomerTakes.length)] : kevTakes[Math.floor(Math.random() * kevTakes.length)]
    };
};

const getCreativeHooks = (title: string) => {
    return [
        `Boomer attempts to 'disrupt' ${title} using only boxing gloves.`,
        `Kev debunking the ${title} hype with absolute deadpan logic.`,
        `A high-velocity debate where Boomer gets too close to the mic about ${title}.`
    ];
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const geo = searchParams.get('geo') || 'AU';

    try {
        const feed = await parser.parseURL(`https://trends.google.com/trending/rss?geo=${geo}`);

        const trends = feed.items.map((item: { title?: string, contentSnippet?: string, link?: string } & Record<string, unknown>) => {
            const title = item.title || "Global Trend";
            return {
                title,
                snippet: item.contentSnippet || `Trending in ${geo}`,
                url: item.link,
                traffic: item['ht:approx_traffic'] || `${Math.floor(Math.random() * 50 + 1)}K+`,
                published: item.pubDate,
                news: item['ht:news_item'] ? [
                    {
                        title: item['ht:news_item_title'],
                        url: item['ht:news_item_url'],
                        source: item['ht:news_item_source']
                    }
                ] : [],
                directorialIntelligence: {
                    take: getCharacterTake(title),
                    hooks: getCreativeHooks(title),
                    viralPotential: Math.floor(Math.random() * 40) + 60 // 60-99
                }
            };
        });

        if (trends.length === 0) throw new Error("Empty Feed");

        return NextResponse.json(trends);
    } catch (error) {
        console.warn(`Google Trends Feed [${geo}] unreachable, deploying high-fidelity fallback:`, error);

        const fallbackTrends = [
            {
                title: "Artificial General Intelligence",
                traffic: "500K+",
                snippet: "Global interest spikes as new paradigm shift enters final phase.",
                published: "2 hours ago",
                news: [{ title: "AGI Horizon", source: "Tech Pulse", url: "#" }],
                directorialIntelligence: {
                    take: { character: 'BOOMER', text: "AGI? Is that a new brand of boxing gloves? I'll take ten!" },
                    hooks: ["Boomer tries to out-think an AGI", "Kev explains why AGI is just a glorified koala brain"],
                    viralPotential: 98
                }
            },
            {
                title: "Quantum Decentralized Finance",
                traffic: "50K+",
                snippet: "Major interest in the upcoming cryptographic derby.",
                published: "5 hours ago",
                news: [{ title: "The Quantum Leap", source: "Crypto Daily", url: "#" }],
                directorialIntelligence: {
                    take: { character: 'KEV', text: "Quantum money? Unless I can buy leaves with it, I'm out." },
                    hooks: ["Boomer loses the studio budget on quantum crypto", "Kev's 'Nah' to the blockchain"],
                    viralPotential: 72
                }
            }
        ];

        return NextResponse.json(fallbackTrends);
    }
}
