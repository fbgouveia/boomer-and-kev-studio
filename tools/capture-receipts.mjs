#!/usr/bin/env node
// Captura "recibos": prints reais de manchetes de veiculos confiaveis sobre um tema.
//
// Uso: node tools/capture-receipts.mjs "brisbane coffee price" [dias]
//
// Fluxo: Google News RSS -> filtra allowlist (sem paywall) -> resolve o redirect
// num navegador headless (o payload CBM... e opaco, so JS resolve) -> confere a
// data REAL do artigo -> printa a regiao da manchete.
//
// ponytail: allowlist fixa em vez de detector de paywall. Detectar paywall de
// verdade exige heuristica por site; uma lista de 8 veiculos livres resolve hoje.

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

// Veiculos AU conhecidos e SEM paywall duro. SMH e Courier Mail ficam de fora
// de proposito: o print sairia com o muro em vez da noticia.
const ALLOWLIST = {
    'abc.net.au': 'ABC News',
    'news.com.au': 'News.com.au',
    'nine.com.au': 'Nine.com.au',
    '7news.com.au': '7NEWS',
    'sbs.com.au': 'SBS News',
    'theguardian.com': 'The Guardian',
    'theconversation.com': 'The Conversation',
    'timeout.com': 'Time Out',
};

// Recorte do TOPO da pagina, nao so do <h1>. Testado em 07/08: printar apenas o
// h1 devolve texto pelado — sem logo, sem assinatura, sem data. Isso vira o mesmo
// cartao tipografado que a camada de prova existe para substituir. O recorte do
// topo pega masthead + manchete + byline + data publicada, que e o que faz o
// espectador reconhecer o veiculo. Custo: em alguns sites entra banner de cookie.
const CLIP = { x: 0, y: 0, width: 1000, height: 560 };

const MIN_OUTLETS = 5; // abaixo disso o tema nao sustenta a camada de prova

const topic = process.argv[2];
const days = Number(process.argv[3] || 7);
if (!topic) {
    console.error('uso: node tools/capture-receipts.mjs "<tema>" [dias]');
    process.exit(1);
}

const outDir = path.join(process.cwd(), '.tmp', 'receipts', topic.replace(/\W+/g, '-').toLowerCase());
fs.mkdirSync(outDir, { recursive: true });

