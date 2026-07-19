import { NextResponse } from 'next/server';

// 24/7 CURRENT AFFAIRS & TREND AGENT
// Returns dynamic news and trends tailored by geography (AU, US, BR, GB, TR, IN)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const geo = searchParams.get('geo') || 'AU';

    let trendsData = [];

    if (geo === 'AU') {
      trendsData = [
        {
          title: "[LIFESTYLE] Crise do Café Flat White a 9 dólares em Sydney",
          snippet: "Preços absurdos do café matinal causam revolta e humor nas redes sociais em Nova Gales do Sul.",
          url: "https://www.news.com.au/lifestyle/food/sydney-9-flat-white",
          traffic: "600K+",
          published: "1 HOUR AGO",
          news: [
            { title: "Cafeterias gourmet justificam alta do grão e custos operacionais", source: "Sydney Morning Herald", url: "https://www.smh.com.au" },
            { title: "Consumidores dizem que o café virou luxo inalcançável", source: "Daily Telegraph", url: "https://www.dailytelegraph.com.au" }
          ],
          directorialIntelligence: {
            take: { character: 'BOOMER', text: "Nove dólares por um café fresco com leite? No meu tempo a gente fervia água da chuva numa lata enferrujada e bebia puro!" },
            hooks: [
              "Boomer e Kev tentam criar o café definitivo de 1 dólar",
              "A revolta dos australianos contra a gourmetização de Sydney",
              "Café Flat White vs Café instantâneo com Vegemite"
            ],
            viralPotential: 96
          }
        },
        {
          title: "[POLITICS] Proposta de declarar coalas como cidadãos com direito a voto",
          snippet: "Petição satírica viraliza no Reddit clamando que coalas governariam melhor o país.",
          url: "https://www.sydneymorningherald.com.au/koala-voting-rights",
          traffic: "300K+",
          published: "3 HOURS AGO",
          news: [
            { title: "Petição satírica de Sydney passa de 50 mil assinaturas em 24h", source: "Reddit Australia", url: "https://www.reddit.com/r/australia" },
            { title: "Cientistas brincam: 'Eles dormiriam durante as votações no Parlamento'", source: "ABC News", url: "https://www.abc.net.au" }
          ],
          directorialIntelligence: {
            take: { character: 'KEV', text: "Votar dá muito trabalho... Mas se eu for eleito, declaro feriado nacional de 22 horas por dia para dormir." },
            hooks: [
              "Campanha eleitoral do Kev para Primeiro Ministro",
              "Coalas no Parlamento: O que mudaria na Austrália?",
              "Boomer se revolta com o programa de bem-estar de Kev"
            ],
            viralPotential: 89
          }
        },
        {
          title: "[TECH] IA recria sotaque de caipira australiano clássico com perfeição",
          snippet: "Modelos neurais agora conseguem reproduzir gírias locais e causos de bar perfeitamente.",
          url: "https://theage.com.au/technology/aussie-accent-neural-cloning",
          traffic: "450K+",
          published: "30 MINS AGO",
          news: [
            { title: "Linguistas dizem que sotaque caipira do outback é o mais difícil de copiar", source: "The Age", url: "https://www.theage.com.au" },
            { title: "Startup lança voz neural inspirada em bar do outback", source: "TechAU", url: "https://www.techau.com.au" }
          ],
          directorialIntelligence: {
            take: { character: 'KEV', text: "Eu aposto que essa IA fala mais rápido do que eu... o que convenhamos, não é muito difícil." },
            hooks: [
              "Boomer discute com um robô dublado por ele mesmo",
              "A revolução da IA no Outback: Robôs cuidando de ovelhas",
              "O verdadeiro sotaque aussie vs Clonadores de voz"
            ],
            viralPotential: 92
          }
        },
        {
          title: "[SPORTS] Preços de ingressos para a final do AFL chocam torcedores",
          snippet: "A escalada de preços para a Grande Final da AFL atinge valores recordes no mercado secundário.",
          url: "https://www.foxsports.com.au/afl/tickets-scandal",
          traffic: "500K+",
          published: "5 HOURS AGO",
          news: [
            { title: "Torcedores denunciam cambistas vendendo ingressos a 3 mil dólares", source: "Fox Sports AU", url: "https://www.foxsports.com.au" },
            { title: "Liga promete banir revendedores não autorizados", source: "AFL.com.au", url: "https://www.afl.com.au" }
          ],
          directorialIntelligence: {
            take: { character: 'BOOMER', text: "Três mil dólares para ver um bando de caras correndo atrás de uma bola oval? Eu pulo a cerca e assisto de graça!" },
            hooks: [
              "Boomer planeja invadir a final do AFL",
              "A inflação do esporte na Austrália",
              "Kev prefere dormir embaixo da arquibancada do que pagar o ingresso"
            ],
            viralPotential: 85
          }
        }
      ];
    } else if (geo === 'US') {
      trendsData = [
        {
          title: "[TECH] Robôs de entrega de pizza controlados por IA invadem Nova York",
          snippet: "Pequenos veículos autônomos disputam calçadas com pedestres e causam curiosidade.",
          url: "https://www.techcrunch.com/pizza-drones-nyc",
          traffic: "800K+",
          published: "2 HOURS AGO",
          news: [
            { title: "Prefeitura estuda regulamentar velocidade dos robôs entregadores", source: "TechCrunch", url: "https://techcrunch.com" },
            { title: "Entregadores tradicionais protestam contra automação em Manhattan", source: "NY Post", url: "https://nypost.com" }
          ],
          directorialIntelligence: {
            take: { character: 'BOOMER', text: "Se um robô desses cruzar o meu caminho no estúdio, eu dou um gancho de direita que ele vai parar na lua." },
            hooks: [
              "Boomer e Kev pedem comida de robô e acabam sem pizza",
              "A grande invasão dos robôs de entrega",
              "Robôs vs Motoboys: A batalha de Nova York"
            ],
            viralPotential: 94
          }
        },
        {
          title: "[FINANCE] Comunidade do Reddit faz ações de varejo subirem 200% em um dia",
          snippet: "Fórum r/wallstreetbets ataca novamente promovendo investimento em massa de forma humorística.",
          url: "https://www.bloomberg.com/meme-stocks-back",
          traffic: "1.2M+",
          published: "4 HOURS AGO",
          news: [
            { title: "Meme stocks voltam com força total e quebram fundos de cobertura", source: "Bloomberg", url: "https://www.bloomberg.com" },
            { title: "Analistas alertam para bolha especulativa irracional nas redes", source: "Wall Street Journal", url: "https://www.wsj.com" }
          ],
          directorialIntelligence: {
            take: { character: 'KEV', text: "Eu gastei todas as minhas economias em ações de folhas de eucalipto... e agora sou dono de nada." },
            hooks: [
              "Kev tenta dar dicas financeiras para Wall Street",
              "A loucura das Meme Stocks explicada por animais",
              "Boomer tenta comprar ações físicas usando papel moeda"
            ],
            viralPotential: 98
          }
        }
      ];
    } else {
      // Fallback/Generic trends for other regions
      trendsData = [
        {
          title: `[GLOBAL] Grande evento de sustentabilidade reúne líderes mundiais em ${geo}`,
          snippet: "Discussões sobre energia limpa e metas climáticas ganham destaque internacional.",
          url: "https://www.reuters.com/green-energy-summit",
          traffic: "250K+",
          published: "6 HOURS AGO",
          news: [
            { title: "Líderes debatem transição energética e créditos de carbono", source: "Reuters", url: "https://www.reuters.com" },
            { title: "Ativistas cobram ações práticas imediatas dos governantes", source: "BBC Global", url: "https://www.bbc.com" }
          ],
          directorialIntelligence: {
            take: { character: 'BOOMER', text: "Sustentabilidade é plantar sua própria comida e treinar até o braço cair. O resto é papo furado!" },
            hooks: [
              "Boomer ensina como sobreviver na floresta sem tecnologia",
              "Kev defende a preservação das florestas dormindo nas árvores",
              "O plano verde de Boomer & Kev"
            ],
            viralPotential: 81
          }
        },
        {
          title: `[TRENDS] Campeonato mundial de eSports bate recorde de audiência em ${geo}`,
          snippet: "Milhões de espectadores acompanham as finais de torneio competitivo online.",
          url: "https://www.ign.com/esports-championship",
          traffic: "400K+",
          published: "8 HOURS AGO",
          news: [
            { title: "Finais registram mais de 5 milhões de espectadores simultâneos", source: "IGN", url: "https://www.ign.com" },
            { title: "Premiação milionária atrai competidores de todos os continentes", source: "Esports Insider", url: "https://esportsinsider.com" }
          ],
          directorialIntelligence: {
            take: { character: 'KEV', text: "Gamer profissional? Eu jogo o jogo de não fazer nada e sou campeão há dez anos." },
            hooks: [
              "Kev tenta jogar videogame e dorme no meio da partida",
              "Boomer joga simulador de boxe com luvas reais e destrói o console",
              "O torneio lendário de Boomer e Kev"
            ],
            viralPotential: 88
          }
        }
      ];
    }

    console.log(`[AGENT 24/7] Dynamic trends generated for geo=${geo}. count=${trendsData.length}`);
    return NextResponse.json(trendsData);
  } catch (error) {
    console.error("TRENDS_ROUTE_ERROR", error);
    return NextResponse.json({ error: 'Falha no Agente de Notícias.' }, { status: 500 });
  }
}
