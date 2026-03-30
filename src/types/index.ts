export interface ScriptLine {
  id: string;
  characterId: string; // was 'boomer' | 'kev' in new, but generic string in old
  text: string;
  shotType: string;
  action: string;
  durationEst: number;
  emotion?: string;
  status: 'IDLE' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DONE' | 'ERROR';
  predictionId?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioDataUri?: string;
  syncPredictionId?: string;
  syncStatus?: 'IDLE' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  technicalPrompt?: string;
  characterReference?: string;
  studioReference?: string;
}

export type EpisodeStatus =
  | 'draft'       // Rascunho — script não confirmado
  | 'scripted'    // Script gerado e confirmado
  | 'voiced'      // Todas as vozes sintetizadas
  | 'lipsync'     // LipSync de todas as cenas concluído
  | 'rendered'    // Todos os vídeos de cenas prontos
  | 'assembled'   // Vídeo final montado (concatenado)
  | 'published';  // Publicado em todas as plataformas

export interface Episode {
  id: string;
  topic: string;
  snippet?: string;
  director_idea?: string;
  director_snippet?: string;
  status: EpisodeStatus;
  script?: ScriptLine[];
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  publishedAt?: string;
}

export interface RenderJob {
  id: string;
  episodeId: string;
  sceneIndex: number;
  scriptLine: ScriptLine;
  voiceUrl?: string;
  voiceStatus: 'pending' | 'processing' | 'done' | 'failed';
  lipsyncPredictionId?: string;
  lipsyncUrl?: string;
  lipsyncStatus: 'pending' | 'processing' | 'done' | 'failed';
  videoPredictionId?: string;
  videoUrl?: string;
  videoStatus: 'pending' | 'processing' | 'done' | 'failed';
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PublishJob {
  id: string;
  episodeId: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  videoUrl: string;
  status: 'pending' | 'uploading' | 'published' | 'failed';
  platformPostId?: string;
  error?: string;
  createdAt: string;
  publishedAt?: string;
}

export interface SocialAccount {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  channelId?: string;
  channelName?: string;
  active: boolean;
}

export interface PipelineEvent {
  episodeId: string;
  step: EpisodeStatus;
  sceneIndex?: number;
  payload?: Record<string, unknown>;
  timestamp: string;
}
