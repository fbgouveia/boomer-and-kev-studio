"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Zap,
    Lock,
    RefreshCcw,
    CheckCircle2,
    TrendingUp,
    BarChart3,
    Sparkles,
    Terminal,
    ChevronRight,
    Search,
    Youtube,
    Instagram,
    Eye,
    Brain,
    X,
    Layers,
    MessageSquare,
    Volume2,
    type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

type BrainstormOption = {
    characterId: string;
    text: string;
    action: string;
    emotion: string;
    retentionScore: number;
    reasoning: string;
};

type BrainstormData = {
    hooks: BrainstormOption[];
    bridges: BrainstormOption[];
    reactions: BrainstormOption[];
    sponsorPitch: BrainstormOption[];
    sponsorRebuttal: BrainstormOption[];
    interaction1: BrainstormOption[];
    interaction2: BrainstormOption[];
    closings: BrainstormOption[];
    wardrobe?: {
        boomer: string;
        kev: string;
        studio: string;
    };
};

interface DraftingTableProps {
    topic: string;
    snippet: string;
    apiKey?: string;
    onAssemble: (assembledScript: {
        id: string,
        characterId: string,
        text: string,
        shotType: string,
        durationEst: number,
        emotion: string,
        action: string,
        status: 'IDLE'
    }[], wardrobe?: { boomer: string, kev: string, studio: string }) => void;
    onClose: () => void;
}

