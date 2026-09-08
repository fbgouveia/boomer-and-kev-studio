// BK-06 — Renderizador de legendas burn-in (Operador de TP).
// Spec canônica (AGENTS.md, aprovada): fonte pesada, branco com contorno preto 3px,
// palavra-chave em #FF5F1F, centro-inferior em safe area mobile, pop-in curto.
// Formato: ASS (libass) — ffmpeg aplica com `-vf subtitles=path`.

export const CAPTION_FONT = 'Montserrat Black';
export const CAPTION_FONT_FALLBACK = 'Impact';
export const CAPTION_HIGHLIGHT = '#FF5F1F';

export type CaptionCue = {
  start: number;
  end: number;
  text: string;
  keyword?: string;
};

export type CaptionStyleOptions = {
  fontSize: number;
  marginV: number;
};

// Safe area mobile: margens laterais ~10% e inferior ~12% de 1080x1920.
export const CAPTION_DEFAULTS_9X16: CaptionStyleOptions = { fontSize: 64, marginV: 230 };

function assTimestamp(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\N');
}

// Destaca a palavra-chave na cor de marca; sem keyword, texto todo branco.
function cueDialogueText(cue: CaptionCue): string {
  const safe = escapeAssText(cue.text);
  if (!cue.keyword) return safe;
  const idx = cue.text.toUpperCase().indexOf(cue.keyword.toUpperCase());
  if (idx < 0) return safe;
  const prefix = escapeAssText(cue.text.slice(0, idx));
  const match = escapeAssText(cue.text.slice(idx, idx + cue.keyword.length));
  const suffix = escapeAssText(cue.text.slice(idx + cue.keyword.length));
  // ponytail: highlight via override tag inline — separar em karaoke temps é overkill aqui
  return `${prefix}{\\c${CAPTION_HIGHLIGHT}}${match}{\\c&HFFFFFF&}${suffix}`;
}

export function buildAssHeader(width: number, height: number, options: CaptionStyleOptions): string {
  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    'PlayResX: ' + width,
    'PlayResY: ' + height,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // Alignment 2 = bottom-center. Outline 3px + sombra 0 = spec (contorno preto 3px).
    `Style: Caption,${CAPTION_FONT},${options.fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,0,2,${Math.round(width * 0.1)},${Math.round(width * 0.1)},${options.marginV},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ].join('\n');
}

export function buildAssCues(cues: CaptionCue[]): string {
  return cues
    .filter(c => Number.isFinite(c.start) && Number.isFinite(c.end) && c.end > c.start && c.text.trim())
    .map(cue => `Dialogue: 0,${assTimestamp(cue.start)},${assTimestamp(cue.end)},Caption,,0,0,0,,${cueDialogueText(cue)}`)
    .join('\n');
}

// Gera o .ass completo para um episódio (PlayRes = destino do render).
export function buildAssSubtitles(
  cues: CaptionCue[],
  width: number,
  height: number,
  options: CaptionStyleOptions = height >= width ? CAPTION_DEFAULTS_9X16 : { fontSize: 44, marginV: 120 },
): string {
  return `${buildAssHeader(width, height, options)}\n${buildAssCues(cues)}\n`;
}
