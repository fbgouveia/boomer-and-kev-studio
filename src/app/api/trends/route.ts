import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

// 24/7 TREND AGENT — MEDIDED, not invented (04/09 rewrite).
// Fonte: Google News RSS (grátis, sem chave) — a mesma mecanica comprovada do
// capture-receipts.mjs. Regra de admissão do handoff 07/08 agora em codigo:
//   >=5 veiculos confiaveis cobrindo o assunto em 7 dias = quente.
// O score e a CONTAGEM REAL de outlets. Nada de viralPotential digitado a mao.
// Sem noticias reais -> rota devolve vazio/erro; NUNCA fabrica manchete.

const parser = new Parser({
  timeout: 8000,
  customFields: { item: ['source'] },
});

// Google News RSS entrega <source> como objeto custom ({ _: 'Outlet' }) —
// normaliza para o nome do veiculo (a contagem de outlets E o score medido).
function outletOf(item: Record<string, unknown>, fallbackLink: string): string {
  const s = item.source as { _: string } | string | undefined;
  if (typeof s === 'string' && s.trim()) return s.trim();
  if (s && typeof s === 'object' && typeof s._ === 'string' && s._.trim()) return s._.trim();
  try { return new URL(fallbackLink).hostname.replace('www.', ''); } catch { return 'unknown'; }
}

type Geo = 'AU' | 'US' | 'BR' | 'GB';

// Consultas do genero editorial B&K: absurdo cotidiano do humano comum —
// precos, consumismo, politica errada, dia a dia dificil.
const QUERIES: Record<Geo, string[]> = {
  AU: [
    'cost of living Australia',
    'coffee OR groceries prices Australia',
    'rent OR housing Australia',
    'energy bills OR petrol prices Australia',
    'Australia politics scandal OR blunder',
    'Woolworths OR Coles Australia',
  ],
  US: ['cost of living US', 'grocery prices US', 'rent housing US', 'gas prices US', 'US politics scandal'],
  BR: ['custo de vida Brasil', 'precos alimentação Brasil', 'aluguel Brasil', 'conta de luz Brasil'],
  GB: ['cost of living UK', 'grocery prices UK', 'rent housing UK', 'energy bills UK'],
};

function relTime(date: Date): string {
  const mins = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 60) return `${mins} MIN AGO`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} HOURS AGO`;
  return `${Math.round(h / 24)} DAYS AGO`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const geo = (searchParams.get('geo') || 'AU') as Geo;
    const queries = QUERIES[geo] || QUERIES.AU;
    const lang = geo === 'BR' ? 'pt-BR' : 'en-AU';
    const gl = geo === 'BR' ? 'BR' : geo === 'US' ? 'US' : geo === 'GB' ? 'GB' : 'AU';
    const ceid = geo === 'BR' ? 'BR:pt-419' : `${gl}:${geo === 'US' ? 'en' : geo === 'GB' ? 'en' : 'en'}`;

    const results = await Promise.allSettled(
      queries.map(async (q) => {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:7d')}&hl=${lang}&gl=${gl}&ceid=${ceid}`;
        const feed = await parser.parseURL(url);
        const raw = (feed.items || []) as unknown as Array<Record<string, unknown>>;
        const items = raw.filter(i => i.title && i.link);
        const outlets = new Set(items.map((i: Record<string, unknown>) => outletOf(i, String(i.link))));
        const newest = items
          .map((i: Record<string, unknown>) => i.isoDate ? new Date(String(i.isoDate)) : null)
          .filter((d): d is Date => !!d && !isNaN(d.getTime()))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        return {
          query: q,
          outletCount: outlets.size,
          items: items.slice(0, 6).map((i: Record<string, unknown>) => ({
            title: String(i.title).replace(/\s+-\s+[^-]+$/, '').trim(),
            source: outletOf(i, String(i.link)),
            url: String(i.link),
            pubDate: String(i.isoDate || ''),
          })),
          newest: newest ? relTime(newest) : '7 DAYS+',
        };
      })
    );

    const trends = results
      .filter((r): r is PromiseFulfilledResult<{ query: string; outletCount: number; items: { title: string; source: string; url: string; pubDate: string }[]; newest: string }> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(r => r.items.length > 0 && r.outletCount > 0)
      .sort((a, b) => b.outletCount - a.outletCount)
      .slice(0, 6)
      .map(r => ({
        // titulo real da manchete mais recente do tema (medido, nao inventado)
        title: `[${r.outletCount >= 5 ? 'HOT' : 'WARM'}·${r.outletCount} OUTLETS] ${r.items[0].title}`,
        snippet: `${r.outletCount} veiculos distintos cobrindo "${r.query}" nos ultimos 7 dias — sinal medido via Google News. Regra de admissao: >=5 outlets = quente.`,
        url: r.items[0].url,
        traffic: `${r.outletCount} OUTLETS`,
        published: r.newest,
        news: r.items.map(i => ({ title: i.title, source: i.source, url: i.url })),
        // directorialIntelligence deliberadamente AUSENTE: o "take" do personagem e
        // trabalho do brainstorm (LLM), nao do agente de busca. A UI esconde o gauge
        // quando o campo nao vem — honestidade por design.
        measured: { query: r.query, outlets: r.outletCount, admissionRule: '>=5 outlets / 7 days' },
      }));

    console.log(`[TREND AGENT] geo=${geo} temas medidos=${trends.length} (outlets reais, RSS 7d)`);
    return NextResponse.json(trends);
  } catch (error) {
    console.error('TRENDS_ROUTE_ERROR', error);
    return NextResponse.json(
      { error: 'Trend agent falhou ao buscar noticias reais. Nenhuma pauta fabricada — verifique rede/RSS.' },
      { status: 502 }
    );
  }
}