export function DraftingTable({ topic, snippet, apiKey, onAssemble, onClose }: DraftingTableProps) {
    const [brainstorm, setBrainstorm] = useState<BrainstormData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedHook, setSelectedHook] = useState<number | null>(null);
    const [selectedBridge, setSelectedBridge] = useState<number | null>(null);
    const [selectedReaction, setSelectedReaction] = useState<number | null>(null);
    const [selectedSponsorPitch, setSelectedSponsorPitch] = useState<number | null>(null);
    const [selectedSponsorRebuttal, setSelectedSponsorRebuttal] = useState<number | null>(null);
    const [selectedInteraction1, setSelectedInteraction1] = useState<number | null>(null);
    const [selectedInteraction2, setSelectedInteraction2] = useState<number | null>(null);
    const [selectedClosing, setSelectedClosing] = useState<number | null>(null);
    const [activeSection, setActiveSection] = useState<keyof BrainstormData>('hooks');
    const brainstormInFlight = useRef(false);

    const advanceToNextIncompleteSection = () => {
        if (selectedHook === null) { setActiveSection('hooks'); return; }
        if (selectedBridge === null) { setActiveSection('bridges'); return; }
        if (selectedReaction === null) { setActiveSection('reactions'); return; }
        if (selectedSponsorPitch === null) { setActiveSection('sponsorPitch'); return; }
        if (selectedSponsorRebuttal === null) { setActiveSection('sponsorRebuttal'); return; }
        if (selectedInteraction1 === null) { setActiveSection('interaction1'); return; }
        if (selectedInteraction2 === null) { setActiveSection('interaction2'); return; }
        if (selectedClosing === null) { setActiveSection('closings'); return; }
    };

    const [retryCountdown, setRetryCountdown] = useState<number>(0);

    const fetchBrainstorm = React.useCallback(async () => {
        if (brainstormInFlight.current) return;
        brainstormInFlight.current = true;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/ai/brainstorm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, snippet, apiKey })
            });
            const data = await res.json();

            if (res.status === 429) {
                const waitSecs = data.retryAfter || 30;
                setRetryCountdown(Math.ceil(waitSecs));
                setError(`BRAINSTORM_SIGNAL_LOSS: Neural Quota Exceeded. Please wait ${Math.ceil(waitSecs)}s.`);
                return;
            }

            if (data.error) {
                setError(`${data.error}: ${data.details || 'Unknown error'}`);
            } else {
                setBrainstorm(data);
                // Auto-tune the initial assembly
                if (data.hooks?.length > 0) setSelectedHook(0);
                if (data.bridges?.length > 0) setSelectedBridge(0);
                if (data.reactions?.length > 0) setSelectedReaction(0);
                if (data.sponsorPitch?.length > 0) setSelectedSponsorPitch(0);
                if (data.sponsorRebuttal?.length > 0) setSelectedSponsorRebuttal(0);
                if (data.interaction1?.length > 0) setSelectedInteraction1(0);
                if (data.interaction2?.length > 0) setSelectedInteraction2(0);
                if (data.closings?.length > 0) setSelectedClosing(0);
            }
        } catch (error) {
            console.error("BRAINSTORM_ERROR", error);
            setError("NETWORK_SIGNAL_LOSS: Connection to Neural Core interrupted.");
        } finally {
            brainstormInFlight.current = false;
            setIsLoading(false);
        }
    }, [topic, snippet, apiKey]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (retryCountdown > 0) {
            timer = setTimeout(() => {
                setRetryCountdown(prev => Math.max(0, prev - 1));
            }, 1000);
        }
        return () => clearTimeout(timer);
    }, [retryCountdown]);

    useEffect(() => {
        if (topic) fetchBrainstorm();
    }, [topic, fetchBrainstorm]);

    const handleAssemble = () => {
        if (!brainstorm) return;

        const hook = selectedHook !== null ? brainstorm.hooks?.[selectedHook] : null;
        const bridge = selectedBridge !== null ? brainstorm.bridges?.[selectedBridge] : null;
        const reaction = selectedReaction !== null ? brainstorm.reactions?.[selectedReaction] : null;
        const sPitch = selectedSponsorPitch !== null ? brainstorm.sponsorPitch?.[selectedSponsorPitch] : null;
        const sReb = selectedSponsorRebuttal !== null ? brainstorm.sponsorRebuttal?.[selectedSponsorRebuttal] : null;
        const i1 = selectedInteraction1 !== null ? brainstorm.interaction1?.[selectedInteraction1] : null;
        const i2 = selectedInteraction2 !== null ? brainstorm.interaction2?.[selectedInteraction2] : null;
        const closing = selectedClosing !== null ? brainstorm.closings?.[selectedClosing] : null;

        if (!hook || !bridge || !reaction || !sPitch || !sReb || !i1 || !i2 || !closing) return;

        onAssemble([
            {
                id: Math.random().toString(36).substr(2, 9),
                characterId: hook.characterId || 'boomer',
                text: hook.text,
                shotType: (hook.characterId === 'kev') ? 'KEV_CU' : 'BOOMER_MCU',
                durationEst: 6,
                emotion: hook.emotion || 'INTENSE',
                action: hook.action || 'AGGRESSIVE_SHADOW_BOXING',
                status: 'IDLE'
            },
            {
                id: Math.random().toString(36).substr(2, 9),
                characterId: bridge.characterId || 'boomer',
                text: bridge.text,
                shotType: (bridge.characterId === 'kev') ? 'KEV_CU' : 'BOOMER_MCU',
                durationEst: 7,
                emotion: bridge.emotion || 'EXCITED',
                action: bridge.action || 'GESTURING_WILDLY',
                status: 'IDLE'
            },
            {
                id: Math.random().toString(36).substr(2, 9),
                characterId: reaction.characterId || 'kev',
                text: reaction.text,
                shotType: (reaction.characterId === 'boomer') ? 'BOOMER_MCU' : 'KEV_CU',
                durationEst: 5,
                emotion: reaction.emotion || 'DEADPAN',
                action: reaction.action || 'SLOW_BLINKING',
                status: 'IDLE'
            },
            {
                id: Math.random().toString(36).substr(2, 9),
                characterId: sPitch.characterId || 'boomer',
                text: sPitch.text,
                shotType: 'WIDE',
                durationEst: 7,
                emotion: sPitch.emotion || 'SALESMAN',
                action: sPitch.action || 'HOLDING_IMAGINARY_PRODUCT',
                status: 'IDLE'
            },
            {
                id: Math.random().toString(36).substr(2, 9),
                characterId: sReb.characterId || 'kev',
                text: sReb.text,
                shotType: 'KEV_CU',
                durationEst: 5,
                emotion: sReb.emotion || 'DISGUSTED',
                action: sReb.action || 'SHAKING_HEAD',
                status: 'IDLE'
            },
            {
                id: Math.random().toString(36).substr(2, 9),
                characterId: i1.characterId || 'boomer',
                text: i1.text,
                shotType: 'BOOMER_MCU',
                durationEst: 6,
                emotion: i1.emotion || 'ENGAGED',
                action: i1.action || 'TALKING',
                status: 'IDLE'
            },
            {
                id: Math.random().toString(36).substr(2, 9),
                characterId: i2.characterId || 'kev',
                text: i2.text,
                shotType: 'WIDE',
                durationEst: 6,
                emotion: i2.emotion || 'ENGAGED',
                action: i2.action || 'TALKING',
                status: 'IDLE'
            },
            {
                id: Math.random().toString(36).substr(2, 9),
                characterId: closing.characterId || 'boomer',
                text: closing.text,
                shotType: 'BOOMER_MCU',
                durationEst: 6,
                emotion: closing.emotion || 'PUMPED',
                action: closing.action || 'BICEP_FLEX_AND_POINT',
                status: 'IDLE'
            },
        ], brainstorm.wardrobe);
    };

    const renderOption = (option: BrainstormOption, index: number, isSelected: boolean, onSelect: () => void) => (
        <button
            key={index}
            onClick={onSelect}
            className={cn(
                "w-full text-left p-8 border transition-all duration-700 relative group overflow-hidden mb-6 stagger-item",
                isSelected
                    ? "bg-[#FF5F1F]/10 border-[#FF5F1F] shadow-[0_20px_50px_rgba(255,95,31,0.1)] translate-x-2"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-1"
            )}
            style={{ animationDelay: `${index * 150}ms` }}
        >
            {/* Background Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-[#FF5F1F] animate-pulse" : "bg-white/20")} />
                    <span className="text-sm font-black text-white/60 uppercase tracking-[0.2em]">Block_Variant_0{index + 1}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1 border border-white/5">
                    <BarChart3 size={12} className="text-[#FF5F1F]" />
                    <span className="text-sm font-black text-[#FF5F1F] tracking-tighter uppercase">{option.retentionScore}% Momentum</span>
                </div>
            </div>

            <p className="text-2xl font-black italic uppercase leading-[1.1] mb-6 text-white group-hover:text-[#FF5F1F] transition-colors relative z-10 tracking-tighter">
                &quot;{option.text}&quot;
            </p>

            <div className="p-4 bg-black/60 border border-white/10 relative z-10 group-hover:border-[#FF5F1F]/30 transition-all">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={10} className="text-[#FF5F1F]/60" />
                    <span className="text-xs font-black text-white/60 uppercase tracking-widest">Generative Insight</span>
                </div>
                <p className="text-sm text-white/70 font-medium italic leading-relaxed">
                    {option.reasoning}
                </p>
            </div>

            {isSelected && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF5F1F]/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
            )}
        </button>
    );

    const sections: { id: keyof BrainstormData, label: string, icon: LucideIcon }[] = [
        { id: 'hooks', label: 'THE HOOK', icon: Zap },
        { id: 'bridges', label: 'THE BRIDGE', icon: Layers },
        { id: 'reactions', label: 'THE REACTION', icon: TrendingUp },
        { id: 'sponsorPitch', label: 'FAKE SPONSOR PITCH', icon: Sparkles },
        { id: 'sponsorRebuttal', label: 'SPONSOR REBUTTAL', icon: X },
        { id: 'interaction1', label: 'DIALOGUE 1', icon: MessageSquare },
        { id: 'interaction2', label: 'DIALOGUE 2', icon: Volume2 },
        { id: 'closings', label: 'THE CLOSING', icon: Terminal },
    ];

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-black/40 backdrop-blur-xl animate-in zoom-in-95 duration-500 overflow-hidden">
            {/* NOISE TEXTURE OVERLAY */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

            <div className="max-w-7xl w-full h-[90vh] bg-black/60 border-[4px] border-white/20 flex flex-col relative overflow-hidden shadow-[0_0_100px_rgba(255,95,31,0.05)] backdrop-blur-3xl">

                {/* HEADER */}
                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-[#111111]">
                    <div className="flex items-center gap-6 stagger-item">
                        <div className="cine-icon w-20 h-20 border-2 border-[#FF5F1F] bg-[#FF5F1F]/5 shadow-[0_0_50px_rgba(255,95,31,0.15)] group">
                            <Brain size={32} className="text-[#FF5F1F] group-hover:scale-110 transition-transform duration-700 neural-sparkle" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="px-2 py-0.5 bg-[#FF5F1F] text-white text-xs font-black uppercase tracking-widest animate-pulse">Neural_Synthesis_v2.7</span>
                                <span className="text-sm font-black text-white/50 tracking-[0.4em] uppercase">Intelligence_HUD</span>
                            </div>
                            <h2 className="text-4xl font-black tracking-tighter uppercase italic">
                                <span className="text-[#FF5F1F]">NEURAL</span> DRAFTING MODE
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        {/* Simulated Search Intent Indicators */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2 text-xs font-black text-white/60 uppercase mb-1">
                                    <Youtube size={12} /> YouTube Intent
                                </div>
                                <div className="h-1 w-20 bg-white/5">
                                    <div className="h-full bg-red-500 w-[85%] animate-pulse" />
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2 text-xs font-black text-white/60 uppercase mb-1">
                                    <Instagram size={12} /> IG Velocity
                                </div>
                                <div className="h-1 w-20 bg-white/5">
                                    <div className="h-full bg-[#FF5F1F] w-[92%] animate-pulse" />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-3 border border-white/10 hover:border-[#FF5F1F] hover:text-[#FF5F1F] transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* MAIN TABLE */}
                <div className="flex-1 flex overflow-hidden min-h-0">

                    {/* LEFT NAV */}
                    <nav className="w-80 border-r border-white/5 bg-black/40 flex flex-col pt-10 px-4">
                        <span className="text-xs font-black text-white/50 tracking-[0.3em] uppercase block mb-8 px-6 italic">Engine_Section_Streams</span>
                        <div className="space-y-3">
                            {sections.map((section, idx) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                const isComplete = (section.id === 'hooks' && selectedHook !== null) ||
                                    (section.id === 'bridges' && selectedBridge !== null) ||
                                    (section.id === 'reactions' && selectedReaction !== null) ||
                                    (section.id === 'sponsorPitch' && selectedSponsorPitch !== null) ||
                                    (section.id === 'sponsorRebuttal' && selectedSponsorRebuttal !== null) ||
                                    (section.id === 'interaction1' && selectedInteraction1 !== null) ||
                                    (section.id === 'interaction2' && selectedInteraction2 !== null) ||
                                    (section.id === 'closings' && selectedClosing !== null);

                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={cn(
                                            "w-full text-left flex items-center gap-6 px-6 py-4 transition-all relative group stagger-item border-l-2 outline-none",
                                            isActive ? "bg-[#FF5F1F]/10 border-[#FF5F1F]" : "text-white/50 hover:text-white/60 border-transparent hover:bg-white/5",
                                            isComplete && !isActive && "text-white/60"
                                        )}
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className={cn("cine-icon", isActive && "border-[#FF5F1F] bg-[#FF5F1F]/20")}>
                                            <Icon size={18} className={cn(isActive && "text-[#FF5F1F]")} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Section 0{idx + 1}</span>
                                            <span className="text-sm font-black uppercase tracking-widest">{section.label}</span>
                                        </div>
                                        {isComplete && (
                                            <div className="absolute right-6 w-1.5 h-1.5 bg-[#FF5F1F] rounded-full shadow-[0_0_10px_rgba(255,95,31,0.5)]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-12">
                            <div className="p-4 border border-white/5 bg-white/[0.02]">
                                <span className="text-xs font-black text-[#FF5F1F] tracking-widest block mb-2 uppercase italic">Target Analytics</span>
                                <div className="space-y-3">
                                    {/* Honestidade (06/08 + 04/09): métricas inventadas ("92% MOMENTUM",
                                        "RETENTION GOAL 90%+") foram removidas. Só existe métrica aqui quando
                                        vier de dados reais de plataforma (ver W6 — analytics ingest). */}
                                    <div className="flex justify-between items-center text-xs font-bold text-white/60">
                                        <span>RETENTION DATA</span>
                                        <span className="text-white">aguardando 1º episódio no ar</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-white/60">
                                        <span>ENGAGEMENT DATA</span>
                                        <span className="text-white">aguardando 1º episódio no ar</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </nav>

                    {/* CONTENT AREA */}
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-gradient-to-b from-[#0d0d0d] to-[#050505]">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex justify-between items-end mb-12">
                                <div>
                                    <span className="text-sm font-black text-[#FF5F1F] tracking-[0.5em] block mb-2 uppercase">Neural_Selection_Terminal</span>
                                    <h3 className="text-5xl font-black tracking-tighter uppercase italic">{sections.find(s => s.id === activeSection)?.label}</h3>
                                </div>
                                <button
                                    onClick={fetchBrainstorm}
                                    disabled={isLoading}
                                    className="px-6 py-2 border border-white/10 text-sm font-black tracking-widest hover:border-[#FF5F1F] hover:text-[#FF5F1F] transition-all flex items-center gap-2 group disabled:opacity-20"
                                >
                                    <RefreshCcw size={14} className={cn(isLoading && "animate-spin")} /> REROLL_STUBS
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="space-y-4">
                                    {Array(3).fill(0).map((_, i) => (
                                        <div key={i} className="h-40 bg-white/5 animate-pulse border border-white/5" />
                                    ))}
                                </div>
                            ) : error ? (
                                <div className="p-12 border-2 border-red-500/20 bg-red-500/5 text-center space-y-6">
                                    <div className="w-16 h-16 border-2 border-red-500 flex items-center justify-center bg-red-500/10 mx-auto">
                                        <Zap size={32} className="text-red-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-red-500 uppercase italic">Neural_Link_Severed</h4>
                                        <p className="text-sm font-bold text-white/60 uppercase mt-2">
                                            {error}
                                        </p>
                                    </div>
                                    <button
                                        onClick={fetchBrainstorm}
                                        disabled={retryCountdown > 0}
                                        className={cn(
                                            "px-8 py-3 bg-red-500 text-white text-sm font-black uppercase tracking-widest hover:bg-white hover:text-red-500 transition-all disabled:opacity-30 disabled:cursor-wait",
                                            retryCountdown > 0 && "cursor-not-allowed"
                                        )}
                                    >
                                        {retryCountdown > 0 ? `BACKOFF_COOLDOWN: ${retryCountdown}S` : "RE-ESTABLISH SIGNAL"}
                                    </button>
                                </div>
                            ) : brainstorm ? (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {activeSection === 'hooks' ? brainstorm.hooks?.map((opt, i) => renderOption(opt, i, selectedHook === i, () => { setSelectedHook(i); advanceToNextIncompleteSection(); })) :
                                        activeSection === 'bridges' ? brainstorm.bridges?.map((opt, i) => renderOption(opt, i, selectedBridge === i, () => { setSelectedBridge(i); advanceToNextIncompleteSection(); })) :
                                            activeSection === 'reactions' ? brainstorm.reactions?.map((opt, i) => renderOption(opt, i, selectedReaction === i, () => { setSelectedReaction(i); advanceToNextIncompleteSection(); })) :
                                                activeSection === 'sponsorPitch' ? brainstorm.sponsorPitch?.map((opt, i) => renderOption(opt, i, selectedSponsorPitch === i, () => { setSelectedSponsorPitch(i); advanceToNextIncompleteSection(); })) :
                                                    activeSection === 'sponsorRebuttal' ? brainstorm.sponsorRebuttal?.map((opt, i) => renderOption(opt, i, selectedSponsorRebuttal === i, () => { setSelectedSponsorRebuttal(i); advanceToNextIncompleteSection(); })) :
                                                        activeSection === 'interaction1' ? brainstorm.interaction1?.map((opt, i) => renderOption(opt, i, selectedInteraction1 === i, () => { setSelectedInteraction1(i); advanceToNextIncompleteSection(); })) :
                                                            activeSection === 'interaction2' ? brainstorm.interaction2?.map((opt, i) => renderOption(opt, i, selectedInteraction2 === i, () => { setSelectedInteraction2(i); advanceToNextIncompleteSection(); })) :
                                                                activeSection === 'closings' ? brainstorm.closings?.map((opt, i) => renderOption(opt, i, selectedClosing === i, () => { setSelectedClosing(i); advanceToNextIncompleteSection(); })) : null}
                                </div>
                            ) : (
                                <div className="p-12 border-2 border-white/5 bg-white/[0.02] text-center">
                                    <p className="text-sm font-bold text-white/50 uppercase tracking-widest">No variants synthesized. Reroll to attempt again.</p>
                                </div>
                            )}
                        </div>

                        {/* ACTION HINT / AUTO-ADVANCE */}
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => {
                                    const sectionOrder: (keyof BrainstormData)[] = ['hooks', 'bridges', 'reactions', 'sponsorPitch', 'sponsorRebuttal', 'interaction1', 'interaction2', 'closings'];
                                    const currentIndex = sectionOrder.indexOf(activeSection);
                                    if (currentIndex < sectionOrder.length - 1) {
                                        setActiveSection(sectionOrder[currentIndex + 1]);
                                    }
                                }}
                                disabled={
                                    (activeSection === 'hooks' && selectedHook === null) ||
                                    (activeSection === 'bridges' && selectedBridge === null) ||
                                    (activeSection === 'reactions' && selectedReaction === null) ||
                                    (activeSection === 'sponsorPitch' && selectedSponsorPitch === null) ||
                                    (activeSection === 'sponsorRebuttal' && selectedSponsorRebuttal === null) ||
                                    (activeSection === 'interaction1' && selectedInteraction1 === null) ||
                                    (activeSection === 'interaction2' && selectedInteraction2 === null) ||
                                    (activeSection === 'closings' && selectedClosing === null) ||
                                    activeSection === 'closings'
                                }
                                className="px-10 py-4 border border-[#FF5F1F] text-[#FF5F1F] text-sm font-black uppercase tracking-widest hover:bg-[#FF5F1F] hover:text-white transition-all flex items-center gap-3 disabled:opacity-20"
                            >
                                Next Section <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* PREVIEW BAR */}
                    <div className="w-96 border-l border-white/5 bg-black/40 p-10 flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-black text-white/50 tracking-[0.3em] uppercase block mb-8">Assembled_Blueprint</span>

                            <div className="space-y-6">
                                {sections.map(section => {
                                    let selectedText = "...";
                                    if (section.id === 'hooks' && selectedHook !== null) selectedText = brainstorm?.hooks[selectedHook].text || "...";
                                    if (section.id === 'bridges' && selectedBridge !== null) selectedText = brainstorm?.bridges[selectedBridge].text || "...";
                                    if (section.id === 'reactions' && selectedReaction !== null) selectedText = brainstorm?.reactions[selectedReaction].text || "...";
                                    if (section.id === 'sponsorPitch' && selectedSponsorPitch !== null) selectedText = brainstorm?.sponsorPitch[selectedSponsorPitch].text || "...";
                                    if (section.id === 'sponsorRebuttal' && selectedSponsorRebuttal !== null) selectedText = brainstorm?.sponsorRebuttal[selectedSponsorRebuttal].text || "...";
                                    if (section.id === 'interaction1' && selectedInteraction1 !== null) selectedText = brainstorm?.interaction1[selectedInteraction1].text || "...";
                                    if (section.id === 'interaction2' && selectedInteraction2 !== null) selectedText = brainstorm?.interaction2[selectedInteraction2].text || "...";
                                    if (section.id === 'closings' && selectedClosing !== null) selectedText = brainstorm?.closings[selectedClosing].text || "...";

                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={cn(
                                                "w-full text-left relative pl-6 border-l transition-all group py-2",
                                                activeSection === section.id ? "border-[#FF5F1F]" : "border-white/10"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute -left-1.5 top-3 w-3 h-3 border rounded-full transition-all",
                                                activeSection === section.id ? "bg-[#FF5F1F] border-[#FF5F1F]" : "bg-[#0d0d0d] border-white/20 group-hover:border-[#FF5F1F]"
                                            )} />
                                            <span className={cn(
                                                "text-xs font-black uppercase tracking-widest block mb-1",
                                                activeSection === section.id ? "text-[#FF5F1F]" : "text-white/50"
                                            )}>{section.label}</span>
                                            <p className={cn(
                                                "text-sm font-bold uppercase italic leading-tight transition-all",
                                                selectedText === "..." ? "text-white/50" : "text-white"
                                            )}>
                                                {selectedText?.length > 80 ? selectedText.substring(0, 80) + "..." : (selectedText || "...")}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 border border-[#FF5F1F]/20 bg-[#FF5F1F]/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles size={12} className="text-[#FF5F1F]" />
                                    <span className="text-xs font-black text-[#FF5F1F] tracking-widest uppercase">Directorial Confidence</span>
                                </div>
                                <div className="text-2xl font-black text-white flex items-baseline gap-1 italic tracking-tighter">
                                    {Math.floor(
                                        ((selectedHook !== null ? 1 : 0) +
                                            (selectedBridge !== null ? 1 : 0) +
                                            (selectedReaction !== null ? 1 : 0) +
                                            (selectedSponsorPitch !== null ? 1 : 0) +
                                            (selectedSponsorRebuttal !== null ? 1 : 0) +
                                            (selectedInteraction1 !== null ? 1 : 0) +
                                            (selectedInteraction2 !== null ? 1 : 0) +
                                            (selectedClosing !== null ? 1 : 0)) * (100 / 8)
                                    )}<span className="text-sm text-white/60">%</span>
                                </div>
                            </div>

                            <button
                                onClick={handleAssemble}
                                disabled={selectedHook === null || selectedBridge === null || selectedReaction === null || selectedSponsorPitch === null || selectedSponsorRebuttal === null || selectedInteraction1 === null || selectedInteraction2 === null || selectedClosing === null}
                                className="w-full bg-white text-black py-4 font-black text-sm tracking-[0.3em] uppercase flex items-center justify-center gap-3 hover:bg-[#FF5F1F] hover:text-white transition-all disabled:opacity-20 shadow-[10px_10px_0_rgba(255,95,31,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none btn-signal"
                            >
                                <Terminal size={14} className="neural-sparkle" /> Commit to Timeline
                            </button>
                        </div>
                    </div>
                </div>

                {/* SCANLINE OVERLAY */}
                <div className="absolute inset-0 pointer-events-none border-4 border-[#FF5F1F]/10 z-10" />
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#FF5F1F]/20 blur-sm animate-scan z-20" />
            </div>
        </div>
    );
}
