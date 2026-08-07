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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });

// Sem isto o recorte do topo vem com banner de anuncio (o Nine trouxe um de rugby
// colado no logo em 07/08). Anuncio no recibo e ruido: confunde o espectador sobre
// o que e a materia. Bloquear na rede e mais confiavel que esconder por CSS.
const AD_HOSTS = /doubleclick|googlesyndication|googletagservices|adservice|adnxs|taboola|outbrain|amazon-adsystem|criteo|pubmatic|rubiconproject|scorecardresearch|teads/i;
await page.route('**/*', route => AD_HOSTS.test(route.request().url()) ? route.abort() : route.continue());

const results = [];

for (const [i, r] of picked.entries()) {
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
