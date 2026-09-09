import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runPipelineSchema } from '@/lib/validations';

const validScript = [
    {
        id: 'scene-1',
        characterId: 'boomer',
        text: 'Fair dinkum mates!',
        shotType: 'WIDE',
        action: 'Shadow boxing towards the camera',
        emotion: 'Explosive',
        durationEst: 4,
    },
    {
        id: 'scene-2',
        characterId: 'kev',
        text: 'Yeah, nah. Keep it moving.',
        shotType: 'KEV_CU',
        action: 'Chewing gum leaf calmly',
        emotion: 'Deadpan',
        durationEst: 3,
    },
] as const;

describe('runPipelineSchema — Formato e Checkpoint (BK-04 & BK-05)', () => {
    it('aplica aspect 9:16 como padrão quando omitido', () => {
        const result = runPipelineSchema.parse({
            script: [...validScript],
        });
        assert.equal(result.aspect, '9:16');
        assert.equal(result.engine, 'kling');
        assert.equal(result.resumeJobId, undefined);
    });

    it('voiceMode: kling_native é o padrão (régua BK-18) e elevenlabs é aceito', () => {
        const native = runPipelineSchema.parse({ script: [...validScript] });
        assert.equal(native.voiceMode, 'kling_native');
        const legacy = runPipelineSchema.parse({ script: [...validScript], voiceMode: 'elevenlabs' });
        assert.equal(legacy.voiceMode, 'elevenlabs');
        const invalid = runPipelineSchema.safeParse({ script: [...validScript], voiceMode: 'parrot' });
        assert.equal(invalid.success, false);
    });

    it('aceita aspecto 16:9 explicitamente', () => {
        const result = runPipelineSchema.parse({
            script: [...validScript],
            aspect: '16:9',
        });
        assert.equal(result.aspect, '16:9');
    });

    it('rejeita formato de aspecto não suportado (ex: 4:3 ou 1:1)', () => {
        const result = runPipelineSchema.safeParse({
            script: [...validScript],
            aspect: '4:3',
        });
        assert.equal(result.success, false);
    });

    it('aceita resumeJobId quando é um UUID válido', () => {
        const validUuid = '123e4567-e89b-42d3-a456-426614174000';
        const result = runPipelineSchema.parse({
            script: [...validScript],
            resumeJobId: validUuid,
        });
        assert.equal(result.resumeJobId, validUuid);
    });

    it('rejeita resumeJobId quando não é UUID (previne injeção e path traversal)', () => {
        const invalidJobIds = ['../../escape', '12345', 'not-a-uuid', ''];
        for (const badId of invalidJobIds) {
            const result = runPipelineSchema.safeParse({
                script: [...validScript],
                resumeJobId: badId,
            });
            assert.equal(result.success, false);
        }
    });

    it('rejeita duas cenas com o mesmo ID antes de qualquer chamada a provedor (BK-16)', () => {
        const result = runPipelineSchema.safeParse({
            script: [validScript[0], { ...validScript[1], id: 'scene-1' }],
        });
        assert.equal(result.success, false);
    });

    it('preserva characterReference e studioReference (não descarta referência da interface)', () => {
        const result = runPipelineSchema.parse({
            script: [
                { ...validScript[0], characterReference: '/assets/custom_boomer.png', studioReference: '/assets/guide.png' },
                validScript[1],
            ],
        });
        assert.equal(result.script[0].characterReference, '/assets/custom_boomer.png');
        assert.equal(result.script[0].studioReference, '/assets/guide.png');
    });

    it('converte referência vazia em undefined em vez de caminho vazio', () => {
        const result = runPipelineSchema.parse({
            script: [{ ...validScript[0], characterReference: '   ', studioReference: '' }, validScript[1]],
        });
        assert.equal(result.script[0].characterReference, undefined);
        assert.equal(result.script[0].studioReference, undefined);
    });

    it('aceita voiceIds override por personagem', () => {
        const result = runPipelineSchema.parse({
            script: [...validScript],
            voiceIds: { boomer: 'IKne3meq5aSn9XLyUdCD', kev: '' },
        });
        assert.equal(result.voiceIds?.boomer, 'IKne3meq5aSn9XLyUdCD');
        assert.equal(result.voiceIds?.kev, undefined);
    });
});
