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
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NewsItem = {
    title: string;
    source: string;
    url: string;
};

type Trend = {
    title: string;
    snippet: string;
    url: string;
    traffic: string;
    published: string;
    news: NewsItem[];
};

interface TrendsFeedProps {
    onSelectTrend: (trend: Trend) => void;
}

export function TrendsFeed({ onSelectTrend }: TrendsFeedProps) {
    const [trends, setTrends] = useState<Trend[]>([]);
    const [_error, setError] = useState<string | null>(null);
    const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSyncTime, setLastSyncTime] = useState<string>("");

    const fetchTrends = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/trends');
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setTrends(data);
            setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            if (data.length > 0 && !selectedTrend) {
                setSelectedTrend(data[0]);
            }
        } catch (err) {
            setError('SIGNAL_LOSS');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedTrend]);

    useEffect(() => {
        fetchTrends();
    }, [fetchTrends]);

    return (
        <div className="w-full lg:w-[800px] border-l border-white/5 bg-[#050505] flex h-full overflow-hidden">
            {/* LEFT: Trend List (Daily Aggregator) */}
            <div className="w-80 border-r border-white/5 flex flex-col h-full bg-[#080808]">
                <div className="p-8 border-b border-white/5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black text-[#FF5F1F] tracking-[0.4em] block mb-1 uppercase">Daily Feed</span>
                            <h3 className="text-xl font-black tracking-tighter uppercase">Aggregator</h3>
                        </div>
                        <button
                            onClick={fetchTrends}
                            disabled={isLoading}
                            className="p-2 border border-white/10 hover:border-[#FF5F1F] hover:text-[#FF5F1F] transition-all disabled:opacity-20"
                        >
                            <RefreshCcw size={14} className={cn(isLoading && "animate-spin")} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-[8px] font-black text-white/20 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Last Sync: {lastSyncTime || '--:--'}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading && Array(8).fill(0).map((_, i) => (
                        <div key={i} className="h-20 bg-white/5 animate-pulse border-b border-white/5" />
                    ))}

                    {!isLoading && trends.map((trend, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedTrend(trend)}
                            className={cn(
                                "w-full text-left p-6 border-b border-white/5 transition-all relative group",
                                selectedTrend?.title === trend.title ? "bg-[#111111]" : "hover:bg-[#0d0d0d]"
                            )}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[11px] font-black text-white/90 uppercase tracking-tight">{trend.title}</span>
                                <span className="text-[8px] font-black text-[#FF5F1F] tracking-tighter">{trend.traffic}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[8px] font-bold text-white/20 uppercase">
                                <span className="flex items-center gap-1"><Clock size={8} /> {trend.published || 'Active'}</span>
                                {selectedTrend?.title === trend.title && <div className="w-1 h-1 bg-[#FF5F1F] rounded-full animate-pulse" />}
                            </div>

                            {selectedTrend?.title === trend.title && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF5F1F]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* RIGHT: Trend Intelligence & Visualization */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {selectedTrend ? (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="p-10 border-b border-white/5">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-2 py-0.5 bg-[#FF5F1F] text-white text-[8px] font-black uppercase">Live_Trend</span>
                                        <span className="text-[10px] font-black text-white/20 tracking-widest uppercase italic">{selectedTrend.traffic} Searches</span>
                                    </div>
                                    <h2 className="text-5xl font-black tracking-tighter uppercase italic">{selectedTrend.title}</h2>
                                </div>
                                <button
                                    onClick={() => onSelectTrend(selectedTrend)}
                                    className="bg-white text-black px-6 py-3 font-black text-[10px] tracking-widest uppercase flex items-center gap-3 hover:bg-[#FF5F1F] hover:text-white transition-all shadow-[8px_8px_0_rgba(255,255,255,0.1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                                >
                                    <Plus size={14} /> Feed Machine
                                </button>
                            </div>

                            {/* Synthetic Sparkline (SVG) */}
                            <div className="w-full h-32 bg-white/[0.02] border border-white/5 relative group p-6 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#FF5F1F]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-end gap-1 h-full w-full justify-between relative z-10">
                                    {Array(40).fill(0).map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1 bg-[#FF5F1F] opacity-30 group-hover:opacity-60 transition-all duration-700"
                                            style={{ height: `${Math.random() * 80 + 20}%`, transitionDelay: `${i * 10}ms` }}
                                        />
                                    ))}
                                </div>
                                <div className="absolute top-2 right-4 flex items-center gap-2 text-[8px] font-black text-white/20 uppercase tracking-[0.4em]">
                                    <BarChart3 size={10} className="text-[#FF5F1F]" /> 24H_INTEREST_VELOCITY
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 grid grid-cols-1 gap-10">
                            {/* Context Summary */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-[#FF5F1F] tracking-widest uppercase">
                                    <ArrowUpRight size={12} /> Narrative Synthesis
                                </div>
                                <p className="text-2xl font-bold leading-tight text-white/60 uppercase">
                                    {selectedTrend.snippet}
                                </p>
                            </div>

                            {/* News Feed Items */}
                            {selectedTrend.news.length > 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-white/30 tracking-widest uppercase">
                                        <Newspaper size={12} /> Intelligence Reports
                                    </div>
                                    <div className="space-y-3">
                                        {selectedTrend.news.map((item, i) => (
                                            <a
                                                key={i}
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-6 bg-[#080808] border border-white/5 hover:border-white/20 transition-all group"
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-black text-[#FF5F1F] uppercase">{item.source}</span>
                                                    <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{item.title}</span>
                                                </div>
                                                <ChevronRight size={18} className="text-white/10 group-hover:text-white group-hover:translate-x-1 transition-all" />
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
                        <span className="text-[10px] font-black tracking-[0.5em] uppercase">NO_SIGNAL_DETECTED</span>
                    </div>
                )}
            </div>
        </div>
    );
}
