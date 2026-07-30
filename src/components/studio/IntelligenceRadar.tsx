"use client";

import React, { useState, useEffect } from 'react';
import { Target, Activity, Zap, Search, ArrowUpRight, Users, Sparkles, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import benchmarkData from '@/data/radar.json';

interface Benchmark {
  name: string;
  category: string;
  url: string;
  retention_strategy: string;
  why_we_follow: string;
  status: string;
}

export function IntelligenceRadar() {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);

  useEffect(() => {
    // Load from json. We can also fetch live updates here in the future
    setBenchmarks(benchmarkData as Benchmark[]);
  }, []);

  const categories = ['ALL', ...Array.from(new Set(benchmarks.map(b => b.category)))];

  const filteredBenchmarks = activeFilter === 'ALL' 
    ? benchmarks 
    : benchmarks.filter(b => b.category === activeFilter);

  return (
    <div className="flex-1 overflow-y-auto px-12 py-12 bg-[#050505] text-white">
      {/* HEADER */}
      <div className="mb-12 border-b border-white/10 pb-6 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <span className="text-sm font-black text-[#FF5F1F] tracking-[0.4em] block uppercase italic mb-1">Competitive Intelligence</span>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase italic">Radar de Excelência</h2>
          <p className="text-white/50 text-xs font-mono mt-2 max-w-xl">
            Repositório interno de benchmarks, atualizações tecnológicas e influenciadores digitais. 
            Mantenha Boomer & Kev alinhados com o estado da arte do mercado.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 px-4 py-1.5 border border-[#FF5F1F]/30 bg-[#FF5F1F]/5 text-[#FF5F1F] text-xs font-black tracking-widest uppercase">
            <Target size={12} /> TRACKING {benchmarks.length} MARKET LEADERS
          </div>
          <span className="text-xs font-mono text-white/60 uppercase tracking-widest flex items-center gap-1">
            <Zap size={10} className="text-yellow-500" />
            NO UNAUTHORIZED SYSTEM UPDATES ALLOWED
          </span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={cn(
              "px-4 py-2 text-sm font-black tracking-widest uppercase border transition-colors",
              activeFilter === cat 
                ? "bg-[#FF5F1F] text-black border-[#FF5F1F]" 
                : "bg-black/50 text-white/50 border-white/10 hover:border-white/30 hover:text-white"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredBenchmarks.map((item, idx) => (
          <div key={idx} className="border border-white/10 bg-[#0A0A0A] p-6 hover:border-[#FF5F1F]/50 transition-colors group flex flex-col h-full shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-black tracking-tighter uppercase text-white group-hover:text-[#FF5F1F] transition-colors">{item.name}</h3>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
                <ArrowUpRight size={20} />
              </a>
            </div>
            
            <div className="inline-flex self-start mb-6 items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 text-xs font-black tracking-widest uppercase text-white/70">
              <Users size={10} /> {item.category}
            </div>

            <div className="space-y-4 flex-grow">
              <div>
                <h4 className="text-sm font-black text-[#FF5F1F] tracking-widest uppercase mb-1 flex items-center gap-1">
                  <Activity size={12} /> Retention Strategy
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">{item.retention_strategy}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-black text-[#00f2fe] tracking-widest uppercase mb-1 flex items-center gap-1">
                  <Sparkles size={12} /> Why We Follow
                </h4>
                <p className="text-xs text-white/70 leading-relaxed font-mono italic">{item.why_we_follow}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-white/60 uppercase">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {item.status}
              </span>
              <span>MARKET_BENCHMARK</span>
            </div>
          </div>
        ))}
      </div>

      {/* TECH UPDATES "BLOG" SECTION */}
      <div className="mt-16 border-t border-white/10 pt-12">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="text-[#FF5F1F]" size={24} />
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">Technology & Engine Log</h2>
        </div>
        
        <div className="space-y-4">
          <div className="border-l-2 border-[#FF5F1F] pl-6 py-2">
            <span className="text-sm font-mono text-white/60 mb-1 block">SYS_UPDATE // {new Date().toISOString().split('T')[0]}</span>
            <h3 className="text-lg font-black uppercase text-white mb-2">Directorial Prompt Upgrades & UI Expansion</h3>
            <p className="text-sm text-white/60 leading-relaxed max-w-4xl">
              Added full support for dynamic wardrobe overlays injected by the DraftingTable intelligence. 
              Enhanced LibraryViewer to decode technical X-Ray metadata for prompt reverse-engineering.
              <br/><br/>
              <span className="text-[#FF5F1F] font-bold uppercase tracking-widest text-sm">Note: No engine version bumps (Kling/Replicate) will be executed without user explicit permission.</span>
            </p>
          </div>
          
          <div className="border-l-2 border-white/20 pl-6 py-2 opacity-70">
            <span className="text-sm font-mono text-white/60 mb-1 block">SYS_UPDATE // 2026-07-18</span>
            <h3 className="text-lg font-black uppercase text-white mb-2">Pipeline Assembly Orchestrator</h3>
            <p className="text-sm text-white/60 leading-relaxed max-w-4xl">
              FFmpeg multiplexing optimized for parallel async generation. Integration of Wav2Lip for robust lipsync fallback mechanisms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
