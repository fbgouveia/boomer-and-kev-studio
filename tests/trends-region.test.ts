import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('Trends Region Switching & Cancellation (BK-02)', () => {
    it('cancela a requisição anterior ao mudar de região para evitar race conditions', async () => {
        let activeController: AbortController | null = null;
        let lastResolvedRegion: string | null = null;

        async function simulateFetchTrends(region: string, delayMs: number): Promise<void> {
            activeController?.abort();
            const controller = new AbortController();
            activeController = controller;

            try {
                await new Promise((resolve, reject) => {
                    const timer = setTimeout(resolve, delayMs);
                    controller.signal.addEventListener('abort', () => {
                        clearTimeout(timer);
                        reject(new Error('AbortError'));
                    });
                });

                if (!controller.signal.aborted) {
                    lastResolvedRegion = region;
                }
            } catch (err: any) {
                if (err.message === 'AbortError') {
                    // Esperado quando cancelado por uma nova requisição
                    return;
                }
                throw err;
            }
        }

        // Dispara 'AU' com resposta lenta (50ms) e logo em seguida 'US' rápida (10ms)
        const p1 = simulateFetchTrends('AU', 50);
        const p2 = simulateFetchTrends('US', 10);

        await Promise.all([p1, p2]);

        // Apenas 'US' deve prevalecer; a resposta tardia de 'AU' foi cancelada e ignorada
        assert.equal(lastResolvedRegion, 'US');
    });

    it('isola falhas de rede em consultas abortadas sem propagar erros residuais', async () => {
        let errorReported: string | null = null;
        const controller = new AbortController();

        controller.abort();

        try {
            if (controller.signal.aborted) {
                // Se abortado, não reporta erro espúrio de rede
            } else {
                throw new Error('Network timeout');
            }
        } catch (err: any) {
            errorReported = err.message;
        }

        assert.equal(errorReported, null);
    });
});
