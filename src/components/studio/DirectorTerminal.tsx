import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BrainCircuit, 
  Wand2, 
  X, 
  RefreshCcw, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  Zap, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Clock, 
  BarChart3, 
  Newspaper,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AUSSIE_CALENDAR } from '@/data/calendar';

export type Trend = {
  title: string;
  snippet: string;
  url: string;
  traffic: string;
  published: string;
  news: { title: string, source: string, url: string }[];
  directorialIntelligence?: {
    take: { character: 'BOOMER' | 'KEV', text: string };
    hooks: string[];
    viralPotential: number;
  };
};

interface DirectorTerminalProps {
  directorIdea: string;
  setDirectorIdea: (val: string) => void;
  directorSnippet: string;
  setDirectorSnippet: (val: string) => void;
  triggerInstructor: () => void;
  isGenerating: boolean;
  isInterviewing: boolean;
  setIsInterviewing: (val: boolean) => void;
  generateAIScript: (trend?: { title: string, snippet: string, intelligence: any }) => void;
  isGeneratingQuestions: boolean;
  interviewQuestions: string[];
  currentAnswers: string[];
  setCurrentAnswers: (val: string[]) => void;
  finalizeInterview: () => void;
  isRefiningBlueprint: boolean;
}

const REGIONS = [
  { id: 'AU', name: 'Australia' },
  { id: 'US', name: 'United States' },
  { id: 'BR', name: 'South America' },
  { id: 'GB', name: 'Europe' },
  { id: 'TR', name: 'Middle East' },
  { id: 'IN', name: 'Asia' }
];

