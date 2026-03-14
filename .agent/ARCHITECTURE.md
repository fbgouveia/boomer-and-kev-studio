# 🎬 Boomer & Kev Studio — Project Architecture

> AI-Powered Podcast Script Production Engine

---

## 🏗️ Application Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript (strict, 0 errors) |
| **Styling** | Tailwind CSS (Brutalist Neural Glass design system) |
| **AI Engine** | Google Gemini 2.5 Flash (`v1beta`) |
| **Video Render** | Replicate API (Kling v2) |
| **Voice Synth** | ElevenLabs API |
| **PDF Export** | jsPDF v2.7 |
| **Icons** | Lucide React |

---

### 📡 AI Routes

All routes live under `src/app/api/` and call **Google Gemini 2.5 Flash**:

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
```

> ⚠️ **Critical:** Use `v1beta` endpoint. Older models (`gemini-1.5-flash`, `gemini-2.0-flash-lite`) may return 404 depending on API key tier. Run `node find-model.js` to discover the working model for your key.

| Route | File | Purpose |
|---|---|---|
| `POST /api/ai/brainstorm` | `brainstorm/route.ts` | Generates script section options (Hooks, Bridges, Reactions, Closings) |
| `POST /api/ai/script` | `script/route.ts` | Generates a full 6-scene script from topic + directorial notes |
| `POST /api/ai/interview` | `interview/route.ts` | Directorial Q&A → synthesizes master blueprint |
| `POST /api/ai/voice` | `voice/route.ts` | ElevenLabs voice synthesis per character |
| `POST /api/ai/sync` | `sync/route.ts` | Replicate LipSync orchestration |
| `POST /api/render` | `render/route.ts` | Kling v2 video render pipeline initiation |
| `GET /api/render/status` | `render/status/route.ts` | Polls Replicate prediction status |
| `GET /api/trends` | `trends/route.ts` | Google Trends RSS → Australian trending topics |
| `POST /api/keys/balance` | `keys/balance/route.ts` | Validates API keys & ElevenLabs character balance |

---

### 🧩 Component Map

```
src/
├── app/
│   ├── page.tsx                 # Main Studio UI (3 tabs: Director, Production, Engine DNA)
│   ├── layout.tsx               # Root layout + SEO metadata (metadataBase set)
│   ├── globals.css              # Design system tokens & animations
│   └── api/
│       ├── ai/
│       │   ├── brainstorm/      # Drafting Table AI
│       │   ├── script/          # Full Script Generator
│       │   ├── interview/       # Directorial Q&A
│       │   ├── voice/           # ElevenLabs voice synthesis
│       │   └── sync/            # LipSync orchestration
│       ├── render/              # Replicate video render
│       ├── trends/              # Google Trends RSS
│       └── keys/balance/        # API key validation
├── components/
│   └── Director/
│       ├── DraftingTable.tsx    # Script drafting HUD (Brutalist Neural Glass)
│       └── TrendsFeed.tsx       # Trending topics sidebar
└── data/
    └── characters.ts            # Boomer & Kev DNA (personas, shot types, angle specs)
└── lib/
    ├── script-engine.ts         # ScriptEngine + DirectorialIntelligence types
    └── validations.ts           # Zod schemas (balanceSchema)
```

---

### 🛡️ Resilience: Neural Link Hardening

Implemented across all AI routes:

```typescript
// Pattern: fetchWithRetry with exponential backoff
async function fetchWithRetry(url, options, retries = 3) {
    // 3 auto-retries on 429 (rate limit)
    // Exponential backoff: 1s → 2s → 3s
    // Returns { response, retryAfter? } for frontend countdown
}
```

**Frontend (DraftingTable.tsx):**
- Extracts `retryAfter` from 429 response
- Shows live countdown timer
- Disables retry button until cooldown expires

---

### 🎨 Design System: Brutalist Neural Glass

| Token | Value |
|---|---|
| Primary | `#FF5F1F` (Signal Orange) |
| Background | `#000000` / `#0d0d0d` |
| HUD Overlay | `bg-black/40 backdrop-blur-xl` |
| Borders | Solid 4px (`border-[4px] border-[#FF5F1F]`) |
| Typography | All-caps, `tracking-widest`, italic, `font-black` |
| Forbidden | 🚫 Purple — ever |

**Drafting Table HUD** = Semi-transparent "Brutalist Neural Glass" — the Director's Terminal and Nav Bar remain visible behind the active drafting layer. Grain texture overlay reduces noise.

---

### 👕 Outfit Consistency System

The `getDetailedPrompt()` function (in `page.tsx`) guarantees outfit appears in **every scene prompt** using a two-layer approach:

