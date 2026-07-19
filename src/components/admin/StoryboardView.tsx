'use client';

import React, { useState } from 'react';

// 2026 Kinetic Brutalism Design Language
// PIPELINE: Organização no Admin -> Voz OpenSource Local -> Imagens/Videos IA -> Premiere (Manual)
export function StoryboardView({ manifestData }: { manifestData?: any }) {
  const [selectedReference, setSelectedReference] = useState<string>('boomer_master_v3');
  
  // Mock scenes with the new Ad-Read structures
  const scenes = manifestData?.scenes || [
    { 
      id: 1, 
      title: 'BOOMER_MCU', 
      script: '"ALRIGHT YOU MOB! YOU READY FOR THE GREATEST SHOW ON TURF?!"', 
      adRead: '',
      imagePrompt: 'anthropomorphic muscular kangaroo, red boxing gloves...' 
    },
    { 
      id: 2, 
      title: 'KEV_CU_AD', 
      script: '', 
      adRead: '"(NASALLY DRAWL) Esse surto do Boomer é um oferecimento da SPORTSBET. Baixe o app e pare de perder dinheiro apostando no seu time ruim."',
      imagePrompt: 'anthropomorphic cute koala, grey fluffy fur, deadpan, holding a smartphone with SPORTSBET logo...' 
    }
  ];

  const handleDownloadAssets = (scene: any) => {
    alert(`[PREMIERE WORKFLOW] Baixando pacote ZIP da cena ${scene.id} contendo: \n1. Áudio Local (Bark TTS)\n2. Renders do Kling (Reference Anchored)\n\nLeve isso para o Adobe Premiere.`);
  };

  const handleGenerateLocalTTS = () => {
    alert(`[LOCAL TTS] Iniciando inferência MeloTTS/Bark local na sua GPU... (Custo Zero)`);
  };

  return (
    <div className="bg-[#09090B] text-[#FAFAFA] min-h-screen p-8 font-['Space_Grotesk'] uppercase tracking-tighter">
      
      <div className="mb-8 border-4 border-[#3F3F46] p-6 bg-[#18181b] flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-[#DFE104] mb-2">KLING 3.0 & LOCAL TTS (BARK)</h2>
          <p className="text-sm text-gray-400">
            * 2026 STANDARD: Zero automação cega. Usamos IA para criar as peças, mas a edição e montagem final é **100% MANUAL no Adobe Premiere** para reter controle artístico e impacto Brutalista.
          </p>
        </div>
        <button 
          onClick={handleGenerateLocalTTS}
          className="bg-[#FAFAFA] text-black font-black px-6 py-4 hover:bg-gray-300 border-2 border-black"
        >
          GERAR VOZES LOCAIS (BARK)
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {scenes.map((scene: any, idx: number) => (
          <div 
            key={scene.id} 
            className="border-2 border-[#3F3F46] bg-[#09090B] p-6 hover:border-[#DFE104] transition-colors relative"
          >
            {scene.adRead && (
              <div className="absolute top-0 right-0 bg-[#DFE104] text-black font-black text-xs px-2 py-1">
                AD-READ SLOT (SPONSOR)
              </div>
            )}
            
            <h2 className="text-3xl font-bold text-[#DFE104] mb-4">SHOT {scene.id}: {scene.title}</h2>
            
            {!scene.adRead ? (
              <div className="bg-[#18181b] p-4 mb-4 border border-[#3F3F46]">
                <p className="text-[#DFE104] text-sm font-bold mb-1">SCRIPT PRINCIPAL:</p>
                <p className="text-lg">{scene.script}</p>
              </div>
            ) : (
              <div className="bg-[#18181b] p-4 mb-4 border-2 border-dashed border-[#DFE104]">
                <p className="text-[#DFE104] text-sm font-bold mb-1">AD-READ (TRADICIONAL PODCAST):</p>
                <p className="text-lg text-white">{scene.adRead}</p>
              </div>
            )}
            
            <div className="bg-[#18181b] p-4 mb-6 border border-[#3F3F46]">
              <p className="text-[#DFE104] text-sm font-bold mb-1">KLING PROMPT (REFERÊNCIA DE PERSONAGEM):</p>
              <p className="text-sm text-gray-400">{scene.imagePrompt}</p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => handleDownloadAssets(scene)}
                className="bg-[#DFE104] text-[#09090B] font-black w-full py-4 text-xl hover:bg-white hover:scale-[1.02] transition-transform"
              >
                BAIXAR ASSETS (PARA PREMIERE)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
