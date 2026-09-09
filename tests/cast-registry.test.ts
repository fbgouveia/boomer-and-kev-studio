import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    isRegisteredCharacter,
    registerCharacter,
    registeredCharacterIds,
    resolveCharacter,
    type CharacterPack,
} from '../src/lib/cast-registry';
import { CHARACTERS } from '../src/data/characters';
import { runPipelineSchema, voiceSchema } from '../src/lib/validations';
import { getDetailedPrompt } from '../src/app/api/pipeline/run/route';

describe('cast-registry — elenco como dado, não código (BK-19 inc. 1)', () => {
    it('elenco canônico registrado: boomer e kev resolvem para os MESMOS objetos de CHARACTERS', () => {
        assert.deepEqual(registeredCharacterIds(), ['boomer', 'kev']);
        assert.equal(resolveCharacter('boomer'), CHARACTERS[0]);
        assert.equal(resolveCharacter('kev'), CHARACTERS[1]);
    });

    it('recusa id inválido e id duplicado', () => {
        assert.throws(
            () => registerCharacter({ ...CHARACTERS[0], id: 'BAD ID!' } as CharacterPack),
            /Invalid character pack id/,
        );
        assert.throws(
            () => registerCharacter({ ...CHARACTERS[0], id: 'boomer' }),
            /already registered/,
        );
    });

    it('aceite BK-19: novo elenco opera SEM editar engine (schema + prompt)', () => {
        const rooSolo: CharacterPack = {
            ...CHARACTERS[0],
            id: 'roo_solo',
            name: 'Roo Solo',
            actingStyle: 'deadpan',
            visualDescription: 'A solitary wombat engineer with safety goggles and a clipboard.',
            imagePromptContext: 'anthropomorphic wombat engineer, safety goggles, clipboard, acting exactly like a human podcast host',
            defaultOutfit: 'Wearing a high-vis vest over natural fur.',
        };
        registerCharacter(rooSolo);

        // Schema aceita o novo personagem sem nenhuma alteração de código:
        const parsed = runPipelineSchema.parse({
            script: [{
                id: 'scene-1',
                characterId: 'roo_solo',
                text: 'Quiet day in the outback.',
                shotType: 'KEV_CU',
                action: 'Stares at the horizon',
                emotion: 'Deadpan',
                durationEst: 5,
            }],
        });
        assert.equal(parsed.script[0].characterId, 'roo_solo');

        // Prompt engine usa o DNA e a direção de atuação DO PACK (não de id cravado):
        const prompt = getDetailedPrompt(parsed.script[0], 'Test', '', 0, undefined, '9:16');
        assert.match(prompt, /anthropomorphic wombat engineer/);        // DNA do pack
        assert.match(prompt, /high-vis vest/);                          // figurino do pack
        assert.match(prompt, /deadpan low-energy/);                     // actingStyle do pack
        assert.doesNotMatch(prompt, /BOOMER written on the chest/);     // nada do Boomer vaza
        assert.doesNotMatch(prompt, /hyper-active muscle tension/);     // atuação não é a do id antigo

        // voiceSchema também aceita:
        const voice = voiceSchema.parse({ text: 'oi', characterId: 'roo_solo' });
        assert.equal(voice.characterId, 'roo_solo');
    });

    it('personagem não registrado é rejeitado pelo schema', () => {
        const result = runPipelineSchema.safeParse({
            script: [{
                id: 'scene-1',
                characterId: 'whoever_cat',
                text: 'x',
                shotType: 'KEV_CU',
                action: 'x',
                emotion: 'Calm',
                durationEst: 5,
            }],
        });
        assert.equal(result.success, false);
        assert.ok(isRegisteredCharacter('boomer'));
    });
});
