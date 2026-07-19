"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CHARACTERS, STUDIO_SETTING, SHOT_TYPES, GUIDE_IMAGES, ANGLE_SPECS, DEFAULT_STUDIO_REFERENCE, DEFAULT_DNA_FOLDER_URL } from '@/data/characters';
import { ScriptEngine, DirectorialIntelligence } from '@/lib/script-engine';
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
  Volume2,
  History,
  ShieldCheck,
  Key,
  BookOpen,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Info,
  Upload,
  X,
  FileText,
  Dna
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrendsFeed } from '@/components/Director/TrendsFeed';
import { jsPDF } from 'jspdf';
import { DraftingTable } from '@/components/Director/DraftingTable';
import { ScriptLine } from '@/types';
import { LibraryViewer } from '@/components/studio/LibraryViewer';
import { DirectorTerminal } from '@/components/studio/DirectorTerminal';
import { RenderTerminal } from '@/components/studio/RenderTerminal';
import { DNAPanel } from '@/components/studio/DNAPanel';
import { IntelligenceRadar } from '@/components/studio/IntelligenceRadar';
import LabsPanel from '@/components/studio/LabsPanel';
import { FlaskConical, Tv, Target } from 'lucide-react';


export default function Home() {
  const [script, setScript] = useState<ScriptLine[]>([
    { id: '1', characterId: 'boomer', text: "G'day legends! Today we're talking about the Future of AI Production!", shotType: 'WIDE', action: 'Shadow boxing intensely towards the camera', durationEst: 3, emotion: 'Explosive', status: 'IDLE' },
    { id: '2', characterId: 'kev', text: "Yeah, nah. I just want to know when we're finished.", shotType: 'KEV_CU', action: 'Slowly chewing on a gum leaf', durationEst: 2, emotion: 'Deadpan', status: 'IDLE' },
  ]);

  const [activeTab, setActiveTab] = useState<'director' | 'script' | 'library' | 'dna' | 'labs' | 'radar'>('director');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [directorIdea, setDirectorIdea] = useState("");
  const [directorSnippet, setDirectorSnippet] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [wardrobeConfig, setWardrobeConfig] = useState<{ boomer?: string, kev?: string, studio?: string }>({});
  const [previewLineId, setPreviewLineId] = useState<string | null>(null);
  const [sharingLineId, setSharingLineId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isRenderingProject, setIsRenderingProject] = useState(false);
  const [renderEngine, setRenderEngine] = useState<'kling' | 'higgsfield'>('kling');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [assembledVideoUrl, setAssembledVideoUrl] = useState<string | null>(null);
  const [cinemaLineId, setCinemaLineId] = useState<string | null>(null);
  const [charReferences, setCharReferences] = useState<Record<string, { main: string, wide: string, side: string, close: string, profile: string, detail: string }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('BK_CHAR_REFERENCES');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Migrate old Google Drive references to stable local paths
          CHARACTERS.forEach(char => {
            if (parsed[char.id] && (!parsed[char.id].main || parsed[char.id].main.includes('drive.google.com'))) {
              parsed[char.id].main = char.referenceImage || '';
            }
          });
          return parsed;
        } catch (e) { console.error("DNA_LOAD_FAIL", e); }
      }
    }
    const refs: Record<string, { main: string, wide: string, side: string, close: string, profile: string, detail: string }> = {};
    CHARACTERS.forEach(char => {
      refs[char.id] = {
        main: char.referenceImage || '',
        wide: '', side: '', close: '', profile: '', detail: ''
      };
    });
    return refs;
  });

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('BK_CHAR_REFERENCES', JSON.stringify(charReferences));
    }
  }, [charReferences, isLoaded]);

  // Dynamic Character Config (Behaviors, Personality, Lighting)
  const [characterConfig, setCharacterConfig] = useState<Record<string, { personality: string, lightingKey: string, behaviors: { action: string, emotion: string }[] }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('BK_CHAR_CONFIG');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) { console.error("DNA_CONFIG_LOAD_FAIL", e); }
      }
    }
    const config: Record<string, { personality: string, lightingKey: string, behaviors: { action: string, emotion: string }[] }> = {};
    CHARACTERS.forEach(char => {
      config[char.id] = {
        personality: char.personality,
        lightingKey: char.lightingKey,
        behaviors: [...char.motionBehaviors]
      };
    });
    return config;
  });

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('BK_CHAR_CONFIG', JSON.stringify(characterConfig));
    }
  }, [characterConfig, isLoaded]);

  const [voiceIds, setVoiceIds] = useState<Record<string, string>>({
    boomer: typeof window !== 'undefined' ? localStorage.getItem('BK_VOICE_BOOMER') || CHARACTERS[0].voiceId : CHARACTERS[0].voiceId,
    kev: typeof window !== 'undefined' ? localStorage.getItem('BK_VOICE_KEV') || CHARACTERS[1].voiceId : CHARACTERS[1].voiceId
  });
  const [studioReference, setStudioReference] = useState(DEFAULT_STUDIO_REFERENCE);
  const [dnaFolderUrl, setDnaFolderUrl] = useState(DEFAULT_DNA_FOLDER_URL);
  const [activeFooterModal, setActiveFooterModal] = useState<'docs' | 'keys' | 'support' | 'legal' | null>(null);
  const [complianceReport, setComplianceReport] = useState<{
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    flags: { category: string; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'; description: string; recommendation: string; targetCountry: string }[];
    watermarkingRequired: boolean;
    suggestedDisclaimer: string;
  } | null>(null);
  const [isScanningCompliance, setIsScanningCompliance] = useState(false);
  const [complianceCountries, setComplianceCountries] = useState<string[]>(['AU', 'US', 'EU', 'BR']);
  const [mitigationReport, setMitigationReport] = useState<{
    platformStrikeRisk: { tiktok: number, youtube: number, instagram: number };
    loopholeStrategy: string;
    requiredProductionTricks: string[];
    modifiedScript: ScriptLine[];
  } | null>(null);
  const [isMitigatingRisk, setIsMitigatingRisk] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    replicate: typeof window !== 'undefined' ? localStorage.getItem('BK_REPLICATE_KEY') || '' : '',
    elevenlabs: typeof window !== 'undefined' ? localStorage.getItem('BK_ELEVENLABS_KEY') || '' : '',
    gemini: typeof window !== 'undefined' ? localStorage.getItem('BK_GEMINI_KEY') || '' : ''
  });
  const [balanceData, setBalanceData] = useState<{
    replicate?: { status: string, balance: string },
    elevenlabs?: { status: string, balance: string, percent?: number }
  } | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [renderMode, setRenderMode] = useState<'REAL' | 'SANDBOX' | null>(null);

  // Instructor Bot States
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<string[]>(["", "", ""]);
  const [isRefiningBlueprint, setIsRefiningBlueprint] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [storyboardMode, setStoryboardMode] = useState<'classic' | 'ekonte'>('classic');

  const refreshBalance = useCallback(async (keys = apiKeys) => {
    if (!keys.replicate && !keys.elevenlabs) return;
    setIsCheckingBalance(true);
    try {
      const res = await fetch('/api/keys/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys)
      });
      const data = await res.json() as {
        replicate?: { status: string, balance: string },
        elevenlabs?: { status: string, balance: string, percent?: number }
      };
      setBalanceData(data);
    } catch (err) {
      console.error("BALANCE_CHECK_FAILURE", err);
    } finally {
      setIsCheckingBalance(false);
    }
  }, [apiKeys]);

  useEffect(() => {
    if (activeFooterModal === 'keys' || (apiKeys.replicate || apiKeys.elevenlabs)) {
      refreshBalance();
    }
  }, [activeFooterModal, apiKeys.elevenlabs, apiKeys.replicate, refreshBalance]);

  // Frontend G-Drive resolver for UI previews
  const getPreviewUrl = (url: string) => {
    if (!url) return null;
    const cleanUrl = url.trim();
    if (cleanUrl.includes('drive.google.com')) {
      const gMatch = cleanUrl.match(/\/d\/(.+?)(?:\/|$|\?)/) || cleanUrl.match(/id=(.+?)(?:&|$|#)/);
      const fileId = gMatch ? gMatch[1] : null;
      // Using thumbnail with specific size often bypasses virus scan/download interstitials
      if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
      return null;
    }
    // If it's not a Google Drive URL, return the clean URL as is
    return cleanUrl;
  };

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const generateAIScript = async (contextOverride?: { title: string, snippet: string, intelligence?: DirectorialIntelligence }) => {
    setIsGenerating(true);
    console.log("🚀 [Neural_Link] Initiating Production Sequence...");

    await new Promise(r => setTimeout(r, 300));

    let finalTitle = contextOverride?.title || directorIdea;
    let finalSnippet = contextOverride?.snippet || directorSnippet;

    if (!contextOverride && directorIdea.includes('\n')) {
      const lines = directorIdea.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 1) {
        finalTitle = lines[0];
        finalSnippet = lines.slice(1).join(' ');
        setDirectorIdea(finalTitle);
        setDirectorSnippet(finalSnippet);
      }
    }

    if (!finalTitle) {
      alert("⚠️ PRODUCTION_ERROR: No topic detected in the machine. Please type something first!");
      console.warn("⚠️ [Neural_Link] Aborted: Empty Title.");
      setIsGenerating(false);
      return;
    }

    console.log("✨ [Neural_Link] Signal Confirmed. Opening Drafting Table for:", finalTitle);

    setIsDrafting(true);
    setIsGenerating(false);
    console.log("✨ [Neural_Link] Drafting HUD Active for:", finalTitle);
  };

  const triggerInstructor = async () => {
    if (!directorIdea) return;
    setIsGeneratingQuestions(true);
    setIsInterviewing(true);
    try {
      const res = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: directorIdea.split('\n')[0], apiKey: apiKeys.gemini })
      });
      const data = await res.json();
      if (data.questions) {
        setInterviewQuestions(data.questions);
      }
    } catch (e) {
      console.error("INSTRUCTOR_FAIL", e);
      setIsInterviewing(false);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const finalizeInterview = async () => {
    setIsRefiningBlueprint(true);
    try {
      const res = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: directorIdea.split('\n')[0],
          answers: currentAnswers,
          apiKey: apiKeys.gemini
        })
      });
      const data = await res.json();
      if (data.blueprint) {
        setDirectorSnippet(data.blueprint);
        setIsInterviewing(false);
        setInterviewQuestions([]);
        setCurrentAnswers(["", "", ""]);
      }
    } catch (e) {
      console.error("BLUEPRINT_FAIL", e);
    } finally {
      setIsRefiningBlueprint(false);
    }
  };

  const addLine = () => {
    const mainSubject = directorIdea || "this massive trend";

    // Use ScriptEngine to generate the next line based on context
    const nextLineRaw = ScriptEngine.generateNextLine(script, mainSubject) as ScriptLine;
    const nextLine = {
      ...nextLineRaw,
      technicalPrompt: getDetailedPrompt(nextLineRaw, mainSubject, directorSnippet),
      characterReference: charReferences[nextLineRaw.characterId]?.main || CHARACTERS.find(c => c.id === nextLineRaw.characterId)?.referenceImage,
      studioReference: GUIDE_IMAGES[nextLineRaw.shotType]
    };

    setScript([...script, nextLine]);
  };

  const removeLine = (id: string) => {
    setScript(script.filter(line => line.id !== id));
  };

  const updateLine = (id: string, field: keyof ScriptLine, value: string | number) => {
    setScript(prevScript => prevScript.map(line => {
      if (line.id !== id) return line;
      const updatedLine = { ...line, [field]: value };

      if (field === 'shotType') {
        updatedLine.studioReference = GUIDE_IMAGES[value as string];
      }

      if (field === 'durationEst') {
        const baseChar = CHARACTERS.find(c => c.id === line.characterId);
        const charConfig = characterConfig[line.characterId];
        const behaviors = charConfig?.behaviors || baseChar?.motionBehaviors || [];

        const isIncreasing = (value as number) > line.durationEst;
        if (baseChar) {
          if (isIncreasing) {
            const fillers = baseChar.id === 'boomer'
              ? ["This is the asymmetric intelligence they're trying to hide from you!", "Capture the definition of this play!", "This is absolute tactical madness!"]
              : ["Does anyone actually care?", "I could be napping right now.", "It's all one big circus."];

            const newText = ` ${fillers[Math.floor(Math.random() * fillers.length)]} ${baseChar.catchphrases[Math.floor(Math.random() * baseChar.catchphrases.length)]}`;
            updatedLine.text = line.text + newText;

            if ((value as number) > 6 && behaviors.length > 0) {
              const secondaryBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
              updatedLine.action = `${line.action} THEN ${secondaryBehavior.action.toLowerCase()}`;
            }
          } else if (line.text.length > 40) {
            const sentences = line.text.split(/[.!?]/);
            updatedLine.text = sentences.length > 1 ? sentences.slice(0, -1).join('.') + "!" : line.text.substring(0, Math.floor(line.text.length * 0.7)) + "...";

            if ((value as number) <= 5 && behaviors.length > 0) {
              const behavior = behaviors.find(b => b.emotion === line.emotion) || behaviors[0];
              updatedLine.action = behavior.action;
            }
          }
        }
      }
      // Force prompt update on any change
      updatedLine.technicalPrompt = getDetailedPrompt(updatedLine, directorIdea, directorSnippet);

      return updatedLine;
    }));
  };

  const totalDuration = script.reduce((acc, line) => acc + line.durationEst, 0);
  const totalCost = (totalDuration * 0.14).toFixed(2);

  const getDetailedPrompt = (line: ScriptLine, topicContext?: string, snippetContext?: string) => {
    const baseChar = CHARACTERS.find(c => c.id === line.characterId);
    const charConfig = characterConfig[line.characterId];

    const char = baseChar ? {
      ...baseChar,
      personality: charConfig?.personality || baseChar.personality,
      lightingKey: charConfig?.lightingKey || baseChar.lightingKey
    } : null;

    const shot = SHOT_TYPES.find(s => s.id === line.shotType);
    const topic = topicContext || directorIdea || "Trending News";
    const explicitNotes = snippetContext || directorSnippet || "";

    if (!char) return "";

    let angleSpec = ANGLE_SPECS.main;
    if (shot?.id === 'WIDE') angleSpec = ANGLE_SPECS.wide;
    else if (shot?.id.includes('CU')) angleSpec = ANGLE_SPECS.close;
    else if (shot?.id.includes('OTS')) angleSpec = ANGLE_SPECS.side;
    else if (shot?.id === 'GOPRO_FISHEYE') angleSpec = ANGLE_SPECS.wide;

    // HIGH-END CONSISTENCY INJECTION — Outfit is ALWAYS present, directorial notes layer on top
    const outfitBase = `Wearing ${char.defaultOutfit}.`;
    const directorialOverride = explicitNotes ? ` CRITICAL_DIRECTORIAL_OVERRIDE: ${explicitNotes}. Ensure all visual details like jerseys and text are prioritized.` : '';
    const characterAnchor = `${char.imagePromptContext}. ${outfitBase}${directorialOverride} Visual DNA: ${char.visualDescription}. Physicality: ${char.personality}.`;

    // PERSONALITY-DRIVEN MOTION
    const personalityLogic = line.characterId === 'boomer'
      ? "hyper-active muscle tension, aggressive shadow boxing stance, intense eye contact"
      : "deadpan low-energy, slow heavy blinking, subtle ear tuft movement, indifferent expression";

    const actionBlock = `BEHAVIOR: ${line.action}. ${personalityLogic}. EMOTION: ${line.emotion}. Talking, lips moving clearly to: "${line.text.substring(0, 40)}..."`;

    const cameraBlock = `Highly photorealistic, 8k RAW, movie grade textures, cinematic depth, subsurface scattering on fur, ray-traced lighting, masterpiece. CAMERA: ${shot?.label}, ${shot?.cinematicRule}. ${angleSpec.desc}, ${angleSpec.requirements.join(', ')}.`;

    const activeProps = STUDIO_SETTING.props.filter(p => !p.includes(line.characterId === 'boomer' ? 'Tablet' : 'Gloves')).slice(0, 4).join(', ');
    const envBlock = `ENVIRONMENT: ${STUDIO_SETTING.promptContext}. Visible props: ${activeProps}. TV screen graphics: ${topic}. Lighting: ${char.lightingKey}. Ambience: ${STUDIO_SETTING.acousticPanels}.`;

    return `CINEMATIC MASTERPIECE. ${characterAnchor} ${actionBlock} ${cameraBlock} ${envBlock} --ar 9:16 --v 6.0`;
  };

  const downloadPromptPDF = (characterId: string, angle: string) => {
    const char = CHARACTERS.find(c => c.id === characterId);
    if (!char) return;

    const angleSpec = ANGLE_SPECS[angle as keyof typeof ANGLE_SPECS];
    if (!angleSpec) return;

    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 95, 31); // Brand Orange
    doc.setFont("helvetica", "bold");
    doc.text("BOOMER & KEV STUDIO", margin, 20);
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("OPTICAL MANIFEST / PROMPT CARD v2.6", margin, 30);

    let y = 60;

    // Metadata Block
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`SUBJECT: ${char.name.toUpperCase()}`, margin, y);
    doc.text(`OPTICAL ANGLE: ${angleSpec.label.toUpperCase()}`, margin + 80, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`GENETIC ID: ${char.id.toUpperCase()}`, margin, y);
    doc.text(`REQUIREMENTS: ${angleSpec.requirements.join(' | ').toUpperCase()}`, margin + 80, y);
    y += 20;

    // Prompt Block
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, pageWidth - (margin * 2), 60, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.setFont("courier", "bold");
    doc.text("GENERATIVE_PROMPT_STRING:", margin + 5, y + 10);

    // Construct Prompt
    const promptText = `(Masterpiece, 8k, Ultra High Res) ${char.imagePromptContext}, ${angleSpec.desc}, ${STUDIO_SETTING.promptContext} --ar 1:1 --stylize 250 --v 6.0`;

    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const splitPrompt = doc.splitTextToSize(promptText, pageWidth - (margin * 2) - 10);
    doc.text(splitPrompt, margin + 5, y + 20);

    y += 70;

    // Negative Prompt Block
    doc.setFillColor(255, 240, 240); // Slight red tint for negative
    doc.rect(margin, y, pageWidth - (margin * 2), 40, 'FD');
    doc.setFont("courier", "bold");
    doc.setTextColor(150, 50, 50);
    doc.text("NEGATIVE_PROMPT_STRING:", margin + 5, y + 10);

    const negativeText = "(worst quality, low quality:1.4), text, watermark, signature, blurry, multiple angles, split screen, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, cropped";
    doc.setFont("courier", "normal");
    doc.setTextColor(0, 0, 0);
    const splitNeg = doc.splitTextToSize(negativeText, pageWidth - (margin * 2) - 10);
    doc.text(splitNeg, margin + 5, y + 20);

    y += 50;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Render this prompt in Midjourney v6 or Stable Diffusion XL for optimal results.", margin, y);

    doc.save(`${char.name}_${angle.toUpperCase()}_PROMPT.pdf`);
  };

  const downloadScenePromptPDF = (line: ScriptLine, index: number) => {
    const char = CHARACTERS.find(c => c.id === line.characterId);
    if (!char) return;

    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const colWidth = (pageWidth - (margin * 2) - 10) / 2; // two equal columns with gap
    const maxTextWidth = pageWidth - (margin * 2) - 10;

    // Header
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 95, 31);
    doc.setFont("helvetica", "bold");
    doc.text("BOOMER & KEV STUDIO", margin, 20);
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`SCENE PROMPT CARD / SHOT ${index + 1} v2.7`, margin, 30);

    let y = 60;

    // --- Metadata Grid (2 columns, each clamped to colWidth) ---
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text("CHARACTER", margin, y);
    doc.text("SHOT TYPE", margin + colWidth + 10, y);
    y += 5;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    const charSplit = doc.splitTextToSize(char.name.toUpperCase(), colWidth);
    const shotSplit = doc.splitTextToSize(line.shotType, colWidth);
    doc.text(charSplit, margin, y);
    doc.text(shotSplit, margin + colWidth + 10, y);
    y += Math.max(charSplit.length, shotSplit.length) * 5 + 5;

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text("MOTION / ACTION", margin, y);
    doc.text("EMOTION", margin + colWidth + 10, y);
    y += 5;

    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    const motionSplit = doc.splitTextToSize((line.action || 'TALKING').toUpperCase(), colWidth);
    const emotionSplit = doc.splitTextToSize((line.emotion || 'NEUTRAL').toUpperCase(), colWidth);
    doc.text(motionSplit, margin, y);
    doc.text(emotionSplit, margin + colWidth + 10, y);
    y += Math.max(motionSplit.length, emotionSplit.length) * 5 + 10;

    // Dialogue line
    doc.setFillColor(20, 20, 20);
    const dialogueSplit = doc.splitTextToSize(`"${line.text.toUpperCase()}"`, maxTextWidth - 10);
    const dialogueHeight = dialogueSplit.length * 6 + 12;
    doc.rect(margin, y, maxTextWidth, dialogueHeight, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(dialogueSplit, margin + 5, y + 8);
    y += dialogueHeight + 10;

    // --- Tech Prompt Box ---
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    const techPrompt = getDetailedPrompt(line, directorIdea, directorSnippet);

    doc.setFontSize(6);
    doc.setFont("courier", "normal");
    const splitPrompt = doc.splitTextToSize(techPrompt, maxTextWidth - 10);
    const lineHeight = 3.8;
    const promptHeight = splitPrompt.length * lineHeight + 18;

    // Check if we need a new page
    if (y + promptHeight > 275) {
      doc.addPage();
      y = 20;
    }

    doc.rect(margin, y, maxTextWidth, promptHeight, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(255, 95, 31);
    doc.setFont("helvetica", "bold");
    doc.text("ENGINE_PROMPT_CONSTRUCTION_STREAM:", margin + 5, y + 8);

    doc.setFontSize(6);
    doc.setFont("courier", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(splitPrompt, margin + 5, y + 15);
    y += promptHeight + 10;

    // --- Reference Asset ---
    if (y + 20 > 275) {
      doc.addPage();
      y = 20;
    }

    const ref = line.characterReference || char.referenceImage || "DEFAULT_DNA";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("REFERENCE_ASSET:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    const refSplit = doc.splitTextToSize(ref, maxTextWidth);
    doc.text(refSplit, margin, y);
    y += refSplit.length * 4 + 10;

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text("PROPERTY OF BOOMER & KEV STUDIO.", margin, 285);
    doc.text(`POWERED BY CINEMATIC ENGINE v2.7 | MODEL: GEMINI_2.5_FLASH`, pageWidth - margin - 85, 285);

    doc.save(`PROMPT-SCENE-${index + 1}-${char.id.toUpperCase()}.pdf`);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    charId: string,
    angle: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCharReferences((prev) => ({
        ...prev,
        [charId]: {
          ...prev[charId],
          [angle]: base64
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 0;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    const addHeader = (pageNum: number) => {
      doc.setFillColor(5, 5, 5);
      doc.rect(0, 0, pageWidth, 35, 'F');

      doc.setFontSize(22);
      doc.setTextColor(255, 95, 31);
      doc.setFont("helvetica", "bold");
      doc.text("BOOMER & KEV", margin, 18);

      const studioWidth = doc.getTextWidth("BOOMER & KEV");
      doc.setTextColor(255, 255, 255);
      doc.text(" STUDIO", margin + studioWidth, 18);

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text("MASTER PRODUCTION MANIFEST // CALL SHEET v2.7", margin, 28);

      doc.setTextColor(100, 100, 100);
      doc.text(`PAGE ${pageNum}`, pageWidth - margin - 15, 18);
      doc.text(`PIPELINE: CINEMATIC_ENGINE`, pageWidth - margin - 40, 28);
    };

    let pageNum = 1;
    addHeader(pageNum);
    y = 50;

    // Document Summary Panel
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, pageWidth - (margin * 2), 25, 'F');

    doc.setFontSize(8);
    doc.setTextColor(255, 95, 31);
    doc.setFont("helvetica", "bold");
    doc.text("PRODUCTION OVERVIEW", margin + 5, y + 8);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`TIMESTAMP: ${new Date().toLocaleString().toUpperCase()}`, margin + 5, y + 15);
    doc.text(`SCENE COUNT: ${script.length}`, margin + 80, y + 15);
    doc.text(`DUR_EST: ${Math.floor(totalDuration / 60)}M ${totalDuration % 60}S`, margin + 120, y + 15);

    doc.setTextColor(150, 150, 150);
    doc.text(`ENGINE_DNA: NEURAL_CORTEX_v2.7 | MODEL: GEMINI_2.5_FLASH | RENDERING: PHOTOREALISM_PRODUCTION`, margin + 5, y + 21);
    y += 35;

    script.forEach((line, index) => {
      const char = CHARACTERS.find(c => c.id === line.characterId);
      const shot = SHOT_TYPES.find(s => s.id === line.shotType);

      // Pre-calculate heights
      doc.setFontSize(10);
      const maxTextWidth = pageWidth - (margin * 2) - 16;
      const splitScript = doc.splitTextToSize(`"${line.text.toUpperCase()}"`, maxTextWidth);
      const scriptHeight = splitScript.length * 6;

      const techPrompt = getDetailedPrompt(line, directorIdea, directorSnippet);
      doc.setFontSize(6);
      doc.setFont("courier", "normal");
      const splitPrompt = doc.splitTextToSize(techPrompt, maxTextWidth - 6);
      const promptHeight = splitPrompt.length * 3.5;

      const cardHeight = 40 + scriptHeight + promptHeight + 15;

      // Page Break Guard
      if (y + cardHeight > 280) {
        doc.addPage();
        pageNum++;
        addHeader(pageNum);
        y = 45;
      }

      // Card Container
      doc.setDrawColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - (margin * 2), cardHeight);

      // Scene Header Bar
      const isBoomer = line.characterId === 'boomer';
      doc.setFillColor(isBoomer ? 255 : 40, isBoomer ? 95 : 40, isBoomer ? 31 : 40);
      doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');

      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(`SCENE [${String(index + 1).padStart(2, '0')}] // ACTOR: ${char?.name.toUpperCase()}`, margin + 5, y + 7);

      let currentY = y + 18;

      // Metadata Grid Start
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text("CAMERA SETTINGS", margin + 5, currentY);
      doc.text("PHYSICALITY & EMOTION", margin + 80, currentY);

      currentY += 4;
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`${line.shotType} (${shot?.label})`, margin + 5, currentY);
      const actionText = `${(line.action || "TALKING").toUpperCase()} [${(line.emotion || "ENGAGED").toUpperCase()}]`;
      const splitAction = doc.splitTextToSize(actionText, pageWidth - (margin * 2) - 88);
      doc.text(splitAction[0], margin + 80, currentY);

      // Dialogue Shaded Area
      currentY += 8;
      doc.setFillColor(250, 250, 250);
      doc.rect(margin + 2, currentY, pageWidth - (margin * 2) - 4, scriptHeight + 6, 'F');

      currentY += 6;
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.text(splitScript, margin + 8, currentY);

      currentY += scriptHeight + 2;

      // Tech Data Stream
      currentY += 2;
      doc.setFontSize(6);
      doc.setTextColor(255, 95, 31);
      doc.setFont("helvetica", "bold");
      doc.text("ENGINE_PROMPT_CONSTRUCTION_STREAM:", margin + 5, currentY);

      currentY += 4;
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(240, 240, 240);
      doc.rect(margin + 5, currentY, pageWidth - (margin * 2) - 10, promptHeight + 6, 'FD');

      doc.setTextColor(80, 80, 80);
      doc.setFont("courier", "normal");
      doc.text(splitPrompt, margin + 8, currentY + 5);

      y += cardHeight + 10;
    });

    const lastY = 285;
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text("PROPERTY OF BOOMER & KEV STUDIO. UNAUTHORIZED DISTRIBUTION PROHIBITED.", margin, lastY);
    doc.text("POWERED BY CINEMATIC ENGINE v2.7", pageWidth - margin - 45, lastY);

    doc.save(`BK-MANIFEST-${Date.now()}.pdf`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const runComplianceScan = async () => {
    setIsScanningCompliance(true);
    setComplianceReport(null);
    try {
      const response = await fetch('/api/ai/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: script.map(line => ({ characterId: line.characterId, text: line.text })),
          countries: complianceCountries,
          apiKey: apiKeys.gemini || undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha na varredura jurídica');
      setComplianceReport(data);
      setMitigationReport(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha na varredura de compliance');
    } finally {
      setIsScanningCompliance(false);
    }
  };

  const runRiskMitigation = async () => {
    if (!complianceReport) return;
    setIsMitigatingRisk(true);
    setMitigationReport(null);
    try {
      const response = await fetch('/api/ai/mitigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: script.map(line => ({ 
            id: line.id,
            characterId: line.characterId, 
            text: line.text,
            shotType: line.shotType,
            action: line.action,
            durationEst: line.durationEst,
            emotion: line.emotion
          })),
          complianceReport,
          apiKey: apiKeys.gemini || undefined
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha na mitigação de risco');
      setMitigationReport(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao rodar agente de risco');
    } finally {
      setIsMitigatingRisk(false);
    }
  };

  const applyMitigatedScript = () => {
    if (!mitigationReport || !mitigationReport.modifiedScript) return;
    const updatedScript = script.map(originalLine => {
      const matchedLine = mitigationReport.modifiedScript.find(ml => ml.id === originalLine.id);
      return {
        ...originalLine,
        text: matchedLine ? matchedLine.text : originalLine.text
      };
    });
    setScript(updatedScript);
    alert("Roteiro mitigado e atualizado na linha do tempo!");
    setActiveFooterModal(null);
  };

  const renderProject = async () => {
    console.log("RENDER_PROJECT_TRIGGERED");
    setIsRenderingProject(true);
    setRenderProgress(0);
    setAssembledVideoUrl(null);
    setRenderLogs([
      "🚀 INITIALIZING_PRODUCTION_PIPELINE...",
      renderEngine === 'higgsfield' ? "CONNECTING_TO_HIGGSFIELD_CORE..." : "CONNECTING_TO_REPLICATE_CORE...",
      "VALIDATING_NEUROMARKETIC_PAYLOAD..."
    ]);

    // Prepare Data for API
    const productionData = {
      script: script.map(line => {
        let selectedReference = charReferences[line.characterId]?.main || '';
        const charRef = charReferences[line.characterId];
        if (charRef) {
          if (line.shotType === 'WIDE' && charRef.wide) selectedReference = charRef.wide;
          else if ((line.shotType === 'KEV_CU' || line.shotType === 'BOOMER_MCU') && charRef.close) selectedReference = charRef.close;
          else if (line.shotType.includes('OTS') || line.shotType.includes('LOW')) selectedReference = charRef.side || charRef.main;
          else if (line.shotType.includes('PROFILE') && charRef.profile) selectedReference = charRef.profile;
          else if (line.shotType.includes('DETAIL') && charRef.detail) selectedReference = charRef.detail;
          else selectedReference = charRef.main;
        }

        return {
          id: line.id,
          characterId: line.characterId,
          text: line.text,
          shotType: line.shotType,
          action: line.action,
          emotion: line.emotion,
          durationEst: line.durationEst,
          characterReference: selectedReference,
          studioReference: studioReference
        };
      }),
      directorIdea,
      directorSnippet,
      engine: renderEngine,
      wardrobe: wardrobeConfig
    };

    try {
      setRenderLogs(prev => ["ENCRYPTING_NEUROMORPHIC_PAYLOAD...", ...prev]);
      setRenderProgress(10);
      await new Promise(r => setTimeout(r, 800));

      console.log("TRIGGERING_PIPELINE_RUN...");
      const runRes = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productionData)
      });

      const runData = await runRes.json();

      if (!runRes.ok) {
        throw new Error(runData.error || "Failed to start background orchestrator.");
      }

      const jobId = runData.jobId;
      setRenderLogs(prev => [`HANDSHAKE_SUCCESSFUL. JOB_ID: ${jobId}`, ...prev]);

      // Polling loop
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/pipeline/run?id=${jobId}`);
          if (!pollRes.ok) {
            console.error("Polling check failed status:", pollRes.status);
            return;
          }
          const jobState = await pollRes.json();
          
          // Update logs and progress
          if (jobState.logs && jobState.logs.length) {
            setRenderLogs([...jobState.logs].reverse());
          }
          setRenderProgress(jobState.progress || 0);

          if (jobState.status === 'COMPLETED') {
            clearInterval(pollInterval);
            setAssembledVideoUrl(jobState.finalVideoUrl);
            setRenderProgress(100);
            setRenderLogs(prev => ["🎉 SUCCESS: PRODUCTION_READY. ALL_SCENES_SYNTHESIZED.", ...prev]);
            setTimeout(() => {
              setIsRenderingProject(false);
            }, 3000);
          } else if (jobState.status === 'FAILED') {
            clearInterval(pollInterval);
            setRenderProgress(0);
            setRenderLogs(prev => ["🔴 CRITICAL_PIPELINE_FAILURE.", ...prev]);
            setTimeout(() => {
              setIsRenderingProject(false);
            }, 4000);
          }
        } catch (pollErr: any) {
          console.error("Error in status polling:", pollErr);
        }
      }, 4000);

    } catch (error: any) {
      console.error("RENDER_PROJECT_ERROR:", error);
      setRenderLogs(prev => [`CRITICAL_PIPELINE_FAILURE: ${error.message || 'Unknown Error'}`, ...prev]);
      setRenderProgress(0);
      setTimeout(() => setIsRenderingProject(false), 3000);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-screen bg-[#050505] overflow-hidden tech-grid max-w-[100vw]">
      <main className="flex-1 flex bg-transparent text-white selection:bg-[#FF5F1F] selection:text-white font-sans overflow-hidden min-h-0 max-w-full">
        {/* MOBILE SIDEBAR OVERLAY — hidden on lg+, visible on mobile/tablet */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[200] lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <aside
              className="absolute left-0 top-0 bottom-0 w-64 bg-[#0a0a0a] border-r border-[#FF5F1F]/20 flex flex-col py-8 px-4 gap-2 animate-in slide-in-from-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#FF5F1F] flex items-center justify-center">
                    <span className="text-black font-black text-xs">BK</span>
                  </div>
                  <span className="text-white font-black text-sm tracking-tight">MENU</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/40 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
              {[
                { id: 'director', label: 'DIRECTOR', icon: MonitorPlay },
                { id: 'script', label: 'PRODUCTION', icon: Clapperboard },
                { id: 'library', label: 'LIBRARY', icon: Tv },
                { id: 'dna', label: 'ENGINE DNA', icon: Dna },
                { id: 'labs', label: 'STUDIO LABS', icon: FlaskConical },
                { id: 'radar', label: 'RADAR', icon: Target },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as typeof activeTab); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-xs font-black tracking-widest transition-all",
                      isActive
                        ? "bg-[#FF5F1F] text-white"
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 min-w-0 max-w-full overflow-hidden">
          {/* TOP NAVIGATION */}
          <nav
            role="navigation"
            aria-label="Master Console Navigation"
            className="w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col md:flex-row justify-between items-center bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5 z-50 gap-3 sm:gap-4 max-w-full overflow-hidden"
          >
            <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
              {/* Hamburger menu — mobile/tablet only */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-white/40 hover:text-[#FF5F1F] transition-colors"
                aria-label="Open menu"
              >
                <Layers size={22} />
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FF5F1F] flex items-center justify-center rounded-none shadow-[0_0_20px_rgba(255,95,31,0.3)] neural-sparkle shrink-0">
                <BrainCircuit size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-black tracking-tighter leading-none truncate">BOOMER & KEV <span className="text-[#FF5F1F]">STUDIO</span></h1>
                <p className="text-[9px] sm:text-[10px] text-white/40 tracking-[0.2em] sm:tracking-[0.3em] font-bold truncate">CINEMATIC ENGINE v3.1</p>
              </div>
            </div>

            <div className="hidden md:flex gap-1 bg-[#111111]/80 backdrop-blur-md p-1 border border-white/5 shadow-inner overflow-x-auto max-w-full scrollbar-hide">
              {[
                { id: 'director', label: 'DIRECTOR', icon: Wand2 },
                { id: 'script', label: 'PRODUCTION', icon: Clapperboard },
                { id: 'library', label: 'LIBRARY', icon: Tv },
                { id: 'dna', label: 'ENGINE DNA', icon: History },
                { id: 'labs', label: 'STUDIO LABS', icon: FlaskConical },
                { id: 'radar', label: 'RADAR', icon: Target }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'director' | 'script' | 'library' | 'dna' | 'labs' | 'radar')}
                    aria-label={`Switch to ${tab.label}`}
                    aria-pressed={isActive}
                    className={cn(
                      "flex items-center gap-2 px-3 lg:px-5 py-2 text-[9px] lg:text-[10px] font-black tracking-widest transition-all duration-300 relative overflow-hidden whitespace-nowrap shrink-0",
                      isActive 
                        ? "bg-[#FF5F1F] text-white shadow-[0_0_15px_rgba(255,95,31,0.3)] border-l-2 border-white/40" 
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon size={12} className={cn("transition-colors", isActive ? "text-white" : "text-white/30")} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

          </nav>

          {/* MAIN CONTENT AREA */}
          {/* MAIN CONTENT AREA */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0 bg-[#050505] max-w-full">
            {activeTab === 'director' && (
              <DirectorTerminal
                directorIdea={directorIdea}
                setDirectorIdea={setDirectorIdea}
                directorSnippet={directorSnippet}
                setDirectorSnippet={setDirectorSnippet}
                triggerInstructor={triggerInstructor}
                isGenerating={isGenerating}
                isInterviewing={isInterviewing}
                setIsInterviewing={setIsInterviewing}
                generateAIScript={generateAIScript}
                isGeneratingQuestions={isGeneratingQuestions}
                interviewQuestions={interviewQuestions}
                currentAnswers={currentAnswers}
                setCurrentAnswers={setCurrentAnswers}
                finalizeInterview={finalizeInterview}
                isRefiningBlueprint={isRefiningBlueprint}
              />
            )}

            {activeTab === 'script' && (
              <div className="flex-1 overflow-y-auto px-12 py-12 scroll-smooth animate-in fade-in duration-700 min-h-0">
                <div className="flex items-baseline justify-between mb-16 px-2">
                  <div className="flex items-center gap-4">
                    <h2 className="text-5xl font-black tracking-tighter">PRODUCTION <span className="text-white/20">TIMELINE</span></h2>
                    
                    {/* Storyboard View Toggle */}
                    <div className="flex border-2 border-white/20 rounded-none overflow-hidden ml-4">
                      <button
                        onClick={() => setStoryboardMode('classic')}
                        className={cn("px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer min-h-[36px]",
                          storyboardMode === 'classic' ? "bg-[#FF5F1F] text-black" : "bg-black text-white/50 hover:text-white")}
                      >
                        Estúdio Moderno
                      </button>
                      <button
                        onClick={() => setStoryboardMode('ekonte')}
                        className={cn("px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer min-h-[36px]",
                          storyboardMode === 'ekonte' ? "bg-[#FF5F1F] text-black" : "bg-black text-white/50 hover:text-white")}
                      >
                        絵コンテ (E-KONTE)
                      </button>
                    </div>

                    <button
                      onClick={exportToPDF}
                      className="flex items-center gap-2 px-6 py-2 border border-[#FF5F1F]/30 bg-[#FF5F1F]/5 text-[#FF5F1F] text-[10px] font-black tracking-widest hover:bg-[#FF5F1F] hover:text-white transition-all shadow-[4px_4px_0_rgba(255,95,31,0.2)] ml-4"
                    >
                      <Download size={14} /> DOWNLOAD FULL SCRIPT (PDF)
                    </button>

                    {assembledVideoUrl && (
                      <a
                        href={assembledVideoUrl}
                        download
                        className="flex items-center gap-2 px-6 py-2 border border-green-500/30 bg-green-500/5 text-green-500 text-[10px] font-black tracking-widest hover:bg-green-500 hover:text-black transition-all shadow-[4px_4px_0_rgba(34,197,94,0.2)] ml-4 animate-bounce"
                      >
                        <MonitorPlay size={14} /> DOWNLOAD COMPLETED EPISODE (MP4)
                      </a>
                    )}
                  </div>
                  <button onClick={addLine} className="p-4 border border-white/10 hover:bg-white hover:text-black transition-all">
                    <Plus size={24} />
                  </button>
                </div>

                {storyboardMode === 'classic' ? (
                  <div className="flex flex-col gap-[2px] bg-white/5">
                  {script.map((line, index) => (
                    <div
                      key={line.id}
                      style={{ animationDelay: `${index * 100}ms` }}
                      className={cn("bg-[#080808]/95 backdrop-blur-md flex min-h-[300px] border-l-4 transition-all duration-500 hover:z-10 group stagger-item",
                        line.characterId === 'boomer' 
                          ? "border-[#FF5F1F] hover:border-l-[6px] hover:shadow-[0_0_30px_rgba(255,95,31,0.1)]" 
                          : "border-white/20 hover:border-l-[6px] hover:border-white hover:shadow-[0_0_30px_rgba(255,255,255,0.03)]"
                      )}
                      onMouseEnter={() => setPreviewLineId(line.id)}
                      onMouseLeave={() => setPreviewLineId(null)}
                    >
                      <div className="w-64 p-8 border-r border-white/5 flex flex-col justify-between">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em]">Cena {index + 1}</span>
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
                              <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Enquadramento / Lente</label>
                              <select
                                value={line.shotType}
                                onChange={(e) => updateLine(line.id, 'shotType', e.target.value)}
                                className="w-full bg-[#111111] border border-white/10 p-2 text-[10px] font-black outline-none cursor-pointer text-white/90"
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
                              title="BAIXAR PROMPT DA CENA (PDF)"
                            >
                              <FileText size={18} />
                            </button>
                            <button
                              onClick={() => setSharingLineId(line.id)}
                              className="p-3 border border-white/5 text-white/20 hover:text-white hover:border-white/20 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center grayscale"
                              title="COMPARTILHAR CENA"
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
                              {line.emotion || 'Neutro'}
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
                                <span className="text-[8px] font-black tracking-widest uppercase">Ouvir Voz</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <textarea
                          value={line.text}
                          onChange={(e) => updateLine(line.id, 'text', e.target.value)}
                          className="w-full bg-transparent border-none text-4xl p-0 font-black italic tracking-tighter leading-[0.9] uppercase focus:ring-0 outline-none resize-none mb-10 text-white/90"
                          rows={2}
                          placeholder="DIGITE O DIÁLOGO DO PERSONAGEM AQUI..."
                        />

                        <div className="grid grid-cols-2 gap-10 opacity-40 group-hover:opacity-100 transition-opacity">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#FF5F1F]">Ação do Personagem</span>
                              <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">DNA_ATIVO</span>
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
                              <option value={line.action} className="bg-[#0d0d0d]">{line.action || "-- SELECIONE UMA AÇÃO --"}</option>
                              {CHARACTERS.find(c => c.id === line.characterId)?.motionBehaviors.map((mb, i) => (
                                <option key={i} value={mb.action} className="bg-[#0d0d0d] text-white">
                                  {mb.emotion.toUpperCase()}: {mb.action}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Lógica de Iluminação</span>
                            <p className="text-[10px] font-bold text-white/30 italic">
                              {CHARACTERS.find(c => c.id === line.characterId)?.lightingKey}
                            </p>
                          </div>
                        </div>

                        {/* HIGGSFIELD CINEMATIC DIRECTORY */}
                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-10 opacity-30 group-hover:opacity-100 transition-opacity">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#FF5F1F]">Movimento de Câmera (Preset)</span>
                              <select
                                value={line.cameraPreset || ''}
                                onChange={(e) => updateLine(line.id, 'cameraPreset', e.target.value)}
                                className="w-full bg-[#111111] border border-white/10 p-2 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-[#FF5F1F] text-white/80 appearance-none cursor-pointer"
                              >
                                <option value="" className="bg-[#0d0d0d]">-- CÂMERA FIXA --</option>
                                <option value="pan_left" className="bg-[#0d0d0d]">Pan Esquerda</option>
                                <option value="pan_right" className="bg-[#0d0d0d]">Pan Direita</option>
                                <option value="tilt_up" className="bg-[#0d0d0d]">Tilt Cima</option>
                                <option value="tilt_down" className="bg-[#0d0d0d]">Tilt Baixo</option>
                                <option value="zoom_in" className="bg-[#0d0d0d]">Zoom Aproximar</option>
                                <option value="zoom_out" className="bg-[#0d0d0d]">Zoom Afastar</option>
                                <option value="dolly_in" className="bg-[#0d0d0d]">Dolly Zoom (Entrar)</option>
                                <option value="dolly_out" className="bg-[#0d0d0d]">Dolly Zoom (Sair)</option>
                                <option value="handheld" className="bg-[#0d0d0d]">Câmera na Mão (Tremor)</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Força da Ação (IA)</span>
                                <span className="text-[10px] font-bold text-[#FF5F1F]">{line.motionWeight ?? 0.5}</span>
                              </div>
                              <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={line.motionWeight ?? 0.5}
                                onChange={(e) => updateLine(line.id, 'motionWeight', parseFloat(e.target.value))}
                                className="w-full accent-[#FF5F1F] cursor-pointer bg-white/10"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-white/40">ID do Avatar (Soul ID)</span>
                              <input
                                type="text"
                                placeholder="ex: boomer_master_v3"
                                value={line.soulId || ''}
                                onChange={(e) => updateLine(line.id, 'soulId', e.target.value)}
                                className="w-full bg-[#111111] border border-white/10 p-2 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-[#FF5F1F] text-white/80 placeholder:text-white/20"
                              />
                            </div>
                            <div className="space-y-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Vídeo de Referência (URL)</span>
                              <input
                                type="text"
                                placeholder="Coloque o link do MP4 de referência..."
                                value={line.motionRefUrl || ''}
                                onChange={(e) => updateLine(line.id, 'motionRefUrl', e.target.value)}
                                className="w-full bg-[#111111] border border-white/10 p-2 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-[#FF5F1F] text-white/80 placeholder:text-white/20"
                              />
                            </div>
                          </div>
                        </div>

                        {/* STORYBOARD PRE-VIS BLOCK */}
                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-10 opacity-30 group-hover:opacity-100 transition-opacity">
                          <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#FF5F1F]">Como a Cena Deve Parecer (Prompt)</span>
                            <textarea
                              value={line.visualPrompt || ''}
                              onChange={(e) => updateLine(line.id, 'visualPrompt', e.target.value)}
                              placeholder="Descreva o visual, as roupas, a iluminação e o cenário..."
                              className="w-full bg-[#111111] border border-white/10 p-2.5 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-[#FF5F1F] text-white/80 placeholder:text-white/20 h-20 resize-none font-sans"
                            />
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Dinâmica de Câmera (Storyboard)</span>
                              <select
                                value={line.cameraMovement || 'STATIC'}
                                onChange={(e) => updateLine(line.id, 'cameraMovement', e.target.value)}
                                className="w-full bg-[#111111] border border-white/10 p-2 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-[#FF5F1F] text-white/80 appearance-none cursor-pointer"
                              >
                                <option value="STATIC">CÂMERA ESTÁTICA</option>
                                <option value="PAN_LEFT">PAN PARA ESQUERDA</option>
                                <option value="PAN_RIGHT">PAN PARA DIREITA</option>
                                <option value="TILT_UP">TILT PARA CIMA</option>
                                <option value="TILT_DOWN">TILT PARA BAIXO</option>
                                <option value="DOLLY_IN">DOLLY ZOOM (APROXIMAR)</option>
                                <option value="DOLLY_OUT">DOLLY ZOOM (AFASTAR)</option>
                                <option value="ZOOM_IN">ZOOM IN</option>
                                <option value="ZOOM_OUT">ZOOM OUT</option>
                                <option value="CRANE_UP">CRANE (SUBIR CÂMERA)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[8px] font-black uppercase tracking-widest text-white/20 block">Alinhamento de Enquadramento</span>
                              <span className="text-[9px] font-bold text-white/30 uppercase block">Regra dos Terços Ativa (Margem 9:16)</span>
                            </div>
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
                            {line.videoUrl ? (
                              <video
                                src={line.videoUrl}
                                className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-700"
                                muted
                                loop
                                onMouseEnter={(e) => e.currentTarget.play()}
                                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                              />
                            ) : GUIDE_IMAGES[line.shotType] ? (
                              <img
                                src={GUIDE_IMAGES[line.shotType]}
                                alt="Storyboard concept sketch"
                                className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover/thumb:grayscale-0 group-hover/thumb:scale-105 transition-all duration-700"
                              />
                            ) : null}
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
                              ) : line.status === 'PROCESSING' ? (
                                <>
                                  <Zap size={20} className="text-[#FF5F1F] animate-bounce" />
                                  <span className="text-[7px] font-black text-[#FF5F1F] tracking-[0.2em] uppercase">SYNTHESIZING...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={20} className="text-yellow-400 group-hover/thumb:rotate-12 transition-transform" />
                                  <span className="text-[7px] font-black text-yellow-400 tracking-[0.2em] uppercase">STORYBOARD_STILL</span>
                                  <span className="text-[5px] font-black text-white/40 uppercase">Pre-vis Concept Still</span>
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
                ) : (
                  /* E-KONTE STORYBOARD SHEET */
                  <div className="border-2 border-white/20 bg-black/60 backdrop-blur-3xl overflow-hidden rounded-none p-6 shadow-[12px_12px_0_rgba(255,95,31,0.1)]">
                    <div className="grid grid-cols-12 border-b-2 border-white/20 pb-4 text-[10px] font-black text-[#FF5F1F] uppercase tracking-[0.2em] italic">
                      <div className="col-span-1 text-center">カット (CUT)</div>
                      <div className="col-span-3">画面 (PICTURE)</div>
                      <div className="col-span-4">内容 (ACTION / CAM)</div>
                      <div className="col-span-3">台詞 (AUDIO)</div>
                      <div className="col-span-1 text-center">時間 (TIME)</div>
                    </div>

                    <div className="divide-y divide-white/10">
                      {script.map((line, index) => {
                        const seconds = line.durationEst;
                        const frames = seconds * 24; // 24fps standard anime timing
                        return (
                          <div key={line.id} className="grid grid-cols-12 gap-4 py-6 items-start relative hover:bg-white/[0.02] transition-all">
                            
                            {/* CUT COLUMN */}
                            <div className="col-span-1 flex flex-col items-center justify-center pt-2">
                              <span className="text-3xl font-black italic tracking-tighter text-[#FF5F1F]">
                                #{String(index + 1).padStart(2, '0')}
                              </span>
                              <span className="text-[7px] text-white/30 uppercase mt-1 tracking-widest font-mono">SC_{line.shotType}</span>
                              {script.length > 1 && (
                                <button
                                  onClick={() => removeLine(line.id)}
                                  className="mt-6 text-red-500/40 hover:text-red-500 transition-all p-2 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                                  title="DELETAR CENA"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>

                            {/* PICTURE COLUMN */}
                            <div className="col-span-3 pr-4 relative">
                              <div className="aspect-video bg-black border border-white/10 overflow-hidden relative group/ek">
                                {line.videoUrl ? (
                                  <video
                                    src={line.videoUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                    loop
                                    onMouseEnter={(e) => e.currentTarget.play()}
                                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                  />
                                ) : (
                                  <div className="w-full h-full relative">
                                    <img
                                      src={GUIDE_IMAGES[line.shotType] || DEFAULT_STUDIO_REFERENCE}
                                      alt="E-konte sketch"
                                      className="w-full h-full object-cover opacity-45 grayscale"
                                    />
                                    {/* Traditional Japanese grid overlay mapping */}
                                    <div className="absolute inset-0 border border-dashed border-[#FF5F1F]/20 pointer-events-none" />
                                    <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-[#FF5F1F]/30 pointer-events-none" />
                                    <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-[#FF5F1F]/30 pointer-events-none" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-dashed border-[#FF5F1F]/30 pointer-events-none" />
                                  </div>
                                )}
                                <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 border border-white/10 text-[6px] font-black text-white/50 uppercase tracking-widest">
                                  {line.status}
                                </div>
                              </div>
                              <select
                                value={line.shotType}
                                onChange={(e) => updateLine(line.id, 'shotType', e.target.value)}
                                className="w-full bg-[#111111] border border-white/10 mt-2 p-1.5 text-[8px] font-black uppercase outline-none cursor-pointer text-white/60 text-center"
                              >
                                {SHOT_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                              </select>
                            </div>

                            {/* ACTION & CAM COLUMN */}
                            <div className="col-span-4 space-y-4 pr-2">
                              <div>
                                <span className="text-[7px] font-black text-[#FF5F1F] uppercase tracking-widest block mb-1">Como a Cena Deve Parecer (Prompt)</span>
                                <textarea
                                  value={line.visualPrompt || ''}
                                  onChange={(e) => updateLine(line.id, 'visualPrompt', e.target.value)}
                                  className="w-full bg-[#111111]/80 border border-white/10 p-2 text-[9px] font-bold uppercase tracking-wider outline-none focus:border-[#FF5F1F] text-white/80 h-16 resize-none font-sans"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[7px] font-black text-white/40 uppercase tracking-widest block mb-1">Dinâmica de Câmera</span>
                                  <select
                                    value={line.cameraMovement || 'STATIC'}
                                    onChange={(e) => updateLine(line.id, 'cameraMovement', e.target.value)}
                                    className="w-full bg-[#111111] border border-white/10 p-1 text-[8px] font-bold uppercase tracking-wider outline-none focus:border-[#FF5F1F] text-white/80 cursor-pointer"
                                  >
                                    <option value="STATIC">CÂMERA ESTÁTICA</option>
                                    <option value="PAN_LEFT">PAN ESQUERDA</option>
                                    <option value="PAN_RIGHT">PAN DIREITA</option>
                                    <option value="TILT_UP">TILT CIMA</option>
                                    <option value="TILT_DOWN">TILT BAIXO</option>
                                    <option value="DOLLY_IN">DOLLY ZOOM (IN)</option>
                                    <option value="DOLLY_OUT">DOLLY ZOOM (OUT)</option>
                                  </select>
                                </div>
                                <div>
                                  <span className="text-[7px] font-black text-white/40 uppercase tracking-widest block mb-1">Ação do Personagem</span>
                                  <select
                                    value={line.action}
                                    onChange={(e) => {
                                      const selectedChar = CHARACTERS.find(c => c.id === line.characterId);
                                      const behavior = selectedChar?.motionBehaviors.find(b => b.action === e.target.value);
                                      updateLine(line.id, 'action', e.target.value);
                                      if (behavior) updateLine(line.id, 'emotion', behavior.emotion);
                                    }}
                                    className="w-full bg-[#111111] border border-white/10 p-1 text-[8px] font-bold uppercase tracking-wider outline-none focus:border-[#FF5F1F] text-white/80 cursor-pointer"
                                  >
                                    <option value={line.action}>{line.action || "-- SELECIONE --"}</option>
                                    {CHARACTERS.find(c => c.id === line.characterId)?.motionBehaviors.map((mb, i) => (
                                      <option key={i} value={mb.action}>{mb.emotion.toUpperCase()}: {mb.action}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* DIALOGUE/AUDIO COLUMN */}
                            <div className="col-span-3 space-y-4">
                              <div className="flex items-center gap-2">
                                <select
                                  value={line.characterId}
                                  onChange={(e) => updateLine(line.id, 'characterId', e.target.value)}
                                  className={cn("px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border-none outline-none cursor-pointer",
                                    line.characterId === 'boomer' ? "bg-[#FF5F1F] text-white" : "bg-white text-black")}
                                >
                                  {CHARACTERS.map(c => (
                                    <option key={c.id} value={c.id} className="bg-[#0d0d0d] text-white">{c.name.toUpperCase()}</option>
                                  ))}
                                </select>
                                {line.audioUrl && (
                                  <button
                                    onClick={() => {
                                      const audio = new Audio(line.audioUrl);
                                      audio.play();
                                    }}
                                    className="flex items-center gap-1 bg-[#FF5F1F]/10 border border-[#FF5F1F]/30 px-2 py-0.5 hover:bg-[#FF5F1F] text-[#FF5F1F] hover:text-white transition-all min-h-[30px] cursor-pointer"
                                  >
                                    <Volume2 size={10} />
                                    <span className="text-[6px] font-black tracking-widest uppercase">VOZ</span>
                                  </button>
                                )}
                              </div>

                              <textarea
                                value={line.text}
                                onChange={(e) => updateLine(line.id, 'text', e.target.value)}
                                className="w-full bg-transparent border-b border-white/10 p-0 text-xs font-bold uppercase focus:ring-0 outline-none resize-none text-white/80 h-16 leading-relaxed font-mono"
                                placeholder="DIGITE O DIÁLOGO DO ANIME..."
                              />
                            </div>

                            {/* TIME COLUMN */}
                            <div className="col-span-1 flex flex-col items-center justify-center pt-2 font-mono">
                              <div className="text-xl font-black text-white/90">{seconds}s</div>
                              <div className="text-[7px] text-white/40 uppercase tracking-widest mt-1">({frames}f)</div>
                              <div className="mt-4 w-full flex items-center justify-center">
                                <input
                                  type="range"
                                  min="2"
                                  max="12"
                                  step="1"
                                  value={seconds}
                                  onChange={(e) => updateLine(line.id, 'durationEst', parseInt(e.target.value))}
                                  className="w-12 h-1 accent-[#FF5F1F] cursor-pointer bg-white/10 rotate-90 mt-4"
                                />
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'library' && (
              <div className="flex-1 overflow-y-auto px-12 py-12 animate-in fade-in duration-700 min-h-0">
                <div className="w-full max-w-7xl mx-auto space-y-6 h-full flex flex-col">
                  <div className="border border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md p-6 relative overflow-hidden group flex flex-col flex-1">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF5F1F]/30 to-transparent"></div>
                    <h2 className="text-xl font-black mb-4 tracking-tighter uppercase flex items-center gap-3">
                      <Tv className="text-[#FF5F1F]" size={20} />
                      EPISODE ARCHIVE <span className="text-[10px] text-[#FF5F1F] bg-[#FF5F1F]/10 px-2 py-0.5 ml-2 font-bold tracking-widest border border-[#FF5F1F]/20">PUBLIC</span>
                    </h2>
                    <p className="text-xs text-white/40 mb-8 max-w-2xl font-mono uppercase">
                      All generated episodes that have successfully passed the cinematic pipeline and assembled. Stored in Supabase.
                    </p>
                    <LibraryViewer 
                      onRemix={(episode) => {
                        if (episode.director_idea) setDirectorIdea(episode.director_idea);
                        if (episode.director_snippet) setDirectorSnippet(episode.director_snippet);
                        if (episode.script_json) setScript(episode.script_json);
                        setActiveTab('director');
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'dna' && (
              <DNAPanel
                charReferences={charReferences}
                setCharReferences={setCharReferences}
                characterConfig={characterConfig}
                setCharacterConfig={setCharacterConfig}
                voiceIds={voiceIds}
                setVoiceIds={setVoiceIds}
                studioReference={studioReference}
                setStudioReference={setStudioReference}
                dnaFolderUrl={dnaFolderUrl}
                setDnaFolderUrl={setDnaFolderUrl}
                getPreviewUrl={getPreviewUrl}
                handleImageUpload={handleImageUpload}
                downloadPromptPDF={downloadPromptPDF}
              />
            )}

            {activeTab === 'labs' && (
              <LabsPanel />
            )}

            {activeTab === 'radar' && (
              <IntelligenceRadar />
            )}
          </div>
        </div>

        {
          sharingLineId && (
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
                      {sharingLineId && getDetailedPrompt(script.find(l => l.id === sharingLineId)!, directorIdea, directorSnippet)}
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
          )
        }
      </main >

      {isDrafting && (
        <DraftingTable
          topic={directorIdea}
          snippet={directorSnippet}
          apiKey={apiKeys.gemini}
          onClose={() => setIsDrafting(false)}
          onAssemble={(draftedLines, wardrobe) => {
            const hydratedScript = draftedLines.map((line, idx) => ({
              ...line,
              id: `scene-${Date.now()}-${idx}`,
              technicalPrompt: getDetailedPrompt(line as ScriptLine, directorIdea, directorSnippet),
              characterReference: charReferences[line.characterId]?.main || CHARACTERS.find(c => c.id === line.characterId)?.referenceImage,
              studioReference: GUIDE_IMAGES[line.shotType]
            }));
            setScript(hydratedScript as ScriptLine[]);
            if (wardrobe) {
              setWardrobeConfig(wardrobe);
            }
            setIsDrafting(false);
            setActiveTab('script');
          }}
        />
      )}

      {/* ACTION BAR — controles movidos do topo p/ liberar a nav (pedido Felipe 19/07) */}
      <div className="hidden lg:flex w-full z-[60] px-8 py-2.5 bg-[#0a0a0a] border-t-2 border-[#FF5F1F]/40 justify-between items-center gap-6">
        <div className="hidden xl:flex items-center gap-6 text-right font-mono text-[9px] text-white/30">
          <div>
            <span className="block text-white/50 font-bold">GPU_PIPELINE</span>
            <span className="text-[#FF5F1F] font-black">RTX-4090 // ACTIVE</span>
          </div>
          <div>
            <span className="block text-white/50 font-bold">VRAM_LOAD</span>
            <span className="text-blue-400 font-black">14.8GB / 24GB</span>
          </div>
          <div>
            <span className="block text-white/50 font-bold">LATENCY</span>
            <span className="text-green-400 font-black">18ms // OPTIMAL</span>
          </div>
        </div>

        <div className="flex items-center gap-8 ml-auto">
          <div className="flex flex-col items-end border-r border-white/10 pr-8">
            <span className="text-[10px] text-white/30 tracking-widest uppercase">Total Duration</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black italic">{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')} <span className="text-[10px] text-white/40 font-bold ml-1">MINS</span></span>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col items-end border-r border-white/10 pr-8">
            <span className="text-[10px] text-white/30 tracking-widest uppercase">Scene Count</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black italic">{script.length} <span className="text-[10px] text-white/40 font-bold ml-1">BLOCKS</span></span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            </div>
          </div>

          <div className="flex flex-col items-end border-r border-white/10 pr-8">
            <span className="text-[10px] text-white/30 tracking-widest uppercase">Production Budget</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black">${totalCost}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF5F1F]" />
            </div>
          </div>

          <select
            value={renderEngine}
            onChange={(e) => setRenderEngine(e.target.value as 'kling' | 'higgsfield')}
            disabled={isRenderingProject}
            className="bg-black/80 border-2 border-white/20 text-[10px] font-black text-white px-3 py-2 uppercase outline-none focus:border-[#FF5F1F] h-10 cursor-pointer tracking-wider"
          >
            <option value="kling">Kling (Replicate)</option>
            <option value="higgsfield">Higgsfield.ai</option>
          </select>
          <button
            onClick={renderProject}
            disabled={isRenderingProject || script.length === 0}
            aria-label="Initiate Render Cycle"
            className="btn-signal bg-[#FF5F1F] text-black px-6 py-2.5 text-xs font-black uppercase hover:bg-white transition-all shadow-[4px_4px_0_rgba(255,95,31,0.2)] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed flex items-center gap-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            <MonitorPlay size={16} fill="currentColor" className="relative z-10" />
            <span className="relative z-10">{isRenderingProject ? "RENDERING..." : "RENDER SCENE"}</span>
          </button>
        </div>
      </div>

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
            onClick={() => setActiveFooterModal('legal')}
            className={cn("hover:text-white transition-colors text-yellow-400 font-bold", activeFooterModal === 'legal' && "text-white")}
          >
            ⚠️ Compliance Scan
          </button>
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
          <RenderTerminal
            renderProgress={renderProgress}
            renderMode={renderMode}
            renderLogs={renderLogs}
          />
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
                  CLOSE_CONSOLE <X size={16} />
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
        )
      }

      {/* FOOTER MODALS */}
      {
        activeFooterModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-8 bg-black/90 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-300">
            <div className="max-w-4xl w-full bg-[#0d0d0d] border border-white/10 p-12 relative shadow-[40px_40px_0_rgba(255,95,31,0.05)] flex flex-col max-h-[90vh]">
              <button
                onClick={() => setActiveFooterModal(null)}
                className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                Close_Terminal <X size={20} />
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

                    {/* Gemini Key */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <BrainCircuit size={18} className="text-[#FF5F1F]" />
                          <span className="text-[10px] font-black text-white/40 tracking-[0.4em] uppercase">Gemini_Neural_Core</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-white/5 text-[8px] font-black text-white/40 uppercase">GEMINI_1.5_FLASH</span>
                        </div>
                      </div>
                      <input
                        type="password"
                        value={apiKeys.gemini}
                        onChange={(e) => {
                          const val = e.target.value;
                          setApiKeys(prev => ({ ...prev, gemini: val }));
                          localStorage.setItem('BK_GEMINI_KEY', val);
                        }}
                        placeholder="API_********************************"
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

              {activeFooterModal === 'legal' && (
                <div className="flex flex-col h-full overflow-hidden text-[#FAFAFA] font-['Space_Grotesk']">
                  <div className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck size={24} className="text-[#FF5F1F]" />
                        <span className="text-[10px] font-black text-[#FF5F1F] tracking-[0.4em] uppercase">Tactical_Legal_Compliance_Agent</span>
                      </div>
                      <h2 className="text-5xl font-black tracking-tighter uppercase italic">Scenario Compliance Scanner</h2>
                    </div>
                    <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end">
                      <div className="flex gap-4">
                        {['AU', 'US', 'EU', 'BR'].map(country => (
                          <label key={country} className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/10 px-3 py-1.5 hover:border-[#FF5F1F] transition-all">
                            <input
                              type="checkbox"
                              checked={complianceCountries.includes(country)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setComplianceCountries(prev => [...prev, country]);
                                } else {
                                  setComplianceCountries(prev => prev.filter(c => c !== country));
                                }
                              }}
                              className="accent-[#FF5F1F]"
                            />
                            <span className="text-[10px] font-black text-white">{country}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={runComplianceScan}
                        disabled={isScanningCompliance || script.length === 0}
                        className="bg-[#FF5F1F] text-black font-black px-6 py-3 text-xs uppercase hover:bg-white transition-all shadow-[4px_4px_0_rgba(255,95,31,0.2)] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
                      >
                        {isScanningCompliance ? "Analyzing..." : "Run Scanner"}
                      </button>
                      {complianceReport && (
                        <button
                          onClick={runRiskMitigation}
                          disabled={isMitigatingRisk || isScanningCompliance}
                          className="bg-yellow-400 text-black font-black px-6 py-3 text-xs uppercase hover:bg-white transition-all shadow-[4px_4px_0_rgba(234,179,8,0.2)] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
                        >
                          {isMitigatingRisk ? "Bypassing..." : "⚡ Mitigate & Bypass"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-4 space-y-8 min-h-0">
                    {!complianceReport && !isScanningCompliance && (
                      <div className="p-12 border-2 border-dashed border-white/10 text-center space-y-4">
                        <p className="text-sm font-bold text-white/40 uppercase">Ready to scan the active script for defamation, right of publicity, and brand trademark risks.</p>
                        <p className="text-[10px] text-white/20 font-bold uppercase leading-relaxed">
                          Checks against: Australian Defamation Act, US right of publicity (unauthorized synthetic likeness), EU AI Act transparency/watermarking obligations, and global trademark protections.
                        </p>
                      </div>
                    )}

                    {isScanningCompliance && (
                      <div className="p-12 border border-white/5 bg-white/[0.01] text-center space-y-4 animate-pulse">
                        <div className="w-10 h-10 border-4 border-[#FF5F1F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm font-black text-white uppercase tracking-widest">Scanning scripts against international laws...</p>
                        <p className="text-[10px] text-white/40 font-mono uppercase">Evaluating 2026 court precedents & synthetic media guidelines</p>
                      </div>
                    )}

                    {complianceReport && (
                      <div className="space-y-8">
                        {/* Overall Risk Banner */}
                        <div className={cn(
                          "p-6 border-2 flex items-center justify-between",
                          complianceReport.overallRisk === 'HIGH' ? "bg-red-500/10 border-red-500 text-red-500" :
                          complianceReport.overallRisk === 'MEDIUM' ? "bg-yellow-500/10 border-yellow-500 text-yellow-500" :
                          "bg-green-500/10 border-green-500 text-green-500"
                        )}>
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-[0.4em] block mb-1">Overall_Litiation_Risk</span>
                            <span className="text-3xl font-black italic tracking-tighter uppercase">{complianceReport.overallRisk} RISK LEVEL</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-black uppercase tracking-widest block mb-1">EU AI Act Labeling:</span>
                            <span className={cn(
                              "px-3 py-1 text-xs font-black uppercase border",
                              complianceReport.watermarkingRequired ? "bg-red-500 text-black border-red-500" : "bg-green-500/10 text-green-500 border-green-500/30"
                            )}>
                              {complianceReport.watermarkingRequired ? "WATERMARK_REQUIRED" : "CLEAR_OF_EU_LABEL"}
                            </span>
                          </div>
                        </div>

                        {/* List of Flags */}
                        <div className="space-y-4">
                          <span className="text-[10px] font-black text-white/40 tracking-widest uppercase block">Compliance Flags & Warnings</span>
                          {complianceReport.flags.length === 0 ? (
                            <div className="p-6 bg-white/[0.01] border border-white/5 text-center text-xs font-bold text-white/40 uppercase">
                              🎉 No compliance flags detected! The script appears clean of target litigation risks.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {complianceReport.flags.map((flag, idx) => (
                                <div key={idx} className="p-6 bg-[#0c0c0e] border border-white/5 flex gap-6 items-start">
                                  <div className={cn(
                                    "px-3 py-1.5 text-[10px] font-black uppercase border text-center min-w-[120px]",
                                    flag.riskLevel === 'HIGH' ? "border-red-500 text-red-500 bg-red-500/5" :
                                    flag.riskLevel === 'MEDIUM' ? "border-yellow-500 text-yellow-500 bg-yellow-500/5" :
                                    "border-green-500 text-green-500 bg-green-500/5"
                                  )}>
                                    {flag.category}
                                    <span className="block text-[8px] font-bold opacity-60">RISK: {flag.riskLevel}</span>
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black text-white uppercase">{flag.description}</span>
                                      <span className="px-2 py-0.5 bg-white/5 border border-white/15 text-[8px] font-black text-[#FF5F1F] uppercase">{flag.targetCountry}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-white/40 leading-relaxed uppercase">
                                      💡 <span className="text-white/60">Recommendation:</span> {flag.recommendation}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Suggested Disclaimer */}
                        {complianceReport.suggestedDisclaimer && (
                          <div className="space-y-3 bg-[#111] border border-white/10 p-6">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-white/40 tracking-widest uppercase">Required Video Satire / AI Disclaimer</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(complianceReport.suggestedDisclaimer);
                                  alert("Disclaimer copiado com sucesso!");
                                }}
                                className="text-[8px] font-black text-[#FF5F1F] uppercase hover:underline"
                              >
                                [Copy Disclaimer]
                              </button>
                            </div>
                            <p className="text-xs font-mono text-white/70 italic bg-black/40 p-4 border border-white/5">
                              &quot;{complianceReport.suggestedDisclaimer}&quot;
                            </p>
                          </div>
                        )}

                        {/* LOADING MITIGATION STATE */}
                        {isMitigatingRisk && (
                          <div className="p-12 border border-white/5 bg-white/[0.01] text-center space-y-4 animate-pulse">
                            <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-sm font-black text-white uppercase tracking-widest">Risk Agent Communicating with Attorney Agent...</p>
                            <p className="text-[10px] text-white/40 font-mono uppercase">Negotiating fine print & drafting platform strike bypasses</p>
                          </div>
                        )}

                        {/* MITIGATION REPORT */}
                        {mitigationReport && (
                          <div className="border-2 border-yellow-400 p-6 bg-yellow-400/5 space-y-8 animate-in fade-in duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
                              <div>
                                <span className="text-[8px] font-black text-yellow-400 uppercase tracking-[0.4em] block mb-1">Risk_Mitigation_Bypass_Strategy</span>
                                <h3 className="text-2xl font-black uppercase italic text-yellow-400">Tactical Safe-Pass Blueprint</h3>
                              </div>
                              <button
                                onClick={applyMitigatedScript}
                                className="bg-yellow-400 text-black font-black px-6 py-3 text-xs uppercase hover:bg-white hover:scale-[1.02] transition-all shadow-[4px_4px_0_rgba(0,0,0,0.8)]"
                              >
                                Aplicar Roteiro Corrigido
                              </button>
                            </div>

                            {/* Platform Strike Risk Meters */}
                            <div className="space-y-4">
                              <span className="text-[10px] font-black text-white/40 tracking-widest uppercase block">Estudo de Risco por Plataforma (Strikes)</span>
                              <div className="grid grid-cols-3 gap-6">
                                {[
                                  { label: 'TikTok', risk: mitigationReport.platformStrikeRisk.tiktok, color: '#00f2fe' },
                                  { label: 'YouTube', risk: mitigationReport.platformStrikeRisk.youtube, color: '#ff0055' },
                                  { label: 'Instagram', risk: mitigationReport.platformStrikeRisk.instagram, color: '#f99f1b' }
                                ].map((p, i) => (
                                  <div key={i} className="bg-black/60 border border-white/5 p-4 flex flex-col justify-between">
                                    <div className="flex justify-between items-baseline mb-2">
                                      <span className="text-[10px] font-black text-white">{p.label.toUpperCase()}</span>
                                      <span className="text-xs font-black font-mono" style={{ color: p.color }}>{p.risk}%</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full transition-all duration-1000" style={{ backgroundColor: p.color, width: `${p.risk}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Loophole Strategy & Tricks */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                              <div className="space-y-3">
                                <span className="text-[9px] font-black text-white/40 tracking-widest uppercase block">Loophole / Fine Print Analysis</span>
                                <p className="text-xs font-bold leading-relaxed text-white/80 uppercase">
                                  {mitigationReport.loopholeStrategy}
                                </p>
                              </div>
                              <div className="space-y-3">
                                <span className="text-[9px] font-black text-white/40 tracking-widest uppercase block">Required Audio/Visual Hacks</span>
                                <div className="grid grid-cols-1 gap-1">
                                  {mitigationReport.requiredProductionTricks.map((trick, i) => (
                                    <div key={i} className="p-3 bg-black/40 border border-white/5 text-[10px] font-bold text-yellow-400 uppercase">
                                      ⚠️ {trick}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Modified script comparison preview */}
                            <div className="space-y-4 pt-4 border-t border-white/10">
                              <span className="text-[10px] font-black text-white/40 tracking-widest uppercase block">Surgical Script Bypass Changes</span>
                              <div className="space-y-2">
                                {mitigationReport.modifiedScript.map((line, idx) => {
                                  const originalText = script.find(ol => ol.id === line.id)?.text || '';
                                  const isChanged = originalText !== line.text;
                                  return (
                                    <div key={line.id} className={cn(
                                      "p-4 border text-[11px] font-mono leading-tight",
                                      isChanged ? "bg-yellow-400/10 border-yellow-400 text-yellow-200" : "bg-black/30 border-white/5 text-white/40"
                                    )}>
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-black text-[#FF5F1F]">{line.characterId.toUpperCase()}</span>
                                        {isChanged && <span className="text-[8px] font-black uppercase text-yellow-400 border border-yellow-400 px-1 py-0.5 animate-pulse">MODIFIED FOR BYPASS</span>}
                                      </div>
                                      {isChanged && (
                                        <div className="text-red-400 line-through mb-1 opacity-60">
                                          OLD: &quot;{originalText}&quot;
                                        </div>
                                      )}
                                      <div>
                                        NEW: &quot;{line.text}&quot;
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }
    </div >
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
