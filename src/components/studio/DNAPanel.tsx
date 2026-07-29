import React from 'react';
import {
  Camera,
  Download,
  Plus,
  Settings2,
  Share2,
  Sparkles,
  Upload,
  X,
  Zap,
  MessageSquare,
  BrainCircuit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHARACTERS, STUDIO_SETTING, GUIDE_IMAGES, ANGLE_SPECS } from '@/data/characters';

interface DNAPanelProps {
  charReferences: Record<string, { main: string, wide: string, side: string, close: string, profile: string, detail: string }>;
  setCharReferences: React.Dispatch<React.SetStateAction<Record<string, { main: string, wide: string, side: string, close: string, profile: string, detail: string }>>>;
  characterConfig: Record<string, { personality: string, lightingKey: string, behaviors: { action: string, emotion: string }[] }>;
  setCharacterConfig: React.Dispatch<React.SetStateAction<Record<string, { personality: string, lightingKey: string, behaviors: { action: string, emotion: string }[] }>>>;
  voiceIds: Record<string, string>;
  setVoiceIds: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  studioReference: string;
  setStudioReference: (val: string) => void;
  dnaFolderUrl: string;
  setDnaFolderUrl: (val: string) => void;
  getPreviewUrl: (url: string) => string | null;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, charId: string, angle: string) => void;
  downloadPromptPDF: (characterId: string, angle: string) => void;
}

