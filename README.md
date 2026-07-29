# 🎬 Boomer & Kev Studio

> **AI-Powered Australian Podcast Script Production Engine** — From raw idea to fully-drafted, character-driven video script in seconds.

---

## 🏉 What Is This?

**Boomer & Kev Studio** is a Next.js production tool for the *Down Under Discourse* podcast. It uses Google's Gemini AI to generate hilarious, character-driven scripts featuring two iconic Aussie personas:

- 🦘 **BOOMER** — High-energy, alpha-male Queensland larrikin. Shadow boxing. Fair dinkum energy.
- 🐨 **KEV** — Deadpan, cynical, low-energy koala. Stubby holder. Maximum disinterest.

---

## ⚡ Getting Started

### 1. Prerequisites

```bash
node >= 18
npm or yarn
```

### 2. Environment Variables

Create a `.env.local` file in the root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
REPLICATE_API_TOKEN=your_replicate_token_here
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com   # optional, used for OG metadata
```

> **Important:** This project uses Google's **Gemini 2.5 Flash** model (`v1beta` endpoint). Ensure your API key has access to this model via [Google AI Studio](https://aistudio.google.com).

### 3. Run Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the studio.

---

## 🧠 Core Features

| Feature | Description |
|---|---|
| **Director's Terminal** | Input your topic + directorial notes (outfit, jersey text, vibe) to begin |
| **Drafting Table HUD** | AI-generated script options per scene section — Hooks, Bridges, Reactions, Closings |
| **Brutalist Neural Glass UI** | Semi-transparent overlay — Nav Bar and Director Terminal remain visible behind the HUD |
| **Neural Link Hardening** | 3 auto-retries with exponential backoff. Frontend live cooldown countdown on 429 rate limits |
| **Character DNA Engine** | Boomer & Kev reference images, angle library, shot types, and directorial blueprints |
| **Script Assembly** | Select one option per section → assemble a full 6-scene script |
| **Directorial Interview** | AI Q&A to refine your concept. Synthesizes a full directorial blueprint from your answers |
| **Outfit Consistency** | `defaultOutfit` is always stamped into every scene prompt. Directorial notes layer on top as an override — jersey text guaranteed in all 6 scenes |
| **Scene Prompt PDF v2.7** | Per-scene prompt card with dialogue box, 2-col metadata grid, dynamic-height tech prompt block, page-overflow protection, and footer |
| **Full Script PDF v2.7** | Master production manifest — all scenes, AI prompts, metadata, and model attribution |

---

## 📡 AI Architecture

### Model

All AI routes use **Google Gemini 2.5 Flash** via the `v1beta` API:

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
```

> **Note:** Older model names (`gemini-1.5-flash`, `gemini-2.0-flash-lite`) return 404 on most API key tiers. Run `node find-model.js` if you hit errors.

### API Routes

| Route | Purpose |
|---|---|
| `POST /api/ai/brainstorm` | Generates script section options (Hooks, Bridges, Reactions, Closings) |
| `POST /api/ai/script` | Full 6-scene script from topic + directorial notes |
| `POST /api/ai/interview` | Q&A questions + master blueprint synthesis |
| `POST /api/ai/voice` | ElevenLabs voice synthesis per character (paid gate) |
| `POST /api/ai/image` | Gemini image synthesis (paid gate) |
| `POST /api/ai/sync` | Replicate LipSync orchestration (paid gate) |
| `POST /api/video/generate` | Single video generation (paid gate) |
| `POST /api/render` | Kicks off Kling/Higgsfield scene renders (paid gate) |
| `GET /api/render/status` | Polls Replicate prediction status |
| `GET /api/trends` | Fetches Australian trending topics from Google RSS |
| `POST /api/keys/balance` | Validates API keys + checks ElevenLabs character balance |

Paid media routes require an `Idempotency-Key` header plus a fresh `approval`
object (`confirmed`, `source`, `approvedAt`). Reuse the same key and payload
after an uncertain response; never create a new key until the provider state is
known.

### Resilience: Neural Link Hardening

All AI routes implement:
- **Auto Retry** — 3 retries with exponential backoff (`1s → 2s → 3s`)
- **429 Rate Limit** — Returns `retryAfter` seconds to the frontend
- **Frontend Countdown** — Live countdown in Drafting Table before retry is re-enabled

---

## 🎨 UI Design System

**Brutalist Neural Glass** aesthetic:

| Token | Value |
|---|---|
| **Primary** | `#FF5F1F` (Signal Orange) |
| **Background** | `#000000` / `#0d0d0d` |
| **HUD Overlay** | `bg-black/40 backdrop-blur-xl` |
| **Borders** | Solid 4px orange on active containers |
| **Typography** | All-caps, `tracking-widest`, italic, `font-black` |
| **Forbidden** | 🚫 Purple — never |

---

## 🖨️ PDF Export System (v2.7)

### Scene Prompt Card (`downloadScenePromptPDF`)
- **2-column metadata grid** — Character + Shot Type | Motion + Emotion (both wrapped, no overflow)
- **Dialogue block** — Full dark box with white text, dynamically sized
- **Tech Prompt block** — `courier` font size 6, accurate `lineHeight: 3.8` calculation, auto page-break if overflows
- **Reference Asset** — Wrapped URL, never clips edge
- **Footer** — Studio branding + model attribution

### Master Manifest (`exportToPDF`)
- All scenes in one document
- Per-scene AI prompt construction stream
- Dynamic card heights prevent any content cutoff
- Auto page-break with header repeat

---

## 🔧 Debugging & Testing

Utility scripts in the project root (excluded from ESLint):

```bash
# Find the working Gemini model for your API key
node find-model.js

# Test the brainstorm API end-to-end
node test-brainstorm.js

# Test the full script generation
node test-rivalry.js

# Check a specific model's metadata
node check-model.js

# List available models
node list-models.js
```

---

## ✅ Code Quality (Last Audit: 2026-02-24)

```
TypeScript   → 0 errors  (npx tsc --noEmit)
ESLint       → 0 errors, 18 warnings (all intentional <img> tags)
Build        → Exit 0   (npm run build, 7.1s)
```

---

## 🚀 Deploy on Vercel

```bash
vercel deploy
```

Set these environment variables in your Vercel project:

```
GEMINI_API_KEY
REPLICATE_API_TOKEN
NEXT_PUBLIC_SITE_URL     ← your production URL (for OG/Twitter metadata)
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Main Studio UI (3 tabs: Director, Production, DNA)
│   ├── layout.tsx               # Root layout + SEO metadata
│   ├── globals.css              # Design system + animations
│   └── api/
│       ├── ai/
│       │   ├── brainstorm/      # Drafting Table AI
│       │   ├── script/          # Full Script Generator
│       │   ├── interview/       # Directorial Q&A
│       │   ├── voice/           # ElevenLabs voice
│       │   └── sync/            # LipSync orchestration
│       ├── render/              # Replicate video render
│       ├── trends/              # Google Trends RSS
│       └── keys/balance/        # API key validation
├── components/
│   └── Director/
│       ├── DraftingTable.tsx    # Script drafting HUD
│       └── TrendsFeed.tsx       # Trending topics sidebar
├── data/
│   └── characters.ts            # Boomer & Kev DNA
└── lib/
    ├── script-engine.ts         # ScriptEngine + DirectorialIntelligence
    └── validations.ts           # Zod schemas
```

---

*Built with ❤️ and way too much Aussie slang. Fair dinkum.* 🦘🔥