export function DirectorTerminal({
  directorIdea,
  setDirectorIdea,
  directorSnippet,
  setDirectorSnippet,
  triggerInstructor,
  isGenerating,
  isInterviewing,
  setIsInterviewing,
  generateAIScript,
  isGeneratingQuestions,
  interviewQuestions,
  currentAnswers,
  setCurrentAnswers,
  finalizeInterview,
  isRefiningBlueprint
}: DirectorTerminalProps) {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [geo, setGeo] = useState('AU');
  const [isLoading, setIsLoading] = useState(true);
  const [feedMode, setFeedMode] = useState<'LIVE' | 'CALENDAR'>('LIVE');
  const [lastSyncTime, setLastSyncTime] = useState('');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchTrends = useCallback(async (currentGeo?: string) => {
    const targetGeo = currentGeo || geo;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/trends?geo=${targetGeo}`);
      const data = await response.json();
      if (!data.error) {
        setTrends(data);
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.error("TRENDS_FETCH_ERROR", err);
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

  const handleFeedMachine = (trend: Trend) => {
    console.log("🔥 [Feed_Machine] Populating narrative command center:", trend.title);
    setDirectorIdea(trend.title);
    setDirectorSnippet(trend.snippet);
    
    // Fill text and generate
    generateAIScript({
      title: trend.title,
      snippet: trend.snippet,
      intelligence: trend.directorialIntelligence
    });
    
    // Smooth scroll to top of Narrative Terminal
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto scroll-smooth bg-[#050505] pb-24"
    >
      <div className="max-w-7xl mx-auto px-8 md:px-16 py-12 space-y-16 animate-in fade-in duration-700">
        
        {/* SECTION 1: NARRATIVE COMMAND CENTER */}
        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic text-white/90">
              Feed the <span className="text-[#FF5F1F]">Machine.</span>
            </h2>
            <p className="text-xs md:text-sm text-white/60 font-bold uppercase tracking-[0.2em] max-w-xl leading-relaxed">
              The engine will synthesize storytelling, character motion, and cinematic framing from your core idea.
            </p>
          </div>

          {/* Main Input Terminal (Brutalist Glassmorphism) */}
          <div className="rounded-none border-2 border-white/20 bg-black/60 backdrop-blur-3xl overflow-hidden shadow-[12px_12px_0_rgba(255,95,31,0.15)] hover:shadow-[16px_16px_0_rgba(255,95,31,0.25)] transition-all relative ring-1 ring-black/20">
            {/* Ambient Glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF5F1F]/30 to-transparent opacity-50" />
            
            <div className="p-8 md:p-10 flex flex-col h-[400px] relative">
              {/* Status Header */}
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-8 h-8 rounded-none bg-white/5 flex items-center justify-center border border-white/10">
                    <Zap size={14} className="text-[#FF5F1F]" />
                  </div>
                  <span className="text-xs font-black tracking-[0.2em] uppercase text-white/70">Narrative Terminal</span>
                </div>
                {directorIdea.length > 0 && (
                  <div className="flex items-center gap-3 bg-black/40 px-4 py-2 border border-white/10 rounded-none">
                    <span className="text-xs font-black text-white/60 uppercase tracking-[0.2em]">Signal</span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={cn("w-1.5 h-1.5 rounded-none transition-colors duration-500",
                            i < Math.min(5, Math.ceil(directorIdea.length / 50)) ? "bg-[#FF5F1F] shadow-[0_0_8px_rgba(255,95,31,0.6)]" : "bg-white/10"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable Entry Field */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
                {/* Rótulo visível: o placeholder some quando o usuário digita e deixava o campo sem identificação. */}
                <label htmlFor="director-idea" className="block text-xs font-black text-white/60 uppercase tracking-widest mb-2">
                  Episode topic and directorial notes
                </label>
                <textarea
                  id="director-idea"
                  value={directorIdea}
                  onChange={(e) => {
                    setDirectorIdea(e.target.value);
                  }}
                  placeholder={`Topic (e.g. NRL vs AFL)\nDirectorial Notes (e.g. Kev wearing NRL Jersey)`}
                  className="w-full bg-transparent border-none text-2xl md:text-3xl font-black italic uppercase placeholder:text-white/50 focus:ring-0 outline-none resize-none min-h-full tracking-tight leading-[1.3] py-2 text-[#FF5F1F]/90"
                />
              </div>

              {/* Sticky Action Bar */}
              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center shrink-0 relative z-[100]">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      console.log("🧠 [Neural_Input] Instructor Triggered");
                      triggerInstructor();
                    }}
                    disabled={!directorIdea || isGenerating || isInterviewing}
                    className="px-6 py-3 border-2 border-[#FF5F1F]/40 bg-[#FF5F1F]/5 text-[#FF5F1F] text-sm font-black tracking-widest uppercase hover:bg-[#FF5F1F] hover:text-white hover:border-[#FF5F1F] backdrop-blur-md transition-all flex items-center gap-2 group active:scale-95 disabled:opacity-30 min-h-[44px]"
                  >
                    <BrainCircuit size={14} className="group-hover:rotate-12 transition-transform" />
                    Plan with Instructor
                  </button>
                  {/* Removido "Confidence: 98.4%": número hardcoded, não calculado de nada. */}
                </div>

                <button
                  id="production-trigger"
                  onClick={() => generateAIScript()}
                  disabled={!directorIdea || isGenerating}
                  className="bg-[#FF5F1F] text-black px-8 md:px-12 py-4 font-black text-xs tracking-widest uppercase hover:bg-white hover:text-black shadow-[6px_6px_0_rgba(255,95,31,0.25)] hover:shadow-none transition-all duration-300 flex items-center gap-4 relative z-[9999] cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  <span>{isGenerating ? "Generating..." : "Start Production"}</span>
                  <Wand2 size={16} className={cn(isGenerating && "animate-pulse")} />
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Directive & Interview Overlays */}
          {isInterviewing && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <div className="rounded-none border-2 border-white/20 bg-black/80 backdrop-blur-3xl overflow-hidden shadow-[12px_12px_0_rgba(255,95,31,0.1)] relative ring-1 ring-black/20">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF5F1F]/20 to-transparent opacity-30" />
                
                <div className="p-8 md:p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-none bg-white/5 border border-white/10 flex items-center justify-center group shadow-inner">
                        <BrainCircuit size={24} className="text-[#FF5F1F] group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-white/90 uppercase">Instructor Analysis</h3>
                        <p className="text-xs text-white/60 font-black tracking-widest uppercase mt-1">Neural Psychology Module v2.7</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsInterviewing(false)} 
                      aria-label="Close interview panel"
                      className="w-10 h-10 rounded-none bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-red-400 transition-all text-white/50 min-w-[44px] min-h-[44px]"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {isGeneratingQuestions ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-5">
                      <RefreshCcw size={32} className="text-[#FF5F1F] animate-spin" />
                      <p className="text-xs font-black tracking-[0.2em] uppercase text-white/60">Synthesizing inquiries...</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {interviewQuestions.map((q, i) => (
                        <div key={i} className="space-y-4 bg-black/40 p-6 rounded-none border border-white/5">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 w-6 h-6 rounded-none bg-[#FF5F1F]/20 text-[#FF5F1F] flex items-center justify-center text-sm font-bold shrink-0">
                              {i + 1}
                            </div>
                            <p className="text-sm font-bold text-white/80 tracking-tight leading-relaxed uppercase">{q}</p>
                          </div>
                          <div className="pl-10">
                            <input
                              type="text"
                              value={currentAnswers[i] || ""}
                              onChange={(e) => {
                                const newAnswers = [...currentAnswers];
                                newAnswers[i] = e.target.value;
                                setCurrentAnswers(newAnswers);
                              }}
                              placeholder="Type your response..."
                              className="w-full bg-white/5 rounded-none border-b-2 border-white/20 px-5 py-4 text-white font-medium placeholder:text-white/50 focus:border-[#FF5F1F] focus:bg-white/10 outline-none transition-all"
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={finalizeInterview}
                        disabled={isRefiningBlueprint || currentAnswers.some(a => !a)}
                        className="w-full py-5 bg-[#FF5F1F] text-black rounded-none font-black text-xs tracking-widest uppercase hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] shadow-[6px_6px_0_rgba(255,95,31,0.25)] min-h-[44px]"
                      >
                        {isRefiningBlueprint ? (
                          <>
                            <RefreshCcw size={18} className="animate-spin" />
                            Weaving Blueprint...
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={18} />
                            Finalize Blueprint
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {directorSnippet && (
            <div className="animate-in slide-in-from-bottom-4 duration-700">
              <div className="p-8 rounded-none border-2 border-[#FF5F1F]/40 bg-gradient-to-br from-[#FF5F1F]/10 to-transparent backdrop-blur-2xl relative overflow-hidden group shadow-[12px_12px_0_rgba(255,95,31,0.1)] ring-1 ring-black/20">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-none bg-[#FF5F1F]/20 flex items-center justify-center">
                      <Sparkles size={14} className="text-[#FF5F1F]" />
                    </div>
                    <span className="text-sm font-black text-white/90 uppercase tracking-widest">Refined Directive</span>
                  </div>
                  <button 
                    onClick={() => setDirectorSnippet("")} 
                    aria-label="Delete directive"
                    className="w-8 h-8 rounded-none bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white text-white/60 transition-all min-w-[44px] min-h-[44px]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  value={directorSnippet}
                  onChange={(e) => setDirectorSnippet(e.target.value)}
                  className="w-full bg-transparent border-none text-xs font-bold text-white/70 leading-relaxed outline-none resize-none min-h-[100px] focus:text-white/90 transition-colors uppercase font-mono"
                />
                <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                  <BrainCircuit size={160} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: DYNAMIC TRENDS & SIGNALS MIXER */}
        <div className="border-t border-white/10 pt-16 space-y-10">
          
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <span className="text-[#FF5F1F] text-sm font-black uppercase tracking-[0.3em] block mb-2 italic">Global Signal Aggregator</span>
              <h3 className="text-3xl font-black tracking-tighter uppercase italic text-white/90">Viral Signals & Hot Topics</h3>
            </div>
            
            {/* Live Wire / Planner Toggle */}
            <div className="flex rounded-none overflow-hidden border-2 border-white/20 p-0.5 bg-black/60">
              <button
                onClick={() => setFeedMode('LIVE')}
                className={cn("px-5 py-3 text-xs font-black uppercase tracking-widest transition-all cursor-pointer min-h-[40px] flex items-center gap-2",
                  feedMode === 'LIVE' ? "bg-[#FF5F1F] text-black" : "text-white/60 hover:text-white hover:bg-white/5")}
              >
                <TrendingUp size={12} />
                LIVE WIRE
              </button>
              <button
                onClick={() => setFeedMode('CALENDAR')}
                className={cn("px-5 py-3 text-xs font-black uppercase tracking-widest transition-all cursor-pointer min-h-[40px] flex items-center gap-2",
                  feedMode === 'CALENDAR' ? "bg-[#FF5F1F] text-black" : "text-white/60 hover:text-white hover:bg-white/5")}
              >
                <CalendarIcon size={12} />
                2026 PLANNER
              </button>
            </div>
          </div>

          {/* Filter Sub-Bar */}
          {feedMode === 'LIVE' && (
            <div className="flex flex-wrap items-center justify-between gap-6 bg-[#080808]/90 border border-white/5 p-4 rounded-none">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-white/60 uppercase tracking-widest font-mono">Select Region:</span>
                <div className="flex flex-wrap gap-1">
                  {REGIONS.map((region) => (
                    <button
                      key={region.id}
                      onClick={() => handleRegionChange(region.id)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-black transition-all uppercase tracking-tighter border border-transparent",
                        geo === region.id ? "bg-[#FF5F1F]/15 text-[#FF5F1F] border-[#FF5F1F]/30" : "hover:bg-white/5 text-white/60"
                      )}
                    >
                      {region.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-white/60 uppercase">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Signal Sync: {lastSyncTime || '--:--'}
                <button
                  onClick={() => fetchTrends()}
                  disabled={isLoading}
                  className="ml-2 hover:text-white transition-colors"
                  aria-label="Manual refresh"
                >
                  <RefreshCcw size={10} className={cn(isLoading && "animate-spin")} />
                </button>
              </div>
            </div>
          )}

          {/* Loading Shimmer State */}
          {isLoading && feedMode === 'LIVE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-64 bg-[#080808] border border-white/5 animate-pulse" />
              ))}
            </div>
          )}

          {/* Live Wire Trends Grid */}
          {feedMode === 'LIVE' && !isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {trends.map((trend, index) => (
                <div 
                  key={index}
                  className="bg-[#080808]/90 border border-white/5 hover:border-[#FF5F1F]/30 transition-all flex flex-col justify-between p-8 relative group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#FF5F1F]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="space-y-5">
                    {/* Badge details */}
                    <div className="flex justify-between items-center text-xs font-mono text-white/60 uppercase tracking-widest">
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/70">Live Signal</span>
                      <span className="text-[#FF5F1F] font-bold">{trend.traffic} · 7d · measured</span>
                    </div>

                    <h4 className="text-xl font-black italic tracking-tighter uppercase text-white/90 leading-tight">
                      {trend.title}
                    </h4>
                    
                    <p className="text-xs text-white/55 leading-relaxed font-medium">
                      {trend.snippet}
                    </p>

                    {/* Speech take preview */}
                    {trend.directorialIntelligence && (
                      <div className="p-4 bg-black/40 border-l border-[#FF5F1F]/40 font-mono text-sm text-white/60 leading-snug">
                        <span className="text-[#FF5F1F] font-black mr-1">{trend.directorialIntelligence.take.character}:</span>
                        &quot;{trend.directorialIntelligence.take.text.substring(0, 80)}...&quot;
                      </div>
                    )}

                    {/* News reports */}
                    {trend.news.length > 0 && (
                      <div className="space-y-2 pt-4 border-t border-white/5">
                        <span className="text-xs font-black text-white/50 uppercase tracking-[0.2em] flex items-center gap-1">
                          <Newspaper size={8} /> Intel Reports:
                        </span>
                        {trend.news.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-white/60 hover:text-white/60">
                            <span className="font-bold underline truncate max-w-[80%]">{item.title}</span>
                            <span className="text-xs font-mono text-[#FF5F1F]/70">{item.source}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CTA button */}
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <button
                      onClick={() => handleFeedMachine(trend)}
                      className="w-full py-3 bg-[#FF5F1F]/10 hover:bg-[#FF5F1F] text-[#FF5F1F] hover:text-black border border-[#FF5F1F]/30 hover:border-transparent text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group-hover:scale-[1.01]"
                    >
                      <Zap size={10} fill="currentColor" />
                      Feed Machine
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2026 Planner Events Grid */}
          {feedMode === 'CALENDAR' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {AUSSIE_CALENDAR.map((event) => (
                <div 
                  key={event.id}
                  className="bg-[#080808]/90 border border-white/5 hover:border-[#FF5F1F]/30 transition-all flex flex-col justify-between p-8 relative group"
                >
                  <div className="space-y-5">
                    {/* Badge details */}
                    <div className="flex justify-between items-center text-xs font-mono text-white/60 uppercase tracking-widest">
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/70">{event.category}</span>
                      <span className="text-[#FF5F1F] font-bold">{event.date} // 2026</span>
                    </div>

                    <h4 className="text-xl font-black italic tracking-tighter uppercase text-white/90 leading-tight">
                      {event.name}
                    </h4>

                    {/* Speech take previews */}
                    <div className="space-y-2 pt-2">
                      <div className="p-3 bg-black/40 border-l border-[#FF5F1F]/40 font-mono text-xs text-white/60 leading-snug">
                        <span className="text-[#FF5F1F] font-black mr-1">BOOMER:</span>
                        &quot;{event.boomerTake.substring(0, 80)}...&quot;
                      </div>
                      <div className="p-3 bg-black/40 border-l border-white/20 font-mono text-xs text-white/60 leading-snug">
                        <span className="text-white/60 font-black mr-1">KEV:</span>
                        &quot;{event.kevTake.substring(0, 80)}...&quot;
                      </div>
                    </div>
                  </div>

                  {/* CTA button */}
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <button
                      onClick={() => handleFeedMachine({
                        title: event.name,
                        snippet: event.boomerTake,
                        url: '',
                        traffic: event.date,
                        published: 'UPCOMING',
                        news: [],
                        directorialIntelligence: {
                          take: { character: 'BOOMER', text: event.boomerTake },
                          hooks: [`${event.name} Special`, "National Debate", "Cultural Deep Dive"],
                          viralPotential: 92
                        }
                      })}
                      className="w-full py-3 bg-[#FF5F1F]/10 hover:bg-[#FF5F1F] text-[#FF5F1F] hover:text-black border border-[#FF5F1F]/30 hover:border-transparent text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Zap size={10} fill="currentColor" />
                      Feed Machine
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
