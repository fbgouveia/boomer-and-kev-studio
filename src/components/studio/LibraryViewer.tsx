import { useState, useEffect } from 'react';
import { querySupabase } from '@/lib/supabase';
import { Play, Download, Calendar, Loader2, RefreshCw, Trash2, Search, X, Code2, Film, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScriptLine } from '@/types';

interface Episode {
  id: string;
  topic: string;
  director_idea?: string;
  director_snippet?: string;
  script_json?: ScriptLine[];
  status: string;
  video_url: string;
  created_at: string;
}

interface LibraryViewerProps {
  onRemix?: (episode: Episode) => void;
}

export function LibraryViewer({ onRemix }: LibraryViewerProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);

  const fetchEpisodes = async () => {
    setIsLoading(true);
    try {
      const data = await querySupabase('episodes?status=eq.assembled&order=created_at.desc');
      if (data && Array.isArray(data)) {
        setEpisodes(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEpisodes = episodes.filter(ep => 
    ep.topic?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ep.director_idea?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteEpisode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this episode?')) return;
    
    // Optimistic UI update
    setEpisodes(prev => prev.filter(ep => ep.id !== id));
    
    try {
      const res = await fetch(`/api/episodes/delete?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete from backend');
    } catch (e) {
      console.error("Failed to delete episode", e);
      // Revert if failed
      fetchEpisodes();
    }
  };

  useEffect(() => {
    fetchEpisodes();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50">
        <Loader2 className="animate-spin text-[#FF5F1F] mb-4" size={32} />
        <p className="text-xs font-mono uppercase tracking-widest">Accessing Archive...</p>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-white/5 bg-black/50">
        <p className="text-xs font-mono uppercase tracking-widest text-white/40">No assembled episodes found in the archive.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-32 pr-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-black uppercase tracking-tighter text-white">Production Archive</h2>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={14} className="text-white/40" />
            </div>
            <input
              type="text"
              placeholder="SEARCH EPISODES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 bg-white/5 border border-white/10 text-white text-xs px-10 py-2 focus:outline-none focus:border-[#FF5F1F]/50 uppercase placeholder:text-white/20"
            />
          </div>
          <button 
            onClick={fetchEpisodes}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-[#FF5F1F]/20 border border-white/10 hover:border-[#FF5F1F] transition-colors text-[10px] font-black uppercase tracking-widest text-[#FF5F1F]"
          >
            <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
            Refresh Sync
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
      {filteredEpisodes.map(ep => (
        <div key={ep.id} className="border border-white/10 bg-black/60 group hover:border-[#FF5F1F]/50 transition-colors flex flex-row h-40 overflow-hidden cursor-pointer" onClick={() => setSelectedEpisode(ep)}>
          <div className="h-full aspect-[9/16] bg-[#111] relative overflow-hidden flex-shrink-0 border-r border-white/10">
            {ep.video_url ? (
              <video 
                src={`${ep.video_url}#t=0.1`} 
                className="w-full h-full object-cover" 
                controls
                preload="metadata"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-mono text-white/20">NO_VIDEO_SIGNAL</span>
              </div>
            )}
          </div>
          
          <div className="p-4 flex flex-col flex-grow min-w-0">
            <h3 className="font-black text-sm mb-2 uppercase line-clamp-2 truncate whitespace-normal">{ep.topic || "Untitled Transmission"}</h3>
            <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono mb-4">
              <Calendar size={12} />
              <span>{new Date(ep.created_at).toLocaleDateString()}</span>
            </div>
            
            <div className="mt-auto flex gap-2">
              <a 
                href={ep.video_url} 
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-[#FF5F1F]/20 border border-white/10 hover:border-[#FF5F1F] transition-colors text-[10px] font-black uppercase tracking-widest"
              >
                <Download size={12} />
                DL
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); deleteEpisode(ep.id); }}
                className="flex items-center justify-center px-3 py-2 bg-black hover:bg-red-900/50 border border-white/10 hover:border-red-500/50 transition-colors text-white/40 hover:text-red-500"
                title="Delete Episode"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
      </div>

      {/* X-Ray Modal */}
      {selectedEpisode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 lg:p-12" onClick={() => setSelectedEpisode(null)}>
          <div 
            className="bg-[#0a0a0a] border border-white/10 w-full max-w-6xl max-h-full flex flex-col overflow-hidden relative shadow-[0_0_50px_rgba(255,95,31,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
              <h2 className="text-lg font-black uppercase tracking-tighter text-[#FF5F1F]">
                Episode X-Ray <span className="text-white/40 font-mono text-xs ml-2">[{selectedEpisode.id.split('-')[0]}]</span>
              </h2>
              <button onClick={() => setSelectedEpisode(null)} className="text-white/40 hover:text-white p-2">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
              {/* Left Column: Video */}
              <div className="w-full lg:w-1/3 bg-black flex flex-col border-r border-white/10">
                <div className="w-full aspect-[9/16] relative flex-shrink-0 bg-[#111]">
                  {selectedEpisode.video_url ? (
                    <video src={selectedEpisode.video_url} className="w-full h-full object-cover" controls autoPlay />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">NO VIDEO</div>
                  )}
                </div>
                
                <div className="p-4 flex-grow flex flex-col gap-2 bg-white/5">
                  <h3 className="font-black text-sm uppercase">{selectedEpisode.topic || "Untitled"}</h3>
                  <div className="text-[10px] font-mono text-white/40 mb-4">{new Date(selectedEpisode.created_at).toLocaleString()}</div>
                  
                  {onRemix && (
                    <button 
                      onClick={() => {
                        onRemix(selectedEpisode);
                        setSelectedEpisode(null);
                      }}
                      className="mt-auto w-full flex items-center justify-center gap-2 py-3 bg-[#FF5F1F]/20 hover:bg-[#FF5F1F] border border-[#FF5F1F] text-white transition-colors text-xs font-black uppercase tracking-widest"
                    >
                      <RefreshCcw size={14} />
                      Remix Episode
                    </button>
                  )}
                </div>
              </div>
              
              {/* Right Column: DNA & Script */}
              <div className="w-full lg:w-2/3 flex flex-col overflow-y-auto p-6 space-y-8 bg-black">
                <div>
                  <div className="flex items-center gap-2 text-[#FF5F1F] mb-3">
                    <Film size={16} />
                    <h4 className="font-black text-xs uppercase tracking-widest">Director's Concept</h4>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 font-mono text-xs text-white/70">
                    <p><span className="text-white/40">Topic:</span> {selectedEpisode.director_idea || selectedEpisode.topic}</p>
                    {selectedEpisode.director_snippet && (
                      <p className="mt-2 text-white/90">"{selectedEpisode.director_snippet}"</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-[#00f2fe] mb-3">
                    <Code2 size={16} />
                    <h4 className="font-black text-xs uppercase tracking-widest">Rendered Script</h4>
                  </div>
                  <div className="space-y-2">
                    {selectedEpisode.script_json && selectedEpisode.script_json.length > 0 ? (
                      selectedEpisode.script_json.map((line, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 p-4">
                          <div className="flex justify-between items-baseline mb-2 border-b border-white/10 pb-2">
                            <span className={cn(
                              "font-black uppercase text-xs",
                              line.characterId === 'boomer' ? 'text-[#FF5F1F]' : 'text-[#00f2fe]'
                            )}>{line.characterId}</span>
                            <span className="text-[10px] font-mono text-white/40">[{line.shotType}]</span>
                          </div>
                          <p className="text-sm font-medium text-white mb-2 leading-relaxed">"{line.text}"</p>
                          {line.action && (
                            <p className="text-xs text-white/50 italic flex gap-1">
                              <span>*</span>
                              {line.action}
                              <span>*</span>
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-white/40 font-mono text-xs p-4 bg-white/5 border border-white/10">
                        No script data found in this archive record.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
