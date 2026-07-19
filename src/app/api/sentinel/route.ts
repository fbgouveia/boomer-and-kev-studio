import { NextResponse } from 'next/server';

// Sondas de contrato lidas pela skill `deriva` (ver deriva.yml na raiz).
// Afirmam CONTEUDO, nao disponibilidade: "respondeu 200" nao e prova de saude.
// Barato o suficiente p/ rodar diariamente + pre-voo. NUNCA renderiza video.

type Probe = { id: string; status: 'GREEN' | 'RED'; detail: string; ms: number };

const SELF = `http://127.0.0.1:${process.env.PORT ?? 3000}`;
const KLING_MODEL = 'kwaivgi/kling-v2.6'; // mesmo modelo usado por /api/pipeline/run
const VOICE_BOOMER = 'IKne3meq5aSn9XLyUdCD'; // Charlie, ver src/data/characters.ts

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function run(id: string, fn: () => Promise<string>, timeoutMs = 90_000): Promise<Probe> {
  const t0 = Date.now();
  try {
    const detail = await Promise.race([
      fn(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timeout ${timeoutMs}ms`)), timeoutMs)),
    ]);
    return { id, status: 'GREEN', detail, ms: Date.now() - t0 };
  } catch (e) {
    return { id, status: 'RED', detail: e instanceof Error ? e.message : String(e), ms: Date.now() - t0 };
  }
}

// O roteirista tem que referenciar o topico recebido. Deriva ja vista em 19/07:
// workflow mandava `trend` onde a rota le `topic` -> roteiro generico com HTTP 200.
const probeRoteirista = () => run('gemini_roteirista', async () => {
  const res = await fetch(`${SELF}/api/ai/script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'Shark sighted at Bondi Beach', snippet: 'Beach closed after great white sighting' }),
  });
  // 404 no modelo => rodar `node find-model.js`; 403 => key sem acesso ao gemini-2.5-flash.
  // Dica herdada do antigo tools/verify_gemini.py, removido em 19/07.
  assert(res.ok, `HTTP ${res.status}${res.status === 404 ? ' — modelo sumiu? rodar `node find-model.js`' : ''}${res.status === 403 ? ' — key sem acesso ao gemini-2.5-flash' : ''}`);
  const script = await res.json();

  assert(Array.isArray(script), 'resposta nao e array');
  assert(script.length >= 4, `apenas ${script.length} cenas (minimo 4)`);

  for (const [i, s] of script.entries()) {
    for (const f of ['id', 'characterId', 'text', 'shotType', 'action', 'emotion']) {
      assert(typeof s?.[f] === 'string' && s[f].length > 0, `cena ${i}: campo '${f}' ausente/vazio`);
    }
    assert(typeof s.durationEst === 'number', `cena ${i}: durationEst nao e numero`);
  }

  const corpo = script.map((s: { text: string }) => s.text).join(' ');
  assert(/bondi|shark/i.test(corpo), 'roteiro NAO referencia o topico enviado (deriva silenciosa)');

  // WP 1.5: contrato de DUO — episodio 5x1 de 19/07 provou que o desequilibrio
  // e deriva silenciosa (Kev sumiu do video com HTTP 200 em tudo).
  const porPersonagem: Record<string, number> = {};
  for (const s of script) porPersonagem[s.characterId] = (porPersonagem[s.characterId] || 0) + 1;
  const minimo = script.length >= 8 ? 3 : 2;
  for (const c of ['boomer', 'kev']) {
    assert((porPersonagem[c] || 0) >= minimo,
      `desequilibrio de personagens: '${c}' com ${porPersonagem[c] || 0}/${script.length} cenas (minimo ${minimo}) — duo virou monologo`);
  }

  return `${script.length} cenas, topico referenciado, balanco boomer/kev ${porPersonagem['boomer']}/${porPersonagem['kev']}`;
});

