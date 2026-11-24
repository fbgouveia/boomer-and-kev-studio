"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Check, X, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveCharacter } from '@/lib/cast-registry';
import { keyframeAnchor, keyframePrompt, storyboardApproved, type Aspect, type Keyframe } from '@/lib/storyboard';
import { useDrafting, type DraftLine, type Wardrobe } from './DraftingTable';

// Painel inline do Director (proposta aprovada director-roteiro-storyboard-v1):
// Gerando -> Roteiro pronto -> Storyboard. A lógica de brainstorm vive em useDrafting (DraftingTable.tsx).

export type StoryboardLine = DraftLine & { keyframes?: Partial<Record<Aspect, Keyframe>> };

interface Props {
    topic: string;
    snippet: string;
    apiKey?: string;
    renderAspect: Aspect;
    wardrobe?: { boomer?: string; kev?: string; studio?: string };
    onSend: (lines: StoryboardLine[], aspect: Aspect, wardrobe?: Wardrobe) => void;
    onClose: () => void;
}

const STEPS = ['Ganchos', 'Pontes', 'Reações', 'Patrocínio', 'Interações', 'Fechamento'];
const SECTION_LABELS = ['Gancho', 'Ponte', 'Reação', 'Patrocínio', 'Resposta', 'Interação 1', 'Interação 2', 'Fechamento'];
const STEP_SECONDS = 3.5; // estimativa: o servidor não reporta progresso por etapa
const PAID_KEY_TTL_MS = 10 * 60_000;

type Attempt = { idempotencyKey: string; approvedAt: string };

