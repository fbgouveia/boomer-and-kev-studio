import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { buildCoverPrompt, buildCoverVariations, coverAnchor, type CoverSpec } from '../src/lib/cover-prompt';

const base: CoverSpec = {
  type: 'reaction',
  characterId: 'boomer',
  aspect: '9:16',
  topic: 'Oat milk banned in Australia',
};

describe('buildCoverPrompt — regras que são restrição técnica, não estilo', () => {
  test('proíbe texto na imagem: a IA escreve letra deformada, o título entra depois', () => {
    for (const aspect of ['9:16', '16:9'] as const) {
      const p = buildCoverPrompt({ ...base, aspect });
      assert.match(p, /no text/, 'falta o negativo de texto');
      assert.match(p, /no letters/);
      assert.match(p, /no watermark/);
      assert.match(p, /never through written words/, 'não proíbe transmitir o tema por escrito');
    }
  });

  test('reserva espaço negativo para o título, no lado certo de cada formato', () => {
    assert.match(buildCoverPrompt({ ...base, aspect: '9:16' }), /lower third .* negative space/);
    assert.match(buildCoverPrompt({ ...base, aspect: '16:9' }), /left third .* negative space/);
  });

  test('descreve o personagem a partir de characters.ts, nunca do zero', () => {
    const p = buildCoverPrompt(base);
    assert.match(p, /anthropomorphic muscular kangaroo/, 'perdeu o imagePromptContext do Boomer');
    assert.match(p, /boxing gloves/i, 'perdeu o figurino canônico');
  });

  test('não repete palavra nem pontuação ao concatenar os campos do personagem', () => {
    // O output real trazia "Wearing Wearing ..." e ".." — defeito que só apareceu
    // imprimindo o prompt, nao nos asserts de presenca. Achado 31/07.
    const specs: CoverSpec[] = [];
    for (const id of ['boomer', 'kev']) {
      for (const aspect of ['9:16', '16:9'] as const) {
        specs.push({ ...base, characterId: id, aspect });
        specs.push({ ...base, characterId: id, aspect, type: 'versus', opponentId: id === 'boomer' ? 'kev' : 'boomer' });
      }
    }
    for (const spec of specs) {
      {
        const id = `${spec.characterId}/${spec.type}`;
        const aspect = spec.aspect;
        const p = buildCoverPrompt(spec);
        assert.doesNotMatch(p, /\bWearing Wearing\b/, `${id}/${aspect}: "Wearing" duplicado`);
        assert.doesNotMatch(p, /\.\./, `${id}/${aspect}: pontuação duplicada`);
        assert.doesNotMatch(p, /\b(\w+) \1\b/i, `${id}/${aspect}: palavra repetida em sequência`);
      }
    }
  });

  test('o tema entra como contexto de cena, não como legenda', () => {
    const p = buildCoverPrompt({ ...base, topic: 'Oat milk banned in Australia' });
    assert.match(p, /Oat milk banned in Australia/);
    assert.match(p, /props and set dressing ONLY/);
  });
});

describe('buildCoverPrompt — coerência entre tipo, formato e âncora', () => {
  test('reaction proíbe o segundo personagem (mesmo bug que quebrou o vídeo)', () => {
    const p = buildCoverPrompt(base);
    assert.match(p, /Only ONE host in frame/);
    assert.doesNotMatch(p, /SECOND HOST/);
  });

  test('versus em 9:16 empilha — split lado a lado não cabe em vertical', () => {
    const v: CoverSpec = { ...base, type: 'versus', opponentId: 'kev' };
    assert.match(buildCoverPrompt({ ...v, aspect: '9:16' }), /stacked split/);
    assert.match(buildCoverPrompt({ ...v, aspect: '16:9' }), /split screen/);
  });

  test('versus exige dois personagens, e distintos', () => {
    assert.throws(() => buildCoverPrompt({ ...base, type: 'versus' }), /opponentId/);
    assert.throws(
      () => buildCoverPrompt({ ...base, type: 'versus', opponentId: 'boomer' }),
      /diferentes/,
    );
  });

  test('versus nomeia o segundo e proíbe duplicar o primeiro', () => {
    const p = buildCoverPrompt({ ...base, type: 'versus', opponentId: 'kev' });
    assert.match(p, /anthropomorphic cute koala/, 'perdeu o DNA visual do Kev');
    assert.match(p, /never a duplicate of the same character/);
  });

  test('a âncora acompanha o tipo: solo usa a do personagem, versus usa o two-shot', () => {
    assert.equal(coverAnchor(base), '/assets/master_boomer.png');
    assert.equal(coverAnchor({ ...base, characterId: 'kev' }), '/assets/master_kev.png');
    assert.equal(coverAnchor({ ...base, type: 'versus', opponentId: 'kev' }), '/assets/master_wide.png');
  });

  test('personagem inexistente falha alto, não gera capa genérica', () => {
    assert.throws(() => buildCoverPrompt({ ...base, characterId: 'ninguem' }), /desconhecido/);
  });
});