```typescript
// Layer 1: Always present — character's default outfit
const outfitBase = `Wearing ${char.defaultOutfit}.`;

// Layer 2: Directorial override layers ON TOP (jersey text, colour, etc.)
const directorialOverride = explicitNotes
  ? ` CRITICAL_DIRECTORIAL_OVERRIDE: ${explicitNotes}. Ensure all visual details like jerseys and text are prioritized.`
  : '';

const characterAnchor = `${char.imagePromptContext}. ${outfitBase}${directorialOverride} ...`;
```

**Call sites that pass director context** (all fixed):
- `onAssemble` in DraftingTable → `getDetailedPrompt(line, directorIdea, directorSnippet)` ✅
- `renderProject` pipeline → passes `directorIdea, directorSnippet` ✅
- `addLine` → passes `mainSubject, directorSnippet` ✅
- `updateLine` → passes `directorIdea, directorSnippet` ✅
- Share panel → passes `directorIdea, directorSnippet` ✅
- Both PDF exports → pass `directorIdea, directorSnippet` ✅

---

### 🖨️ PDF Export System (v2.7)

#### Scene Prompt Card (`downloadScenePromptPDF`)

```
┌─────────────────────────────────────────┐
│ BOOMER & KEV STUDIO          SHOT 1 v2.7│  ← Header
├────────────────────┬────────────────────┤
│ CHARACTER          │ SHOT TYPE          │  ← 2-col label row
│ BOOMER             │ MCU_BOOMER         │  ← splitTextToSize per column
├────────────────────┼────────────────────┤
│ MOTION / ACTION    │ EMOTION            │
│ SHADOW BOXING...   │ EXPLOSIVE          │
├─────────────────────────────────────────┤
│ "DIALOGUE LINE HERE IN UPPERCASE"       │  ← Dark box, dynamic height
├─────────────────────────────────────────┤
│ ENGINE_PROMPT_CONSTRUCTION_STREAM:      │  ← Font size 6, lineHeight 3.8
│ CINEMATIC MASTERPIECE. Wearing...       │  ← Auto page-break if overflow
├─────────────────────────────────────────┤
│ REFERENCE_ASSET: [url wrapped]          │
├─────────────────────────────────────────┤
│ PROPERTY OF BOOMER & KEV STUDIO    v2.7 │  ← Footer
└─────────────────────────────────────────┘
```

Key fixes in v2.7:
- All metadata fields use `splitTextToSize` — no overflow possible
- Tech prompt box height = `lines × 3.8 + 18` (not a fixed estimate)
- Auto `doc.addPage()` if content exceeds 275px
- Reference URLs wrapped, never clip edge
- Added dialogue box (was missing in v2.6)

#### Master Manifest (`exportToPDF`)
- All 6 scenes in one document, per-scene AI prompt stream
- Dynamic card heights prevent content cutoff
- Auto page-break with header repeat

---

### 🔧 Debug Utilities

Scripts in project root — excluded from ESLint (`eslint.config.mjs` ignore list):

| Script | Purpose |
|---|---|
| `find-model.js` | Exhaustively probes all models × API versions for a working endpoint |
| `test-brainstorm.js` | End-to-end brainstorm API integration test |
| `test-rivalry.js` | Full script generation test (NRL vs AFL topic) |
| `check-model.js` | Checks metadata for a specific Gemini model |
| `list-models.js` | Lists all Gemini models accessible to your API key |
| `test-direct.js` | Direct Gemini API call for raw endpoint testing |

---

### ✅ Code Quality Audit — 2026-02-24

```
TypeScript (tsc --noEmit)  → 0 errors
ESLint                     → 0 errors, 18 warnings (intentional <img> tags)
Production Build           → Exit 0, compiled in 7.1s
11 routes generated cleanly
```

**Fixes applied this session:**
- Removed unused imports (`Terminal`, `CHARACTERS`, `ScriptState` interface)
- Fixed `useEffect` missing deps array
- Renamed all unused catch variables to `_e` / `_error`
- Removed unused `driveLink` variable
- Added all debug `.js` scripts to ESLint ignore list
- Added `metadataBase` + Twitter card to `layout.tsx` (fixes OG build warning)

---


# Antigravity Kit Architecture

> Comprehensive AI Agent Capability Expansion Toolkit

---

## 📋 Overview

Antigravity Kit is a modular system consisting of:

- **20 Specialist Agents** - Role-based AI personas
- **36 Skills** - Domain-specific knowledge modules
- **11 Workflows** - Slash command procedures

---

## 🏗️ Directory Structure