export function ScriptStoryboardPanel({ topic, snippet, apiKey, renderAspect, wardrobe, onSend, onClose }: Props) {
    const d = useDrafting({ topic, snippet, apiKey });
    const [phase, setPhase] = useState<'script' | 'storyboard'>('script');
    const [aspect, setAspect] = useState<Aspect>(renderAspect);
    const [frames, setFrames] = useState<Record<Aspect, Record<number, Keyframe>>>({ '9:16': {}, '16:9': {} });
    const [busy, setBusy] = useState<Record<string, boolean>>({});
    const [frameError, setFrameError] = useState<Record<string, string>>({});
    const [elapsed, setElapsed] = useState(0);
    const attempts = useRef<Record<string, Attempt>>({});
    const rootRef = useRef<HTMLDivElement>(null);

    // Roteiro novo ("Gerar outro roteiro") invalida todos os quadros: sem isto o
    // storyboard antigo (8/8) liberava o envio com imagens de outras falas.
    useEffect(() => {
        attempts.current = {};
        setFrames({ '9:16': {}, '16:9': {} });
        setFrameError({});
    }, [d.brainstorm]);

    useEffect(() => { rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, []);

    useEffect(() => {
        if (!d.isLoading) return;
        setElapsed(0);
        const t0 = Date.now();
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
        return () => clearInterval(id);
    }, [d.isLoading]);

    const lines = d.draft;
    const complete = !!lines;
    const approvedCount = lines ? lines.filter((_, i) => frames[aspect][i]?.approved).length : 0;
    const withKeyframes: StoryboardLine[] = (lines ?? []).map((l, i) => {
        const keyframes: StoryboardLine['keyframes'] = {};
        (['9:16', '16:9'] as Aspect[]).forEach(a => { if (frames[a][i]) keyframes[a] = frames[a][i]; });
        return { ...l, keyframes };
    });
    const canSend = complete && storyboardApproved(withKeyframes, aspect);

    const swap = (sectionIdx: number, optIdx: number) => {
        d.picks[sectionIdx].set(optIdx);
        // a cena mudou: quadros antigos não valem mais
        setFrames(prev => ({
            '9:16': Object.fromEntries(Object.entries(prev['9:16']).filter(([k]) => Number(k) !== sectionIdx)),
            '16:9': Object.fromEntries(Object.entries(prev['16:9']).filter(([k]) => Number(k) !== sectionIdx)),
        }));
    };

    const goStoryboard = () => {
        if (d.buildLines()) setPhase('storyboard'); // buildLines roda assertBalanced e mostra o erro se falhar
    };

    const generate = async (i: number, fresh: boolean) => {
        if (!lines) return;
        const line = lines[i];
        const k = `${i}-${aspect}`;
        if (busy[k]) return;
        let attempt = fresh ? undefined : attempts.current[k];
        if (attempt && Date.now() - Date.parse(attempt.approvedAt) > PAID_KEY_TTL_MS) attempt = undefined;
        if (!attempt) {
            attempt = { idempotencyKey: `kf-${crypto.randomUUID()}`, approvedAt: new Date().toISOString() };
            attempts.current[k] = attempt;
        }
        setBusy(p => ({ ...p, [k]: true }));
        setFrameError(p => { const n = { ...p }; delete n[k]; return n; });
        try {
            const anchor = keyframeAnchor(line, aspect);
            const res = await fetch('/api/ai/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.idempotencyKey },
                body: JSON.stringify({
                    prompt: keyframePrompt(line, aspect, wardrobe?.[line.characterId as 'boomer' | 'kev']),
                    aspectRatio: aspect,
                    ...(anchor ? { anchorAsset: anchor } : {}),
                    approval: { confirmed: true, source: 'studio_ui', approvedAt: attempt.approvedAt },
                }),
            });
            const data = await res.json();
            if (data.error || !data.imageUrl) {
                if ([400, 403, 409].includes(res.status) && data.error !== 'IDEMPOTENCY_IN_PROGRESS') delete attempts.current[k];
                throw new Error(data.error || 'Sem imagem na resposta');
            }
            delete attempts.current[k];
            setFrames(p => ({ ...p, [aspect]: { ...p[aspect], [i]: { url: data.imageUrl, approved: false } } }));
        } catch (e) {
            setFrameError(p => ({ ...p, [k]: e instanceof Error ? e.message : String(e) }));
        } finally {
            setBusy(p => ({ ...p, [k]: false }));
        }
    };

    const approve = (i: number) =>
        setFrames(p => ({ ...p, [aspect]: { ...p[aspect], [i]: { ...p[aspect][i], approved: true } } }));

    const step = Math.min(STEPS.length - 1, Math.floor(elapsed / STEP_SECONDS));
    const chip = "px-2 py-0.5 border border-white/20 text-[11px] font-mono uppercase tracking-wider text-white/70";

    return (
        <div ref={rootRef} data-testid="script-panel" className="border-4 border-[#FF5F1F] bg-[#0d0d0d] p-5 md:p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <span className="text-xs font-black text-[#FF5F1F] tracking-[0.3em] uppercase block mb-1">
                        {phase === 'storyboard' ? `Storyboard ${aspect}` : 'Roteiro'}
                    </span>
                    <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white leading-tight break-words">{topic}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {phase === 'storyboard' && (
                        <div className="flex border-2 border-white/20" role="group" aria-label="Formato do storyboard">
                            {(['9:16', '16:9'] as Aspect[]).map(a => (
                                <button key={a} onClick={() => setAspect(a)} aria-pressed={aspect === a}
                                    className={cn("px-3 py-1.5 text-xs font-black tracking-widest", aspect === a ? "bg-[#FF5F1F] text-black" : "text-white/60 hover:text-white")}>
                                    {a}
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={onClose} aria-label="Fechar painel" className="p-2 border border-white/10 hover:border-[#FF5F1F] hover:text-[#FF5F1F] transition-colors"><X size={16} /></button>
                </div>
            </div>

            {d.isLoading ? (
                <div data-testid="gerando" className="space-y-5">
                    <div className="flex items-center justify-between text-xs font-mono uppercase text-white/70">
                        <span className="font-black text-[#FF5F1F]">Gerando roteiro</span>
                        <span>{elapsed}s · estimativa ≈20s</span>
                    </div>
                    <ol className="grid grid-cols-2 gap-2">
                        {STEPS.map((s, i) => (
                            <li key={s} className={cn("flex items-center gap-2 px-3 py-2 border text-xs font-black uppercase tracking-widest",
                                i < step ? "border-[#FF5F1F]/60 text-white/80" : i === step ? "border-[#FF5F1F] text-[#FF5F1F] animate-pulse" : "border-white/10 text-white/40")}>
                                <span className="font-mono">{i + 1}</span>{s}
                            </li>
                        ))}
                    </ol>
                    <div className="space-y-2">
                        {Array(4).fill(0).map((_, i) => <div key={i} className="h-14 bg-white/5 border border-white/5 animate-pulse" />)}
                    </div>
                </div>
            ) : !d.brainstorm ? (
                <div className="p-6 border-2 border-red-500/30 bg-red-500/5 space-y-4 text-center">
                    <p className="text-sm font-bold text-white/70 uppercase break-words">{d.error ?? 'Nenhuma variante gerada.'}</p>
                    <button onClick={d.fetchBrainstorm} disabled={d.retryCountdown > 0}
                        className="px-6 py-2 bg-red-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed">
                        {d.retryCountdown > 0 ? `Nova tentativa em ${d.retryCountdown}s` : 'Tentar de novo'}
                    </button>
                </div>
            ) : (
                <>
                    {phase === 'storyboard' && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-sm md:text-base font-black italic uppercase tracking-tighter text-white">
                                    Storyboard {aspect} · {approvedCount}/8 aprovados
                                </span>
                                <span className="text-[11px] font-mono uppercase text-white/60 border border-dashed border-white/20 px-2 py-1">custo estimado: a confirmar</span>
                            </div>
                            <div className="h-2 bg-white/10"><div className="h-full bg-[#FF5F1F] transition-transform origin-left duration-200 ease-out" style={{ transform: `scaleX(${approvedCount / 8})` }} /></div>
                            <p className="text-xs text-white/60 font-medium">O quadro aprovado vira a imagem inicial do Kling — trava rosto, orelhas e figurino.</p>
                        </div>
                    )}

                    {d.error && <p role="alert" className="text-xs font-bold text-red-400 uppercase break-words">{d.error}</p>}

                    <div className="space-y-3">
                        {(lines ?? []).map((line, i) => {
                            const char = resolveCharacter(line.characterId);
                            const k = `${i}-${aspect}`;
                            const fr = frames[aspect][i];
                            const opts = d.picks[i].options ?? [];
                            return (
                                <div key={i} data-testid="scene-row" className="border border-white/10 bg-black/40 p-3 md:p-4 flex gap-3 md:gap-4">
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-lg font-black italic text-[#FF5F1F] font-mono">{String(i + 1).padStart(2, '0')}</span>
                                            {char?.referenceImage && (
                                                <img src={char.referenceImage} alt="" className="w-7 h-7 object-cover object-top border border-white/20" />
                                            )}
                                            <span className="px-2 py-0.5 bg-[#FF5F1F] text-black text-[11px] font-black uppercase">{char?.name ?? line.characterId}</span>
                                            <span className={chip}>{line.shotType}</span>
                                            <span className="text-[11px] font-mono text-white/50 ml-auto">~{line.durationEst}s</span>
                                        </div>
                                        <p className="text-sm md:text-base font-black italic uppercase leading-snug text-white break-words">&quot;{line.text}&quot;</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className={chip}>Emoção: {line.emotion}</span>
                                            <span className={chip}>Ação: {line.action}</span>
                                        </div>
                                        {phase === 'script' && (
                                            <div className="flex items-center gap-1.5 pt-1" role="group" aria-label={`Trocar fala da cena ${i + 1}`}>
                                                <span className="text-[11px] font-black uppercase tracking-widest text-white/50 mr-1">{SECTION_LABELS[i]} ·</span>
                                                {opts.map((_, oi) => (
                                                    <button key={oi} onClick={() => swap(i, oi)} aria-pressed={d.picks[i].index === oi}
                                                        aria-label={`Opção ${'ABC'[oi] ?? oi + 1} da cena ${i + 1}`}
                                                        className={cn("w-8 h-8 text-xs font-black border-2 transition-colors",
                                                            d.picks[i].index === oi ? "border-[#FF5F1F] bg-[#FF5F1F] text-black" : "border-white/20 text-white/70 hover:border-[#FF5F1F]")}>
                                                        {'ABC'[oi] ?? oi + 1}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {phase === 'storyboard' && (
                                        <div className="w-24 md:w-28 shrink-0 space-y-1.5" data-testid="keyframe-cell">
                                            <div className={cn("relative border-2 bg-black overflow-hidden", aspect === '9:16' ? "aspect-[9/16]" : "aspect-video",
                                                fr?.approved ? "border-[#FF5F1F]" : "border-white/20 border-dashed", busy[k] && "animate-pulse")}>
                                                {fr && (
                                                    <img src={fr.url} alt={`Quadro da cena ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                                                )}
                                                {fr?.approved && (
                                                    <span className="absolute bottom-0 inset-x-0 bg-[#FF5F1F] text-black text-[10px] font-black flex items-center justify-center gap-1 py-0.5">
                                                        <Check size={10} strokeWidth={4} /> APROVADO
                                                    </span>
                                                )}
                                                {!fr && !busy[k] && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/40 uppercase">Sem quadro</span>}
                                            </div>
                                            {busy[k] ? (
                                                <span className="block text-center text-[10px] font-black uppercase text-[#FF5F1F]">Gerando…</span>
                                            ) : !fr ? (
                                                <button onClick={() => generate(i, false)} className="w-full py-1.5 bg-[#FF5F1F] text-black text-[11px] font-black uppercase">Gerar</button>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    {!fr.approved && <button onClick={() => approve(i)} className="w-full py-1.5 bg-[#FF5F1F] text-black text-[11px] font-black uppercase">Aprovar</button>}
                                                    <button onClick={() => generate(i, true)} className="w-full py-1.5 border border-white/30 text-white/80 text-[11px] font-black uppercase hover:border-[#FF5F1F]">Refazer</button>
                                                </div>
                                            )}
                                            {frameError[k] && <span role="alert" className="block text-[10px] text-red-400 break-words">{frameError[k]}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        {phase === 'script' ? (
                            <>
                                <button onClick={d.fetchBrainstorm} className="px-4 py-2 border border-white/20 text-xs font-black uppercase tracking-widest text-white/70 hover:border-[#FF5F1F] flex items-center gap-2">
                                    <RefreshCcw size={12} /> Gerar outro roteiro
                                </button>
                                <button onClick={goStoryboard} disabled={!complete}
                                    className="px-6 py-3 bg-[#FF5F1F] text-black text-xs font-black uppercase tracking-widest disabled:opacity-30">
                                    Storyboard →
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setPhase('script')} className="px-4 py-2 border border-white/20 text-xs font-black uppercase tracking-widest text-white/70 hover:border-[#FF5F1F]">← Roteiro</button>
                                <button onClick={() => lines && onSend(withKeyframes, aspect, d.wardrobe)} disabled={!canSend}
                                    title={canSend ? undefined : 'Aprove todas as cenas'}
                                    className="px-6 py-3 bg-[#FF5F1F] text-black text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed">
                                    Enviar para produção
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
