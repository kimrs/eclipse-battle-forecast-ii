# Eclipse Combat Forecast II — Mobile-First Redesign Tasks

Each task is a self-contained unit of work for `claude run`.
Mark completed tasks with ✅. Skip tasks already marked ✅.

Read `specs/mobile-first-redesign.md` before starting each task.
Run `npm run build` after your changes to verify no TypeScript errors.
Run `npx vitest run` after any task that touches engine code or tests.

---

## Tasks

- [x] **Task 1: Blank die face for misses**
  Specs: `specs/mobile-first-redesign.md` §4
  In `src/components/SimulationLog.tsx`, update the `DieChip` component. Change the blank die label from `'\u00D8'` (ø) to an empty string `''`. Add a `min-w-[1.2em]` Tailwind class to the chip's `<span>` so blank chips maintain the same dimensions as chips with characters. The chip should still render with its die color background — just no text inside. Verify the change visually: `[★] [5] [ ] [3] [ ]` instead of `[★] [5] [ø] [3] [ø]`.

- [x] **Task 2: Remove draw from results chart data**
  Specs: `specs/mobile-first-redesign.md` §3 (No Draw Concept)
  In `src/components/ResultsChart.tsx`, update the `buildChartData` function (or equivalent) to stop appending a "Draw" entry. Win percentages should be computed as `faction.wins / totalWins` where `totalWins = sum of all faction wins`, not `totalRuns`. Remove the `DRAW_COLOR` constant if it becomes unused. In `src/pages/ResultsPage.tsx`, remove the "Draw" row from the Per-Faction Statistics table. The total run count in the header should still reflect all runs.

- [x] **Task 3: Replace bar chart with pie chart**
  Specs: `specs/mobile-first-redesign.md` §3 (Pie Chart)
  Rewrite `src/components/ResultsChart.tsx` to render a D3 pie chart instead of horizontal bars. Use `d3.pie()` and `d3.arc()`. One segment per faction, sized by win percentage (draws excluded per Task 2). Keep the existing `PALETTE` for colors. Add a legend below the chart: colored circle + faction name + win percentage. The SVG should be responsive — pie diameter ~200–250px on phone (~375px width), capped at ~350px on wider screens. Add hover/tap interaction that highlights a segment and shows a tooltip with exact win count and percentage. Animate segments growing from 0 on load using D3 transitions.

- [x] **Task 4: Convert three pages into sections**
  Specs: `specs/mobile-first-redesign.md` §1
  Convert `src/pages/BlueprintPage.tsx`, `src/pages/BattlePage.tsx`, and `src/pages/ResultsPage.tsx` from standalone routed pages into section components. Each should accept props for its state instead of managing its own top-level state or reading from storage/URL. Remove internal navigation logic (e.g., `useNavigate` calls). Add an `id` attribute to each section's root element (`blueprints`, `battle`, `results`) for anchor linking. Each section should be wrapped in a container with clear visual separation (e.g., border-top or spacing).

- [x] **Task 5: Single-page layout and state lift**
  Specs: `specs/mobile-first-redesign.md` §1
  Rewrite `src/App.tsx` to render all three sections vertically on one page instead of using React Router. Remove `react-router-dom` from imports and from `package.json` dependencies. Lift all shared state into `App.tsx` (or a new top-level hook): factions (from `useLocalStorage`), faction deployments, NPC deployments, simulation config, and simulation results. Remove `sessionStorage` usage for cross-page data transfer — the Results section reads directly from shared state. The Results section renders only after the user triggers a simulation, showing a placeholder until then. Update `src/main.tsx` to remove `BrowserRouter` wrapper. Add optional smooth-scroll anchor links in the header for `#blueprints`, `#battle`, `#results`. Run `npm run build` to confirm the app compiles with no router references remaining.

- [x] **Task 6: Unified combatant list with ⊕ button**
  Specs: `specs/mobile-first-redesign.md` §2
  Rewrite `src/components/BattleSetup.tsx` to render factions and NPCs in a single interleaved list instead of two separate sections. Remove the separate "Add Faction" and "Add NPC" buttons. Add a single `⊕` button centered below the last combatant card. The button should be circular or rounded, minimum 44×44px tap target, subtle outline style. When tapped, show a selection (dropdown or bottom sheet) listing: (a) all user-created factions from localStorage, and (b) NPC options: Ancient (Normal), Ancient (Advanced), Guardian (Normal), Guardian (Advanced), GCDS. Selecting an option appends a new combatant card to the list.

- [x] **Task 7: NPC combatant cards**
  Specs: `specs/mobile-first-redesign.md` §2 (NPC Cards)
  Update `src/components/FactionPanel.tsx` (or create a sibling `NpcPanel.tsx` component) to handle NPC combatant cards in the unified list. NPC cards show: name as "Type (Variant)" (not editable), a single "Count" number input (not per-ship-type), a "Turn of Entry" input, and a remove button. No "Controls Sector" checkbox for NPCs. NPC blueprints come from `src/data/npcBlueprints.ts` and are not editable. The card styling should match faction cards but be visually distinguishable (e.g., a subtle accent border or icon).

- [x] **Task 8: Cleanup and build verification**
  Remove any dead code from the migration: unused router imports, orphaned `useSessionStorage` hook if no longer used, unused navigation components or helper functions. Run `npm run build` and fix any TypeScript errors. Run `npx vitest run` and fix any test failures. Verify the full scroll flow works: Blueprints section → Battle section with unified combatant list and ⊕ button → Results section with pie chart. Confirm localStorage persistence still works for factions across page reloads.