```plaintext
.agent/
├── ARCHITECTURE.md          # This file
├── agents/                  # 20 Specialist Agents
├── skills/                  # 36 Skills
├── workflows/               # 11 Slash Commands
├── rules/                   # Global Rules
└── scripts/                 # Master Validation Scripts
```

---

## 🤖 Agents (20)

Specialist AI personas for different domains.

| Agent                    | Focus                      | Skills Used                                              |
| ------------------------ | -------------------------- | -------------------------------------------------------- |
| `orchestrator`           | Multi-agent coordination   | parallel-agents, behavioral-modes                        |
| `project-planner`        | Discovery, task planning   | brainstorming, plan-writing, architecture                |
| `frontend-specialist`    | Web UI/UX                  | frontend-design, react-best-practices, tailwind-patterns |
| `backend-specialist`     | API, business logic        | api-patterns, nodejs-best-practices, database-design     |
| `database-architect`     | Schema, SQL                | database-design, prisma-expert                           |
| `mobile-developer`       | iOS, Android, RN           | mobile-design                                            |
| `game-developer`         | Game logic, mechanics      | game-development                                         |
| `devops-engineer`        | CI/CD, Docker              | deployment-procedures, docker-expert                     |
| `security-auditor`       | Security compliance        | vulnerability-scanner, red-team-tactics                  |
| `penetration-tester`     | Offensive security         | red-team-tactics                                         |
| `test-engineer`          | Testing strategies         | testing-patterns, tdd-workflow, webapp-testing           |
| `debugger`               | Root cause analysis        | systematic-debugging                                     |
| `performance-optimizer`  | Speed, Web Vitals          | performance-profiling                                    |
| `seo-specialist`         | Ranking, visibility        | seo-fundamentals, geo-fundamentals                       |
| `documentation-writer`   | Manuals, docs              | documentation-templates                                  |
| `product-manager`        | Requirements, user stories | plan-writing, brainstorming                              |
| `product-owner`          | Strategy, backlog, MVP     | plan-writing, brainstorming                              |
| `qa-automation-engineer` | E2E testing, CI pipelines  | webapp-testing, testing-patterns                         |
| `code-archaeologist`     | Legacy code, refactoring   | clean-code, code-review-checklist                        |
| `explorer-agent`         | Codebase analysis          | -                                                        |
| `neuromarketing-agent`   | Persuasion & Conversion    | neuromarketing-strategy, frontend-design                 |

---

## 🧩 Skills (36)

Modular knowledge domains that agents can load on-demand. based on task context.

### Frontend & UI

| Skill                   | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `react-best-practices`  | React & Next.js performance optimization (Vercel - 57 rules)          |
| `web-design-guidelines` | Web UI audit - 100+ rules for accessibility, UX, performance (Vercel) |
| `tailwind-patterns`     | Tailwind CSS v4 utilities                                             |
| `frontend-design`       | UI/UX patterns, design systems                                        |
| `ui-ux-pro-max`         | 50 styles, 21 palettes, 50 fonts                                      |

### Backend & API

| Skill                   | Description                    |
| ----------------------- | ------------------------------ |
| `api-patterns`          | REST, GraphQL, tRPC            |
| `nestjs-expert`         | NestJS modules, DI, decorators |
| `nodejs-best-practices` | Node.js async, modules         |
| `python-patterns`       | Python standards, FastAPI      |

### Database

| Skill             | Description                 |
| ----------------- | --------------------------- |
| `database-design` | Schema design, optimization |
| `prisma-expert`   | Prisma ORM, migrations      |

### TypeScript/JavaScript

| Skill               | Description                         |
| ------------------- | ----------------------------------- |
| `typescript-expert` | Type-level programming, performance |

### Cloud & Infrastructure

| Skill                   | Description               |
| ----------------------- | ------------------------- |
| `docker-expert`         | Containerization, Compose |
| `deployment-procedures` | CI/CD, deploy workflows   |
| `server-management`     | Infrastructure management |

### Testing & Quality

| Skill                   | Description              |
| ----------------------- | ------------------------ |
| `testing-patterns`      | Jest, Vitest, strategies |
| `webapp-testing`        | E2E, Playwright          |
| `tdd-workflow`          | Test-driven development  |
| `code-review-checklist` | Code review standards    |
| `lint-and-validate`     | Linting, validation      |

### Security

| Skill                   | Description              |
| ----------------------- | ------------------------ |
| `vulnerability-scanner` | Security auditing, OWASP |
| `red-team-tactics`      | Offensive security       |

### Architecture & Planning

| Skill           | Description                |
| --------------- | -------------------------- |
| `app-builder`   | Full-stack app scaffolding |
| `architecture`  | System design patterns     |
| `plan-writing`  | Task planning, breakdown   |
| `brainstorming` | Socratic questioning       |

### Mobile

