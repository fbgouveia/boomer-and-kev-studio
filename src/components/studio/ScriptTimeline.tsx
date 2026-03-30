import React, { useState } from 'react';
import { Download, Plus, FileText, Share2, Trash2, Volume2, MonitorPlay, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScriptLine } from '@/types';
import { CHARACTERS, SHOT_TYPES } from '@/data/characters';

interface ScriptTimelineProps {
  script: ScriptLine[];
  exportToPDF: () => void;
  addLine: () => void;
  updateLine: (id: string, field: string, value: any) => void;
  removeLine: (id: string) => void;
  downloadScenePromptPDF: (line: ScriptLine, index: number) => void;
  setSharingLineId: (id: string | null) => void;
  setCinemaLineId: (id: string | null) => void;
}

function ClockInput({ value, onChange }: { value: number, onChange: (val: number) => void }) {
  return (
    <div className="flex items-center gap-3 bg-[#111111] border border-white/10 px-4 py-2 hover:border-[#FF5F1F] transition-all group/clock">
      <span className="text-[9px] font-black text-white/20 uppercase">Dur</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-10 bg-transparent text-xs font-black text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-right"
      />
      <span className="text-[9px] font-black text-white/20 uppercase">Sec</span>
    </div>
  );
}

export function ScriptTimeline({
  script,
  exportToPDF,
  addLine,
  updateLine,
  removeLine,
  downloadScenePromptPDF,
  setSharingLineId,
  setCinemaLineId
}: ScriptTimelineProps) {
  const [previewLineId, setPreviewLineId] = useState<string | null>(null);

  return (
    <div className="flex-1 overflow-y-auto px-12 py-12 scroll-smooth animate-in fade-in duration-700 min-h-0">
      <div className="flex items-baseline justify-between mb-16 px-2">
        <div className="flex items-center gap-4">
          <h2 className="text-5xl font-black tracking-tighter">PRODUCTION <span className="text-white/20">TIMELINE</span></h2>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-6 py-2 border border-[#FF5F1F]/30 bg-[#FF5F1F]/5 text-[#FF5F1F] text-[10px] font-black tracking-widest hover:bg-[#FF5F1F] hover:text-white transition-all shadow-[4px_4px_0_rgba(255,95,31,0.2)]"
          >
            <Download size={14} /> DOWNLOAD FULL SCRIPT (PDF)
          </button>
        </div>
        <button onClick={addLine} className="p-4 border border-white/10 hover:bg-white hover:text-black transition-all">
          <Plus size={24} />
        </button>
      </div>

      <div className="flex flex-col gap-[2px] bg-white/5">
        {script.map((line, index) => (
          <div
            key={line.id}
            style={{ animationDelay: `${index * 100}ms` }}
            className={cn("bg-[#080808] flex min-h-[300px] border-l-4 transition-all duration-500 hover:z-10 group stagger-item",
              line.characterId === 'boomer' ? "border-[#FF5F1F]" : "border-white/20")}
            onMouseEnter={() => setPreviewLineId(line.id)}
            onMouseLeave={() => setPreviewLineId(null)}
          >
            <div className="w-64 p-8 border-r border-white/5 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em]">Shot {index + 1}</span>
                  <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500",
                    line.status === 'COMPLETED' ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" :
                      line.status === 'PROCESSING' ? "bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" :
                        line.status === 'QUEUED' ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]" :
                          line.characterId === 'boomer'
                            ? "bg-[#FF5F1F] shadow-[0_0_10px_rgba(255,95,31,0.8)]"
                            : "bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]",
                    previewLineId === line.id ? "opacity-100 scale-125" : "opacity-30 scale-100"
                  )} />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">LENS OPTIC</label>
                    <select
                      value={line.shotType}
                      onChange={(e) => updateLine(line.id, 'shotType', e.target.value)}
                      className="w-full bg-[#111111] border border-white/10 p-2 text-[10px] font-black outline-none cursor-pointer"
                    >
                      {SHOT_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="text-[9px] text-white/20 leading-relaxed font-bold italic uppercase tracking-wider">
                    {SHOT_TYPES.find(s => s.id === line.shotType)?.cinematicRule}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <ClockInput value={line.durationEst} onChange={(val) => updateLine(line.id, 'durationEst', val)} />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadScenePromptPDF(line, index)}
                    className="p-3 border border-white/5 text-white/20 hover:text-white hover:border-white/20 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center grayscale"
                    title="DOWNLOAD INDIVIDUAL PROMPT CARD"
                  >
                    <FileText size={18} />
                  </button>
                  <button
                    onClick={() => setSharingLineId(line.id)}
                    className="p-3 border border-white/5 text-white/20 hover:text-white hover:border-white/20 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center grayscale"
                    title="SHARE SCENE"
                  >
                    <Share2 size={18} />
                  </button>
                  {script.length > 1 && (
                    <button
                      onClick={() => removeLine(line.id)}
                      className="text-red-500/30 hover:text-red-500 hover:scale-110 transition-all p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 p-10 relative">
              <div className="flex items-center gap-4 mb-10">
                <select
                  value={line.characterId}
                  onChange={(e) => updateLine(line.id, 'characterId', e.target.value)}
                  className={cn("px-4 py-1 text-[11px] font-black uppercase tracking-widest border-none outline-none cursor-pointer appearance-none transition-all",
                    line.characterId === 'boomer' ? "bg-[#FF5F1F] text-white hover:bg-white hover:text-[#FF5F1F]" : "bg-white text-black hover:bg-[#FF5F1F] hover:text-white")}
                >
                  {CHARACTERS.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#0d0d0d] text-white">{c.name.toUpperCase()}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <div className={cn("px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border",
                    line.status === 'COMPLETED' ? "border-green-500/30 text-green-500 bg-green-500/5" :
                      line.status === 'PROCESSING' ? "border-blue-500/30 text-blue-500 bg-blue-500/5 animate-pulse" :
                        line.status === 'QUEUED' ? "border-yellow-500/30 text-yellow-500 bg-yellow-500/5" :
                          "border-white/5 text-white/20")}>
                    {line.status}
                  </div>
                  <div className="text-[10px] font-black text-white/20 tracking-[0.2em] px-2 py-1 border border-white/5 uppercase">
                    {line.emotion || 'Neutral'}
                  </div>
                  {line.audioUrl && (
                    <button
                      onClick={() => {
                        const audio = new Audio(line.audioUrl);
                        audio.play();
                      }}
                      className="flex items-center gap-2 bg-[#FF5F1F]/10 border border-[#FF5F1F]/30 px-3 py-1 hover:bg-[#FF5F1F] text-[#FF5F1F] hover:text-white transition-all group/audio ml-2"
                    >
                      <Volume2 size={12} className="group-hover/audio:animate-pulse" />
                      <span className="text-[8px] font-black tracking-widest uppercase">Sonic_Preview</span>
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={line.text}
                onChange={(e) => updateLine(line.id, 'text', e.target.value)}
                className="w-full bg-transparent border-none text-4xl p-0 font-black italic tracking-tighter leading-[0.9] uppercase focus:ring-0 outline-none resize-none mb-10 text-white/90"
                rows={2}
              />

              <div className="grid grid-cols-2 gap-10 opacity-40 group-hover:opacity-100 transition-opacity">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#FF5F1F]">Physical Motion</span>
                    <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">DNA_SOURCE_ACTIVE</span>
                  </div>
                  <select
                    value={line.action}
                    onChange={(e) => {
                      const selectedChar = CHARACTERS.find(c => c.id === line.characterId);
                      const behavior = selectedChar?.motionBehaviors.find(b => b.action === e.target.value);
                      updateLine(line.id, 'action', e.target.value);
                      if (behavior) updateLine(line.id, 'emotion', behavior.emotion);
                    }}
                    className="w-full bg-[#111111] border-b border-white/10 py-2 px-1 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-[#FF5F1F] text-white/80 appearance-none cursor-pointer group-hover:bg-[#1a1a1a] transition-all"
                  >
                    <option value={line.action} className="bg-[#0d0d0d]">{line.action || "-- SELECT MOTION --"}</option>
                    {CHARACTERS.find(c => c.id === line.characterId)?.motionBehaviors.map((mb, i) => (
                      <option key={i} value={mb.action} className="bg-[#0d0d0d] text-white">
                        {mb.emotion.toUpperCase()}: {mb.action}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Lighting Logic</span>
                  <p className="text-[10px] font-bold text-white/30 italic">
                    {CHARACTERS.find(c => c.id === line.characterId)?.lightingKey}
                  </p>
                </div>
              </div>

              {line.status === 'COMPLETED' || line.status === 'PROCESSING' || previewLineId === line.id ? (
                <div
                  onClick={() => line.status === 'COMPLETED' && setCinemaLineId(line.id)}
                  className={cn(
                    "absolute right-10 top-10 w-48 h-28 border border-white/10 bg-black overflow-hidden group/thumb cursor-pointer",
                    line.status === 'PROCESSING' && "animate-pulse"
                  )}
                >
                  {line.videoUrl && (
                    <video
                      src={line.videoUrl}
                      className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-700"
                      muted
                      loop
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF5F1F]/20 to-transparent opacity-50 pointer-events-none" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                    {line.status === 'COMPLETED' ? (
                      <>
                        <MonitorPlay size={24} className="text-white group-hover/thumb:scale-125 transition-transform" />
                        <span className="text-[7px] font-black text-white/40 tracking-[0.2em] uppercase">VIEW_PLAYBACK</span>
                        {line.videoUrl && (
                          <a
                            href={line.videoUrl}
                            download={`BK_ASSET_${line.id}.mp4`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-[#FF5F1F] text-white/40 hover:text-white transition-all border border-white/10"
                            title="DIRECT_DOWNLOAD"
                          >
                            <Download size={14} />
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <Zap size={20} className="text-[#FF5F1F] animate-bounce" />
                        <span className="text-[7px] font-black text-[#FF5F1F] tracking-[0.2em] uppercase">SYNTHESIZING...</span>
                      </>
                    )}
                  </div>

                  {/* Scanning Line Effect */}
                  <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#FF5F1F]/20 animate-scan" />

                  <div className="absolute bottom-2 left-2 flex items-center gap-1">
                    <div className="w-1 h-3 bg-[#FF5F1F]" />
                    <span className="text-[6px] font-black opacity-30">CAM_{line.shotType}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
