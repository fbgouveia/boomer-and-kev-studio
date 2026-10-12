import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { balanceSchema } from '@/lib/validations';

// renderSchema/voiceSchema saíram com /api/render e /api/ai/voice (arquivadas em
// 12/10/2026). A validação do pipeline vivo está em pipeline-checkpoint e cast-registry.
describe('balanceSchema', () => {
    it('rejeita chaves vazias ou excessivas', () => {
        assert.equal(balanceSchema.safeParse({ replicate: 'token' }).success, true);
        assert.equal(balanceSchema.safeParse({ replicate: '   ' }).success, false);
        assert.equal(balanceSchema.safeParse({ elevenlabs: 'x'.repeat(513) }).success, false);
    });
});
