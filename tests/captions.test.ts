import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    buildAssSubtitles,
    CAPTION_HIGHLIGHT,
    type CaptionCue,
} from '../src/lib/captions';

const cues: CaptionCue[] = [
    { start: 0.1, end: 3, text: "G'day legends! Today we're talking about the FUTURE of AI!", keyword: 'FUTURE' },
    { start: 3.1, end: 6, text: 'Yeah, nah. Keep it moving, mate.' },
];

describe('buildAssSubtitles — spec canônica de legendas (BK-06)', () => {
    const ass = buildAssSubtitles(cues, 1080, 1920);

    it('usa contorno 3px e alignment bottom-center (2)', () => {
        const style = ass.split('\n').find(l => l.startsWith('Style:'));
        assert.ok(style, 'estilo ausente');
        assert.match(style!, /,1,3,0,2,/); // BorderStyle=1, Outline=3, Shadow=0, Alignment=2
        assert.match(style!, /,230,1$/, 'marginV de safe area 9:16');
    });

    it('destaca palavra-chave na cor de marca e volta ao branco', () => {
        assert.match(ass, new RegExp(String.raw`\{\\c${CAPTION_HIGHLIGHT}\}FUTURE\{\\c&HFFFFFF&\}`));
    });

    it('cue sem keyword fica todo branco', () => {
        assert.match(ass, /Keep it moving, mate\./);
        assert.doesNotMatch(ass, /\{\\c#FF5F1F\}Keep/);
    });

    it('escapa chaves e barras para não quebrar o parser ASS', () => {
        const hostile = buildAssSubtitles([{ start: 0, end: 1, text: 'C:\\path {x}'}], 1080, 1920);
        assert.match(hostile, /C:\\\\path \\\{x\\\}/);
    });

    it('cue inválido (fim antes do início ou vazio) é descartado', () => {
        const filtered = buildAssSubtitles([
            { start: 5, end: 2, text: 'invertido' },
            { start: 0, end: 1, text: '   ' },
            { start: 0, end: 1, text: 'válido' },
        ], 1080, 1920);
        assert.match(filtered, /válido/);
        assert.doesNotMatch(filtered, /invertido/);
    });

    it('timestamps no formato h:mm:ss.cc', () => {
        assert.match(ass, /0:00:00\.10,0:00:03\.00/);
    });
});
