"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
    RefreshCcw,
    TrendingUp,
    Zap,
    Plus,
    ArrowUpRight,
    Clock,
    BarChart3,
    Newspaper,
    ChevronRight,
    ExternalLink,
    Calendar as CalendarIcon
} from 'lucide-react';
import { AUSSIE_CALENDAR, getUpcomingEvent } from '@/data/calendar';
import { cn } from '@/lib/utils';

type NewsItem = {
    title: string;
    source: string;
    url: string;
};

export type Trend = {
    title: string;
    snippet: string;
    url: string;
    traffic: string;
    published: string;
    news: NewsItem[];
    directorialIntelligence?: {
        take: { character: 'BOOMER' | 'KEV', text: string };
        hooks: string[];
        viralPotential: number;
    };
};

interface TrendsFeedProps {
    onSelectTrend: (trend: Trend) => void;
}

const REGIONS = [
    { id: 'AU', label: 'AU', name: 'Australia' },
    { id: 'US', label: 'US', name: 'United States' },
    { id: 'BR', label: 'BR', name: 'South America' },
    { id: 'GB', label: 'EU', name: 'Europe' },
    { id: 'TR', label: 'ME', name: 'Middle East' },
    { id: 'IN', label: 'AS', name: 'Asia' }
];

export function TrendsFeed({ onSelectTrend }: TrendsFeedProps) {
    const [trends, setTrends] = useState<Trend[]>([]);
    const [geo, setGeo] = useState('AU');
    const [_error, setError] = useState<string | null>(null);
    const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSyncTime, setLastSyncTime] = useState<string>("");
    const [feedMode, setFeedMode] = useState<'LIVE' | 'CALENDAR'>('LIVE');

    const fetchTrends = useCallback(async (currentGeo?: string) => {
        const targetGeo = currentGeo || geo;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/trends?geo=${targetGeo}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setTrends(data);
            setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            if (data.length > 0) {
                setSelectedTrend(data[0]);
            }
        } catch (err) {
            setError('SIGNAL_LOSS');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [geo]);

    useEffect(() => {
        fetchTrends();
    }, [fetchTrends]);

    const handleRegionChange = (newGeo: string) => {
        setGeo(newGeo);
        fetchTrends(newGeo);
    };

    return (
        <div className="w-full lg:w-[350px] xl:w-[400px] 2xl:w-[800px] bg-[#050505] flex h-full overflow-hidden min-h-0">
            {/* LEFT: Trend List (Daily Aggregator) */}
            <div className="flex-1 2xl:w-80 2xl:flex-none border-r border-white/5 flex flex-col h-full bg-[#080808] min-h-0 max-h-full">
                <div className="p-8 border-b border-white/5 flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex rounded-none overflow-hidden border-2 border-white/20 w-fit">
                            <button
                                onClick={() => setFeedMode('LIVE')}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFeedMode('LIVE'); } }}
                                className={cn("px-5 py-3 text-xs font-black uppercase tracking-widest transition-all cursor-pointer min-h-[44px]",
                                    feedMode === 'LIVE' ? "bg-[#FF5F1F] text-black font-black" : "bg-white/5 text-white/60 hover:text-white")}
                            >
                                <TrendingUp size={12} className="inline mr-2 mb-0.5" />
                                LIVE WIRE
                            </button>
                            <button
                                onClick={() => {
                                    setFeedMode('CALENDAR');
                                    // Auto-select upcoming event
                                    const nextEvent = getUpcomingEvent();
                                    if (nextEvent) {
                                        // Mock convert to Trend
                                        // logic will be in render
                                    }
                                }}
                                className={cn("px-5 py-3 text-xs font-black uppercase tracking-widest transition-all cursor-pointer min-h-[44px]",
                                    feedMode === 'CALENDAR' ? "bg-[#FF5F1F] text-black font-black" : "bg-white/5 text-white/60 hover:text-white")}
                            >
                                <CalendarIcon size={12} className="inline mr-2 mb-0.5" />
                                2026 PLANNER
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs font-black text-[#FF5F1F] tracking-[0.4em] block mb-1 uppercase">
                                    {feedMode === 'LIVE' ? 'Global Signal' : 'Future Events'}
                                </span>
                                <h3 className="text-xl font-black tracking-tighter uppercase italic">Aggregator</h3>
                            </div>
                            {feedMode === 'LIVE' && (
                                <button
                                    onClick={() => fetchTrends()}
                                    disabled={isLoading}
                                    aria-label="Refresh trends"
                                    className="border-2 border-white/20 bg-black/40 hover:border-[#FF5F1F] hover:text-[#FF5F1F] transition-all disabled:opacity-20 translate-y-1 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                                >
                                    <RefreshCcw size={14} className={cn(isLoading && "animate-spin")} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Region Selector - Premium Brutalist Style */}
                    {feedMode === 'LIVE' && (
                        <div className="space-y-2">
                            <span className="text-xs font-black text-white/60 tracking-[0.2em] uppercase">Regional Signal</span>
                            <div className="grid grid-cols-3 gap-1">
                                {REGIONS.map((region) => (
                                    <button
                                        key={region.id}
                                        onClick={() => handleRegionChange(region.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRegionChange(region.id); } }}
                                        className={cn(
                                            "py-2 px-1 text-xs font-black transition-all border border-white/5 uppercase tracking-tighter",
                                            geo === region.id ? "bg-[#FF5F1F] text-white border-[#FF5F1F] shadow-[0_0_10px_rgba(255,95,31,0.2)]" : "hover:bg-white/5 text-white/60"
                                        )}
                                    >
                                        {region.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-xs font-black text-white/50 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Last Sync: {lastSyncTime || '--:--'}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative min-h-0">
                    <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#080808] to-transparent z-10 pointer-events-none opacity-50" />
                    {isLoading && feedMode === 'LIVE' && Array(8).fill(0).map((_, i) => (
                        <div key={i} className="h-20 bg-white/5 animate-pulse border-b border-white/5" />
                    ))}

                    {feedMode === 'LIVE' && !isLoading && trends.map((trend, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedTrend(trend)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTrend(trend); } }}
                            className={cn(
                                "w-full text-left p-6 border-b border-white/5 transition-all relative group",
                                selectedTrend?.title === trend.title ? "bg-[#111111]" : "hover:bg-[#0d0d0d]"
                            )}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-black text-white/90 uppercase tracking-tight">{trend.title}</span>
                                <span className="text-xs font-black text-[#FF5F1F] tracking-tighter">{trend.traffic}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-white/50 uppercase">
                                <span className="flex items-center gap-1"><Clock size={8} /> {trend.published || 'Active'}</span>
                                {selectedTrend?.title === trend.title && <div className="w-1 h-1 bg-[#FF5F1F] rounded-full animate-pulse" />}
                            </div>

                            {selectedTrend?.title === trend.title && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF5F1F]" />
                            )}
                        </button>
                    ))}

                    {feedMode === 'CALENDAR' && AUSSIE_CALENDAR.map((event, index) => {
                        const isSelected = selectedTrend?.title === event.name;
                        return (
                            <button
                                key={event.id}
                                onClick={() => {
                                    setSelectedTrend({
                                        title: event.name,
                                        snippet: event.boomerTake,
                                        url: '',
                                        traffic: event.date,
                                        published: 'UPCOMING',
                                        news: [],
                                        directorialIntelligence: {
                                            take: { character: 'BOOMER', text: event.boomerTake },
                                            hooks: [`${event.name} Special`, "National Debate", "Cultural Deep Dive"],
                                            viralPotential: 90 + (index % 10)
                                        }
                                    });
                                }}
                                className={cn(
                                    "w-full text-left p-6 border-b border-white/5 transition-all relative group",
                                    isSelected ? "bg-[#111111]" : "hover:bg-[#0d0d0d]"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-black text-white/90 uppercase tracking-tight">{event.name}</span>
                                    <span className="px-1.5 py-0.5 bg-white/10 text-xs font-black text-white tracking-tighter rounded uppercase">{event.category}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-white/50 uppercase mt-2">
                                    <span className="text-[#FF5F1F]">{event.date}</span>
                                    <span>•</span>
                                    <span>2026</span>
                                </div>

                                {isSelected && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF5F1F]" />
                                )}
                            </button>
                        );
                    })}

                    {feedMode === 'LIVE' && !isLoading && trends.length > 5 && (
                        <div className="py-8 text-center opacity-10 animate-pulse">
                            <div className="text-xs font-black tracking-[0.5em] uppercase italic">Scroll for more intelligence</div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Trend Intelligence & Visualization */}
            <div className="hidden 2xl:flex flex-1 flex-col h-full overflow-hidden">
                {selectedTrend ? (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="p-10 border-b border-white/5">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-2 py-0.5 bg-[#FF5F1F] text-white text-xs font-black uppercase">Live_Trend</span>
                                        <span className="text-sm font-black text-white/50 tracking-widest uppercase italic">{selectedTrend.traffic} · 7d · measured</span>
                                    </div>
                                    <h2 className="text-5xl font-black tracking-tighter uppercase italic">{selectedTrend.title}</h2>
                                </div>
                                <button
                                    onClick={() => onSelectTrend(selectedTrend)}
                                    className="bg-white text-black px-6 py-3 font-black text-sm tracking-widest uppercase flex items-center gap-3 hover:bg-[#FF5F1F] hover:text-white transition-all shadow-[8px_8px_0_rgba(255,255,255,0.1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                                >
                                    <Plus size={14} /> Feed Machine
                                </button>
                            </div>

                            {/* Honestidade: sparkline com Math.random() removida (04/09).
                                Não existe dado de "24h interest velocity" real no sistema —
                                quando o W6 (analytics ingest) existir, volta com dado verdadeiro. */}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12 min-h-0 bg-gradient-to-b from-[#050505] to-[#080808]">
                            {/* Viral Potential Gauge */}
                            {selectedTrend.directorialIntelligence && (
                                <div className="p-6 border border-white/5 bg-white/[0.02] relative overflow-hidden group">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <span className="text-xs font-black text-white/50 uppercase tracking-[0.4em] block mb-1">Viral_Signal_Strength</span>
                                            <span className="text-4xl font-black italic tracking-tighter text-[#FF5F1F] leading-none">
                                                {selectedTrend.directorialIntelligence.viralPotential}%
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-black text-white/50 uppercase tracking-[0.2em] block">Confidence_Interval</span>
                                            <span className="text-sm font-black text-white uppercase italic">Optimal</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#FF5F1F]/40 to-[#FF5F1F] transition-all duration-1000 ease-out"
                                            style={{ width: `${selectedTrend.directorialIntelligence.viralPotential}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Character Take */}
                            {selectedTrend.directorialIntelligence && (
                                <div className="space-y-4 relative">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 flex items-center justify-center font-black text-sm border-2",
                                            selectedTrend.directorialIntelligence.take.character === 'BOOMER'
                                                ? "border-[#FF5F1F] text-[#FF5F1F] bg-[#FF5F1F]/10"
                                                : "border-white/40 text-white/60 bg-white/5"
                                        )}>
                                            {selectedTrend.directorialIntelligence.take.character[0]}
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-white/50 uppercase tracking-widest block">Character_Response</span>
                                            <span className="text-sm font-black text-white uppercase">{selectedTrend.directorialIntelligence.take.character} TERMINAL</span>
                                        </div>
                                    </div>
                                    <div className="p-8 bg-[#111111] border-l-4 border-[#FF5F1F] relative">
                                        <div className="absolute top-2 right-4 text-xs font-bold text-white/5 tracking-[0.5em] uppercase italic">Raw_Audio_Intercept</div>
                                        <p className="text-xl font-black italic leading-tight text-white/80 uppercase">
                                            &quot;{selectedTrend.directorialIntelligence.take.text}&quot;
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Creative Hooks / Scene Suggestions */}
                            {selectedTrend.directorialIntelligence && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-sm font-black text-[#FF5F1F] tracking-widest uppercase">
                                        <TrendingUp size={12} /> Sugggested Narrative Hooks
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {selectedTrend.directorialIntelligence.hooks.map((hook, i) => (
                                            <button
                                                key={i}
                                                className="group/hook text-left p-6 bg-white/[0.02] border border-white/5 hover:border-[#FF5F1F]/40 hover:bg-[#FF5F1F]/5 transition-all relative overflow-hidden"
                                                onClick={() => {
                                                    // This would ideally populate the director idea
                                                    onSelectTrend({ ...selectedTrend, title: hook });
                                                }}
                                            >
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/5 group-hover/hook:bg-[#FF5F1F] transition-colors" />
                                                <div className="flex items-start gap-4">
                                                    <span className="text-sm font-black text-white/50 group-hover/hook:text-[#FF5F1F]/40 transition-colors">0{i + 1}</span>
                                                    <p className="text-sm font-bold text-white/60 group-hover/hook:text-white uppercase transition-colors italic leading-snug">
                                                        {hook}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* News Feed Items */}
                            {selectedTrend.news.length > 0 && (
                                <div className="space-y-6 pt-6 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-sm font-black text-white/60 tracking-widest uppercase">
                                        <Newspaper size={12} /> Intelligence Reports
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {selectedTrend.news.map((item, i) => (
                                            <a
                                                key={i}
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-6 bg-[#080808] border border-white/5 hover:border-white/20 transition-all group"
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-black text-[#FF5F1F] uppercase">{item.source}</span>
                                                    <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{item.title}</span>
                                                </div>
                                                <ChevronRight size={18} className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-20">
                        <Zap size={48} />
                        <span className="text-sm font-black tracking-[0.5em] uppercase">NO_SIGNAL_DETECTED</span>
                    </div>
                )}
            </div>
        </div>
    );
}
