import fs from 'fs';
import { fileURLToPath } from 'url';

const DIR = fileURLToPath(new URL(".", import.meta.url)); // caminho da propria pasta (fileURLToPath: o path do URL vem com espacos percent-encoded)

const TOPICS = [
  { id: 'ai', label: 'Entrevistas de emprego por IA',
    sub: 'Empresas trocam entrevista por teste de IA; candidatos respondem com IA.',
    files: { sonnet: 'raw-claude-sonnet-5.json', opus: 'raw-claude-opus-5.json' } },
  { id: 't1', label: 'NRL Grand Final Controversy',
    sub: 'Tema hardcoded no trend-hunter. Sinal "85" — inventado.',
    files: { sonnet: 't1-claude-sonnet-5.json', opus: 't1-claude-opus-5.json' } },
  { id: 't2', label: 'Aussie Housing Crisis Update',
    sub: 'Tema hardcoded no trend-hunter. Sinal "70" — inventado.',
    files: { sonnet: 't2-claude-sonnet-5.json', opus: 't2-claude-opus-5.json' } },
  { id: 't3', label: 'Brisbane Coffee Price Shock',
    sub: 'Tema hardcoded no trend-hunter. Sinal "92" — inventado.',
    files: { sonnet: 't3-claude-sonnet-5.json', opus: 't3-claude-opus-5.json' } },
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function stats(s) {
  const c = {};
  for (const l of s) c[l.characterId] = (c[l.characterId] || 0) + 1;
  let mx = 1, cur = 1;
  for (let i = 1; i < s.length; i++) {
    if (s[i].characterId === s[i - 1].characterId) { cur++; mx = Math.max(mx, cur); } else cur = 1;
  }
  return {
    cenas: s.length,
    boomer: c.boomer || 0,
    kev: c.kev || 0,
    seq: mx,
    dur: s.reduce((a, l) => a + (l.durationEst || 0), 0),
    planos: new Set(s.map(l => l.shotType)).size,
  };
}

function renderScript(file) {
  const s = JSON.parse(fs.readFileSync(`${DIR}/${file}`, 'utf8'));
  const st = stats(s);
  const hud = `
    <dl class="hud">
      <div><dt>cenas</dt><dd>${st.cenas}</dd></div>
      <div><dt>boomer/kev</dt><dd>${st.boomer}/${st.kev}</dd></div>
      <div><dt>máx. seguidas</dt><dd>${st.seq}</dd></div>
      <div><dt>duração</dt><dd>${st.dur}s</dd></div>
      <div><dt>planos</dt><dd>${st.planos}</dd></div>
    </dl>`;
  const scenes = s.map((l, i) => `
    <article class="scene ${l.characterId}">
      <header class="scene-head">
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <span class="who">${esc(l.characterId)}</span>
        <span class="meta">${esc(l.shotType)} · ${esc(l.emotion)} · ${l.durationEst}s</span>
      </header>
      <p class="line">${esc(l.text)}</p>
      <p class="action">${esc(l.action)}</p>
    </article>`).join('');
  return hud + `<div class="scenes">${scenes}</div>`;
}

const body = TOPICS.map(t => `
  <section class="topic">
    <header class="topic-head">
      <h2>${esc(t.label)}</h2>
      <p class="topic-sub">${esc(t.sub)}</p>
    </header>
    <div class="pair">
      <div class="col">
        <h3 class="model sonnet">Sonnet&nbsp;5</h3>
        ${renderScript(t.files.sonnet)}
      </div>
      <div class="col">
        <h3 class="model opus">Opus&nbsp;5</h3>
        ${renderScript(t.files.opus)}
      </div>
    </div>
  </section>`).join('');

const html = `<title>Boomer &amp; Kev — Roteiros do A/B, 07/08/2026</title>
<style>
  :root{
    --ink:#EDE7E1; --ink-dim:#9C948C; --ink-faint:#6B645E;
    --ground:#0A0908; --surface:#131211; --surface-2:#1B1917;
    --rule:#2C2926;
    --boomer:#FF5F1F;   /* Signal Orange — rim light quente do Boomer */
    --kev:#79A3B8;      /* soft-box frio do Kev */
    --max:1400px;
  }
  *{box-sizing:border-box}
  body{
    margin:0; background:var(--ground); color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    font-size:17px; line-height:1.5; -webkit-font-smoothing:antialiased;
  }
  .mono,.num,.meta,.hud,.eyebrow,.model{
    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  }
  .wrap{max-width:var(--max); margin:0 auto; padding:0 24px 96px}

  /* ── cabeçalho ─────────────────────────────── */
  .masthead{border-bottom:4px solid var(--boomer); margin-bottom:48px; padding:56px 0 32px}
  .eyebrow{
    font-size:12px; letter-spacing:.18em; text-transform:uppercase;
    color:var(--boomer); margin:0 0 16px
  }
  h1{
    font-size:clamp(30px,5vw,52px); line-height:1.05; margin:0 0 16px;
    letter-spacing:-.02em; text-wrap:balance; font-weight:800;
  }
  .standfirst{max-width:62ch; color:var(--ink-dim); margin:0; font-size:18px}
  .standfirst strong{color:var(--ink); font-weight:600}

  .caveat{
    margin:32px 0 0; padding:16px 20px; background:var(--surface);
    border-left:4px solid var(--boomer); max-width:78ch;
  }
  .caveat p{margin:0; font-size:15px; color:var(--ink-dim)}
  .caveat p + p{margin-top:8px}

  /* ── tópico ────────────────────────────────── */
  .topic{margin-bottom:72px}
  .topic-head{border-bottom:1px solid var(--rule); padding-bottom:14px; margin-bottom:24px}
  .topic-head h2{
    font-size:clamp(21px,2.6vw,28px); margin:0 0 6px; letter-spacing:-.01em;
    text-wrap:balance; font-weight:700;
  }
  .topic-sub{margin:0; color:var(--ink-faint); font-size:14px}

  .pair{display:grid; grid-template-columns:1fr 1fr; gap:28px}
  @media (max-width:860px){ .pair{grid-template-columns:1fr; gap:44px} }

  .model{
    font-size:12px; letter-spacing:.16em; text-transform:uppercase;
    margin:0 0 14px; padding:7px 12px; display:inline-block; font-weight:600;
  }
  .model.sonnet{background:var(--surface-2); color:var(--ink-dim); border:1px solid var(--rule)}
  .model.opus{background:var(--boomer); color:#0A0908}

  /* ── HUD de métricas ───────────────────────── */
  .hud{
    display:flex; flex-wrap:wrap; gap:0; margin:0 0 20px;
    border:1px solid var(--rule); background:var(--surface);
  }
  .hud > div{padding:9px 14px; border-right:1px solid var(--rule); flex:1 1 auto}
  .hud > div:last-child{border-right:0}
  .hud dt{
    font-size:9.5px; letter-spacing:.12em; text-transform:uppercase;
    color:var(--ink-faint); margin:0 0 3px;
  }
  .hud dd{margin:0; font-size:16px; font-variant-numeric:tabular-nums; color:var(--ink)}

  /* ── cenas ─────────────────────────────────── */
  .scenes{display:flex; flex-direction:column; gap:2px}
  .scene{
    background:var(--surface); padding:16px 18px 18px;
    border-left:4px solid var(--rule);
  }
  .scene.boomer{border-left-color:var(--boomer)}
  .scene.kev{border-left-color:var(--kev)}

  .scene-head{
    display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:10px;
  }
  .num{
    font-size:12px; color:var(--ink-faint); font-variant-numeric:tabular-nums;
  }
  .who{
    font-size:12px; letter-spacing:.16em; text-transform:uppercase; font-weight:700;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  }
  .boomer .who{color:var(--boomer)}
  .kev .who{color:var(--kev)}
  .meta{
    font-size:11px; color:var(--ink-faint); margin-left:auto; text-align:right;
  }
  .line{
    margin:0; font-size:19px; line-height:1.5; max-width:60ch; text-wrap:pretty;
  }
  .action{
    margin:10px 0 0; font-size:13.5px; color:var(--ink-dim);
    font-style:italic; max-width:60ch;
  }

  footer{
    border-top:1px solid var(--rule); margin-top:24px; padding-top:24px;
    color:var(--ink-faint); font-size:13.5px; max-width:78ch;
  }
  footer p{margin:0 0 8px}
  code{
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.9em;
    background:var(--surface-2); padding:1px 5px; color:var(--ink-dim);
  }
</style>

<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">Boomer &amp; Kev Studio · A/B de modelo · 07 ago 2026</p>
    <h1>Oito roteiros, quatro temas, dois modelos</h1>
    <p class="standfirst">
      Gerados pela rota <code>/api/ai/script</code> depois da migração do Gemini para Claude
      com structured outputs. Custo total: <strong>US$&nbsp;0,26</strong>.
      O gabarito já foi revelado — cada coluna traz o modelo no topo.
    </p>
    <div class="caveat">
      <p><strong>Isto não decide nada.</strong> São quatro pares de amostras, um tema cada.
      Não existe medição de retenção porque não existe episódio publicado.</p>
      <p>Três dos quatro temas vêm <em>hardcoded</em> em
      <code>trend-hunter/route.ts:25-29</code>, com &ldquo;viral score&rdquo; digitado à mão.
      Não são tendências reais.</p>
    </div>
  </header>

  ${body}

  <footer>
    <p>Ordem das colunas fixa (Sonnet à esquerda, Opus à direita) — na geração original
    a ordem foi sorteada por tema para o julgamento ser cego.</p>
    <p>Cores: laranja = Boomer (rim light quente), azul-frio = Kev (soft-box difuso).
    Ambas derivadas do <code>lightingKey</code> de cada personagem em <code>characters.ts</code>.</p>
  </footer>
</div>`;

fs.writeFileSync(`${DIR}/roteiros.html`, html);
console.log('gerado:', html.length, 'bytes');
