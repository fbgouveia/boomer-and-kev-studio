import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { balanceSchema, runPipelineSchema } from '@/lib/validations';

// renderSchema/voiceSchema saíram com /api/render e /api/ai/voice (arquivadas em
// 12/10/2026). A validação do pipeline vivo está em pipeline-checkpoint e cast-registry.
describe('balanceSchema', () => {
    it('rejeita chaves vazias ou excessivas', () => {
        assert.equal(balanceSchema.safeParse({ replicate: 'token' }).success, true);
        assert.equal(balanceSchema.safeParse({ replicate: '   ' }).success, false);
        assert.equal(balanceSchema.safeParse({ elevenlabs: 'x'.repeat(513) }).success, false);
    });
});

describe('runPipelineSchema — cliente nunca fornece credencial/modelo de Higgsfield', () => {
    const baseInput = {
        script: [{
            id: 'scene1',
            characterId: 'boomer',
            text: 'Mate, look at this',
            shotType: 'WIDE',
            action: 'leans into the microphone',
            emotion: 'excited',
            durationEst: 5,
        }],
    };

    it('campos desconhecidos do cliente (hfApiKey/videoProvider/higgsfieldModel) são descartados', () => {
        const parsed = runPipelineSchema.safeParse({
            ...baseInput,
            hfApiKey: 'hf-evil-injected-key',
            videoProvider: 'higgsfield',
            higgsfieldModel: 'evil/model',
        });
        assert.equal(parsed.success, true);
        if (parsed.success) {
            assert.equal('hfApiKey' in parsed.data, false);
            assert.equal('videoProvider' in parsed.data, false);
            assert.equal('higgsfieldModel' in parsed.data, false);
        }
    });
});