export function DNAPanel({
  charReferences,
  setCharReferences,
  characterConfig,
  setCharacterConfig,
  voiceIds,
  setVoiceIds,
  studioReference,
  setStudioReference,
  dnaFolderUrl,
  setDnaFolderUrl,
  getPreviewUrl,
  handleImageUpload,
  downloadPromptPDF
}: DNAPanelProps) {
  const [generating, setGenerating] = React.useState<string | null>(null);
  const paidImageRequests = React.useRef<Record<string, {
    idempotencyKey: string;
    approval: { confirmed: true; source: 'studio_ui'; approvedAt: string };
  }>>({});

  const generateWithBanana = async (charId: string, angle: string) => {
    const char = CHARACTERS.find(c => c.id === charId);
    if (!char) return;

    const key = `${charId}-${angle}`;
    let paidRequest: (typeof paidImageRequests.current)[string] | undefined = paidImageRequests.current[key];
    if (paidRequest && Date.now() - Date.parse(paidRequest.approval.approvedAt) > 10 * 60_000) {
      delete paidImageRequests.current[key];
      paidRequest = undefined;
    }
    if (!paidRequest) {
      if (!window.confirm('Esta síntese de imagem usa um provedor pago e pode gerar cobrança. Deseja continuar?')) return;
      paidRequest = {
        idempotencyKey: `dna-image-${crypto.randomUUID()}`,
        approval: {
          confirmed: true,
          source: 'studio_ui',
          approvedAt: new Date().toISOString()
        }
      };
      paidImageRequests.current[key] = paidRequest;
    }
    setGenerating(key);

    try {
      const basePrompt = `${char.name}, ${char.visualDescription}, ${char.defaultOutfit}, ${STUDIO_SETTING.promptContext}`;
      
      let angleModifier = '';
      let aspectRatio = '1:1';

      if (angle === 'wide') {
        angleModifier = 'wide shot showing full body in setting,';
        aspectRatio = '16:9';
      } else if (angle === 'side') {
        angleModifier = 'side angle shot, 45 degree lateral profile,';
        aspectRatio = '4:3';
      } else if (angle === 'close') {
        angleModifier = 'tight close-up shot focusing on face,';
        aspectRatio = '1:1';
      } else if (angle === 'profile') {
        angleModifier = 'pure lateral profile view from the side,';
        aspectRatio = '1:1';
      } else if (angle === 'detail') {
        angleModifier = 'macro detail shot showing textures close up,';
        aspectRatio = '1:1';
      } else {
        angleModifier = 'front-facing master reference portrait,';
        aspectRatio = '1:1';
      }

      const finalPrompt = `${angleModifier} ${basePrompt}`;

      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': paidRequest.idempotencyKey
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspectRatio,
          approval: paidRequest.approval
        })
      });

      const data = await res.json();
      if (data.error) {
        if ([400, 403, 409].includes(res.status) && data.error !== 'IDEMPOTENCY_IN_PROGRESS') {
          delete paidImageRequests.current[key];
        }
        throw new Error(data.error);
      }

      if (data.imageUrl) {
        delete paidImageRequests.current[key];
        setCharReferences(prev => {
          const updated = {
            ...prev,
            [charId]: {
              ...prev[charId],
              [angle]: data.imageUrl
            }
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem('BK_CHAR_REFERENCES', JSON.stringify(updated));
          }
          return updated;
        });
      }
    } catch (e) {
      console.error('BANANA_GEN_FAIL', e);
      alert(`Synthesis Failed: ${e instanceof Error ? e.message : 'Unknown Error'}`);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-12 py-12 scroll-smooth animate-in fade-in duration-700">
      <div className="mb-20 flex justify-between items-end">
        <div>
          <h2 className="text-6xl font-black tracking-tighter uppercase">Engine DNA</h2>
          <p className="text-white/30 text-lg font-bold tracking-tight">Biological and Behavioral Parameter Blocks.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Master Asset Repository</span>
          <div className="flex gap-4">
            <input
              type="text"
              value={dnaFolderUrl}
              onChange={(e) => setDnaFolderUrl(e.target.value)}
              placeholder="PASTE_GDRIVE_FOLDER_URL"
              className="bg-white/5 border border-white/10 px-4 py-2 text-[10px] font-bold text-white outline-none focus:border-[#FF5F1F] w-64"
            />
            <a
              href={dnaFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase hover:bg-[#FF5F1F] hover:text-white transition-all flex items-center gap-2"
            >
              <Share2 size={12} /> OPEN_GDRIVE_DNA
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2px] bg-white/5 border-b border-white/5 mb-16 px-2 pb-16 stagger-item">
        {CHARACTERS.map((char, idx) => (
          <div
            key={char.id}
            style={{ animationDelay: `${idx * 200}ms` }}
            className="studio-panel p-16 space-y-12 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-20 h-20 bg-[#111111] border border-white/10 flex items-center justify-center text-5xl font-black">
                {char.name[0]}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-[#FF5F1F] tracking-[0.5em] block mb-1">BIOLOGICAL UNIT</span>
                <h3 className="text-4xl font-black tracking-tighter uppercase">{char.name}</h3>
              </div>
            </div>

            {/* Appearance Guide & Visual DNA */}
            <div className="p-6 bg-white/[0.02] border border-white/5 space-y-4">
              <div className="space-y-1">
                <span className="text-[8px] font-black text-[#FF5F1F] uppercase tracking-widest block">Appearance Spec (Visual DNA)</span>
                <p className="text-xs font-bold text-white/80 leading-relaxed uppercase">{char.visualDescription}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block">Default Outfit Specification</span>
                <p className="text-xs font-bold text-white/60 leading-relaxed uppercase italic">{char.defaultOutfit}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block">Biological Genus</span>
                <p className="text-xs font-bold text-white/60 leading-relaxed uppercase">{char.species}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5F1F]">Primary_Genetic_Anchor</h3>

                <div className="relative aspect-square w-full bg-[#111111] border border-white/10 overflow-hidden group/dna-preview">
                  {charReferences[char.id].main ? (
                    <img
                      src={getPreviewUrl(charReferences[char.id].main) || ''}
                      alt={`${char.name} DNA`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-80 group-hover/dna-preview:opacity-100 transition-all duration-700 dna-float"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080808]">
                      <img
                        src={GUIDE_IMAGES.main}
                        className="absolute inset-0 w-full h-full object-cover opacity-[0.05] grayscale brightness-50"
                        alt="Master Guide"
                      />
                      <BrainCircuit size={40} className="text-[#FF5F1F]/20 relative z-10" />
                      <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] mt-6 relative z-10 italic">Awaiting_Biological_Source</span>
                    </div>
                  )}

                  {/* Requirement Widget Overlay */}
                  <div className="absolute top-4 right-4 w-40 p-4 bg-black/80 backdrop-blur-xl border border-white/5 opacity-0 group-hover/dna-preview:opacity-100 transition-all duration-500 translate-x-4 group-hover/dna-preview:translate-x-0 z-20">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings2 size={10} className="text-[#FF5F1F]" />
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">Master_Spec</span>
                    </div>
                    <p className="text-[8px] text-white/40 font-bold uppercase mb-3 leading-tight tracking-tighter">{ANGLE_SPECS.main.desc}</p>
                    <div className="space-y-1">
                      {ANGLE_SPECS.main.requirements.map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-[#FF5F1F]" />
                          <span className="text-[7px] font-black text-white/60 uppercase">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 bg-black/60 backdrop-blur-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#FF5F1F] rounded-full animate-pulse" />
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">
                      {charReferences[char.id].main ? "MASTER_DNA_SOURCE" : "ORPHAN_DNA_BLOCK"}
                    </span>
                  </div>
                </div>
                <div className="bg-[#0A0A0A] border border-white/10 mt-2 group hover:border-[#FF5F1F]/50 transition-colors">
                  <div className="flex divide-x divide-white/10 h-10">
                    <button
                      onClick={() => downloadPromptPDF(char.id, 'main')}
                      className="px-6 hover:bg-[#FF5F1F] text-white/40 hover:text-white transition-colors group/ext flex items-center gap-3"
                      title="EXTRACT NEURAL MANIFEST"
                    >
                      <Download size={12} className="group-hover/ext:animate-bounce" />
                      <span className="text-[9px] font-black uppercase tracking-widest hidden xl:block">EXTRACT</span>
                    </button>
                    <label className="px-6 hover:bg-[#FF5F1F] text-white/40 hover:text-white transition-colors cursor-pointer group/inj flex items-center gap-3" title="INJECT BIOLOGICAL SOURCE">
                      <Upload size={12} className="group-hover/inj:animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest hidden xl:block">INJECT</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, char.id, 'main')}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => generateWithBanana(char.id, 'main')}
                      disabled={generating !== null}
                      className="px-6 hover:bg-[#FF5F1F] text-white/40 hover:text-white transition-colors group/gen flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="SYNTHESIZE WITH NANO BANANA PRO"
                    >
                      <Sparkles size={12} className={cn("group-hover/gen:animate-spin", generating === `${char.id}-main` && "animate-spin text-[#FF5F1F]")} />
                      <span className="text-[9px] font-black uppercase tracking-widest hidden xl:block">
                        {generating === `${char.id}-main` ? 'SYNTHESIZING...' : 'SYNTHESIZE'}
                      </span>
                    </button>

                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="MASTER_GENETIC_SOURCE_URL"
                        value={charReferences[char.id].main}
                        onChange={(e) => setCharReferences(prev => ({
                          ...prev,
                          [char.id]: { ...prev[char.id], main: e.target.value }
                        }))}
                        className="w-full h-full bg-transparent px-6 text-[10px] font-bold text-white uppercase outline-none placeholder:text-white/10 focus:bg-white/5 transition-colors"
                      />
                      {charReferences[char.id].main && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sonic Behavioral Module */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5F1F]">Sonic_Behavioral_Module</h3>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", voiceIds[char.id].length > 5 ? "bg-green-500 animate-pulse" : "bg-white/20")} />
                    <span className="text-[8px] font-black text-white/40 uppercase">SIGNAL_STRENGTH</span>
                  </div>
                </div>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="ELEVENLABS_VOICE_ID"
                    value={voiceIds[char.id]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVoiceIds(prev => ({ ...prev, [char.id]: val }));
                      localStorage.setItem(`BK_VOICE_${char.id.toUpperCase()}`, val);
                    }}
                    className="w-full bg-[#111111] border border-white/10 p-6 font-mono text-sm text-[#FF5F1F] outline-none focus:border-[#FF5F1F] transition-all"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest hidden md:block">XI_VOICE_UID</span>
                    <MessageSquare size={16} className="text-white/10 group-focus-within:text-[#FF5F1F] transition-colors" />
                  </div>
                </div>
                <div className="p-4 bg-white/[0.02] border border-white/5">
                  <p className="text-[9px] text-white/30 font-bold uppercase leading-relaxed">
                    {char.id === 'boomer'
                      ? "RECOMMENDED: Stuart_Energetic_AU (High_Velocity_Tone)"
                      : "RECOMMENDED: Lee_Middle_Aged_AU (Deadpan_Cynicism)"
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Optical_Angle_Expansion_Matrix</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {['wide', 'side', 'close', 'profile', 'detail'].map((angle) => (
                    <div key={angle} className="space-y-4">
                      <div className="aspect-[4/3] bg-[#0d0d0d] border border-white/5 relative overflow-hidden group/angle">
                        {charReferences[char.id][angle as keyof typeof charReferences[string]] ? (
                          <img
                            src={getPreviewUrl(charReferences[char.id][angle as keyof typeof charReferences[string]]) || ''}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover opacity-40 group-hover/angle:opacity-100 transition-all duration-500"
                            alt={`${char.name} ${angle}`}
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080808]">
                            <img
                              src={GUIDE_IMAGES[angle] || GUIDE_IMAGES.main}
                              className="absolute inset-0 w-full h-full object-cover opacity-[0.1] grayscale brightness-50"
                              alt="Shot Guide"
                            />
                            <Camera size={14} className="text-[#FF5F1F]/20 relative z-10" />
                            <span className="text-[6px] font-black text-white/10 uppercase tracking-[0.3em] mt-2 relative z-10 italic">Sample_Frame_{angle}</span>
                          </div>
                        )}

                        {/* Perspective Hub Overlay */}
                        <div className="absolute inset-0 bg-black/90 p-4 opacity-0 group-hover/angle:opacity-100 transition-all duration-300 backdrop-blur-md flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                              <Zap size={10} className="text-[#FF5F1F]" />
                              <span className="text-[8px] font-black text-white uppercase tracking-widest">{angle}_optical_logic</span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[7px] text-white/40 font-bold uppercase tracking-tighter leading-[1.1]">{ANGLE_SPECS[angle as keyof typeof ANGLE_SPECS].desc}</p>
                              <div className="space-y-1">
                                {ANGLE_SPECS[angle as keyof typeof ANGLE_SPECS].requirements.map((req, ridx) => (
                                  <div key={ridx} className="flex items-center gap-1.5">
                                    <div className="w-1 h-1 bg-[#FF5F1F]" />
                                    <span className="text-[6px] font-black text-white/60 uppercase">{req}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-[6px] font-black text-[#FF5F1F] tracking-widest uppercase italic">Awaiting_Visual_Feed</div>
                        </div>

                        <div className="absolute top-0 left-0 px-3 py-1 bg-[#FF5F1F]/20 text-[7px] font-black text-white uppercase tracking-tighter backdrop-blur-md">
                          {angle}
                        </div>
                      </div>

                      <div className="bg-[#0A0A0A] border border-white/5 group hover:border-[#FF5F1F]/50 transition-colors">
                        <div className="flex divide-x divide-white/5">
                          <button
                            onClick={() => downloadPromptPDF(char.id, angle)}
                            className="p-3 hover:bg-[#FF5F1F] text-white/40 hover:text-white transition-colors group/pdf flex items-center justify-center"
                            title="EXTRACT OPTICAL DATA"
                          >
                            <Download size={10} className="group-hover/pdf:animate-bounce" />
                          </button>
                          <label className="p-3 hover:bg-[#FF5F1F] text-white/40 hover:text-white transition-colors cursor-pointer group/upl flex items-center justify-center" title="INJECT OPTICAL FEED">
                            <Upload size={10} className="group-hover/upl:animate-pulse" />
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, char.id, angle)}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => generateWithBanana(char.id, angle)}
                            disabled={generating !== null}
                            className="p-3 hover:bg-[#FF5F1F] text-white/40 hover:text-white transition-colors group/gen flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            title="SYNTHESIZE ANGLE WITH NANO BANANA PRO"
                          >
                            <Sparkles size={10} className={cn("group-hover/gen:animate-spin", generating === `${char.id}-${angle}` && "animate-spin text-[#FF5F1F]")} />
                          </button>
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              placeholder="LINK_PROTOCOL"
                              value={charReferences[char.id][angle as keyof typeof charReferences[string]]}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCharReferences(prev => ({
                                  ...prev,
                                  [char.id]: { ...prev[char.id], [angle]: val }
                                }));
                              }}
                              className="w-full h-full bg-transparent px-3 text-[9px] font-bold text-white uppercase outline-none placeholder:text-white/10 focus:bg-white/5 transition-colors"
                            />
                            {charReferences[char.id][angle as keyof typeof charReferences[string]] && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Behavioral Sets</h4>
                  <span className="text-[8px] font-black text-[#FF5F1F] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Editable Matrix</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {characterConfig[char.id]?.behaviors.map((behavior, bIndex) => (
                    <div key={bIndex} className="group/tag relative px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider text-white/50 hover:text-white transition-all cursor-pointer">
                      {behavior.action}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newBehaviors = characterConfig[char.id].behaviors.filter((_, idx) => idx !== bIndex);
                          setCharacterConfig(prev => ({ ...prev, [char.id]: { ...prev[char.id], behaviors: newBehaviors } }));
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity hover:scale-110"
                      >
                        <X size={8} className="text-white" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FF5F1F]/10 hover:bg-[#FF5F1F]/20 border border-[#FF5F1F]/20 transition-all rounded-sm group/add">
                    <Plus size={10} className="text-[#FF5F1F]" />
                    <input
                      type="text"
                      placeholder="ADD_BEHAVIOR"
                      className="bg-transparent text-[9px] font-black text-[#FF5F1F] placeholder:text-[#FF5F1F]/30 uppercase outline-none w-24"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = e.currentTarget.value.trim();
                          if (val) {
                            const newBehaviors = [...characterConfig[char.id].behaviors, { action: val, emotion: 'CUSTOM' }];
                            setCharacterConfig(prev => ({ ...prev, [char.id]: { ...prev[char.id], behaviors: newBehaviors } }));
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-10 items-start mt-8">
                <div className="space-y-2 group/psych">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF5F1F] group-hover/psych:text-white transition-colors">Psych_Logic</h4>
                  <textarea
                    value={characterConfig[char.id]?.personality || ''}
                    onChange={(e) => setCharacterConfig(prev => ({ ...prev, [char.id]: { ...prev[char.id], personality: e.target.value } }))}
                    className="w-full bg-transparent text-xs font-bold text-white/40 leading-relaxed uppercase outline-none focus:text-white transition-colors resize-none h-24 scrollbar-hide border-l-2 border-transparent focus:border-[#FF5F1F] pl-2"
                  />
                </div>
                <div className="space-y-2 text-right group/opt">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF5F1F] group-hover/opt:text-white transition-colors">Optical_Key</h4>
                  <textarea
                    value={characterConfig[char.id]?.lightingKey || ''}
                    onChange={(e) => setCharacterConfig(prev => ({ ...prev, [char.id]: { ...prev[char.id], lightingKey: e.target.value } }))}
                    className="w-full bg-transparent text-xs font-bold text-white/40 leading-relaxed uppercase italic outline-none focus:text-white transition-colors resize-none h-24 scrollbar-hide text-right border-r-2 border-transparent focus:border-[#FF5F1F] pr-2"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-12 pb-32">
        <div className="flex items-end justify-between border-b border-white/5 pb-8 px-2">
          <div>
            <span className="text-[10px] font-black text-[#FF5F1F] tracking-[0.4em] block mb-2 uppercase italic">Environment_Matrix</span>
            <h2 className="text-6xl font-black tracking-tighter uppercase italic">Scenario DNA</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-white/20 tracking-widest uppercase mb-1">Set ID: DUD_STUDIO_001</p>
            <p className="text-xs font-bold text-white/40 uppercase tracking-tighter italic">{STUDIO_SETTING.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-[2px] bg-white/5">
          <div className="bg-[#080808] p-12 space-y-8 h-full">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-white/10 flex items-center justify-center text-[#FF5F1F]">
                <Camera size={20} />
              </div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Atmosphere_Core</h4>
            </div>

            {studioReference && (
              <div className="relative aspect-video w-full bg-[#111111] border border-white/10 overflow-hidden group/studio-preview">
                <img
                  src={getPreviewUrl(studioReference) || ''}
                  alt="Studio DNA"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-60 group-hover/studio-preview:opacity-100 transition-opacity duration-700"
                />
                <div className="absolute inset-x-0 bottom-0 p-4 bg-black/80 backdrop-blur-md flex items-center gap-2">
                  <Sparkles size={12} className="text-[#FF5F1F]" />
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Atmosphere Anchor Locked</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-2">Visual_Anchor_Reference</span>
              <input
                type="text"
                value={studioReference}
                onChange={(e) => setStudioReference(e.target.value)}
                placeholder="PASTE_STUDIO_GDRIVE_URL"
                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-[10px] font-bold text-white outline-none focus:border-[#FF5F1F] transition-all"
              />
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Visual_Description</span>
                <p className="text-xs font-bold text-white/60 leading-relaxed uppercase">{STUDIO_SETTING.visualDescription}</p>
              </div>
              <div className="space-y-2">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Ambience_Logic</span>
                <p className="text-xs font-bold text-[#FF5F1F] leading-relaxed uppercase italic">{STUDIO_SETTING.ambience}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#080808] p-12 space-y-8 h-full">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-white/10 flex items-center justify-center text-[#FF5F1F]">
                <Settings2 size={20} />
              </div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Prop_Synthesis</h4>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {STUDIO_SETTING.props.map((prop, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 group hover:border-[#FF5F1F]/30 transition-all">
                  <span className="text-[7px] font-black text-white/10 tracking-tighter">0{i + 1}</span>
                  <span className="text-[9px] font-black text-white/40 uppercase group-hover:text-white transition-colors tracking-widest">{prop}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#080808] p-12 space-y-8 h-full">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-white/10 flex items-center justify-center text-[#FF5F1F]">
                <Sparkles size={20} />
              </div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Optical_Environment</h4>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Acoustic_Architecture</span>
                <p className="text-xs font-bold text-white/60 leading-relaxed uppercase">{STUDIO_SETTING.acousticPanels}</p>
              </div>
              <div className="space-y-2">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Sponsor_LED_Metrics</span>
                <p className="text-xs font-bold text-white/60 leading-relaxed uppercase">{STUDIO_SETTING.sponsorScreens}</p>
              </div>
              <div className="space-y-2">
                <span className="text-[8px] font-black text-[#FF5F1F] uppercase tracking-widest">Global_Lighting_Key</span>
                <p className="text-xs font-bold text-[#FF5F1F] leading-relaxed uppercase italic">{STUDIO_SETTING.lighting}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
