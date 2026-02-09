# Plan: Australian Google Trends Feed

## Goal
Integrate a live "Intelligence Feed" of daily Australian Google Trends into the Director's Dashboard to inspire script ideas.

## Tasks
- [x] **T1: Install Dependencies** → Install `rss-parser` to handle the XML feed. Verify: `package.json` has `rss-parser`.
- [x] **T2: Create API Route** → Create `src/app/api/trends/route.ts` to fetch and parse `https://trends.google.com/trends/trendingsearches/daily/rss?geo=AU`. Verify: Accessing `/api/trends` returns JSON data.
- [x] **T3: Create Trends Component** → Build `TrendsFeed.tsx` with "Cinematic Brutalism" styling (scrolling ticker or data list). Verify: Component renders mock data correctly.
- [x] **T4: Integrate into Director Dashboard** → Place the feed in the `Director` tab layout (likely to the right of the input). Verify: Live data appears on the dashboard.
- [x] **T5: Interaction Logic** → Make trend items clickable to auto-fill the "Narrative Trigger" input. Verify: Clicking a trend updates the `directorIdea` state.

## Done When
- [ ] The Director page shows a list of current top searches in Australia.
- [ ] The UI matches the dark/orange "feed the machine" aesthetic.
- [ ] Clicking a trend populates the input field.
