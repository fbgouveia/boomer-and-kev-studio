import React from 'react';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface RenderTerminalProps {
  renderProgress: number;
  renderMode: 'REAL' | 'SANDBOX' | null;
  renderLogs: string[];
}

export function RenderTerminal({
  renderProgress,
  renderMode,
  renderLogs
}: RenderTerminalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 animate-in fade-in duration-500 overflow-hidden">
      {/* HUD Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,1)] z-20" />

      <div className="max-w-4xl w-full p-20 flex flex-col items-center relative z-30">
        <div className="relative w-64 h-64 mb-16">
          <div className="absolute inset-0 border-4 border-[#FF5F1F]/20 rounded-full" />
          <div
            className="absolute inset-0 border-4 border-[#FF5F1F] rounded-full transition-all duration-300"
            style={{ clipPath: `inset(0 0 ${100 - renderProgress}% 0)` }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-black italic tracking-tighter text-white">{Math.floor(renderProgress)}%</span>
            <span className="text-[10px] font-black text-[#FF5F1F] tracking-[0.4em] uppercase mt-2">
              {renderMode === 'SANDBOX' ? "SIMULATION_ACTIVE" : "Processing"}
            </span>
          </div>
        </div>

        <div className="w-full space-y-8">
          <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase italic">
                Engine_Production_Terminal
                {renderMode === 'SANDBOX' && <span className="text-[#FF5F1F] text-xs ml-4">[PREVIEW_MODE]</span>}
              </h2>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Status: High_Velocity_Render_Active</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-[#FF5F1F] tracking-widest">FPS: 60.0</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 font-mono">
            {renderLogs.map((log, i) => (
              <div
                key={i}
                className={cn(
                  "text-[11px] flex items-center gap-4 transition-all duration-300",
                  i === 0 ? "text-white opacity-100" : "text-white/20 opacity-50"
                )}
              >
                <span className="text-[#FF5F1F] font-black">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                <span className="tracking-tight uppercase">{log}</span>
                {i === 0 && <span className="w-2 h-4 bg-[#FF5F1F] animate-pulse" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-0 right-0 p-10 font-mono text-[83px] font-black leading-none uppercase rotate-90 origin-top-right select-none">
          PRODUCTION_PIPELINE_ACTIVE_00101101
        </div>
      </div>
    </div>
  );
}
