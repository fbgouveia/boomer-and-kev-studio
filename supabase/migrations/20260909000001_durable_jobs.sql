-- BK-17 — Fase 3 (contrato, NÃO aplicado)
-- Fila transacional durável no Postgres existente. Este arquivo é o CONTRATO:
-- só pode ser aplicado no Supabase remoto com autorização explícita do Felipe.
-- Decisão de arquitetura (auditoria 09/09): fila no banco antes de Redis/n8n —
-- medir antes de adicionar infraestrutura.
--
-- Modelo: RenderJob (1 por episódio) -> SceneJob (1 por cena) + eventos de
-- provedor. O worker local continua sendo o executor; o banco passa a ser a
-- fonte de verdade que sobrevive a restart (hoje o estado vive em .tmp/*.json).
--
-- RLS: nenhuma política pública — apenas service role acessa (padrão
-- seguro-por-padrão). Isolamento por tenant é BK-21 e ampliará estas políticas.

create table if not exists render_jobs (
  id uuid primary key,                    -- = jobId local (uuid v4)
  status text not null check (status in (
    'DRAFT','REVIEW_REQUIRED','APPROVED','QUEUED','RUNNING','QC_PENDING',
    'READY','DELIVERED','FAILED_RETRYABLE','FAILED_FINAL','CANCELLED','PROVIDER_UNKNOWN'
  )),
  aspect text not null default '9:16',
  voice_mode text not null default 'kling_native',
  engine text not null default 'kling',
  config_hash text not null,              -- mesma função do resume-policy (BK-16)
  script_json jsonb not null,
  director_idea text not null default '',
  director_snippet text not null default '',
  worker_instance_id text,
  lease_until timestamptz,                -- lock com prazo (espelho do lease local)
  final_video_url text,
  delivery text check (delivery in ('cloud','local')),
  failure_stage text,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scene_jobs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references render_jobs(id) on delete cascade,
  scene_id text not null,                 -- id do roteiro (único por job, BK-16)
  status text not null default 'PENDING' check (status in (
    'PENDING','AUDIO_READY','VIDEO_READY','FAILED','SKIPPED'
  )),
  provider text,
  model text,
  provider_request_id text,               -- predictionId persistido ANTES do polling
  attempts int not null default 0,
  input_hash text,                        -- identidade do conteúdo da cena
  artifact_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, scene_id)
);

create index if not exists scene_jobs_job_idx on scene_jobs(job_id);
create index if not exists render_jobs_status_idx on render_jobs(status, updated_at);

-- Lock com prazo: o worker que quiser executar um job RUNNING com lease vencido
-- pode assumi-lo atomicamente (update ... where lease_until < now()).

alter table render_jobs enable row level security;
alter table scene_jobs  enable row level security;
-- Deliberadamente SEM políticas públicas: service role só.
