# Plan: Magnetic Storytelling Engine

## Goal
Transform the random script generation into a "Magnetic Storytelling" system that follows narrative arcs (Hook → Conflict → Resolution) and uses character DNA for high-engagement Aussie dialogue.

## Tasks
- [x] **T1: Define Narrative Archetypes** → Create `StoryArc` types and patterns in `characters.ts`. Verify: `StoryArc` type exists.
- [x] **T2: Implement The "Hook" Generator** → Update `generateAIScript` to start every sequence with a high-energy "Scroll Stopper" dialogue + motion. Verify: First block has "Explosive" emotion.
- [x] **T3: Add Conflict/React Logic** → Inject contrasting "Kev Skepticism" blocks that challenge Boomer's energy mid-script. Verify: Script contains at least one "Disbelief" or "Cynical" beat.
- [x] **T4: Dynamic Motion Synthesis** → Map specific emotions to the `motionBehaviors` in `characters.ts`. **Implemented "Motion Sequences" for durations > 6s (e.g., Action A THEN Action B).** Verify: Motion evolves with duration.
- [x] **T5: Storytelling Script Polish** → Add "Magnetic" keywords and slang variety to catchphrases for more "human" output. Verify: Generation uses new Catchphrase pool.
- [x] **T6: Fix Technical Indicators** → Correct the "Right Orange Indicator" static stay and add sidebar progress bar. Verify: Indicators react to character and tab changes.
- [x] **T7: Manual Card "Magnetic" Suggestions** → Auto-generate dialogue and motion when manually adding a card. Verify: New cards are pre-populated with character-accurate data.
- [x] **T8: Scenario & Ambience DNA** → Implement "Scenario DNA" in the Engine tab with prop lists and lighting keys. Verify: DNA tab shows Technical Manifest.
- [x] **T9: Production DNA Override** → All DNA data (Characters, Motions) integrated as selectable options in production cards. Verify: Users can manually select any behavior from the DNA pool.
- [x] **T10: Professional AI Prompts & Asset Repo** → Integrated high-fidelity video prompts into PDF/Exports and added Google Drive asset link. Verify: PDF contains structured 8k prompt strings for video generators.

## Done When
- [ ] AI-generated scripts feel like a cohesive story (Hook, Tension, Payoff).
- [ ] Commands like "Boomer tries to sell a fake bridge" generate logically connected dialogue between the two characters.
- [ ] All production prompts include the upgraded lighting/motion metadata.

## Notes
- We want to avoid generic "G'day" repeats. The engine should prioritize "First Time" catchphrases for the hook.
- Kev's "magnetic" draw is his deadpan contrast—ensure his lines are short and punchy.