| Skill           | Description           |
| --------------- | --------------------- |
| `mobile-design` | Mobile UI/UX patterns |

### Game Development

| Skill              | Description           |
| ------------------ | --------------------- |
| `game-development` | Game logic, mechanics |

### SEO & Growth

| Skill              | Description                   |
| ------------------ | ----------------------------- |
| `seo-fundamentals` | SEO, E-E-A-T, Core Web Vitals |
| `geo-fundamentals` | GenAI optimization            |

### Shell/CLI

| Skill                | Description               |
| -------------------- | ------------------------- |
| `bash-linux`         | Linux commands, scripting |
| `powershell-windows` | Windows PowerShell        |

### Other

| Skill                     | Description               |
| ------------------------- | ------------------------- |
| `clean-code`              | Coding standards (Global) |
| `behavioral-modes`        | Agent personas            |
| `parallel-agents`         | Multi-agent patterns      |
| `mcp-builder`             | Model Context Protocol    |
| `documentation-templates` | Doc formats               |
| `i18n-localization`       | Internationalization      |
| `performance-profiling`   | Web Vitals, optimization  |
| `systematic-debugging`    | Troubleshooting           |

---

## 🔄 Workflows (11)

Slash command procedures. Invoke with `/command`.

| Command          | Description              |
| ---------------- | ------------------------ |
| `/brainstorm`    | Socratic discovery       |
| `/create`        | Create new features      |
| `/debug`         | Debug issues             |
| `/deploy`        | Deploy application       |
| `/enhance`       | Improve existing code    |
| `/orchestrate`   | Multi-agent coordination |
| `/plan`          | Task breakdown           |
| `/preview`       | Preview changes          |
| `/status`        | Check project status     |
| `/test`          | Run tests                |
| `/ui-ux-pro-max` | Design with 50 styles    |

---

## 🎯 Skill Loading Protocol

```plaintext
User Request → Skill Description Match → Load SKILL.md
                                            ↓
                                    Read references/
                                            ↓
                                    Read scripts/
```

### Skill Structure

```plaintext
skill-name/
├── SKILL.md           # (Required) Metadata & instructions
├── scripts/           # (Optional) Python/Bash scripts
├── references/        # (Optional) Templates, docs
└── assets/            # (Optional) Images, logos
```

### Enhanced Skills (with scripts/references)

| Skill               | Files | Coverage                            |
| ------------------- | ----- | ----------------------------------- |
| `ui-ux-pro-max`     | 27    | 50 styles, 21 palettes, 50 fonts    |
| `app-builder`       | 20    | Full-stack scaffolding              |

---

## � Scripts (2)

Master validation scripts that orchestrate skill-level scripts.

### Master Scripts

| Script          | Purpose                                 | When to Use              |
| --------------- | --------------------------------------- | ------------------------ |
| `checklist.py`  | Priority-based validation (Core checks) | Development, pre-commit  |
| `verify_all.py` | Comprehensive verification (All checks) | Pre-deployment, releases |

### Usage

```bash
# Quick validation during development
python .agent/scripts/checklist.py .

# Full verification before deployment
python .agent/scripts/verify_all.py . --url http://localhost:3000
```

### What They Check

**checklist.py** (Core checks):

- Security (vulnerabilities, secrets)
- Code Quality (lint, types)
- Schema Validation
- Test Suite
- UX Audit
- SEO Check

**verify_all.py** (Full suite):

- Everything in checklist.py PLUS:
- Lighthouse (Core Web Vitals)
- Playwright E2E
- Bundle Analysis
- Mobile Audit
- i18n Check

For details, see [scripts/README.md](scripts/README.md)

---

## 📊 Statistics

| Metric              | Value                         |
| ------------------- | ----------------------------- |
| **Total Agents**    | 20                            |
| **Total Skills**    | 36                            |
| **Total Workflows** | 11                            |
| **Total Scripts**   | 2 (master) + 18 (skill-level) |
| **Coverage**        | ~90% web/mobile development   |

---

## 🔗 Quick Reference

| Need     | Agent                 | Skills                                |
| -------- | --------------------- | ------------------------------------- |
| Web App  | `frontend-specialist` | react-best-practices, frontend-design |
| API      | `backend-specialist`  | api-patterns, nodejs-best-practices   |
| Mobile   | `mobile-developer`    | mobile-design                         |
| Database | `database-architect`  | database-design, prisma-expert        |
| Security | `security-auditor`    | vulnerability-scanner                 |
| Testing  | `test-engineer`       | testing-patterns, webapp-testing      |
| Debug    | `debugger`            | systematic-debugging                  |
| Plan     | `project-planner`     | brainstorming, plan-writing           |
