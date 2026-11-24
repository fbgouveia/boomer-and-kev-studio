import React from 'react';
import { cn } from '@/lib/utils';

// Identity Lock — design aprovado por Felipe em 29/10 (design/rascunhos/engine-dna-identidade-v1).
export type Verdict = 'approved' | 'fix';

export const IDENTITY_AXES = [
  { id: 'boomer_face', label: 'Boomer face' },
  { id: 'kev_face', label: 'Kev face' },
  { id: 'outfit', label: 'Original outfit' },
  { id: 'boomer_voice', label: 'Boomer voice' },
  { id: 'kev_voice', label: 'Kev voice' },
  { id: 'studio_set', label: 'Studio set' },
  { id: 'framing', label: 'Framing 16:9 · 9:16' },
] as const;

// Problema conhecido mostrado até haver decisão.
const KNOWN_ISSUE: Record<string, string> = { outfit: 'Conflict', studio_set: 'Real brands' };

export const VOICE_REFS: Record<string, { label: string; src: string }[]> = {
  boomer: [{ label: 'Pilot reference · 6.9 s', src: '/assets/voice-ref/PILOTO-BOOMER.mp3' }],
  kev: [1, 2, 3].map(n => ({ label: `Pilot reference · take ${n}`, src: `/assets/voice-ref/PILOTO-KEV-c${n}.mp3` })),
};

const STORAGE_KEY = 'BK_IDENTITY_LOCK';

// ponytail: decisões no localStorage, como o resto da Engine DNA; mover para Supabase se mais de um navegador decidir.
export function useIdentityLock() {
  // A aba só monta após o clique em ENGINE DNA, então ler o storage na criação não quebra a hidratação.
  const [verdicts, setVerdicts] = React.useState<Record<string, Verdict>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  });
  const decide = (id: string, v: Verdict) => setVerdicts(prev => {
    const next = { ...prev };
    if (next[id] === v) delete next[id]; else next[id] = v; // clicar de novo desfaz
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* segue só na memória */ }
    return next;
  });
  return { verdicts, decide };
}

const chip = 'text-xs font-black uppercase tracking-widest px-3 py-1 border transition-colors whitespace-nowrap';

function StatusChip({ verdict, issue }: { verdict?: Verdict; issue?: string }) {
  if (verdict === 'approved') return <span className={cn(chip, 'text-green-500 border-green-500')}>Approved</span>;
  if (verdict === 'fix') return <span className={cn(chip, 'text-[#FF5F1F] border-[#FF5F1F]')}>Needs fix</span>;
  if (issue) return <span className={cn(chip, 'text-[#FF5F1F] border-[#FF5F1F]')}>{issue}</span>;
  return <span className={cn(chip, 'text-white/40 border-white/20')}>Pending</span>;
}

export function VerdictButtons({ id, verdicts, decide, approveLabel = 'Approve', fixLabel = 'Needs fix' }: {
  id: string; verdicts: Record<string, Verdict>; decide: (id: string, v: Verdict) => void; approveLabel?: string; fixLabel?: string;
}) {
  const v = verdicts[id];
  return (
    <div className="flex gap-2">
      <button type="button" aria-pressed={v === 'approved'} onClick={() => decide(id, 'approved')}
        className={cn(chip, v === 'approved' ? 'bg-green-500 text-black border-green-500' : 'text-green-500 border-green-500 hover:bg-green-500 hover:text-black')}>
        {approveLabel}
      </button>
      <button type="button" aria-pressed={v === 'fix'} onClick={() => decide(id, 'fix')}
        className={cn(chip, v === 'fix' ? 'bg-[#FF5F1F] text-black border-[#FF5F1F]' : 'text-[#FF5F1F] border-[#FF5F1F] hover:bg-[#FF5F1F] hover:text-black')}>
        {fixLabel}
      </button>
    </div>
  );
}

export function IdentityLockStrip({ verdicts }: { verdicts: Record<string, Verdict> }) {
  const approved = IDENTITY_AXES.filter(a => verdicts[a.id] === 'approved').length;
  return (
    <section className="studio-panel p-10 mb-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-3xl font-black tracking-tighter uppercase">Identity Lock</h3>
          <p className="text-white/50 text-sm font-bold mt-1">Nothing renders as &quot;final&quot; until every axis is approved.</p>
        </div>
        <div className="text-right">
          <div className="text-6xl font-black text-[#FF5F1F]">{approved}<span className="text-white/30">/{IDENTITY_AXES.length}</span></div>
          <div className="text-xs font-black text-white/50 uppercase tracking-widest">Axes approved</div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-[2px] bg-white/5">
        {IDENTITY_AXES.map(a => (
          <div key={a.id} className="bg-[#0a0a0b] p-4 space-y-3">
            <div className="text-xs font-black text-white/70 uppercase tracking-widest">{a.label}</div>
            <StatusChip verdict={verdicts[a.id]} issue={KNOWN_ISSUE[a.id]} />
          </div>
        ))}
      </div>
    </section>
  );
}

