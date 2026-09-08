import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';
import { buildEditingPlan, klingDurationForAudio } from '../src/lib/editing-policy';

const episode = [
  { characterId: 'boomer', emotion: 'EXCITED' },
  { characterId: 'kev', emotion: 'DEADPAN' },
  { characterId: 'boomer', emotion: 'CONFUSED' },
  { characterId: 'boomer', emotion: 'INTENSE' },
  { characterId: 'kev', emotion: 'DEADPAN' },
  { characterId: 'boomer', emotion: 'ANGRY' },
  { characterId: 'kev', emotion: 'SARCASTIC' },
  { characterId: 'boomer', emotion: 'EXCITED' },
];

describe('buildEditingPlan — constituição de edição e retenção', () => {
  test('mapeia o roteiro de oito cenas para beats narrativos explícitos', () => {
    assert.deepEqual(buildEditingPlan(episode).beats, [
      'hook',
      'setup',
      'development',
      'sponsor',
      'sponsor',
      'climax',
      'climax',
      'payoff',
    ]);
  });

  test('marca mudança de bloco e mantém cortes discretos dentro do bloco', () => {
    const plan = buildEditingPlan(episode);
    assert.deepEqual(plan.transitions[2], { type: 'fadeblack', dur: 0.5 });
    assert.deepEqual(plan.transitions[4], { type: 'fadeblack', dur: 0.5 });
    assert.deepEqual(plan.transitions[3], { type: 'fade', dur: 0.35 });
  });

  test('posiciona SFX por beat narrativo, não por percentual da duração', () => {
    assert.deepEqual(buildEditingPlan(episode).comedyCues, {
      drumsSceneIndex: 4,
      laughSceneIndex: 6,
    });
  });

  test('preserva deadpan como contraste em vez de tratá-lo como intensidade', () => {
    const plan = buildEditingPlan([
      { characterId: 'boomer', emotion: 'EXCITED' },
      { characterId: 'kev', emotion: 'DEADPAN' },
    ]);
    assert.deepEqual(plan.transitions[0], { type: 'fade', dur: 0.35 });
  });

  test('aceita roteiros menores sem inventar sponsor break', () => {
    const plan = buildEditingPlan([
      { characterId: 'boomer', emotion: 'EXCITED' },
      { characterId: 'kev', emotion: 'DEADPAN' },
      { characterId: 'boomer', emotion: 'SHOCKED' },
    ]);
    assert.deepEqual(plan.beats, ['hook', 'climax', 'payoff']);
    assert.equal(plan.transitions.length, 2);
  });

  test('rejeita roteiro vazio', () => {
    assert.throws(() => buildEditingPlan([]), /pelo menos uma cena/);
  });
});

describe('klingDurationForAudio — fala inteira (BK-16)', () => {
  it('áudio dentro de 5s mantém clipe de 5s', () => {
    assert.equal(klingDurationForAudio(4.2, 5), 5);
    assert.equal(klingDurationForAudio(5, 5), 5);
  });

  it('áudio maior que 5s pede clipe de 10s (não trunca no mux)', () => {
    assert.equal(klingDurationForAudio(5.2, 5), 10);
    assert.equal(klingDurationForAudio(9.9, 5), 10);
  });

  it('sem medição (checkpoint legado) cai na estimativa do roteiro', () => {
    assert.equal(klingDurationForAudio(undefined, 10), 10);
    assert.equal(klingDurationForAudio(0, 5), 5);
    assert.equal(klingDurationForAudio(NaN, 5), 5);
  });
});
