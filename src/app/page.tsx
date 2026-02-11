"use client";

import React, { useState, useEffect } from 'react';
import { CHARACTERS, STUDIO_SETTING, SHOT_TYPES, Character, GUIDE_IMAGES, ANGLE_SPECS } from '@/data/characters';
import {
  Camera,
  Clapperboard,
  Download,
  Trash2,
  Plus,
  Copy,
  Sparkles,
  Settings2,
  Share2,
  Layers,
  BrainCircuit,
  RefreshCcw,
  Zap,
  Wand2,
  MonitorPlay,
  History,
  ShieldCheck,
  Key,
  BookOpen,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  ShieldQuestion,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrendsFeed } from '@/components/Director/TrendsFeed';
import { jsPDF } from 'jspdf';

type ScriptLine = {
  id: string;
  characterId: string;
  text: string;
  shotType: string;
  action: string;
  durationEst: number;
  emotion?: string;
  status: 'IDLE' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  predictionId?: string;
  videoUrl?: string;
};



export default function Home() {
  const [script, setScript] = useState<ScriptLine[]>([
    { id: '1', characterId: 'boomer', text: "G'day legends! Today we're talking about the Future of AI Production!", shotType: 'WIDE', action: 'Shadow boxing intensely towards the camera', durationEst: 3, emotion: 'Explosive', status: 'IDLE' },
    { id: '2', characterId: 'kev', text: "Yeah, nah. I just want to know when we're finished.", shotType: 'KEV_CU', action: 'Slowly chewing on a gum leaf', durationEst: 2, emotion: 'Deadpan', status: 'IDLE' },
  ]);

  const [activeTab, setActiveTab] = useState<'director' | 'script' | 'dna'>('director');
  const [directorIdea, setDirectorIdea] = useState("");
  const [directorSnippet, setDirectorSnippet] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [previewLineId, setPreviewLineId] = useState<string | null>(null);
  const [sharingLineId, setSharingLineId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isRenderingProject, setIsRenderingProject] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [cinemaLineId, setCinemaLineId] = useState<string | null>(null);
  const [charReferences, setCharReferences] = useState<Record<string, { main: string, wide: string, side: string, close: string, profile: string, detail: string }>>({
    boomer: {
      main: 'https://drive.google.com/file/d/160ZOQOxYsAzk6-ftW6rRVccQbBVR8jn1/view?usp=sharing',
      wide: '',
      side: '',
      close: '',
      profile: '',
      detail: ''
    },
    kev: {
      main: 'https://drive.google.com/file/d/1Msb2xa_rbAeMlzvuKh9Hi8zCdzw15bQh/view?usp=sharing',
      wide: '',
      side: '',
      close: '',
      profile: '',
      detail: ''
    }
  });

  const [voiceIds, setVoiceIds] = useState<Record<string, string>>({
    boomer: typeof window !== 'undefined' ? localStorage.getItem('BK_VOICE_BOOMER') || CHARACTERS[0].voiceId : CHARACTERS[0].voiceId,
    kev: typeof window !== 'undefined' ? localStorage.getItem('BK_VOICE_KEV') || CHARACTERS[1].voiceId : CHARACTERS[1].voiceId
  });
  const [studioReference, setStudioReference] = useState('https://drive.google.com/file/d/1tqQAsVev8OV2LZ01FkkfQ1Sag94K-IjY/view?usp=sharing');
  const [dnaFolderUrl, setDnaFolderUrl] = useState('https://drive.google.com/drive/folders/1BhtSpeBYhTG5TgQmPbqxBK2z1SCQh5Zf');
  const [activeFooterModal, setActiveFooterModal] = useState<'docs' | 'keys' | 'support' | null>(null);
  const [apiKeys, setApiKeys] = useState({
    replicate: typeof window !== 'undefined' ? localStorage.getItem('BK_REPLICATE_KEY') || '' : '',
    elevenlabs: typeof window !== 'undefined' ? localStorage.getItem('BK_ELEVENLABS_KEY') || '' : ''
  });
  const [balanceData, setBalanceData] = useState<any>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [renderMode, setRenderMode] = useState<'REAL' | 'SANDBOX' | null>(null);

  const refreshBalance = async (keys = apiKeys) => {
    if (!keys.replicate && !keys.elevenlabs) return;
    setIsCheckingBalance(true);
    try {
      const res = await fetch('/api/keys/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys)
      });
      const data = await res.json();
      setBalanceData(data);
    } catch (err) {
      console.error("BALANCE_CHECK_FAILURE", err);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  useEffect(() => {
    if (activeFooterModal === 'keys' || (apiKeys.replicate || apiKeys.elevenlabs)) {
      refreshBalance();
    }
  }, [activeFooterModal]);

  // Frontend G-Drive resolver for UI previews
  const getPreviewUrl = (url: string) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    if (cleanUrl.includes('drive.google.com')) {
      const gMatch = cleanUrl.match(/\/d\/(.+?)(?:\/|$|\?)/) || cleanUrl.match(/id=(.+?)(?:&|$|#)/);
      const fileId = gMatch ? gMatch[1] : null;
      // Using thumbnail restricted to larger size for better UI preview reliability
      if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      // If it's a Google Drive URL but no fileId is found, return null
      return null;
    }
    // If it's not a Google Drive URL, return the clean URL as is
    return cleanUrl;
  };

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const generateAIScript = (contextOverride?: { title: string, snippet: string }) => {
    const title = contextOverride?.title || directorIdea;
    const snippet = contextOverride?.snippet || directorSnippet;

    if (!title) return;
    setIsGenerating(true);

    setTimeout(() => {
      const boomer = CHARACTERS[0];
      const kev = CHARACTERS[1];

      const getMotion = (char: Character, emotion: string) => {
        const behavior = char.motionBehaviors.find(b => b.emotion === emotion) || char.motionBehaviors[0];
        return behavior.action;
      };

      const topicKeywords = title.split(' ').filter(w => w.length > 3);
      const mainSubject = topicKeywords[0] || title;

      // 2026 NEUROMARKETING ARCHITECTURE: Hook -> Dopamine Loop -> Cognitive Contrast -> Loss Aversion
      const newScript: ScriptLine[] = [
        // PHASE 1: THE PATTERN INTERRUPT (0-6s) - Triggering the Amygdala
        {
          id: Math.random().toString(36).substr(2, 9),
          characterId: 'boomer',
          text: `EYES ON ME! 🔴 You're currently ignoring a ${title.toUpperCase()} loophole that is literally siphoning your attention! Your brain is lying to you!`,
          shotType: 'LOW_ANGLE_BOOMER',
          action: getMotion(boomer, 'Explosive'),
          durationEst: 6,
          emotion: 'Explosive',
          status: 'IDLE'
        },
        // PHASE 2: THE DOPAMINE SPIKE (6-15s) - Information Arbitrage as Reward
        {
          id: Math.random().toString(36).substr(2, 9),
          characterId: 'boomer',
          text: `Decode the pattern: ${snippet ? snippet.split('.')[0] : `This ${mainSubject} shift is 100% asymmetric`}! The 1% are using this as a weaponized advantage while you're stuck in the legacy loop!`,
          shotType: 'BOOMER_MCU',
          action: getMotion(boomer, 'Power'),
          durationEst: 9,
          emotion: 'Power',
          status: 'IDLE'
        },
        // PHASE 3: COGNITIVE CONTRAST (15-22s) - Mirror Neuron Conflict (The Skeptic)
        {
          id: Math.random().toString(36).substr(2, 9),
          characterId: 'kev',
          text: `Weaponized advantage? Give it a rest, Boomer. You're just stimming on ${mainSubject} hype. It's a standard noise-floor event. I'm choosing biological stasis.`,
          shotType: 'KEV_CU',
          action: getMotion(kev, 'Disbelief'),
          durationEst: 7,
          emotion: 'Disbelief',
          status: 'IDLE'
        },
        // PHASE 4: LOSS AVERSION & BINARY CLOSURE (22-30s) - The "Survivor" Play
        {
          id: Math.random().toString(36).substr(2, 9),
          characterId: 'boomer',
          text: `Biological stasis is just a fancy word for OBSOLESCENCE, mate! ${mainSubject} is the leverage point. Adapt in the next 24 hours or accept the liquidation. ARE YOU IN OR OUT?`,
          shotType: 'GOPRO_FISHEYE',
          action: getMotion(boomer, 'Vibe'),
          durationEst: 8,
          emotion: 'Vibe',
          status: 'IDLE'
        }
      ];

      setScript(newScript);
      setIsGenerating(false);
      setActiveTab('script');
    }, 1500);
  };

  const addLine = () => {
    const lastCharId = script[script.length - 1]?.characterId;
    const nextCharId = lastCharId === 'boomer' ? 'kev' : 'boomer';
    const char = CHARACTERS.find(c => c.id === nextCharId)!;

    const behavior = char.motionBehaviors[Math.floor(Math.random() * char.motionBehaviors.length)];
    const catchphrase = char.catchphrases[Math.floor(Math.random() * char.catchphrases.length)];

    const mainSubject = directorIdea || "this massive trend";

    const transitions = char.id === 'boomer'
      ? [
        `And the absolute high-stakes kicker about ${mainSubject} is the sheer biological scale—this is industrial-grade domination!`,
        `But wait, analyze the ${mainSubject} metrics with your own eyes—the wealth gap is closing or widening based on this logic!`,
        `This ${mainSubject} shift is a total elite power move, we're talking legacy-level arbitrage!`,
        `Nobody is prepared for how ${mainSubject} is going to liquidate every traditional player in this space!`
      ]
      : [
        `Right, because ${mainSubject} is the 'answer'... sounds like a sales pitch to me.`,
        `I'm still waiting for a single shred of evidence that ${mainSubject} isn't just hype.`,
        `You're dreaming about ${mainSubject} 'leverage', mate. It's just more work.`,
        `Ground control to Boomer, you're drowning in the ${mainSubject} Kool-Aid.`
      ];

    const suggestedText = `${catchphrase} ${transitions[Math.floor(Math.random() * transitions.length)]}`;

    setScript([...script, {
      id: Math.random().toString(36).substr(2, 9),
      characterId: nextCharId,
      text: suggestedText,
      shotType: char.id === 'boomer' ? 'BOOMER_MCU' : 'KEV_CU',
      action: behavior.action,
      durationEst: 5,
      emotion: behavior.emotion,
      status: 'IDLE'
    }]);
  };

  const removeLine = (id: string) => {
    setScript(script.filter(line => line.id !== id));
  };

  const updateLine = (id: string, field: keyof ScriptLine, value: string | number) => {
    setScript(prevScript => prevScript.map(line => {
      if (line.id !== id) return line;
      const updatedLine = { ...line, [field]: value };

      if (field === 'durationEst') {
        const char = CHARACTERS.find(c => c.id === line.characterId);
        const isIncreasing = (value as number) > line.durationEst;
        if (char) {
          if (isIncreasing) {
            const fillers = char.id === 'boomer'
              ? ["This is the asymmetric intelligence they're trying to hide from you!", "Capture the definition of this play!", "This is absolute tactical madness!"]
              : ["Does anyone actually care?", "I could be napping right now.", "It's all one big circus."];

            const newText = ` ${fillers[Math.floor(Math.random() * fillers.length)]} ${char.catchphrases[Math.floor(Math.random() * char.catchphrases.length)]}`;
            updatedLine.text = line.text + newText;

            if ((value as number) > 6) {
              const secondaryBehavior = char.motionBehaviors[Math.floor(Math.random() * char.motionBehaviors.length)];
              updatedLine.action = `${line.action} THEN ${secondaryBehavior.action.toLowerCase()}`;
            }
          } else if (line.text.length > 40) {
            const sentences = line.text.split(/[.!?]/);
            updatedLine.text = sentences.length > 1 ? sentences.slice(0, -1).join('.') + "!" : line.text.substring(0, Math.floor(line.text.length * 0.7)) + "...";

            if ((value as number) <= 5) {
              const behavior = char.motionBehaviors.find(b => b.emotion === line.emotion) || char.motionBehaviors[0];
              updatedLine.action = behavior.action;
            }
          }
        }
      }
      return updatedLine;
    }));
  };

  const totalDuration = script.reduce((acc, line) => acc + line.durationEst, 0);
  const totalCost = (totalDuration * 0.14).toFixed(2);

  const getDetailedPrompt = (line: ScriptLine) => {
    const char = CHARACTERS.find(c => c.id === line.characterId);
    const shot = SHOT_TYPES.find(s => s.id === line.shotType);

    if (!char) return "";

    const characterBase = `Cinematic 8k video, neuromorphic anthropomorphic ${char.species}, ${char.visualDescription}. Subliminal micro-muscle jitters in fur, dilated pupils to trigger mirror neurons.`;
    const actionBase = `Action: ${line.action}. High-frequency micro-expressions: ${line.emotion?.toUpperCase()}. Hyper-precise lip-sync alignment for psychological impact: "${line.text}".`;
    const lightingBase = `Lighting: ${char.lightingKey}, volumetric god-rays with subliminal color-shift triggers (Red/Orange for Boomer, Cool Teal for Kev). Studio: ${STUDIO_SETTING.visualDescription}.`;
    const cameraBase = `Camera: ${shot?.label}. Rapid 15% FOV pulse on key beats. 60fps, sharp focus on tactile textures.`;

    return `${cameraBase} SUBJECT: ${characterBase} ${actionBase} ${lightingBase} STYLE: 2026 Viral Neuromarketing, ultra-realistic podcast, hyper-tactile 3D render.`;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const driveLink = "https://drive.google.com/drive/folders/1BhtSpeBYhTG5TgQmPbqxBK2z1SCQh5Zf";
    let y = 0;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    const addHeader = (pageNum: number) => {
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setFontSize(18);
      doc.setTextColor(255, 95, 31);
      doc.setFont("helvetica", "bold");
      doc.text("BOOMER & KEV STUDIO", margin, 20);

      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("MASTER PRODUCTION MANIFEST / CALL SHEET v2.6", margin, 30);

      doc.setTextColor(100, 100, 100);
      doc.text(`PAGE ${pageNum}`, pageWidth - margin - 15, 20);
      doc.text(`PIPELINE: CINEMATIC_ENGINE`, pageWidth - margin - 40, 30);
    };

    let pageNum = 1;
    addHeader(pageNum);
    y = 55;

    // Document Summary
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("PRODUCTION OVERVIEW", margin, y);
    y += 7;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`GENERATED: ${new Date().toLocaleString().toUpperCase()}`, margin, y);
    doc.text(`TOTAL SCENES: ${script.length}`, margin + 80, y);
    doc.text(`TOTAL RUNTIME: ${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`, margin + 120, y);
    y += 10;

    doc.setTextColor(255, 95, 31);
    doc.setFont("helvetica", "bold");
    doc.text(`ASSET REPOSITORY (GOOGLE DRIVE):`, margin, y);
    y += 5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(driveLink, margin, y);
    y += 15;

    script.forEach((line, index) => {
      const char = CHARACTERS.find(c => c.id === line.characterId);
      const shot = SHOT_TYPES.find(s => s.id === line.shotType);

      // Check for page break (Scene card height approx 60 units)
      if (y > 230) {
        doc.addPage();
        pageNum++;
        addHeader(pageNum);
        y = 50;
      }

      // SCENE CARD CONTAINER
      doc.setDrawColor(240, 240, 240);
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, y, pageWidth - (margin * 2), 65, 'F');
      doc.rect(margin, y, pageWidth - (margin * 2), 65, 'S');

      // Side Color Bar
      doc.setFillColor(line.characterId === 'boomer' ? 255 : 200, line.characterId === 'boomer' ? 95 : 200, line.characterId === 'boomer' ? 31 : 200);
      doc.rect(margin, y, 4, 65, 'F');

      // Scene Identifier
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(`SCENE ${String(index + 1).padStart(2, '0')} // ${char?.name.toUpperCase()}`, margin + 10, y + 10);

      // Shot Info
      doc.setFontSize(8);
      doc.setTextColor(255, 95, 31);
      doc.text(`${line.shotType} | ${shot?.label}`, margin + 10, y + 16);

      // VOICE OVER Section
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      const scriptText = `VOICE OVER: "${line.text.toUpperCase()}"`;
      const splitText = doc.splitTextToSize(scriptText, 160);
      doc.text(splitText, margin + 10, y + 28);

      // Dynamic y offset for text
      const textOffset = (splitText.length * 5);

      // METADATA LINE
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text(`MOTION: ${line.action} | EMOTION: ${line.emotion} | EST: ${line.durationEst} SEC`, margin + 10, y + 33 + textOffset);

      // AI PROMPT BLOCK
      doc.setFillColor(240, 240, 240);
      doc.rect(margin + 8, y + 38 + textOffset, pageWidth - (margin * 2) - 16, 20, 'F');

      const prompt = getDetailedPrompt(line);
      const splitPrompt = doc.splitTextToSize(`TECH_PROMPT: ${prompt}`, 155);
      doc.setFontSize(6);
      doc.setTextColor(120, 120, 120);
      doc.text(splitPrompt, margin + 12, y + 43 + textOffset);

      y += 75; // Card Space
    });

    // FOOTER
    const lastY = 285;
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text("THIS DOCUMENT IS THE PROPERTY OF BOOMER & KEV STUDIO. UNAUTHORIZED DISTRIBUTION IS RIGOROUSLY PROHIBITED.", margin, lastY);
    doc.text("POWERED BY CINEMATIC ENGINE v2.6", pageWidth - margin - 45, lastY);

    doc.save(`BK-MANIFEST-${Date.now()}.pdf`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const renderProject = async () => {
    alert("RENDER_SCENE_INITIATED");
    console.log("RENDER_PROJECT_TRIGGERED");
    setIsRenderingProject(true);
    setRenderProgress(0);
    setRenderLogs(["INITIALIZING_PRODUCTION_PIPELINE...", "CONNECTING_TO_SERVER_ENGINE...", "VALIDATING_NEUROMARKETING_TRIGGERS..."]);

    // Add Balance Diagnostic to logs
    if (balanceData) {
      if (balanceData.elevenlabs?.status === 'AUTHENTICATED') {
        setRenderLogs(prev => [`SYSTEM_FUEL_STATUS: ${balanceData.elevenlabs.balance}`, ...prev]);
      }
      if (balanceData.replicate?.status === 'AUTHENTICATED') {
        setRenderLogs(prev => [`REPLICATE_SIGNAL: ${balanceData.replicate.balance}`, ...prev]);
      }
    }

    // Prepare Data for API
    const productionData = {
      script: script.map(line => {
        // Intelligent Shot Mapping: Select the best anchor based on shot type
        let selectedReference = charReferences[line.characterId]?.main || '';

        const charRef = charReferences[line.characterId];
        if (charRef) {
          if (line.shotType === 'WIDE' && charRef.wide) selectedReference = charRef.wide;
          else if ((line.shotType === 'KEV_CU' || line.shotType === 'BOOMER_MCU') && charRef.close) selectedReference = charRef.close;
          else if (line.shotType.includes('OTS') || line.shotType.includes('LOW')) selectedReference = charRef.side || charRef.main;
          else if (line.shotType.includes('PROFILE') && charRef.profile) selectedReference = charRef.profile;
          else if (line.shotType.includes('DETAIL') && charRef.detail) selectedReference = charRef.detail;
          // Fallback to main if specific shot type reference is not available
          else selectedReference = charRef.main;
        }

        return {
          ...line,
          technicalPrompt: getDetailedPrompt(line),
          characterReference: selectedReference,
          studioReference: studioReference
        };
      }),
      studioDNA: STUDIO_SETTING
    };

    try {
      // Step 1: Simulated Preparation Logs
      setRenderLogs(prev => ["ENCRYPTING_NEUROMORPHIC_PAYLOAD...", ...prev]);
      setRenderProgress(15);
      await new Promise(r => setTimeout(r, 800));

      // Step 2: Real API Handshake
      console.log("FETCHING_API_RENDER...");
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productionData)
      });

      const data = await response.json();
      console.log("RENDER_API_RESPONSE:", data);
      setRenderMode(data.mode);

      if (!response.ok) {
        setRenderLogs(prev => [`ERROR: ${data.error || 'PIPELINE_CRASH'}`, data.suggestion || "Check terminal for crash data.", ...prev]);
        setRenderProgress(0);
        setTimeout(() => setIsRenderingProject(false), 4000);
        return;
      }

      if (data.mode === 'SANDBOX') {
        setRenderLogs(prev => [
          "⚠️ WARNING: NO_API_KEY_DETECTED. RUNNING_IN_SANDBOX_MODE.",
          "SIMULATING_NEUROMORPHIC_ENCODING...",
          ...prev
        ]);
      } else {
        setRenderLogs(prev => ["HANDSHAKE_SUCCESSFUL. PIPELINE: REAL_TIME_KLING_V2.6", ...prev]);
      }

      setRenderLogs(prev => ["QUEUING_SCENES_FOR_SYNTHESIS...", ...prev]);

      // Step 3: Progressive Scene Updates & Real-Time Polling
      const sceneResults = data.results || [];

      // Link backend prediction IDs to frontend script lines
      setScript(prev => prev.map(line => {
        const result = sceneResults.find((r: { sceneId: string; predictionId?: string; status?: string }) => r.sceneId === line.id);
        return {
          ...line,
          status: result?.status === 'FAILED' ? 'FAILED' : 'QUEUED',
          predictionId: result?.predictionId
        };
      }));

      // Start individual polling for real results
      if (sceneResults.length > 0 && sceneResults[0].predictionId && !sceneResults[0].predictionId.startsWith('rep_')) {
        sceneResults.forEach((res: { sceneId: string, predictionId: string }) => {
          const poll = setInterval(async () => {
            try {
              const pollRes = await fetch(`/api/render/status?id=${res.predictionId}`);
              const pollData = await pollRes.json();

              if (pollData.status === 'succeeded' || pollData.status === 'failed') {
                clearInterval(poll);
                setScript(prev => prev.map(l => l.id === res.sceneId ? {
                  ...l,
                  status: pollData.status === 'succeeded' ? 'COMPLETED' : 'FAILED',
                  videoUrl: pollData.output?.[0]
                } : l));
              } else if (pollData.status === 'processing') {
                setScript(prev => prev.map(l => l.id === res.sceneId ? { ...l, status: 'PROCESSING' } : l));
              }
            } catch (e) {
              clearInterval(poll);
            }
          }, 4000);
        });
      }

      // Visual Terminal Progress (Aesthetic & Sandbox Logic)
      let currentProgress = 20;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 8;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          setRenderLogs(prev => ["SUCCESS: PRODUCTION_READY. PIPELINE_IDLE.", ...prev]);
          setTimeout(() => {
            setIsRenderingProject(false);
            setRenderMode(null);
          }, 2500);
        }
        setRenderProgress(currentProgress);

        // Progressively finalize sandbox statuses based on progress %
        if (data.mode === 'SANDBOX') {
          setScript(prev => prev.map((line, idx) => {
            const threshold = (idx / prev.length) * 100;
            if (currentProgress > threshold && line.status === 'QUEUED') {
              return { ...line, status: 'COMPLETED' };
            }
            return line;
          }));
        }
      }, 600);

    } catch (error) {
      console.error("RENDER_PROJECT_ERROR:", error);
      setRenderLogs(prev => ["CRITICAL_PIPELINE_FAILURE.", "Check network conditions.", ...prev]);
      setRenderProgress(0);
      setTimeout(() => setIsRenderingProject(false), 3000);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-screen bg-[#050505] overflow-hidden">
      <main className="flex-1 flex bg-[#050505] text-white selection:bg-[#FF5F1F] selection:text-white font-sans overflow-hidden min-h-0">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-24 border-r border-white/5 flex flex-col items-center py-10 justify-between bg-[#050505] z-50">
          <div className="flex flex-col gap-12">
            <div className="w-12 h-12 bg-[#FF5F1F] flex items-center justify-center rotate-45 hover:rotate-90 transition-all duration-700 cursor-none group">
              <div className="-rotate-45 group-hover:-rotate-90 transition-all duration-700">
                <span className="text-black font-black text-xs">BK</span>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <button
                onClick={() => setActiveTab('director')}
                className={cn("p-4 transition-all duration-500 hover:bg-white/5 relative group",
                  activeTab === 'director' ? "text-[#FF5F1F]" : "text-white/20")}
              >
                <MonitorPlay size={24} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-[#FF5F1F] text-white text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-[100]">Director_Terminal</span>
              </button>
              <button
                onClick={() => setActiveTab('script')}
                className={cn("p-4 transition-all duration-500 hover:bg-white/5 relative group",
                  activeTab === 'script' ? "text-[#FF5F1F]" : "text-white/20")}
              >
                <Zap size={24} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-[#FF5F1F] text-white text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-[100]">Production_Timeline</span>
              </button>
              <button
                onClick={() => setActiveTab('dna')}
                className={cn("p-4 transition-all duration-500 hover:bg-white/5 relative group",
                  activeTab === 'dna' ? "text-[#FF5F1F]" : "text-white/20")}
              >
                <History size={24} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-[#FF5F1F] text-white text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-[100]">Engine_DNA</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6 items-center">
            <div className="group relative cursor-help">
              <Layers size={20} className={cn("transition-colors", activeTab === 'director' ? "text-[#FF5F1F]" : "text-white/20")} />
            </div>
            <div className="group relative cursor-help">
              <Zap size={20} className={cn("transition-colors", activeTab === 'script' ? "text-[#FF5F1F]" : "text-white/20")} />
            </div>
            <div className="group relative cursor-help">
              <History size={20} className={cn("transition-colors", activeTab === 'dna' ? "text-[#FF5F1F]" : "text-white/20")} />
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-0">
          {/* TOP NAVIGATION */}
          <nav
            role="navigation"
            aria-label="Master Console Navigation"
            className="w-full px-8 py-4 flex flex-col md:flex-row justify-between items-center bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5 z-50 gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FF5F1F] flex items-center justify-center rounded-none shadow-[0_0_20px_rgba(255,95,31,0.3)]">
                <BrainCircuit size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tighter leading-none">BOOMER & KEV <span className="text-[#FF5F1F]">STUDIO</span></h1>
                <p className="text-[10px] text-white/40 tracking-[0.3em] font-bold">CINEMATIC ENGINE v2.6</p>
              </div>
            </div>

            <div className="flex gap-1 bg-[#111111] p-1 border border-white/5">
              {[
                { id: 'director', label: 'DIRECTOR', icon: Wand2 },
                { id: 'script', label: 'PRODUCTION', icon: Clapperboard },
                { id: 'dna', label: 'ENGINE DNA', icon: History }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  aria-label={`Switch to ${tab.label}`}
                  aria-pressed={activeTab === tab.id}
                  className={cn("px-6 py-2 text-[11px] font-black tracking-widest transition-all",
                    activeTab === tab.id ? "bg-white text-black" : "text-white/30 hover:text-white")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-10">
                <div className="hidden lg:flex flex-col items-end border-r border-white/10 pr-8">
                  <span className="text-[10px] text-white/30 tracking-widest uppercase mb-1">Total Duration</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black italic">{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')} <span className="text-[10px] text-white/40 font-bold ml-1">MINS</span></span>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                </div>

                <div className="hidden lg:flex flex-col items-end border-r border-white/10 pr-8">
                  <span className="text-[10px] text-white/30 tracking-widest uppercase mb-1">Scene Count</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black italic">{script.length} <span className="text-[10px] text-white/40 font-bold ml-1">BLOCKS</span></span>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  </div>
                </div>

                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-[10px] text-white/30 tracking-widest uppercase mb-1">Production Budget</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">${totalCost}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF5F1F]" />
                  </div>
                </div>
              </div>
              <button
                onClick={renderProject}
                disabled={isRenderingProject || script.length === 0}
                aria-label="Initiate Render Cycle"
                className="btn-signal flex items-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                <MonitorPlay size={16} fill="currentColor" className="relative z-10" />
                <span className="relative z-10">{isRenderingProject ? "RENDERING..." : "RENDER SCENE"}</span>
              </button>
            </div>
          </nav>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0 bg-[#050505]">
            {activeTab === 'director' && (
              <div className="flex-1 flex overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto px-12 py-12 scroll-smooth bg-[#0a0a0a]/50">
                  <div className="max-w-4xl mx-auto xl:mx-0 animate-in fade-in duration-700">
                    <div className="mb-20 space-y-2">
                      <h2 className="text-7xl font-black tracking-tighter uppercase italic">Feed the <span className="text-[#FF5F1F]">Machine.</span></h2>
                      <p className="text-xl text-white/30 font-bold max-w-xl leading-snug uppercase tracking-tight">The engine will synthesize storytelling, character motion, and cinematic framing from your core idea.</p>
                    </div>

                    <div className="studio-panel p-1 border-white/10 focus-within:border-[#FF5F1F]/50 transition-all duration-700 bg-[#111111]">
                      <div className="p-10 bg-[#0d0d0d]">
                        <div className="flex items-center gap-2 mb-6 opacity-40">
                          <Zap size={14} className="text-[#FF5F1F]" />
                          <span className="text-[10px] font-black tracking-widest uppercase">Input_Narrative_Terminal</span>
                        </div>
                        <textarea
                          value={directorIdea}
                          onChange={(e) => setDirectorIdea(e.target.value)}
                          placeholder="NARRATIVE TRIGGER..."
                          className="w-full bg-transparent border-none text-4xl font-black placeholder:text-white/5 focus:ring-0 outline-none resize-none min-h-[300px] uppercase italic tracking-tighter leading-[0.85]"
                        />
                        <div className="flex justify-between items-center mt-10">
                          <div className="flex items-center gap-4">
                            <div className="px-3 py-1 border border-white/10 text-[10px] font-black text-white/20">NVIDIA_CUDA: ACTIVE</div>
                            <div className="px-3 py-1 border border-white/10 text-[10px] font-black text-white/20">AGENT_CONFIDENCE: 98.4%</div>
                          </div>
                          <button
                            onClick={() => generateAIScript()}
                            disabled={!directorIdea || isGenerating}
                            className="bg-white text-black px-12 py-6 font-black text-sm tracking-[0.2em] flex items-center gap-4 hover:bg-[#FF5F1F] hover:text-white transition-all disabled:opacity-20 shadow-[12px_12px_0_rgba(255,95,31,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                          >
                            {isGenerating ? "MODULATING..." : "START PRODUCTION"}
                            <Wand2 size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="hidden 2xl:block h-full flex flex-col min-w-0 max-h-full">
                  <TrendsFeed onSelectTrend={(trend) => {
                    setDirectorIdea(trend.title);
                    setDirectorSnippet(trend.snippet);
                    generateAIScript({ title: trend.title, snippet: trend.snippet });
                  }} />
                </aside>
              </div>
            )}

            {activeTab === 'script' && (
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
                      className={cn("bg-[#080808] flex min-h-[300px] border-l-4 transition-all duration-500",
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
                              onClick={() => setSharingLineId(line.id)}
                              className="p-2 border border-white/5 text-white/20 hover:text-white hover:border-white/20 transition-all"
                            >
                              <Share2 size={16} />
                            </button>
                            {index >= 4 && (
                              <button onClick={() => removeLine(line.id)} className="text-red-500/30 hover:text-red-500 hover:scale-110 transition-all p-2">
                                <Trash2 size={16} />
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
                            <div className="absolute inset-0 bg-gradient-to-br from-[#FF5F1F]/20 to-transparent opacity-50" />
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
            )}

            {activeTab === 'dna' && (
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[2px] bg-white/5 border-b border-white/5 mb-16 px-2 pb-16">
                  {CHARACTERS.map(char => (
                    <div key={char.id} className="bg-[#080808] p-16 space-y-12">
                      <div className="flex items-center justify-between">
                        <div className="w-20 h-20 bg-[#111111] border border-white/10 flex items-center justify-center text-5xl font-black">
                          {char.name[0]}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-[#FF5F1F] tracking-[0.5em] block mb-1">BIOLOGICAL UNIT</span>
                          <h3 className="text-4xl font-black tracking-tighter uppercase">{char.name}</h3>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="space-y-6">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5F1F]">Primary_Genetic_Anchor</h4>

                          <div className="relative aspect-square w-full bg-[#111111] border border-white/10 overflow-hidden group/dna-preview">
                            {charReferences[char.id].main ? (
                              <img
                                src={getPreviewUrl(charReferences[char.id].main) || ''}
                                alt={`${char.name} DNA`}
                                className="w-full h-full object-cover opacity-80 group-hover/dna-preview:opacity-100 transition-opacity duration-700"
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
                          <input
                            type="text"
                            placeholder="PASTE_MASTER_DNA_URL"
                            value={charReferences[char.id].main}
                            onChange={(e) => setCharReferences(prev => ({
                              ...prev,
                              [char.id]: { ...prev[char.id], main: e.target.value }
                            }))}
                            className="w-full bg-[#111111] border border-white/10 px-6 py-4 text-[10px] font-bold text-white uppercase outline-none focus:border-[#FF5F1F] transition-all"
                          />
                        </div>

                        {/* Sonic Behavioral Module */}
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5F1F]">Sonic_Behavioral_Module</h4>
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
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Optical_Angle_Expansion_Matrix</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                            {['wide', 'side', 'close', 'profile', 'detail'].map((angle) => (
                              <div key={angle} className="space-y-4">
                                <div className="aspect-[4/3] bg-[#0d0d0d] border border-white/5 relative overflow-hidden group/angle">
                                  {charReferences[char.id][angle as keyof typeof charReferences[string]] ? (
                                    <img
                                      src={getPreviewUrl(charReferences[char.id][angle as keyof typeof charReferences[string]]) || ''}
                                      className="w-full h-full object-cover opacity-40 group-hover/angle:opacity-100 transition-all duration-500"
                                      alt={`${char.name} ${angle}`}
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080808]">
                                      <img
                                        src={GUIDE_IMAGES[angle] || GUIDE_IMAGES.main}
                                        className="absolute inset-0 w-full h-full object-cover opacity-[0.03] grayscale brightness-50"
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
                                <input
                                  type="text"
                                  placeholder="ANCHOR_URL"
                                  value={charReferences[char.id][angle as keyof typeof charReferences[string]]}
                                  onChange={(e) => setCharReferences(prev => ({
                                    ...prev,
                                    [char.id]: { ...prev[char.id], [angle]: e.target.value }
                                  }))}
                                  className="w-full bg-[#111111] border border-white/5 text-[8px] font-bold text-white/20 uppercase outline-none focus:border-[#FF5F1F] p-2 transition-colors"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Behavioral Sets</h4>
                          <div className="flex flex-wrap gap-1">
                            {char.motionBehaviors.map((behavior, bIndex) => (
                              <span key={bIndex} className="px-3 py-1 bg-white/5 text-[9px] font-black uppercase tracking-wider text-white/50">
                                {behavior.action}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-10 items-start">
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF5F1F]">Psych_Logic</h4>
                            <p className="text-xs font-bold text-white/40 leading-relaxed uppercase">{char.personality}</p>
                          </div>
                          <div className="space-y-2 text-right">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF5F1F]">Optical_Key</h4>
                            <p className="text-xs font-bold text-white/40 leading-relaxed uppercase italic">{char.lightingKey}</p>
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
            )}
          </div>
        </div>

        {sharingLineId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="max-w-2xl w-full bg-[#0d0d0d] border border-white/10 p-12 relative shadow-[20px_20px_0_rgba(255,95,31,0.1)]">
              <button
                onClick={() => setSharingLineId(null)}
                className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"
              >
                <Trash2 size={24} />
              </button>

              <div className="mb-10">
                <span className="text-[10px] font-black text-[#FF5F1F] tracking-[0.4em] block mb-2 uppercase italic">Exporting Beat</span>
                <h2 className="text-4xl font-black tracking-tighter uppercase italic">Output Channel</h2>
              </div>

              <div className="bg-black/50 border border-white/5 p-8 mb-6 overflow-hidden relative">
                <div className="absolute top-2 right-4 text-[7px] font-black text-white/10 tracking-[0.5em] uppercase">Beat_Buffer_Raw</div>
                <p className="text-lg font-bold text-white/80 leading-relaxed uppercase mb-4">
                  VOICE OVER: &quot;{script.find(l => l.id === sharingLineId)?.text}&quot;
                </p>
                <div className="mt-6 pt-6 border-t border-white/5">
                  <span className="text-[8px] font-black text-[#FF5F1F] tracking-[0.3em] uppercase block mb-2">AI_Video_Prompt_Synthesis</span>
                  <p className="text-[10px] text-white/40 italic leading-relaxed">
                    {sharingLineId && getDetailedPrompt(script.find(l => l.id === sharingLineId)!)}
                  </p>
                </div>
              </div>

              <div className="mb-10 p-4 border border-[#FF5F1F]/20 bg-[#FF5F1F]/5">
                <span className="text-[8px] font-black text-white/40 tracking-[0.2em] uppercase block mb-1">Visual Asset Remote Repository</span>
                <a href={dnaFolderUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#FF5F1F] font-bold hover:underline break-all">
                  {dnaFolderUrl}
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => copyToClipboard(script.find(l => l.id === sharingLineId)?.text || "")}
                  className={cn("px-8 py-5 font-black text-[12px] tracking-widest uppercase flex items-center justify-center gap-4 transition-all duration-300",
                    isCopied ? "bg-green-500 text-white" : "bg-white text-black hover:bg-[#FF5F1F] hover:text-white shadow-[8px_8px_0_rgba(255,255,255,0.1)]")}
                >
                  {isCopied ? <Plus size={18} className="rotate-45" /> : <Copy size={18} />}
                  {isCopied ? "COPIED TO CLIPBOARD" : "COPY TO CLIPBOARD"}
                </button>

                <button
                  onClick={() => {
                    const line = script.find(l => l.id === sharingLineId);
                    if (line) {
                      const char = CHARACTERS.find(c => c.id === line.characterId);
                      const doc = new jsPDF();
                      doc.setFontSize(16);
                      doc.text(`${char?.name.toUpperCase()} - Beat Script`, 20, 20);
                      doc.setFontSize(12);
                      doc.text(doc.splitTextToSize(line.text.toUpperCase(), 170), 20, 40);
                      doc.save(`beat-export-${line.id}.pdf`);
                    }
                  }}
                  className="px-8 py-5 border border-white/10 text-white font-black text-[12px] tracking-widest uppercase flex items-center justify-center gap-4 hover:bg-white/5 transition-all shadow-[8px_8px_0_rgba(255,255,255,0.05)]"
                >
                  <Download size={18} /> DOWNLOAD BEAT (PDF)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full z-[60] px-8 py-3 bg-[#050505] border-t border-white/5 flex justify-between items-center text-[9px] font-black tracking-[0.2em] text-white/20">
        <div className="flex gap-10">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-green-500 rounded-full animate-ping" />
            ENGINE_STATUS: OPTIMAL
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-[#FF5F1F] rounded-full" />
            RENDER_CORE: TURBOPACK
          </div>
          {balanceData?.elevenlabs?.status === 'AUTHENTICATED' && (
            <div className="flex items-center gap-3 border-l border-white/5 pl-10">
              <span className="text-white/40 uppercase tracking-widest">ElevenLabs_Buffer:</span>
              <span className="text-[#FF5F1F] uppercase">{balanceData.elevenlabs.balance}</span>
              <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF5F1F] transition-all duration-1000"
                  style={{ width: `${balanceData.elevenlabs.percent}%` }}
                />
              </div>
            </div>
          )}
          {balanceData?.replicate?.status === 'AUTHENTICATED' && (
            <div className="flex items-center gap-3 border-l border-white/5 pl-10">
              <span className="text-white/40 uppercase tracking-widest">Replicate:</span>
              <span className="text-green-500 uppercase">ACTIVE_SIGNAL</span>
            </div>
          )}
        </div>
        <div className="flex gap-6 uppercase">
          <button
            onClick={() => setActiveFooterModal('docs')}
            className={cn("hover:text-white transition-colors", activeFooterModal === 'docs' && "text-white")}
          >
            Documentation
          </button>
          <button
            onClick={() => setActiveFooterModal('keys')}
            className={cn("hover:text-white transition-colors", activeFooterModal === 'keys' && "text-white")}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveFooterModal('support')}
            className={cn("hover:text-white transition-colors text-[#FF5F1F]", activeFooterModal === 'support' && "text-white")}
          >
            Support
          </button>
        </div>
      </footer>
      {
        isRenderingProject && (
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
        )
      }
      {
        cinemaLineId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-3xl animate-in zoom-in-95 duration-300">
            <div className="max-w-6xl w-full aspect-[9/16] max-h-[90vh] bg-black border border-white/10 relative group/cinema flex flex-col">
              <div className="absolute -top-12 right-0 flex items-center gap-8">
                {script.find(l => l.id === cinemaLineId)?.videoUrl && (
                  <a
                    href={script.find(l => l.id === cinemaLineId)?.videoUrl}
                    download={`BK_STUDIO_RENDER_${cinemaLineId}.mp4`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF5F1F] hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black tracking-widest"
                  >
                    DOWNLOAD_SIGNAL <Download size={16} />
                  </a>
                )}
                <button
                  onClick={() => setCinemaLineId(null)}
                  className="text-white/30 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black tracking-widest"
                >
                  CLOSE_CONSOLE <Trash2 size={16} />
                </button>
              </div>

              <div className="flex-1 relative overflow-hidden bg-[#050505]">
                <div className="absolute inset-0 flex items-center justify-center">
                  {script.find(l => l.id === cinemaLineId)?.videoUrl ? (
                    <video
                      src={script.find(l => l.id === cinemaLineId)?.videoUrl}
                      autoPlay
                      loop
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="w-24 h-24 border border-[#FF5F1F] rounded-full mx-auto flex items-center justify-center animate-pulse">
                        <Zap size={48} className="text-[#FF5F1F]" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black tracking-tighter italic text-white uppercase">Synthetic_Preview_Mode</h3>
                        <p className="text-[10px] text-white/40 font-bold tracking-[0.4em] uppercase">Connect Replicate Token for Real Synthesis</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* UI OVERLAYS */}
                <div className="absolute inset-0 p-12 flex flex-col justify-between pointer-events-none">
                  <div className="flex justify-between items-start">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-[#FF5F1F] text-black text-[10px] font-black uppercase">LIVE_RENDER</div>
                        <div className="text-[10px] font-black text-white/40 font-mono tracking-widest uppercase italic">00:0{script.find(l => l.id === cinemaLineId)?.durationEst}:00</div>
                      </div>
                      <div className="h-0.5 w-32 bg-white/10 overflow-hidden">
                        <div className="h-full bg-[#FF5F1F] animate-progress" />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em] block mb-1">Optical_Engine</span>
                      <span className="text-[12px] font-black text-[#FF5F1F] uppercase italic">{script.find(l => l.id === cinemaLineId)?.shotType}</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="max-w-md">
                      <p className="text-sm font-black text-white/20 uppercase tracking-[0.3em] mb-2">DIALOGUE_OVERRIDE</p>
                      <p className="text-2xl font-black italic uppercase leading-none text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        &quot;{script.find(l => l.id === cinemaLineId)?.text}&quot;
                      </p>
                    </div>
                    <div className="flex justify-between items-end bg-white/[0.02] border-t border-white/5 p-6 backdrop-blur-md">
                      <div className="flex gap-12">
                        <div>
                          <span className="text-[8px] font-black text-white/20 uppercase block">Character</span>
                          <span className="text-xs font-black text-white">{CHARACTERS.find(c => c.id === script.find(l => l.id === cinemaLineId)?.characterId)?.name.toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-white/20 uppercase block">Motion</span>
                          <span className="text-xs font-black text-white">{script.find(l => l.id === cinemaLineId)?.action}</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 flex items-center justify-center border border-white/10">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CRT Effects */}
                <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay" />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/40" />
              </div>
            </div>
          </div>
        )}

      {/* FOOTER MODALS */}
      {activeFooterModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-8 bg-black/90 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-300">
          <div className="max-w-4xl w-full bg-[#0d0d0d] border border-white/10 p-12 relative shadow-[40px_40px_0_rgba(255,95,31,0.05)] flex flex-col max-h-[90vh]">
            <button
              onClick={() => setActiveFooterModal(null)}
              className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              Close_Terminal <Trash2 size={20} />
            </button>

            {activeFooterModal === 'docs' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen size={24} className="text-[#FF5F1F]" />
                    <span className="text-[10px] font-black text-[#FF5F1F] tracking-[0.4em] uppercase">Operations Manual v2.6</span>
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter uppercase italic">Documentation</h2>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 pr-6">
                  <section className="space-y-4">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">01_The_Narrative_Engine</h3>
                    <p className="text-sm font-bold text-white/40 leading-relaxed uppercase">
                      The studio utilizes high-velocity LLM synthesis to transform raw &quot;narrative triggers&quot; into structured cinematic beats.
                      Every script line is metadata-rich, containing character identifiers, motion behaviors, and shot dynamics.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-white/[0.02] border border-white/5 space-y-2">
                        <span className="text-[8px] font-black text-[#FF5F1F] uppercase tracking-widest">Input_Shorthand</span>
                        <p className="text-[10px] text-white/60 font-medium">Use high-impact verbs. Instead of &quot;Boomer is happy&quot;, use &quot;Boomer celebrates a huge victory&quot;.</p>
                      </div>
                      <div className="p-6 bg-white/[0.02] border border-white/5 space-y-2">
                        <span className="text-[8px] font-black text-[#FF5F1F] uppercase tracking-widest">Vibe_Modulation</span>
                        <p className="text-[10px] text-white/60 font-medium">The engine auto-assigns shot types based on character personality (Wide for Boomer energy, CU for Kev deadpan).</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">02_Character_DNA</h3>
                    <p className="text-sm font-bold text-white/40 leading-relaxed uppercase">
                      Characters are defined by their unique DNA profiles. Each character has a specific &quot;Motion Buffer&quot; and &quot;Catchphrase Registry&quot;.
                    </p>
                    <div className="studio-panel p-6 space-y-6 bg-black/40">
                      <div>
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">BOOMER (Alpha_Roo)</span>
                        <ul className="text-[10px] text-white/60 space-y-1 font-bold">
                          <li>• High_Energy_Constraint: ACTIVE</li>
                          <li>• Boxing_Glove_Asset: MANDATORY</li>
                          <li>• Speech_Velocity: 1.5x</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">KEV (Deadpan_Koala)</span>
                        <ul className="text-[10px] text-white/60 space-y-1 font-bold">
                          <li>• Kinetic_Damping: 100%</li>
                          <li>• Sarcasm_Multiplier: INFINITE</li>
                          <li>• Eucalyptus_Dependency: HIGH</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section className="p-8 bg-[#FF5F1F]/5 border border-[#FF5F1F]/20">
                    <div className="flex items-center gap-3 mb-4">
                      <ShieldCheck size={20} className="text-[#FF5F1F]" />
                      <h4 className="text-xs font-black uppercase text-[#FF5F1F] tracking-widest">Production_Protocol_Clearance</h4>
                    </div>
                    <p className="text-[11px] font-bold text-white/80 leading-relaxed uppercase italic">
                      All generated video assets are temporary biological references. For high-fidelity final renders,
                      use the &quot;Export Beat&quot; function to download the prompt manifest for professional AI video workstations (Kling, Wan, LTX).
                    </p>
                  </section>
                </div>
              </div>
            )}

            {activeFooterModal === 'keys' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="mb-12 flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Key size={24} className="text-[#FF5F1F]" />
                      <span className="text-[10px] font-black text-[#FF5F1F] tracking-[0.4em] uppercase">External Signal Authentication</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter uppercase italic">API Settings</h2>
                  </div>
                  <button
                    onClick={() => refreshBalance()}
                    disabled={isCheckingBalance}
                    className="flex items-center gap-2 px-4 py-2 border border-white/10 text-[8px] font-black uppercase tracking-widest hover:border-[#FF5F1F] hover:text-[#FF5F1F] transition-all"
                  >
                    <RefreshCcw size={12} className={cn(isCheckingBalance && "animate-spin")} />
                    Refresh_Signal_Stats
                  </button>
                </div>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                        Replicate_API_Token <Info size={12} className="text-white/20" />
                      </label>
                      <div className="flex items-center gap-3">
                        {balanceData?.replicate && (
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border",
                            balanceData.replicate.status === 'AUTHENTICATED' ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-red-500 border-red-500/20 bg-red-500/10"
                          )}>
                            {balanceData.replicate.status}: {balanceData.replicate.balance}
                          </span>
                        )}
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Network: KLING_V2.6_SDK</span>
                      </div>
                    </div>
                    <div className="relative group">
                      <input
                        type="password"
                        value={apiKeys.replicate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setApiKeys(prev => ({ ...prev, replicate: val }));
                          localStorage.setItem('BK_REPLICATE_KEY', val);
                          if (val.length > 10) refreshBalance({ ...apiKeys, replicate: val });
                        }}
                        placeholder="R8_********************************"
                        className="w-full bg-black/40 border border-white/5 p-6 font-mono text-sm text-white/60 focus:border-[#FF5F1F] focus:text-[#FF5F1F] transition-all outline-none"
                      />
                      <Key className="absolute right-6 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-[#FF5F1F] transition-colors" size={20} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                        ElevenLabs_API_Key <Info size={12} className="text-white/20" />
                      </label>
                      <div className="flex items-center gap-3">
                        {balanceData?.elevenlabs && (
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border",
                              balanceData.elevenlabs.status === 'AUTHENTICATED' ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-red-500 border-red-500/20 bg-red-500/10"
                            )}>
                              {balanceData.elevenlabs.status}
                            </span>
                            <div className="flex flex-col items-end">
                              <span className="text-[8px] font-black text-white/60 uppercase">{balanceData.elevenlabs.balance}</span>
                              {balanceData.elevenlabs.percent !== undefined && (
                                <div className="w-24 h-1 bg-white/5 mt-1">
                                  <div className="h-full bg-[#FF5F1F]" style={{ width: `${balanceData.elevenlabs.percent}%` }} />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <input
                      type="password"
                      value={apiKeys.elevenlabs}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApiKeys(prev => ({ ...prev, elevenlabs: val }));
                        localStorage.setItem('BK_ELEVENLABS_KEY', val);
                        if (val.length > 10) refreshBalance({ ...apiKeys, elevenlabs: val });
                      }}
                      placeholder="SK_********************************"
                      className="w-full bg-black/40 border border-white/5 p-6 font-mono text-sm text-white/60 focus:border-[#FF5F1F] focus:text-[#FF5F1F] transition-all outline-none"
                    />
                  </div>

                  <div className="p-8 bg-white/[0.01] border border-white/5 flex items-start gap-4">
                    <ShieldCheck size={24} className="text-white/20 mt-1" />
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Security_Notice</p>
                      <p className="text-[9px] font-bold text-white/20 leading-relaxed uppercase">
                        Keys are stored locally in your browser&apos;s persistent storage. We never transmit these tokens to our central server.
                        Signal is encrypted during biological transmission.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeFooterModal === 'support' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare size={24} className="text-[#FF5F1F]" />
                    <span className="text-[10px] font-black text-[#FF5F1F] tracking-[0.4em] uppercase">Human-Agent Hybrid Interface</span>
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter uppercase italic">Support Channel</h2>
                </div>

                <div className="grid grid-cols-2 gap-12 flex-1 min-h-0">
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block">Operational_Status</span>
                      <div className="grid grid-cols-1 gap-1">
                        {[
                          { label: 'Narrative_Engine', status: 'Optimal', color: '#22c55e' },
                          { label: 'Biological_Asset_Buffer', status: 'De-synced', color: '#FF5F1F' },
                          { label: 'Character_Dna_Registry', status: 'Secure', color: '#22c55e' },
                          { label: 'Regional_Trends_Signal', status: 'Stable', color: '#22c55e' }
                        ].map((node, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5">
                            <span className="text-[10px] font-black text-white/60 uppercase">{node.label}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: node.color }} />
                              <span className="text-[8px] font-black uppercase" style={{ color: node.color }}>{node.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-8 bg-[#FF5F1F] text-black space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-tight italic">Emergency_Down_Under_Line</h4>
                      <p className="text-[10px] font-black leading-tight uppercase">
                        Having issues with the Roo? Koala not deadpan enough? Our tactical response team is on standby.
                      </p>
                      <button className="w-full bg-black text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                        Initiate_High_Velocity_Support
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block">Tactical_Channels</span>
                    <div className="space-y-3">
                      {[
                        { label: 'Engine_Updates', channel: 'Discord_Terminal', icon: <ChevronRight size={14} /> },
                        { label: 'Directorial_Hacks', channel: 'YouTube_Central', icon: <ExternalLink size={14} /> },
                        { label: 'Studio_Vlog', channel: 'Instagram_Feed', icon: <ExternalLink size={14} /> }
                      ].map((channel, i) => (
                        <button key={i} className="w-full group/channel flex items-center justify-between p-6 border border-white/5 bg-white/[0.01] hover:bg-white/[0.05] hover:border-white/20 transition-all">
                          <div className="text-left">
                            <span className="text-[8px] font-black text-[#FF5F1F] uppercase tracking-widest block mb-1">{channel.label}</span>
                            <span className="text-xs font-black text-white uppercase group-hover/channel:text-[#FF5F1F] transition-colors">{channel.channel}</span>
                          </div>
                          <div className="text-white/10 group-hover/channel:text-white transition-colors">
                            {channel.icon}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="p-6 border border-white/5 opacity-20">
                      <span className="text-[7px] font-black text-white uppercase tracking-[0.5em] block mb-4">Diagnostic_Packet_0101</span>
                      <div className="font-mono text-[7px] text-white/60 break-all">
                        UA: {typeof window !== 'undefined' ? window.navigator.userAgent : 'SERVER_NODE'}
                        <br />REF: {typeof window !== 'undefined' ? window.location.origin : 'BK_STUDIO'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
