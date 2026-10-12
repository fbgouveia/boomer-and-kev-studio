import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertBalanced, assertRuntime, decideLoop, ScriptGateError } from '@/lib/script-gates';

const line = (characterId: string, durationEst = 5) => ({ characterId, durationEst });

describe('script gates', () => {
    it('aceita duo equilibrado e rejeita monólogo (episódio 5x1 de 19/07)', () => {
        assert.doesNotThrow(() => assertBalanced(['boomer', 'kev', 'boomer', 'kev'].map(c => line(c))));
        assert.throws(
            () => assertBalanced(['boomer', 'boomer', 'boomer', 'boomer', 'boomer', 'kev'].map(c => line(c))),
            (e: unknown) => e instanceof ScriptGateError && e.gate === 'SCRIPT_BALANCE',
        );
    });

    it('exige mínimo 3 por personagem a partir de 8 cenas', () => {
        const sixTwo = [...Array(6).fill('boomer'), 'kev', 'kev'].map(c => line(c));
        assert.throws(() => assertBalanced(sixTwo), /SCRIPT_BALANCE/);
    });

    it('rejeita roteiro vazio como forma inválida', () => {
        assert.throws(() => assertBalanced([]), /SCRIPT_SHAPE/);
    });

    it('trava por duração total, não por número de cenas', () => {
        assert.equal(assertRuntime(Array(10).fill(0).map(() => line('kev', 8))), 80);
        assert.throws(() => assertRuntime(Array(12).fill(0).map(() => line('kev', 8))), /SCRIPT_RUNTIME/);
    });

    it('veredito do juiz só vale no contrato estruturado', () => {
        assert.equal(decideLoop({ verdict: 'PASS', reason: 'closes the loop' }), 'PASS');
        assert.equal(decideLoop({ verdict: 'FAIL', reason: 'no payoff' }), 'FAIL');
        // Antes: texto contendo PASS e FAIL caía no ramo PASS.
        assert.equal(decideLoop({ verdict: 'PASS or FAIL' }), 'UNJUDGED');
        assert.equal(decideLoop(null), 'UNJUDGED');
        assert.equal(decideLoop('PASS'), 'UNJUDGED');
    });
});
