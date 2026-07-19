-- Boomer & Kev Studio - Supabase Schema
-- Generates the required tables mapped to the TypeScript interfaces.

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. EPISODES
-- Maps to `Episode` and `EpisodeStatus` types.
CREATE TABLE public.episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic TEXT NOT NULL,
    snippet TEXT,
    director_idea TEXT,
    director_snippet TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scripted', 'voiced', 'lipsync', 'rendered', 'assembled', 'published'
    video_url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    script_json JSONB -- Stores the raw JSON array of the ScriptLine objects as backup
);

-- 2. SCRIPT_LINES (SCENES)
-- Maps to `ScriptLine` type, linking back to the episode.
CREATE TABLE public.script_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    scene_index INTEGER NOT NULL,
    character_id TEXT NOT NULL,
    text TEXT NOT NULL,
    shot_type TEXT NOT NULL,
    action TEXT NOT NULL,
    duration_est NUMERIC,
    emotion TEXT,
    status TEXT DEFAULT 'IDLE', -- 'IDLE', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DONE', 'ERROR'
    prediction_id TEXT,
    video_url TEXT,
    audio_url TEXT,
    audio_data_uri TEXT,
    sync_prediction_id TEXT,
    sync_status TEXT DEFAULT 'IDLE',
    technical_prompt TEXT,
    character_reference TEXT,
    studio_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(episode_id, scene_index)
);

-- 3. RENDER_JOBS
-- Maps to `RenderJob` type.
CREATE TABLE public.render_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    scene_index INTEGER NOT NULL,
    script_line_id UUID REFERENCES public.script_lines(id) ON DELETE CASCADE,
    voice_url TEXT,
    voice_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'done', 'failed'
    lipsync_prediction_id TEXT,
    lipsync_url TEXT,
    lipsync_status TEXT DEFAULT 'pending',
    video_prediction_id TEXT,
    video_url TEXT,
    video_status TEXT DEFAULT 'pending',
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4. PUBLISH_JOBS
-- Maps to `PublishJob` type.
CREATE TABLE public.publish_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'tiktok', 'instagram', 'youtube'
    video_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'uploading', 'published', 'failed'
    platform_post_id TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- 5. SOCIAL_ACCOUNTS
-- Maps to `SocialAccount` type.
CREATE TABLE public.social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL, -- 'tiktok', 'instagram', 'youtube'
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    channel_id TEXT,
    channel_name TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PIPELINE_EVENTS
-- Maps to `PipelineEvent` type for audit logs and debugging.
CREATE TABLE public.pipeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    step TEXT NOT NULL,
    scene_index INTEGER,
    payload JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS)
-- Production Security Standard: All tables have RLS enabled.
-- Anon users can only SELECT (read) non-sensitive public views (episodes, script_lines, trends).
-- All mutations (INSERT, UPDATE, DELETE) and sensitive tables (social_accounts, render_jobs, publish_jobs)
-- are locked down from client access and must be processed server-side using the service_role client (bypasses RLS).

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_events ENABLE ROW LEVEL SECURITY;

-- 1. EPISODES POLICIES
CREATE POLICY "Allow anonymous read access on public episodes" ON public.episodes FOR SELECT USING (true);

-- 2. SCRIPT_LINES POLICIES
CREATE POLICY "Allow anonymous read access on public script_lines" ON public.script_lines FOR SELECT USING (true);

-- 3. SENSITIVE TABLES (No policies defined for anon/authenticated = DENY ALL by default)
-- * public.render_jobs
-- * public.publish_jobs
-- * public.social_accounts (protects sensitive oauth tokens)
-- * public.pipeline_events

-- 7. TRENDS (For the Trend Hunter Agent)
-- Maps to `Trend` type in frontend
CREATE TABLE public.trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    snippet TEXT,
    url TEXT,
    traffic TEXT,
    published TIMESTAMP WITH TIME ZONE,
    news JSONB DEFAULT '[]'::jsonb,
    directorial_intelligence JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read access on trends" ON public.trends FOR SELECT USING (true);
