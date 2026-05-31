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
    <div className="flex-1 flex overflow-hidden min-h-0 bg-transparent">
      <div className="flex-1 overflow-y-auto px-8 md:px-12 py-12 scroll-smooth">
        <div className="max-w-4xl mx-auto xl:mx-0 animate-in fade-in duration-700">
          
          <div className="mb-12 space-y-3">
            <h2 className="text-5xl md:text-6xl font-semibold tracking-tight text-white/90">
              Feed the <span className="text-[#FF5F1F]">Machine.</span>
            </h2>
            <p className="text-lg text-white/40 font-medium max-w-xl leading-relaxed tracking-wide">
              The engine will synthesize storytelling, character motion, and cinematic framing from your core idea.
            </p>
          </div>

          {/* Main Input Terminal (Tahoe iOS 27 Glassmorphism) */}
          <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-3xl overflow-hidden shadow-2xl relative z-[1000] ring-1 ring-black/20">
            {/* Ambient Glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
            
            <div className="p-8 md:p-10 flex flex-col h-[500px] relative">
              {/* Status Header */}
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex items-center gap-3 opacity-60">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Zap size={14} className="text-[#FF5F1F]" />
                  </div>
                  <span className="text-[11px] font-medium tracking-widest uppercase text-white/70">Narrative Terminal</span>
                </div>
                {directorIdea.length > 0 && (
                  <div className="flex items-center gap-3 bg-black/20 px-4 py-2 rounded-full border border-white/5">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">Signal</span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={cn("w-1.5 h-1.5 rounded-full transition-colors duration-500",
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
                <textarea
                  value={directorIdea}
                  autoFocus
                  onChange={(e) => {
                    console.log("⌨️ [Neural_Input] Stream detected:", e.target.value.substring(0, 10));
                    setDirectorIdea(e.target.value);
                  }}
                  placeholder={`Topic (e.g. NRL vs AFL)\nDirectorial Notes (e.g. Kev wearing NRL Jersey)`}
                  className="w-full bg-transparent border-none text-2xl md:text-3xl font-medium text-white/90 placeholder:text-white/20 focus:ring-0 outline-none resize-none min-h-full tracking-tight leading-[1.4] py-2"
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
                    className="px-5 py-3 rounded-full border border-white/10 bg-white/5 text-white/70 text-[11px] font-semibold tracking-wide hover:bg-white/10 hover:text-white backdrop-blur-md transition-all flex items-center gap-2 group active:scale-95 disabled:opacity-30"
                  >
                    <BrainCircuit size={14} className="group-hover:rotate-12 transition-transform text-[#FF5F1F]" />
                    Plan with Instructor
                  </button>
                  <div className="hidden sm:block px-4 py-2 rounded-full bg-black/20 border border-white/5 text-[10px] font-medium text-white/40">
                    Confidence: 98.4%
                  </div>
                </div>

                <button
                  id="production-trigger"
                  onClick={(e) => {
                    generateAIScript();
                  }}
                  disabled={!directorIdea || isGenerating}
                  className="bg-gradient-to-r from-[#FF5F1F] to-[#E04B14] rounded-[20px] text-white px-8 md:px-12 py-4 font-bold text-sm tracking-widest uppercase hover:scale-[1.02] shadow-[0_8px_32px_rgba(255,95,31,0.25)] hover:shadow-[0_12px_48px_rgba(255,95,31,0.4)] transition-all duration-300 flex items-center gap-4 relative z-[9999] cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
                >
                  <span>{isGenerating ? "Generating..." : "Start Production"}</span>
                  <Wand2 size={20} className={cn(isGenerating && "animate-pulse")} />
                </button>
              </div>
            </div>
          </div>

          {isInterviewing && (
            <div className="mt-8 animate-in slide-in-from-top-4 duration-500">
              <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-3xl overflow-hidden shadow-2xl relative ring-1 ring-black/20">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30" />
                
                <div className="p-8 md:p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group shadow-inner">
                        <BrainCircuit size={24} className="text-[#FF5F1F] group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold tracking-tight text-white/90">Instructor Analysis</h3>
                        <p className="text-[11px] text-white/40 font-medium tracking-wide mt-1">Neural Psychology Module v2.7</p>
                      </div>
                    </div>
                    <button onClick={() => setIsInterviewing(false)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-red-400 transition-all text-white/50">
                      <X size={16} />
                    </button>
                  </div>

                  {isGeneratingQuestions ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-5">
                      <RefreshCcw size={32} className="text-[#FF5F1F] animate-spin" />
                      <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-white/40">Synthesizing inquiries...</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {interviewQuestions.map((q, i) => (
                        <div key={i} className="space-y-4 bg-black/20 p-6 rounded-[24px] border border-white/5">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 w-6 h-6 rounded-full bg-[#FF5F1F]/20 text-[#FF5F1F] flex items-center justify-center text-[10px] font-bold shrink-0">
                              {i + 1}
                            </div>
                            <p className="text-base md:text-lg font-medium text-white/80 tracking-tight leading-relaxed">{q}</p>
                          </div>
                          <div className="pl-10">
                            <input
                              type="text"
                              value={currentAnswers[i]}
                              onChange={(e) => {
                                const newAnswers = [...currentAnswers];
                                newAnswers[i] = e.target.value;
                                setCurrentAnswers(newAnswers);
                              }}
                              placeholder="Type your response..."
                              className="w-full bg-white/5 rounded-xl border border-white/10 px-5 py-4 text-white font-medium placeholder:text-white/20 focus:border-[#FF5F1F]/50 focus:ring-1 focus:ring-[#FF5F1F]/50 focus:bg-white/10 outline-none transition-all"
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={finalizeInterview}
                        disabled={isRefiningBlueprint || currentAnswers.some(a => !a)}
                        className="w-full py-5 bg-white text-black rounded-2xl font-bold text-sm tracking-widest uppercase hover:bg-white/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] shadow-lg"
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
            <div className="mt-8 animate-in slide-in-from-bottom-4 duration-700">
              <div className="p-8 rounded-[24px] border border-[#FF5F1F]/30 bg-gradient-to-br from-[#FF5F1F]/10 to-transparent backdrop-blur-2xl relative overflow-hidden group shadow-[0_8px_32px_rgba(255,95,31,0.1)] ring-1 ring-black/20">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FF5F1F]/20 flex items-center justify-center">
                      <Sparkles size={14} className="text-[#FF5F1F]" />
                    </div>
                    <span className="text-[12px] font-semibold text-white/90 uppercase tracking-widest">Refined Directive</span>
                  </div>
                  <button onClick={() => setDirectorSnippet("")} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white text-white/40 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  value={directorSnippet}
                  onChange={(e) => setDirectorSnippet(e.target.value)}
                  className="w-full bg-transparent border-none text-sm font-medium text-white/70 leading-relaxed outline-none resize-none min-h-[100px] focus:text-white/90 transition-colors"
                />
                <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                  <BrainCircuit size={160} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="hidden lg:block h-full border-l border-white/5 flex-shrink-0">
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