describe('buildCoverVariations — passo 4 do workflow (gerar várias, escolher depois)', () => {
  test('produz N variações distintas entre si', () => {
    const vs = buildCoverVariations(base, 4);
    assert.equal(vs.length, 4);
    assert.equal(new Set(vs).size, 4, 'variações repetidas não servem para escolher');
  });

  test('toda variação mantém as regras invioláveis', () => {
    for (const p of buildCoverVariations(base, 6)) {
      assert.match(p, /no text/);
      assert.match(p, /negative space/);
      assert.match(p, /anthropomorphic muscular kangaroo/);
    }
  });

  test('count fora de faixa não quebra nem devolve vazio', () => {
    assert.ok(buildCoverVariations(base, 0).length >= 1);
    assert.ok(buildCoverVariations(base, 99).length <= 6);
  });
});

// ── Fronteira de segurança da âncora ─────────────────────────────────────────
// `anchorAsset` vem do cliente e vira leitura de disco no servidor.

import { imageSchema, anchorPart } from '../src/app/api/ai/image/route';

describe('imageSchema.anchorAsset — não pode virar leitura arbitrária de disco', () => {
  test('aceita âncoras legítimas sob /assets', () => {
    for (const ok of ['/assets/master_boomer.png', '/assets/master_wide.png', '/assets/branding/x.jpg']) {
      assert.ok(imageSchema.safeParse({ prompt: 'x', anchorAsset: ok }).success, `rejeitou ${ok}`);
    }
  });

  test('rejeita traversal, caminho absoluto e extensão executável', () => {
    const ataques = [
      '/assets/../../../../etc/passwd',
      '/assets/../.env',
      '/etc/passwd',
      '../../.env',
      '/assets/x.png/../../../.env',
      'file:///etc/passwd',
      '/assets/payload.svg',
      '/assets/payload.sh',
      // Este casava com o regex original: traversal COM extensao de imagem.
      '/assets/../../etc/passwd.png',
      '/assets/a/../../../../root/.ssh/id_rsa.png',
    ];
    for (const a of ataques) {
      assert.equal(imageSchema.safeParse({ prompt: 'x', anchorAsset: a }).success, false, `ACEITOU ${a}`);
    }
  });

  test('9:16 agora é formato válido (faltava, bloqueava capa vertical)', () => {
    for (const r of ['9:16', '16:9', '4:3', '1:1']) {
      assert.ok(imageSchema.safeParse({ prompt: 'x', aspectRatio: r }).success, `rejeitou ${r}`);
    }
    assert.equal(imageSchema.safeParse({ prompt: 'x', aspectRatio: '3:2' }).success, false);
  });
});

describe('anchorPart — camada que realmente le o disco', () => {
  test('devolve inlineData para ancora legitima', async () => {
    const part = await anchorPart('/assets/master_boomer.png');
    assert.ok(part, 'nao leu a ancora real');
    assert.equal(part!.inlineData.mimeType, 'image/png');
    assert.ok(part!.inlineData.data.length > 1000, 'base64 vazio ou truncado');
  });

  test('recusa caminho que escapa de public/assets, mesmo se o regex deixasse passar', async () => {
    for (const evil of ['/assets/../../etc/passwd.png', '/assets/../.env.png', '/../../etc/hosts.png']) {
      assert.equal(await anchorPart(evil), null, `LEU ${evil}`);
    }
  });

  test('ancora inexistente degrada para null, nao derruba a geracao', async () => {
    assert.equal(await anchorPart('/assets/nao_existe_xyz.png'), null);
  });

  test('sem ancora devolve null', async () => {
    assert.equal(await anchorPart(undefined), null);
  });
});