const OCCASIONS = [
  { id: 'original', label: 'Original', outfit: 'Boomer shirtless, red gloves, headset. Kev natural fur, headphones, tablet.', set: 'None. Base set.', limits: 'Main reference for faces, anatomy, gloves and positions.' },
  { id: 'game', label: 'Game day', outfit: 'Approved team piece (club to be defined).', set: 'Small approved fan items.', limits: 'Preserve faces, gloves and set readability.' },
  { id: 'christmas', label: 'Christmas', outfit: 'Approved Christmas accessory or piece.', set: 'Props only on designated surfaces.', limits: 'Never hide ears or faces; never change the architecture.' },
  { id: 'halloween', label: 'Halloween', outfit: 'Approved themed piece or accessory.', set: 'Localized decorations.', limits: 'Never change species, anatomy or the show’s tone.' },
];

export function OccasionDNA({ studioImage, verdicts, decide }: {
  studioImage: string; verdicts: Record<string, Verdict>; decide: (id: string, v: Verdict) => void;
}) {
  const [active, setActive] = React.useState(OCCASIONS[0].id);
  const occ = OCCASIONS.find(o => o.id === active)!;
  const field = (label: string, text: string) => (
    <div className="space-y-1">
      <span className="text-xs font-black text-white/50 uppercase tracking-widest">{label}</span>
      <p className="text-sm font-bold text-white/80">{text}</p>
    </div>
  );
  return (
    <section className="studio-panel p-10">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
        <div>
          <span className="text-sm font-black text-[#FF5F1F] tracking-[0.4em] block mb-2 uppercase italic">Environment_Matrix</span>
          <h2 className="text-4xl font-black tracking-tighter uppercase">Occasion DNA</h2>
          <p className="text-white/50 text-sm font-bold mt-1">Same studio, same positions. Only planned props and outfit variants change — consistent for the whole episode.</p>
        </div>
        <div role="tablist" className="flex border border-white/10 p-1 text-sm font-black tracking-widest">
          {OCCASIONS.map(o => (
            <button key={o.id} type="button" role="tab" aria-selected={o.id === active} onClick={() => setActive(o.id)}
              className={cn('px-4 py-2 uppercase transition-colors', o.id === active ? 'bg-[#FF5F1F] text-white' : 'text-white/60 hover:text-white')}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-8">
        <img src={studioImage} alt="Studio master" className="w-full border border-white/10" />
        <div className="space-y-5">
          {field('Outfit', occ.outfit)}
          {field('Set changes', occ.set)}
          {field('Limits', occ.limits)}
          {field('Locked always', 'Desk, architecture, Boomer left / Kev right, sponsor TVs.')}
          {field('Personality check', 'Would Boomer and Kev actually say or do this?')}
          <div className="pt-2"><VerdictButtons id={`occasion_${occ.id}`} verdicts={verdicts} decide={decide} approveLabel="Approve occasion" /></div>
        </div>
      </div>
    </section>
  );
}

export function FramingDNA({ wide, boomer, kev, verdicts, decide }: {
  wide: string; boomer: string; kev: string; verdicts: Record<string, Verdict>; decide: (id: string, v: Verdict) => void;
}) {
  const vertical = (src: string, label: string, position: string) => (
    <div>
      <div className="relative">
        <img src={src} alt={label} className={cn('w-full aspect-[9/16] object-cover border border-white/10', position)} />
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-[#FF5F1F]/15 border-t border-[#FF5F1F]" />
      </div>
      <div className="text-xs font-black text-white/60 uppercase tracking-widest mt-3">{label}</div>
      <span className={cn(chip, 'text-[#FF5F1F] border-[#FF5F1F] mt-2 inline-block')}>Needs native 9:16</span>
    </div>
  );
  return (
    <section className="studio-panel p-10">
      <span className="text-sm font-black text-[#FF5F1F] tracking-[0.4em] block mb-2 uppercase italic">Optical rules per format</span>
      <h2 className="text-4xl font-black tracking-tighter uppercase mb-8">Framing DNA · 16:9 · 9:16</h2>
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-6 items-start">
        <div>
          <div className="relative">
            <img src={wide} alt="16:9 duo" className="w-full aspect-video object-cover border border-white/10" />
            <div className="absolute inset-[8%] border border-dashed border-white/50" />
          </div>
          <div className="text-xs font-black text-white/60 uppercase tracking-widest mt-3">16:9 · YouTube · duo + safe area</div>
        </div>
        {vertical(boomer, '9:16 · Boomer solo', 'object-[35%]')}
        {vertical(kev, '9:16 · Kev solo', 'object-[70%]')}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
        <p className="text-white/50 text-sm font-bold">Orange band = caption zone. Vertical needs native 9:16 masters (no crop of the 16:9 art). Episode storyboards stay in PRODUCTION.</p>
        <VerdictButtons id="framing" verdicts={verdicts} decide={decide} approveLabel="Approve rule" />
      </div>
    </section>
  );
}
