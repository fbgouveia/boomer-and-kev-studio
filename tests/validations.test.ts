import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { balanceSchema, renderSchema, voiceSchema } from '@/lib/validations';

const validLine = {
    id: 'scene-1',
    characterId: 'boomer',
    text: 'Fair dinkum!',
    shotType: 'BOOMER_MCU',
    durationEst: 5,
    technicalPrompt: 'Boomer addresses the camera in the studio.',
} as const;

describe('renderSchema', () => {
    it('aceita uma cena válida e aplica Kling como engine padrão', () => {
        const result = renderSchema.parse({ script: [validLine] });
        assert.equal(result.engine, 'kling');
        assert.equal(result.script.length, 1);
    });

    it('rejeita lote vazio ou maior que 32 cenas', () => {
        assert.equal(renderSchema.safeParse({ script: [] }).success, false);
        assert.equal(renderSchema.safeParse({ script: Array.from({ length: 33 }, (_, index) => ({
            ...validLine,
            id: `scene-${index}`,
        })) }).success, false);
    });

    it('rejeita personagem, enquadramento e duração incompatíveis', () => {
        for (const invalidLine of [
            { ...validLine, characterId: 'intruder' },
            { ...validLine, shotType: 'UNSUPPORTED' },
            { ...validLine, durationEst: 0 },
            { ...validLine, durationEst: 11 },
            { ...validLine, durationEst: Number.POSITIVE_INFINITY },
        ]) {
            assert.equal(renderSchema.safeParse({ script: [invalidLine] }).success, false);
        }
    });

    it('rejeita campos essenciais vazios ou excessivos', () => {
        assert.equal(renderSchema.safeParse({ script: [{ ...validLine, text: '   ' }] }).success, false);
        assert.equal(renderSchema.safeParse({ script: [{ ...validLine, technicalPrompt: '' }] }).success, false);
        assert.equal(renderSchema.safeParse({
            script: [validLine],
            apiKeys: { replicate: 'x'.repeat(513) },
        }).success, false);
    });
});

describe('voiceSchema e balanceSchema', () => {
    it('aceitam apenas personagens conhecidos e texto não vazio', () => {
        assert.equal(voiceSchema.safeParse({ text: 'Hello', characterId: 'kev' }).success, true);
        assert.equal(voiceSchema.safeParse({ text: '   ', characterId: 'kev' }).success, false);
        assert.equal(voiceSchema.safeParse({ text: 'Hello', characterId: 'unknown' }).success, false);
        assert.equal(voiceSchema.safeParse({ text: 'x'.repeat(5001), characterId: 'boomer' }).success, false);
    });

    it('rejeita chaves vazias ou excessivas', () => {
        assert.equal(balanceSchema.safeParse({ replicate: 'token' }).success, true);
        assert.equal(balanceSchema.safeParse({ replicate: '   ' }).success, false);
        assert.equal(balanceSchema.safeParse({ elevenlabs: 'x'.repeat(513) }).success, false);
    });
});