const probeVoz = () => run('elevenlabs_voz', async () => {
  const key = process.env.ELEVENLABS_API_KEY;
  assert(key, 'ELEVENLABS_API_KEY ausente');

  // Contrato so e provado por TTS real: a key e escopada (sem user_read),
  // entao /v1/user devolve 401 mesmo com billing em dia.
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_BOOMER}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Contract check.', model_id: 'eleven_multilingual_v2' }),
  });
  // Ler o corpo so no caminho de erro: a mensagem do assert e avaliada ANTES
  // da checagem, entao um `await res.text()` inline consome o body sempre.
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  assert(res.headers.get('content-type')?.includes('audio'), `content-type inesperado: ${res.headers.get('content-type')}`);

  const bytes = (await res.arrayBuffer()).byteLength;
  assert(bytes > 5000, `audio pequeno demais (${bytes} bytes) - possivel fallback mudo`);

  return `${(bytes / 1024).toFixed(1)}KB de audio`;
});

// So checa acesso/schema. Renderizar custaria US$3-6 por sonda.
const probeKling = () => run('replicate_kling', async () => {
  const token = process.env.REPLICATE_API_TOKEN;
  assert(token, 'REPLICATE_API_TOKEN ausente');

  const res = await fetch(`https://api.replicate.com/v1/models/${KLING_MODEL}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // 403 = token com escopo restrito: nao lista modelos, mas AINDA cria predictions.
  // Tratar como vermelho cancelaria a producao todo dia por engano (falso positivo).
  // Conhecimento herdado do antigo tools/verify_replicate.py, removido em 19/07.
  if (res.status === 403) return `${KLING_MODEL}: escopo do token nao permite listar modelos — contrato NAO verificado (predictions provavelmente OK)`;

  assert(res.status !== 401, 'token invalido (401)');
  assert(res.ok, `HTTP ${res.status} ao acessar ${KLING_MODEL}`);

  const m = await res.json();
  assert(m?.latest_version?.id, 'modelo sem latest_version (schema mudou?)');

  return `${KLING_MODEL} acessivel, versao ${String(m.latest_version.id).slice(0, 12)}`;
});

// Contrato duplo: service_role GRAVA e anon NAO grava (RLS ativo).
const probeSupabase = () => run('supabase_sydney', async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && anon, 'URL/anon key ausentes');
  assert(srk, 'SUPABASE_SERVICE_ROLE_KEY ausente - pipeline nao consegue persistir');

  const ep = `${url}/rest/v1/episodes`;

  const ins = await fetch(ep, {
    method: 'POST',
    headers: { apikey: srk, Authorization: `Bearer ${srk}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ topic: '__deriva_sentinel__', status: 'draft' }),
  });
  assert(ins.ok, `service_role nao gravou: HTTP ${ins.status}`);
  const [row] = await ins.json();

  const del = await fetch(`${ep}?id=eq.${row.id}`, {
    method: 'DELETE',
    headers: { apikey: srk, Authorization: `Bearer ${srk}` },
  });
  assert(del.ok, `limpeza falhou: HTTP ${del.status} (linha ${row.id} ficou no banco)`);

  const anonIns = await fetch(ep, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: '__deriva_rls_check__', status: 'draft' }),
  });
  assert(!anonIns.ok, `FALHA DE SEGURANCA: anon conseguiu gravar (HTTP ${anonIns.status}) - RLS aberto`);

  return `escrita OK, RLS bloqueia anon (${anonIns.status})`;
});

export async function GET() {
  const probes = await Promise.all([probeRoteirista(), probeVoz(), probeKling(), probeSupabase()]);
  const status = probes.some((p) => p.status === 'RED') ? 'RED' : 'GREEN';

  return NextResponse.json(
    { project: 'boomer-kev', status, checkedAt: new Date().toISOString(), probes },
    { status: 200 }, // sempre 200: quem le decide. O corpo carrega o veredito.
  );
}
