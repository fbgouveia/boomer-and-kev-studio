import { CHARACTERS, type Character } from '@/data/characters';

// BK-19 (incremento 1) — elenco como dado, não código.
// Um CharacterPack é o contrato de um personagem homologado: identidade visual,
// atuação, voz, âncora e figurino. Novos elencos entram pelo registry SEM editar
// engine (schema, prompts e pipeline resolvem pelo registro).

export type CharacterPack = Character & {
    // Direção de atuação usada pelo prompt engine: 'hyper' = tensão muscular alta,
    // leaning agressivo; 'deadpan' = energia baixa, blinks pesados. Pack sem
    // actingStyle cai em 'hyper' (o tom padrão do programa).
    actingStyle?: 'hyper' | 'deadpan';
};

const registry = new Map<string, CharacterPack>();

const PACK_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function registerCharacter(pack: CharacterPack): void {
    if (!PACK_ID_PATTERN.test(pack.id)) {
        throw new Error(`Invalid character pack id: ${pack.id}`);
    }
    const existing = registry.get(pack.id);
    if (existing && existing !== pack) {
        throw new Error(`Character pack already registered: ${pack.id}`);
    }
    registry.set(pack.id, pack);
}

// Elenco canônico do programa. Os objetos são os MESMOS de CHARACTERS (identidade
// de referência preservada para quem ainda importa CHARACTERS direto).
for (const character of CHARACTERS) {
    registerCharacter(character as CharacterPack);
}

export function resolveCharacter(id: string): CharacterPack | undefined {
    return registry.get(id);
}

export function isRegisteredCharacter(id: string): boolean {
    return registry.has(id);
}

export function registeredCharacterIds(): string[] {
    return [...registry.keys()].sort();
}

// BK-19 inc.2: lista para a UI — ordem de registro (boomer/kev primeiro, packs
// novos na sequência). Chame uma vez na inicialização do módulo consumidor.
export function castList(): CharacterPack[] {
    return [...registry.values()];
}