const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic + ` when:${days}d`)}&hl=en-AU&gl=AU&ceid=AU:en`;

const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');

// Data real do artigo. O pubDate do Google NAO e confiavel: em 07/08/2026 ele
// datou como "março/2026" uma materia do ABC cuja URL era 2025-01-20 (19 meses
// mais velha). Recibo com data errada e pior que recibo nenhum.
function realDate(url, html) {
    const fromUrl = url.match(/\/(20\d{2})[-/](\d{2})[-/](\d{2})\//);
    if (fromUrl) return `${fromUrl[1]}-${fromUrl[2]}-${fromUrl[3]}`;
    const meta = html.match(/<meta[^>]+property="article:published_time"[^>]+content="(\d{4}-\d{2}-\d{2})/i)
        || html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/i);
    return meta ? meta[1] : null;
}

const xml = await (await fetch(feedUrl)).text();
const items = [...xml.matchAll(/<item>(.*?)<\/item>/gs)].map(m => m[1]);

const picked = [];
const seen = new Set();
for (const it of items) {
    const src = it.match(/<source url="https?:\/\/(?:www\.)?([^"/]+)"/);
    if (!src) continue;
    const domain = Object.keys(ALLOWLIST).find(d => src[1] === d || src[1].endsWith('.' + d));
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    picked.push({
        outlet: ALLOWLIST[domain],
        domain,
        headline: decode(it.match(/<title>(.*?)<\/title>/s)[1]).replace(/\s+-\s+[^-]+$/, '').trim(),
        gnewsLink: it.match(/<link>(.*?)<\/link>/s)[1],
        feedDate: it.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1] ?? null,
    });
}

console.log(`tema: "${topic}" · janela: ${days}d · veiculos na allowlist: ${picked.length}`);

// ─── FILTRO DE RELEVANCIA (trava nº 1 do handoff 07/08, implementada 04/09) ───
// "Recibo que nao sustenta a fala e enfeite, nao prova." O 7NEWS capturado em
// 07/08 era conteudo de afiliado ("20% off subscription"). Um SIM/NAO barato
// entre a busca e a captura impede prova de enfeite. Metodo: decomposicao de
// claim da skill fact-checker — a manchete sustenta a alegacao?
// Custo: ~US$0.002 por manchete (claude-sonnet-5, ~200 tokens). Acima da linha paga.
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || readEnvKey();
function readEnvKey() {
    try {
        const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
        return env.match(/^ANTHROPIC_API_KEY=(.+)$/m)?.[1]?.trim() || '';
    } catch { return ''; }
}

async function sustainsClaim(headline, claim) {
    if (!ANTHROPIC_KEY) return { verdict: 'UNKNOWN', reason: 'sem ANTHROPIC_API_KEY — filtro desligado' };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
            model: 'claude-sonnet-5',
            max_tokens: 16,
            messages: [{
                role: 'user',
                content: `You are a strict fact-checker. Does this headline DIRECTLY support the claim below? The claim is what a comedy commentary video will state on screen.\nCLAIM: "${claim}"\nHEADLINE: "${headline}"\nAnswer with exactly one word: YES, NO, or PARTIAL (partially related but does not confirm the claim).`
            }]
        })
    });
    if (!res.ok) return { verdict: 'UNKNOWN', reason: `HTTP ${res.status}` };
    const data = await res.json();
    const verdict = String(data.content?.[0]?.text || 'UNKNOWN').trim().toUpperCase();
    return { verdict: ['YES', 'NO', 'PARTIAL'].includes(verdict) ? verdict : 'UNKNOWN' };
}

console.log('\n🧪 filtro de relevância (a manchete sustenta a alegação?):');
const relevant = [];
for (const r of picked) {
    const { verdict, reason } = await sustainsClaim(r.headline, topic);
    const icon = verdict === 'YES' ? '✅' : verdict === 'PARTIAL' ? '🟡' : verdict === 'NO' ? '❌' : '⚪';
    console.log(`   ${icon} ${verdict.padEnd(7)} [${r.outlet}] ${r.headline.slice(0, 70)}${reason ? ` (${reason})` : ''}`);
    r.relevance = verdict;
    if (verdict === 'YES' || verdict === 'PARTIAL') relevant.push(r);
}
console.log(`\nrelevantes: ${relevant.length}/${picked.length} (NO e descartado antes de gastar captura)\n`);

if (relevant.length === 0) {
    console.log('⚠ SEM PAUTA: nenhuma manchete da allowlist sustenta a alegação. Prova de enfeite não entra no episódio.');
    fs.writeFileSync(path.join(outDir, 'receipts.json'), JSON.stringify(picked.map(r => ({ ...r, captured: false, reason: 'relevance filter: NO' })), null, 2));
    process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });

// Sem isto o recorte do topo vem com banner de anuncio (o Nine trouxe um de rugby
// colado no logo em 07/08). Anuncio no recibo e ruido: confunde o espectador sobre
// o que e a materia. Bloquear na rede e mais confiavel que esconder por CSS.
const AD_HOSTS = /doubleclick|googlesyndication|googletagservices|adservice|adnxs|taboola|outbrain|amazon-adsystem|criteo|pubmatic|rubiconproject|scorecardresearch|teads/i;
await page.route('**/*', route => AD_HOSTS.test(route.request().url()) ? route.abort() : route.continue());

const results = [];

// Captura SOMENTE o que sustenta a alegacao. NO nao gasta Playwright nem entra no ep.
for (const [i, r] of relevant.entries()) {
    try {
        await page.goto(r.gnewsLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForURL(u => !u.hostname.includes('news.google.com'), { timeout: 25000 });
        r.articleUrl = page.url();
        r.articleDate = realDate(r.articleUrl, await page.content());

        await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15000 });
        await page.waitForTimeout(2500); // deixa fonte e imagem do topo carregarem
        r.file = path.join(outDir, `${String(i + 1).padStart(2, '0')}-${r.domain}.png`);
        await page.screenshot({ path: r.file, clip: CLIP });
        r.ok = true;
    } catch (e) {
        r.ok = false;
        r.error = String(e.message).split('\n')[0];
    }
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.outlet.padEnd(18)} ${r.articleDate ?? '?'.padEnd(10)} ${r.ok ? path.basename(r.file) : r.error}`);
    results.push(r);
}

await browser.close();
fs.writeFileSync(path.join(outDir, 'receipts.json'), JSON.stringify(results, null, 2));

const ok = results.filter(r => r.ok).length;
console.log(`\n${ok}/${results.length} capturados em ${outDir}`);
if (ok < MIN_OUTLETS) {
    console.log(`\n⚠ SEM PAUTA: ${ok} veiculos em ${days} dias (minimo ${MIN_OUTLETS}).`);
    console.log('  Poucos veiculos na janela = o assunto nao esta quente. Isto e o sinal');
    console.log('  de viral MEDIDO — nao renderizar episodio com camada de prova sobre ele.');
    process.exit(2);
}
