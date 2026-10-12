'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Box, 
  Terminal, 
  Tv, 
  Cpu, 
  Play, 
  Zap, 
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function LabsPanel() {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // 3D Visualizer States
  const [camX, setCamX] = useState<number>(0);
  const [camY, setCamY] = useState<number>(3);
  const [camZ, setCamZ] = useState<number>(6);
  const [lightIntensity, setLightIntensity] = useState<number>(1.5);
  
  // WebGPU Simulation States
  const [isGPUCompiled, setIsGPUCompiled] = useState<boolean>(false);
  const [gpuOutput, setGpuOutput] = useState<string>('');
  const [gpuLogs, setGpuLogs] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);

  // Agent Orchestration States
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);

  // Live Stream States
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [liveChat, setLiveChat] = useState<{ user: string; text: string }[]>([]);

  // 3D Scene Initialization
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    
    // Scene & Camera setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    
    const camera = new THREE.PerspectiveCamera(
      45, 
      container.clientWidth / container.clientHeight, 
      0.1, 
      100
    );
    camera.position.set(camX, camY, camZ);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Helpers
    const grid = new THREE.GridHelper(12, 12, 0xff5f1f, 0x222222);
    grid.position.y = -1;
    scene.add(grid);

    // News Desk representing the Boomer & Kev studio desk
    const deskGeo = new THREE.BoxGeometry(4, 0.8, 1.5);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, -0.6, 0);
    desk.receiveShadow = true;
    scene.add(desk);

    // Boomer Mesh (Orange Box representation)
    const boomerGeo = new THREE.BoxGeometry(0.8, 1.6, 0.8);
    const boomerMat = new THREE.MeshStandardMaterial({ color: 0xff5f1f, roughness: 0.4 });
    const boomer = new THREE.Mesh(boomerGeo, boomerMat);
    boomer.position.set(-1.2, 0.4, 0);
    boomer.castShadow = true;
    scene.add(boomer);

    // Kev Mesh (White Box representation)
    const kevGeo = new THREE.BoxGeometry(0.8, 1.6, 0.8);
    const kevMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const kev = new THREE.Mesh(kevGeo, kevMat);
    kev.position.set(1.2, 0.4, 0);
    kev.castShadow = true;
    scene.add(kev);

    // Lighting (Rembrandt Contrast Angle)
    const ambientLight = new THREE.AmbientLight(0x0a0a0a);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
    keyLight.position.set(-4, 5, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Visual pointer pointing at the table
    camera.lookAt(0, 0.2, 0);

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update camera and light from react states dynamically
      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, 0.2, 0);
      keyLight.intensity = lightIntensity;
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
      deskGeo.dispose();
      deskMat.dispose();
      boomerGeo.dispose();
      boomerMat.dispose();
      kevGeo.dispose();
      kevMat.dispose();
      renderer.dispose();
    };
  }, [camX, camY, camZ, lightIntensity]);

  // Audio Waveform Animation for Live Stream
  useEffect(() => {
    if (!canvasRef.current || !streamActive) return;
    const canvas = canvasRef.current;
    
    // Set high-DPI resolution scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    let animId: number;
    let phase = 0;

    const renderWave = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.strokeStyle = '#FF5F1F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let x = 0; x < rect.width; x++) {
        const y = rect.height / 2 + Math.sin(x * 0.05 + phase) * 15 * Math.sin(x * 0.02);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      phase += 0.15;
      animId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(animId);
  }, [streamActive]);

  // Simulated WebGPU Compilation
  const compileWebGPU = () => {
    setIsCompiling(true);
    setGpuLogs(['[WebGPU] Solicitando acesso ao adaptador de hardware local...', '[WebGPU] Carregando pesos binários do modelo (Llama-3-2-3B)...']);
    
    setTimeout(() => {
      setGpuLogs(prev => [...prev, '[WebGPU] Compilando WebGPU pipeline shaders...']);
    }, 1000);

    setTimeout(() => {
      setGpuLogs(prev => [...prev, '[WebGPU] Alocando buffer de memória do tensor (VRAM)...', '[WebGPU] Modelo compilado com sucesso localmente.']);
      setIsCompiling(false);
      setIsGPUCompiled(true);
    }, 2500);
  };

  const generateLocalDialogue = () => {
    if (!isGPUCompiled) return;
    const prompts = [
      "KEV: 'Boomer, NRL está uma completa loucura tática esta semana!' BOOMER: 'Loucura nada, Kev! No meu tempo se jogava sem essa firula analítica toda!'",
      "KEV: 'Fiz a simulação estocástica e a chance da Austrália ganhar é de 12.3%.' BOOMER: 'Seus gráficos não ganham jogo na lama, Kev!'",
      "KEV: 'AIA de 2026 prevê novos hábitos de treino.' BOOMER: 'No meu tempo a gente só corria na colina até vomitar e pronto!'"
    ];
    setGpuOutput(prompts[Math.floor(Math.random() * prompts.length)]);
  };

  // Simulated Autonomous Agent logs
  const runAutonomousAgents = () => {
    setIsAgentRunning(true);
    setAgentLogs(['[Agente Caçador] Varrendo fóruns NRL/AFL e áudios em alta no TikTok...']);
    
    setTimeout(() => {
      setAgentLogs(prev => [...prev, '[Agente Caçador] Tendência identificada: "Crise tática no Melbourne Storm".', '[Agente Roteirista] Redigindo comédia polarizada Boomer vs Kev...']);
    }, 1500);

    setTimeout(() => {
      setAgentLogs(prev => [...prev, '[Agente Roteirista] Roteiro concluído (Cena 1-3).', '[Agente Jurídico] Rodando auditoria de compliance de marca e direitos autorais...']);
    }, 3000);

    setTimeout(() => {
      setAgentLogs(prev => [...prev, '[Agente Jurídico] Roteiro aprovado (Nenhuma infração de uso comercial ou depreciação de marca encontrada).', '[Orquestrador] Enviando storyboard compilado para a fila de renderização no Replicate (Kling v2.6).']);
      setIsAgentRunning(false);
    }, 4500);
  };

  // Simulated Live Stream Comment Loops
  useEffect(() => {
    if (!streamActive) return;
    setViewerCount(Math.floor(Math.random() * 500) + 1200);

    const comments = [
      { user: 'AussieFan99', text: 'Kev is spot on about the tactics!' },
      { user: 'BoomerLover', text: 'Tell him Boomer! Real rugby is dead!' },
      { user: 'Sarah_T', text: 'This animation looks insanely smooth today.' },
      { user: 'Dave_Footy', text: 'Absolute gold banter mates!' }
    ];

    const timer = setInterval(() => {
      const randomComment = comments[Math.floor(Math.random() * comments.length)];
      setLiveChat(prev => [randomComment, ...prev.slice(0, 9)]);
      setViewerCount(prev => prev + Math.floor(Math.random() * 11) - 5);
    }, 2000);

    return () => clearInterval(timer);
  }, [streamActive]);

  return (
    <div className="flex-1 overflow-y-auto px-12 py-12 bg-[#050505] text-white">
      
      {/* HEADER */}
      <div className="mb-12 border-b border-white/10 pb-6 flex justify-between items-center">
        <div>
          <span className="text-sm font-black text-[#FF5F1F] tracking-[0.4em] block uppercase italic">Visualizer & Labs</span>
          <h2 className="text-5xl font-black tracking-tighter uppercase italic">LABORATÓRIO TECNOLÓGICO 2026</h2>
          {/* Honestidade: tudo nesta aba é SIMULADO (setTimeout + frases hardcoded). Nenhum
              render é enfileirado, nenhuma métrica aqui é real. Selo obrigatório até decisão
              do Felipe sobre remover a aba ou torná-la real. */}
          <div className="mt-3 inline-block border-2 border-[#FF5F1F] bg-[#FF5F1F]/10 text-[#FF5F1F] px-3 py-1 text-xs font-black tracking-widest uppercase">
            ⚠ DEMO — SIMULATED · nothing here is real or queued
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 border border-[#FF5F1F]/30 bg-[#FF5F1F]/5 text-[#FF5F1F] text-xs font-black tracking-widest uppercase">
          <Sparkles size={12} /> BEYOND STATE OF THE ART
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: 3D CANVA PRE-VIS */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="border border-white/10 bg-[#080808]/90 p-6 flex flex-col shadow-[8px_8px_0_rgba(255,95,31,0.05)]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <Box className="text-[#FF5F1F]" size={18} />
                <h3 className="text-xs font-black tracking-widest uppercase">Palco Pré-vis 3D (WebGL / Three.js)</h3>
              </div>
              <span className="text-xs text-white/60 font-mono">RENDER: SIMULATED</span>
            </div>
            
            {/* CANVAS CONTAINER */}
            <div 
              ref={mountRef} 
              className="aspect-video w-full bg-black border border-white/5 relative overflow-hidden"
              style={{ minHeight: '340px' }}
            >
              {/* Overlaid Guide Frame HUD */}
              <div className="absolute inset-0 border border-dashed border-[#FF5F1F]/15 pointer-events-none" />
              <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-[#FF5F1F]/20 pointer-events-none" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-[#FF5F1F]/20 pointer-events-none" />
              
              <div className="absolute top-4 left-4 flex flex-col gap-1 bg-black/80 p-2 border border-white/10 pointer-events-none">
                <span className="text-xs text-white/50 font-black tracking-widest uppercase">CAMERA PARAMETERS</span>
                <span className="text-xs font-mono text-[#FF5F1F]">X: {camX.toFixed(1)} | Y: {camY.toFixed(1)} | Z: {camZ.toFixed(1)}</span>
              </div>
            </div>

            {/* CONTROLS */}
            <div className="grid grid-cols-4 gap-6 mt-6 border-t border-white/5 pt-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/50 font-black tracking-widest uppercase flex items-center justify-between">
                  <span>Câmera Horiz (X)</span>
                  <span className="font-mono text-[#FF5F1F]">{camX}</span>
                </label>
                <input 
                  type="range" min="-6" max="6" step="0.5" value={camX} 
                  onChange={(e) => setCamX(parseFloat(e.target.value))}
                  className="accent-[#FF5F1F] cursor-pointer bg-white/10 h-1"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/50 font-black tracking-widest uppercase flex items-center justify-between">
                  <span>Câmera Altura (Y)</span>
                  <span className="font-mono text-[#FF5F1F]">{camY}</span>
                </label>
                <input 
                  type="range" min="1" max="8" step="0.5" value={camY} 
                  onChange={(e) => setCamY(parseFloat(e.target.value))}
                  className="accent-[#FF5F1F] cursor-pointer bg-white/10 h-1"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/50 font-black tracking-widest uppercase flex items-center justify-between">
                  <span>Zoom / Dist (Z)</span>
                  <span className="font-mono text-[#FF5F1F]">{camZ}</span>
                </label>
                <input 
                  type="range" min="3" max="12" step="0.5" value={camZ} 
                  onChange={(e) => setCamZ(parseFloat(e.target.value))}
                  className="accent-[#FF5F1F] cursor-pointer bg-white/10 h-1"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/50 font-black tracking-widest uppercase flex items-center justify-between">
                  <span>Intensidade Luz</span>
                  <span className="font-mono text-[#FF5F1F]">{lightIntensity}</span>
                </label>
                <input 
                  type="range" min="0.5" max="3" step="0.1" value={lightIntensity} 
                  onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                  className="accent-[#FF5F1F] cursor-pointer bg-white/10 h-1"
                />
              </div>
            </div>
          </div>

          {/* WEBGPU LOCAL DRAFTING CONSOLE */}
          <div className="border border-white/10 bg-[#080808]/90 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Cpu className="text-[#FF5F1F]" size={18} />
                <h3 className="text-xs font-black tracking-widest uppercase font-mono">WebGPU Local Inference Model (Drafting)</h3>
              </div>
              <span className="text-xs text-white/60 font-mono">STATUS: {isGPUCompiled ? 'COMPILED_READY' : 'IDLE'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1 flex flex-col gap-4 border-r border-white/5 pr-6">
                <p className="text-xs text-white/50 uppercase leading-relaxed font-bold">
                  Execute modelos de linguagem leves locais diretamente na sua GPU usando WebGPU para zero custos de API.
                </p>
                
                {!isGPUCompiled ? (
                  <button
                    onClick={compileWebGPU}
                    disabled={isCompiling}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-[#FF5F1F] text-[#FF5F1F] hover:bg-[#FF5F1F] hover:text-black font-black text-xs tracking-widest uppercase transition-all"
                  >
                    {isCompiling ? (
                      <>
                        <Loader2 className="animate-spin" size={12} /> Compilando...
                      </>
                    ) : (
                      <>
                        <Zap size={12} /> Compilar WebGPU
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={generateLocalDialogue}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF5F1F] text-black hover:bg-[#FF5F1F]/90 font-black text-xs tracking-widest uppercase transition-all"
                  >
                    <RefreshCw size={12} /> Gerar Diálogo Local
                  </button>
                )}
              </div>

              {/* LOGS WINDOW */}
              <div className="col-span-2 flex flex-col bg-black/90 p-4 border border-white/5 min-h-[120px] font-mono text-xs leading-relaxed">
                <div className="text-white/60 uppercase mb-2 text-xs tracking-widest border-b border-white/5 pb-1">System Compiler Output</div>
                {gpuLogs.length === 0 && <span className="text-white/50">Aguardando compilação do shader...</span>}
                {gpuLogs.map((log, i) => (
                  <div key={i} className="text-white/80">{log}</div>
                ))}
                
                {gpuOutput && (
                  <div className="mt-4 pt-3 border-t border-[#FF5F1F]/30 text-[#FF5F1F] font-bold">
                    <span className="text-xs text-[#FF5F1F]/50 block mb-1">LOCAL DETAILED GENERATED OUTPUT:</span>
                    {gpuOutput}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AGENTS & STREAM MONITOR */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          
          {/* AUTONOMOUS AGENT ORCHESTRATOR */}
          <div className="border border-white/10 bg-[#080808]/90 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Terminal className="text-[#FF5F1F]" size={18} />
                <h3 className="text-xs font-black tracking-widest uppercase">Orquestrador de Agentes Autônomos</h3>
              </div>
              <span className={isAgentRunning ? "w-2 h-2 rounded-full bg-green-500 animate-pulse" : "w-2 h-2 rounded-full bg-white/20"} />
            </div>

            <p className="text-xs text-white/50 leading-relaxed mb-6 font-bold uppercase">
              Orquestre caçadores de tendências, roteiristas criativos e auditores jurídicos em uma esteira 100% autônoma.
            </p>

            <button
              onClick={runAutonomousAgents}
              disabled={isAgentRunning}
              className="w-full flex items-center justify-center gap-2 py-3 border border-white/10 hover:border-white hover:bg-white hover:text-black font-black text-xs tracking-widest uppercase transition-all mb-6"
            >
              {isAgentRunning ? (
                <>
                  <Loader2 className="animate-spin" size={12} /> Executando Caça...
                </>
              ) : (
                <>
                  <Play size={10} /> Disparar Execução Autônoma
                </>
              )}
            </button>

            <div className="flex flex-col bg-black/95 p-4 border border-white/5 font-mono text-xs leading-relaxed min-h-[180px]">
              <div className="text-white/60 uppercase mb-2 text-xs tracking-widest border-b border-white/5 pb-1">Agent Terminal Output</div>
              {agentLogs.length === 0 && <span className="text-white/50">Aguardando disparo do gatilho...</span>}
              {agentLogs.map((log, i) => (
                <div key={i} className="text-white/80 mb-1 border-l-2 border-white/10 pl-2">{log}</div>
              ))}
            </div>
          </div>

          {/* LIVE STREAM FEEDBACK MONITOR */}
          <div className="border border-white/10 bg-[#080808]/90 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Tv className="text-[#FF5F1F]" size={18} />
                <h3 className="text-xs font-black tracking-widest uppercase">Live Stream Monitor (Gemini Live)</h3>
              </div>
              <button
                onClick={() => setStreamActive(!streamActive)}
                className={`px-3 py-1 text-xs font-black uppercase tracking-widest border transition-all ${
                  streamActive 
                    ? "bg-red-600 border-red-600 text-white animate-pulse" 
                    : "bg-transparent border-white/20 text-white/50 hover:border-white hover:text-white"
                }`}
              >
                {streamActive ? 'ON AIR' : 'GO LIVE'}
              </button>
            </div>

            <div className="aspect-video w-full bg-black border border-white/5 flex flex-col items-center justify-center p-4 relative mb-4">
              {streamActive ? (
                <div className="w-full h-full flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs font-mono text-white/60">
                    <span className="flex items-center gap-1.5 text-red-500 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> LIVE
                    </span>
                    <span>{viewerCount} VIEWERS</span>
                  </div>

                  {/* Audio Waveform Canvas */}
                  <canvas ref={canvasRef} className="w-full h-12 my-auto" />

                  <div className="text-xs text-[#FF5F1F] font-mono text-center tracking-widest font-black uppercase">
                    GEMINI_MULTIMODAL_LIVE_CONNECTED
                  </div>
                </div>
              ) : (
                <>
                  <Tv size={36} className="text-white/50 mb-2" />
                  <span className="text-xs font-black uppercase text-white/60 tracking-widest">STREAM IS OFFLINE</span>
                </>
              )}
            </div>

            {/* LIVE CHAT SIMULATION */}
            <div className="flex flex-col bg-black/95 border border-white/5 font-mono text-xs p-4 min-h-[140px] max-h-[160px] overflow-y-auto">
              <div className="text-white/60 uppercase mb-2 text-xs tracking-widest border-b border-white/5 pb-1">Real-Time User Chat</div>
              {liveChat.length === 0 && <span className="text-white/50">Chat ocioso. Inicie a stream...</span>}
              {liveChat.map((chat, i) => (
                <div key={i} className="mb-1 text-white/60">
                  <span className="text-[#FF5F1F] font-bold">@{chat.user}:</span> {chat.text}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
