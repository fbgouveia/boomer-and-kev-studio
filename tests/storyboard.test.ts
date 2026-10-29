import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isTwoShot, keyframeAnchor, keyframePrompt, storyboardApproved } from '../src/lib/storyboard';

const wideBoomer = { characterId: 'boomer', shotType: 'WIDE', action: 'leans in', emotion: 'EXCITED' };
const kevCu = { characterId: 'kev', shotType: 'KEV_CU', action: 'slow blink', emotion: 'DEADPAN' };

describe('storyboard — quadro-chave nativo por formato', () => {
  it('9:16 nunca é two-shot e ancora na master do personagem', () => {
    assert.equal(isTwoShot(wideBoomer, '9:16'), false);
    assert.equal(keyframeAnchor(wideBoomer, '9:16'), '/assets/master_boomer.png');
  });

  it('WIDE em 16:9 ancora no two-shot do estúdio', () => {
    assert.equal(keyframeAnchor(wideBoomer, '16:9'), '/assets/master_wide.png');
    assert.match(keyframePrompt(wideBoomer, '16:9'), /two-shot/);
  });

  it('9:16 exige cabeça e orelhas inteiras, sozinho no quadro', () => {
    const p = keyframePrompt(kevCu, '9:16');
    assert.match(p, /Kev ALONE/);
    assert.match(p, /both ears fully inside the frame/);
  });

  it('proíbe marca real, texto e roupa adicionada', () => {
    const p = keyframePrompt(kevCu, '16:9');
    assert.match(p, /no brand logos/);
    assert.match(p, /Do not add clothing/);
  });

  it('render só libera com todas as cenas aprovadas no formato escolhido', () => {
    const ok = { keyframes: { '9:16': { url: '/a.jpg', approved: true } } };
    const draft = { keyframes: { '9:16': { url: '/b.jpg', approved: false } } };
    assert.equal(storyboardApproved([ok, ok], '9:16'), true);
    assert.equal(storyboardApproved([ok, draft], '9:16'), false);
    assert.equal(storyboardApproved([ok], '16:9'), false);
    assert.equal(storyboardApproved([], '9:16'), false);
  });
});
