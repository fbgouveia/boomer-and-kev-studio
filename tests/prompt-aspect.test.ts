import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { getDetailedPrompt, anchorCropFilter } from '../src/app/api/pipeline/run/route';

// Achado 30/07: em 9:16 a âncora enviada ao Kling é SOLO (two-shot lado-a-lado não cabe em
// vertical), mas o prompt continuava pedindo o plano aberto com os DOIS personagens. O Kling
// então inventava o segundo sem referência nenhuma — infidelidade de personagem.

const wideLine = {
  id: 's1',
  characterId: 'boomer',
  text: 'Oat milk is a crime against this nation.',
  shotType: 'WIDE',
  action: 'slams the desk',
  emotion: 'FURIOUS',
  durationEst: 5,
};

describe('getDetailedPrompt — coerência entre formato e âncora', () => {
  test('9:16 não pede dois personagens em planos que ancoram solo', () => {
    for (const shotType of ['WIDE', 'OTS_BOOMER', 'GOPRO_FISHEYE']) {
      const prompt = getDetailedPrompt({ ...wideLine, shotType }, 'Oat milk ban', '', 0, undefined, '9:16');
      assert.match(prompt, /vertical solo framing/, `${shotType}: falta a diretiva de solo vertical`);
      assert.match(prompt, /no second host in frame/, `${shotType}: nao proibe o segundo personagem`);
      assert.doesNotMatch(prompt, /Shows both characters|both characters and the studio/i,
        `${shotType}: ainda pede os DOIS personagens com ancora solo`);
      assert.doesNotMatch(prompt, /over Kev's shoulder/i,
        `${shotType}: regra de OTS exige os dois em quadro`);
    }
  });

  test('16:9 preserva o plano aberto original (a âncora ali é o two-shot)', () => {
    const prompt = getDetailedPrompt(wideLine, 'Oat milk ban', '', 0, undefined, '16:9');
    assert.match(prompt, /deep depth of field/, 'perdeu a regra cinematográfica do WIDE');
    assert.doesNotMatch(prompt, /vertical solo framing/, 'nao deveria forcar solo em 16:9');
  });

  test('--ar acompanha o formato escolhido, não fica cravado', () => {
    assert.match(getDetailedPrompt(wideLine, 'x', '', 0, undefined, '16:9'), /--ar 16:9/);
    assert.match(getDetailedPrompt(wideLine, 'x', '', 0, undefined, '9:16'), /--ar 9:16/);
  });

  test('close-up de um personagem não é afetado pelo formato', () => {
    const kevCu = { ...wideLine, characterId: 'kev', shotType: 'KEV_CU' };
    for (const aspect of ['9:16', '16:9'] as const) {
      assert.doesNotMatch(getDetailedPrompt(kevCu, 'x', '', 0, undefined, aspect), /vertical solo framing/);
    }
  });
});

// ── Recorte da âncora ────────────────────────────────────────────────────────
// Achado 30/07: o recorte 16:9→9:16 era sempre centrado, mas o Kev está à direita
// na arte — metade do quadro virava TV e a orelha dele saía cortada.

describe('anchorCropFilter — recorte da âncora respeita onde o personagem está', () => {
  test('9:16 usa o foco do personagem, não o centro', () => {
    const kev = anchorCropFilter('9:16', 0.687);
    assert.match(kev, /iw\*0\.6870-ow\/2/, 'nao aplicou o foco do personagem');
    assert.notEqual(kev, anchorCropFilter('9:16', 0.5), 'foco 0.687 saiu igual ao centro');
  });

  test('sem foco declarado cai no centro (não regride quem já estava bom)', () => {
    assert.match(anchorCropFilter('9:16'), /iw\*0\.5000-ow\/2/);
  });

  test('foco nas bordas e valores inválidos não estouram a imagem', () => {
    for (const bad of [-3, 0, 1, 42, NaN, Infinity]) {
      const f = anchorCropFilter('9:16', bad);
      assert.match(f, /clip\(/, `focus ${bad}: perdeu o clamp`);
      const fx = Number(f.match(/iw\*([\d.]+)-ow/)![1]);
      assert.ok(fx >= 0 && fx <= 1, `focus ${bad} virou ${fx}, fora de 0..1`);
    }
  });

  test('16:9 não aplica foco horizontal (o two-shot ocupa a largura toda)', () => {
    assert.equal(anchorCropFilter('16:9', 0.687), anchorCropFilter('16:9', 0.5));
  });
});
