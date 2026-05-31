# PLAN: DNA Intelligence Engine (Drafting Table & ML Narrative Core)

## 🎯 Objective
Evolution of the Boomer & Kev Studio from a static generator to an interactive "Intelligence HUD". The system will now allow directors to "Draft" scripts using ML-driven suggestions based on real-world search intent (YouTube/IG) and retention mechanics.

## 🏗️ Architecture Updates

### 1. The "Drafting Table" (Frontend Component)
- **Component**: `src/components/Director/DraftingTable.tsx`
- **Function**: A multi-column workspace where the user reviews AI-generated "Stubs" (Hooks, Rebuttals, Closings).
- **Interactions**:
    - "Lock In": User selects a preferred option.
    - "Reroll": AI generates 3 new alternatives for that specific slot.
    - "Manual Override": Text field to inject a specific directorial idea.

### 2. The "Brainstorm" API (Backend Logic)
- **Endpoint**: `/api/ai/brainstorm`
- **Intelligence**: Integrated Gemini 2.0 (Neural Core) + Search Intent Simulation.
- **Logic**:
    - Analyzes `TrendsFeed` selection.
    - Analyzes metadata from mock YT/IG "Engagement Proxies".
    - Outputs a JSON structured as: `{ hooks: [], arguments: [], closings: [] }`.
    - Each suggestion includes a "Retention Score" (e.g., "94% - High Scroll Stop").

### 3. ML Processing Layer
- **Integration**: Update `src/lib/script-engine.ts` to support "Staged Generation".
- **Logic**: Instead of a single "Generate" call, the engine now processes the "Locked" options from the Drafting Table to build the final high-fidelity script.

## 🎨 Visual Aesthetics (Premium Brutalist)
- **Theme**: "Cyber-Director's Manual".
- **Color Palette**: `#050505` (Obsidian), `#FF5F1F` (Signal Orange), and vibrant `#00F0FF` (Cyantific Blue for ML elements).
- **Aesthetic**: Data-heavy tables, Monospace typography, and "Scanning" animations for the ML interpreted sections.

## 🚀 Implementation Roadmap

### Phase 1: API Foundation
- [ ] Create `src/app/api/ai/brainstorm/route.ts`.
- [ ] Implement search intent interpretation logic (Simulated for MVP).
- [ ] Define "Retention Metric" scoring algorithm.

### Phase 2: Drafting Table UI
- [ ] Build `DraftingTable.tsx` with "Lock In" and "Reroll" mechanics.
- [ ] Integrate with `TrendsFeed` for automatic context injection.
- [ ] Add manual input overrides for "DIRECTORIAL_INJECTION".

### Phase 3: Engine Integration
- [ ] Connect `DraftingTable` outputs to the main `Script` timeline.
- [ ] Update `Home` component to handle the new `DRAFTING` state.
- [ ] Final visual polish and checklist audit.

## ✅ Verification Criteria
- [ ] API returns 3 distinct variants for each script section.
- [ ] User can "assemble" a script piece-by-piece.
- [ ] The "Retention Score" is visible and influences prompt weight.
- [ ] `checklist.py` passes all code and UI audits.
