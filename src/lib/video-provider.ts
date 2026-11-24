// Seleção do provedor de vídeo pelo SERVIDOR (VIDEO_PROVIDER). O cliente JSON nunca
// fornece chave de Higgsfield nem escolhe o modelo confiável — o schema zod descarta
// campos desconhecidos e este módulo resolve tudo por ambiente.
// Padrão/ausente = replicate (comportamento legado intacto).
// Valor explícito inválido é REJEITADO (erro claro), nunca fallback silencioso:
// cair para o Replicate pagaria geração duplicada quando o operador escolheu HF.

export type VideoProviderName = 'replicate' | 'higgsfield';

export type FrozenVideoProviderConfig = {
    provider: VideoProviderName;
    model: string;
};

export const LEGACY_REPLICATE_MODEL = 'kwaivgi/kling-v2.6';
export const DEFAULT_HIGGSFIELD_MODEL = 'kling-video/v3.0/pro/image-to-video';

// O payload (higgsfield.ts) é específico deste contrato: nenhum outro modelo pago
// é aceito, nem por fallback silencioso.
export const SUPPORTED_HIGGSFIELD_MODELS: readonly string[] = [DEFAULT_HIGGSFIELD_MODEL];

export class VideoProviderConfigError extends Error {
    code: 'VIDEO_PROVIDER_INVALID' | 'HIGGSFIELD_CREDENTIAL_MISSING' | 'HIGGSFIELD_MODEL_INVALID';

    constructor(code: VideoProviderConfigError['code'], message: string) {
        super(message);
        this.name = 'VideoProviderConfigError';
        this.code = code;
    }
}

export function resolveVideoProviderConfig(
    env: Record<string, string | undefined> = process.env,
): FrozenVideoProviderConfig {
    const raw = (env.VIDEO_PROVIDER ?? '').trim().toLowerCase();

    if (raw === '' || raw === 'replicate') {
        return { provider: 'replicate', model: LEGACY_REPLICATE_MODEL };
    }

    if (raw === 'higgsfield') {
        const model = (env.HIGGSFIELD_MODEL ?? '').trim() || DEFAULT_HIGGSFIELD_MODEL;
        if (!SUPPORTED_HIGGSFIELD_MODELS.includes(model)) {
            throw new VideoProviderConfigError(
                'HIGGSFIELD_MODEL_INVALID',
                `HIGGSFIELD_MODEL inválido: "${model.slice(0, 128)}" (único suportado nesta fase: ${DEFAULT_HIGGSFIELD_MODEL})`,
            );
        }
        if (!(env.HF_API_KEY ?? '').trim()) {
            throw new VideoProviderConfigError(
                'HIGGSFIELD_CREDENTIAL_MISSING',
                'VIDEO_PROVIDER=higgsfield exige HF_API_KEY no servidor. Sem fallback para Replicate — fallback pagaria geração duplicada.',
            );
        }
        return { provider: 'higgsfield', model };
    }

    throw new VideoProviderConfigError(
        'VIDEO_PROVIDER_INVALID',
        `VIDEO_PROVIDER inválido: "${raw.slice(0, 64)}". Valores aceitos: replicate (padrão) ou higgsfield.`,
    );
}
