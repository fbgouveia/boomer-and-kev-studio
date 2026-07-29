import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ScriptEngine } from '@/lib/script-engine';
import type { ScriptLine } from '@/types';

describe('ScriptEngine', () => {
    const originalRandom = Math.random;

    before(() => {
        Math.random = () => 0;
    });

    after(() => {
        Math.random = originalRandom;
    });

    it('gera oito cenas com IDs UUID únicos e equilíbrio máximo 5/3', () => {
        const script = ScriptEngine.generateInitialScript('A finals match');
        const ids = script.map(line => String(line.id));
        const counts = script.reduce<Record<string, number>>((total, line) => {
            const characterId = String(line.characterId);
            total[characterId] = (total[characterId] || 0) + 1;
            return total;
        }, {});

        assert.equal(script.length, 8);
        assert.equal(new Set(ids).size, 8);
        assert.ok(ids.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)));
        assert.ok((counts.boomer || 0) >= 3);
        assert.ok((counts.kev || 0) >= 3);
        assert.ok(script.every(line => line.status === 'IDLE'));
    });

    it('não confunde o fragmento "ai" de rainfall com a categoria TECH', () => {
        const [hook] = ScriptEngine.generateInitialScript('Australian rainfall warning');
        assert.match(String(hook.text), /man vs beast/i);
    });

    it('inicia por Boomer quando a lista atual está vazia', () => {
        const line = ScriptEngine.generateNextLine([], 'Housing costs');
        assert.equal(line.characterId, 'boomer');
        assert.equal(line.status, 'IDLE');
    });

    it('alterna o personagem a partir da última fala', () => {
        const boomer = { characterId: 'boomer' } as ScriptLine;
        const kev = { characterId: 'kev' } as ScriptLine;

        assert.equal(ScriptEngine.generateNextLine([boomer], 'AI software').characterId, 'kev');
        assert.equal(ScriptEngine.generateNextLine([kev], 'AI software').characterId, 'boomer');
    });
});
