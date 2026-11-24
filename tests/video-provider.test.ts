import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    DEFAULT_HIGGSFIELD_MODEL,
    LEGACY_REPLICATE_MODEL,
    VideoProviderConfigError,
    resolveVideoProviderConfig,
} from '@/lib/video-provider';
import { immutablePipelineConfig, pipelineConfigHash, evaluateResume } from '@/lib/resume-policy';
import type { RunPipelineInput } from '@/lib/validations';
import crypto from 'node:crypto';

const baseData = {
    engine: 'kling' as const,
    aspect: '9:16' as const,
    voiceMode: 'kling_native' as const,
    script: [{
        id: 'scene1',
        characterId: 'boomer',
        text: 'Mate!',
        shotType: 'WIDE' as const,
        action: 'leans in',
        emotion: 'excited',
        durationEst: 5,
    }],
};

const minimalInput = baseData as unknown as Omit<RunPipelineInput, 'approval' | 'resumeJobId'>;

describe('resolveVideoProviderConfig — seleção por servidor', () => {
    it('vazio/ausente/replicate = legado (comportamento inalterado)', () => {
        assert.deepEqual(resolveVideoProviderConfig({}), { provider: 'replicate', model: LEGACY_REPLICATE_MODEL });
        assert.deepEqual(resolveVideoProviderConfig({ VIDEO_PROVIDER: '' }), { provider: 'replicate', model: LEGACY_REPLICATE_MODEL });
        assert.deepEqual(resolveVideoProviderConfig({ VIDEO_PROVIDER: 'replicate' }), { provider: 'replicate', model: LEGACY_REPLICATE_MODEL });
        assert.deepEqual(resolveVideoProviderConfig({ VIDEO_PROVIDER: '  Replicate ' }), { provider: 'replicate', model: LEGACY_REPLICATE_MODEL });
    });

    it('higgsfield com chave e modelo padrão do contrato', () => {
        const config = resolveVideoProviderConfig({ VIDEO_PROVIDER: 'higgsfield', HF_API_KEY: 'hf-demo-key' });
        assert.deepEqual(config, { provider: 'higgsfield', model: DEFAULT_HIGGSFIELD_MODEL });
    });

    it('higgsfield aceita modelo configurado no servidor', () => {
        const config = resolveVideoProviderConfig({
            VIDEO_PROVIDER: 'higgsfield',
            HF_API_KEY: 'hf-demo-key',
            HIGGSFIELD_MODEL: 'kling-video/v3.0/pro/image-to-video',
        });
        assert.equal(config.model, 'kling-video/v3.0/pro/image-to-video');
    });

    it('higgsfield SEM chave é erro explícito — nunca fallback pago ao Replicate', () => {
        assert.throws(
            () => resolveVideoProviderConfig({ VIDEO_PROVIDER: 'higgsfield' }),
            (error: unknown) => error instanceof VideoProviderConfigError
                && error.code === 'HIGGSFIELD_CREDENTIAL_MISSING',
        );
    });

    it('valor explícito inválido é rejeitado, não silenciado', () => {
        for (const bad of ['bedrock', 'HiggsfieldFake', 'replicate ']) {
            if (bad === 'replicate ') continue;
            assert.throws(
                () => resolveVideoProviderConfig({ VIDEO_PROVIDER: bad }),
                (error: unknown) => error instanceof VideoProviderConfigError
                    && error.code === 'VIDEO_PROVIDER_INVALID',
            );
        }
    });

    it('modelo Higgsfield com caracteres fora do padrão é rejeitado', () => {
        assert.throws(
            () => resolveVideoProviderConfig({
                VIDEO_PROVIDER: 'higgsfield',
                HF_API_KEY: 'k',
                HIGGSFIELD_MODEL: 'model with spaces',
            }),
            (error: unknown) => error instanceof VideoProviderConfigError
                && error.code === 'HIGGSFIELD_MODEL_INVALID',
        );
    });

    it('P0-6: outro modelo válido (fora do contrato do payload) é rejeitado, sem fallback', () => {
        for (const model of ['bytedance/seedance/v1/pro/image-to-video', 'kling-video/v2.1/pro/image-to-video']) {
            assert.throws(
                () => resolveVideoProviderConfig({ VIDEO_PROVIDER: 'higgsfield', HF_API_KEY: 'k', HIGGSFIELD_MODEL: model }),
                (error: unknown) => error instanceof VideoProviderConfigError && error.code === 'HIGGSFIELD_MODEL_INVALID',
            );
        }
    });
});

describe('pipelineConfigHash com provedor — compatibilidade de retomada', () => {
    const legacyHash = pipelineConfigHash(minimalInput);

    it('hash legado permanece byte-idêntico (immutablePipelineConfig puro)', () => {
        const expected = crypto
            .createHash('sha256')
            .update(JSON.stringify(immutablePipelineConfig(minimalInput)))
            .digest('hex');
        assert.equal(legacyHash, expected);
        // replicate explícito NÃO altera o hash legado (jobs antigos retomáveis).
        assert.equal(
            pipelineConfigHash(minimalInput, { provider: 'replicate', model: LEGACY_REPLICATE_MODEL }),
            legacyHash,
        );
    });

    it('higgsfield entra no hash com provedor e modelo congelados', () => {
        const hfHash = pipelineConfigHash(minimalInput, { provider: 'higgsfield', model: DEFAULT_HIGGSFIELD_MODEL });
        assert.notEqual(hfHash, legacyHash);
        assert.equal(
            pipelineConfigHash(minimalInput, { provider: 'higgsfield', model: DEFAULT_HIGGSFIELD_MODEL }),
            hfHash,
        );
        // Mudança de MODELO no Higgsfield muda o hash ⇒ conflito de retomada.
        assert.notEqual(
            pipelineConfigHash(minimalInput, { provider: 'higgsfield', model: 'other/model' }),
            hfHash,
        );
    });

    it('resume através de troca de provedor/modelo conflita', () => {
        const hfHash = pipelineConfigHash(minimalInput, { provider: 'higgsfield', model: DEFAULT_HIGGSFIELD_MODEL });
        // job legado (hash antigo) × servidor em higgsfield => conflito
        assert.deepEqual(
            evaluateResume({ configHash: legacyHash }, { configHash: hfHash }, { isRunActive: false }),
            { action: 'conflict', code: 'RESUME_CONFIG_CONFLICT' },
        );
        // job higgsfield × servidor de volta em replicate (hash legado) => conflito
        assert.deepEqual(
            evaluateResume({ configHash: hfHash }, { configHash: legacyHash }, { isRunActive: false }),
            { action: 'conflict', code: 'RESUME_CONFIG_CONFLICT' },
        );
        // mesmo provedor/modelo => takeover normal
        assert.deepEqual(
            evaluateResume({ configHash: hfHash }, { configHash: hfHash }, { isRunActive: false }),
            { action: 'takeover' },
        );
    });
});
