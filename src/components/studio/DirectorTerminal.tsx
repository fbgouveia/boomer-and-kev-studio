import React from 'react';
import { BrainCircuit, Wand2, X, RefreshCcw, ShieldCheck, Sparkles, Trash2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrendsFeed } from '@/components/Director/TrendsFeed';
import { Trend } from '@/components/Director/TrendsFeed';

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
  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto px-12 py-12 scroll-smooth bg-[#0a0a0a]/50">
        <div className="max-w-4xl mx-auto xl:mx-0 animate-in fade-in duration-700">
          <div className="mb-20 space-y-2">
            <h2 className="text-7xl font-black tracking-tighter uppercase italic">Feed the <span className="text-[#FF5F1F]">Machine.</span></h2>
            <p className="text-xl text-white/30 font-bold max-w-xl leading-snug uppercase tracking-tight">The engine will synthesize storytelling, character motion, and cinematic framing from your core idea.</p>
          </div>

          <div className="border-4 border-[#FF5F1F] bg-[#111111] overflow-hidden relative z-[1000] shadow-[0_0_100px_rgba(255,95,31,0.1)]">
            <div className="p-10 bg-[#0d0d0d] flex flex-col h-[600px] relative">
              {/* Status Header */}
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-2 opacity-40">
                  <Zap size={14} className="text-[#FF5F1F]" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Input_Narrative_Terminal</span>
                </div>
                {directorIdea.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Neural Signal</span>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={cn("w-1 h-3 transition-colors",
                            i < Math.min(5, Math.ceil(directorIdea.length / 50)) ? "bg-[#FF5F1F]" : "bg-white/5"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable Entry Field */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <textarea
                  value={directorIdea}
                  autoFocus
                  onChange={(e) => {
                    console.log("⌨️ [Neural_Input] Stream detected:", e.target.value.substring(0, 10));
                    setDirectorIdea(e.target.value);
                  }}
                  placeholder={`LINE 1: TOPIC (E.G. NRL VS AFL)\nLINE 2+: DIRECTORIAL NOTES (E.G. KEV WEARING NRL JERSEY)`}
                  className="w-full bg-transparent border-none text-4xl font-black text-white placeholder:text-white/10 focus:ring-0 outline-none resize-none min-h-full uppercase italic tracking-tighter leading-[0.85] py-4"
                />
              </div>

              {/* Sticky Action Bar */}
              <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center shrink-0 relative z-[100] bg-[#0d0d0d]">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      console.log("🧠 [Neural_Input] Instructor Triggered");
                      triggerInstructor();
                    }}
                    disabled={!directorIdea || isGenerating || isInterviewing}
                    className="px-6 py-3 border border-[#FF5F1F]/30 bg-[#FF5F1F]/5 text-[#FF5F1F] text-[10px] font-black uppercase tracking-widest hover:bg-[#FF5F1F] hover:text-white transition-all flex items-center gap-2 group active:scale-95 disabled:opacity-50"
                  >
                    <BrainCircuit size={14} className="group-hover:rotate-12 transition-transform" />
                    PLAN WITH INSTRUCTOR
                  </button>
                  <div className="px-3 py-1 border border-white/10 text-[10px] font-black text-white/20">AGENT_CONFIDENCE: 98.4%</div>
                </div>

                <button
                  id="production-trigger"
                  onClick={(e) => {
                    // Visual confirmation flash
                    const btn = e.currentTarget;
                    btn.style.backgroundColor = '#ffffff';
                    btn.style.color = '#000000';
                    console.warn("!! PRODUCTION_SIGNAL_SENT !!");
                    generateAIScript();
                  }}
                  disabled={!directorIdea || isGenerating}
                  className="bg-[#FF5F1F] text-white px-20 py-10 font-black text-2xl tracking-[0.4em] uppercase italic hover:bg-white hover:text-[#FF5F1F] transition-all transform active:scale-90 flex items-center gap-8 relative z-[9999] cursor-pointer disabled:opacity-50"
                >
                  <span>{isGenerating ? "GENERATING..." : "START PRODUCTION"}</span>
                  <Wand2 size={32} />
                </button>
              </div>
            </div>
          </div>

          {isInterviewing && (
            <div className="mt-8 animate-in slide-in-from-top-4 duration-500">
              <div className="studio-panel p-1 border-[#FF5F1F]/30 bg-[#111111]">
                <div className="p-10 bg-[#0d0d0d] space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="cine-icon w-12 h-12 border-[#FF5F1F]/30 bg-[#FF5F1F]/5 group">
                        <BrainCircuit size={20} className="text-[#FF5F1F] group-hover:scale-110 transition-transform neural-sparkle" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase italic tracking-tighter">Instructor <span className="text-[#FF5F1F]">Analysis</span></h3>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Neural Psychology & Drama Module v2.7</p>
                      </div>
                    </div>
                    <button onClick={() => setIsInterviewing(false)} className="cine-icon w-8 h-8 border-white/5 hover:border-red-500 hover:text-red-500 transition-all">
                      <X size={14} />
                    </button>
                  </div>

                  {isGeneratingQuestions ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                      <RefreshCcw size={40} className="text-[#FF5F1F] animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Synthesizing targeted inquiries...</p>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {interviewQuestions.map((q, i) => (
                        <div key={i} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[#FF5F1F] text-xs font-black">0{i + 1}</span>
                            <p className="text-lg font-bold text-white/80 uppercase italic tracking-tight">{q}</p>
                          </div>
                          <input
                            type="text"
                            value={currentAnswers[i]}
                            onChange={(e) => {
                              const newAnswers = [...currentAnswers];
                              newAnswers[i] = e.target.value;
                              setCurrentAnswers(newAnswers);
                            }}
                            placeholder="TYPE YOUR RESPONSE..."
                            className="w-full bg-white/5 border border-white/10 p-4 text-white font-bold placeholder:text-white/10 focus:border-[#FF5F1F] outline-none uppercase transition-all"
                          />
                        </div>
                      ))}

                      <button
                        onClick={finalizeInterview}
                        disabled={isRefiningBlueprint || currentAnswers.some(a => !a)}
                        className="w-full py-6 bg-[#FF5F1F] text-white font-black text-xs tracking-[0.3em] uppercase hover:bg-white hover:text-[#FF5F1F] transition-all flex items-center justify-center gap-3 shadow-[10px_10px_0_rgba(255,95,31,0.2)]"
                      >
                        {isRefiningBlueprint ? (
                          <>
                            <RefreshCcw size={16} className="animate-spin" />
                            WEAVING BLUEPRINT...
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={16} />
                            FINALIZE DIRECTORIAL BLUEPRINT
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
            <div className="mt-8 animate-in slide-in-from-bottom-4 duration-700">
              <div className="p-6 bg-[#111111] border-l-4 border-[#FF5F1F] relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-[#FF5F1F]" />
                    <span className="text-[10px] font-black text-[#FF5F1F] uppercase tracking-widest">Refined Directive</span>
                  </div>
                  <button onClick={() => setDirectorSnippet("")} className="text-white/10 hover:text-white"><Trash2 size={12} /></button>
                </div>
                <textarea
                  value={directorSnippet}
                  onChange={(e) => setDirectorSnippet(e.target.value)}
                  className="w-full bg-transparent border-none text-xs font-bold text-white/60 leading-relaxed uppercase outline-none resize-none min-h-[100px]"
                />
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <BrainCircuit size={80} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="hidden 2xl:block h-full flex flex-col min-w-0 max-h-full">
        <TrendsFeed onSelectTrend={(trend: Trend) => {
          setDirectorIdea(trend.title);
          setDirectorSnippet(trend.snippet);
          generateAIScript({
            title: trend.title,
            snippet: trend.snippet,
            intelligence: trend.directorialIntelligence
          });
        }} />
      </aside>
    </div>
  );
}
