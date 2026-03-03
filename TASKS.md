# Eclipse Combat Forecast II — Cleanup & Mobile UI Tasks

Each task is a self-contained unit of work for `claude run`.
Mark completed tasks with ✅. Skip tasks already marked ✅.

Read `specs/cleanup.md` and `specs/ui-mobile.md` for full context.
Run `npm run build` after your changes to verify no TypeScript errors.
Run `npx vitest run` after any task that touches engine code or tests.

---

## Phase 1: Cleanup — High Priority

- [x] **Task 1: Extract shared constants module** ✅
  Specs: `specs/cleanup.md` §1.1–1.4, §7.1
  Create `src/data/constants.ts`. Move into it: `SHIP_TYPES` array (dedupe from `BlueprintPage.tsx:8`, `FactionPanel.tsx:17`, inline in `ResultsPage.tsx:240`), `SHIP_TYPE_MAX` map (dedupe from `BattlePage.tsx:10-15`, `FactionPanel.tsx:10-15`), `SHIP_TYPE_LABELS` with singular/plural/abbreviated forms (dedupe from `BlueprintPage.tsx:53-58`, `FactionPanel.tsx:19-24`, `ResultsPage.tsx:20-25`), `DIE_COLOR_CLASSES` Tailwind map (dedupe from `BlueprintEditor.tsx:11-17`, `ShipPartSelector.tsx:29-35`, `SimulationLog.tsx:31-37`), and `PART_BY_ID` lookup map (dedupe from `BlueprintPage.tsx:10`, `npcBlueprints.ts:4-8`). Update all import sites. Delete the local copies.

- [x] **Task 2: Pre-compute blueprint stats on BattleShip** ✅
  Specs: `specs/cleanup.md` §3.1, §4.2, §7.2
  Add a `stats` field to the `BattleShip` type containing pre-computed `cannons`, `missiles`, `computers`, `shields`, `hull`, and `initiative`. Compute it once at battle creation time. Update all call sites that currently call `computeBlueprintStats()` in hot loops: `hasCannonDice()` (`combatEngine.ts:104`), `buildDieResults()` (`combatEngine.ts:58`), `resolveHits()` shields (`hitAssignment.ts:203`), `resolveInitiativeOrder()` (`initiativeResolver.ts:10`). Remove the redundant `computeInitiative()` function from `initiativeResolver.ts`. Run `npx vitest run`.

- [x] **Task 3: Deduplicate simulation aggregation** ✅
  Specs: `specs/cleanup.md` §1.6, §4.5, §7.3
  Extract the win-count + survivor-sum + summary-building logic into a shared function in a new file `src/engine/simulationAggregator.ts`. Both `runSimulations()` in `combatEngine.ts:358-419` and the worker `onmessage` handler in `simulationWorker.ts:21-86` should call this shared function instead of duplicating the aggregation. Run `npx vitest run`.

- [x] **Task 4: Remove or implement avgDamageDealt** ✅
  Specs: `specs/cleanup.md` §2.3
  The `FactionResult.avgDamageDealt` field is always 0. Remove it from the type in `types/game.ts:139`, remove the `avgDamageDealt: 0` assignments in `combatEngine.ts:415` and `simulationWorker.ts:79`, remove the column from the results table in `ResultsPage.tsx:129,143,259`, and remove sorting by it. Run `npx vitest run`.

- [x] **Task 5: Consolidate assignHitsOptimally into resolveHits** ✅
  Specs: `specs/cleanup.md` §1.7, §2.2
  `resolveHits()` in `hitAssignment.ts:182-345` duplicates the greedy hit assignment logic from `assignHitsOptimally()` (lines 51-132). Refactor `assignHitsOptimally` to accept pre-filtered eligible dice per target (with shield eligibility), then have `resolveHits` call it instead of reimplementing inline. Ensure existing tests still pass. Run `npx vitest run`.

- [x] **Task 6: Delete or integrate stats.ts** ✅
  Specs: `specs/cleanup.md` §2.1
  `src/utils/stats.ts` exports `countWins`, `countDraws`, `avgSurvivors`, `aggregateStats`, and `winRate` but none are imported anywhere. If the simulation aggregator from Task 3 can use these, integrate them. Otherwise delete the file entirely.

## Phase 2: Cleanup — Medium Priority

- [x] **Task 7: Cache initiative order** ✅
  Specs: `specs/cleanup.md` §3.2
  In `combatEngine.ts:146-156`, `getOrder()` rebuilds initiative order every round (new Sets, new Maps, new sorted arrays). Initiative values don't change during combat. Compute the full order once before combat and filter per round to only include surviving ship types.

- [x] **Task 8: Ship part factory function** ✅
  Specs: `specs/cleanup.md` §4.1
  Create a `defineShipPart(id, name, overrides)` factory in `src/data/shipParts.ts` that merges overrides with sensible defaults (`cannons: [], missiles: [], computers: 0, shields: 0, hull: 0, initiative: 0, energyProduction: 0, energyConsumption: 0`). Rewrite all part definitions to use the factory. Target ~60% reduction in file size.

- [x] **Task 9: Memoize chartData in ResultsChart** ✅
  Specs: `specs/cleanup.md` §3.5
  In `ResultsChart.tsx:121`, `chartData` is a new array reference on every render, causing the `useEffect` at line 134 to re-run `drawPieChart` unnecessarily. Wrap `chartData` with `useMemo` keyed on the actual results data.

- [x] **Task 10: Fix bg-gray-750 and other UI bugs** ✅
  Specs: `specs/cleanup.md` §5.1, §3.6, §3.7, §3.8
  Fix `bg-gray-750` in `ResultsPage.tsx:248` (not a valid Tailwind class — use `bg-gray-800/50` or similar). Fix the `setup` object reference issue in `ResultsPage.tsx:95-98` (use a run counter or ref). Replace `alert()` in `BlueprintPage.tsx:323` with inline feedback. Fix the falsy-value bug in `buildBlueprintFromPreset` (`BlueprintPage.tsx:19-23`) — use `!= null` instead of `&&`.

## Phase 3: Cleanup — Low Priority

- [x] **Task 11: Remove redundant save button** ✅
  Specs: `specs/cleanup.md` §2.4
  The "Save to Browser" button in `BlueprintPage.tsx:319-328` duplicates `useLocalStorage` auto-persistence in `App.tsx`. Remove the button and its `window.localStorage.setItem()` call.

- [x] **Task 12: Shared ConfirmDialog component** ✅
  Specs: `specs/cleanup.md` §4.3
  Extract the two nearly identical confirmation modal patterns in `BlueprintPage.tsx` (lines 333-356 and 359-387) into a shared `ConfirmDialog` component accepting `title`, `message`, `confirmLabel`, `confirmClass`, `onConfirm`, and `onCancel` props.

- [x] **Task 13: Misc type safety and consistency fixes** ✅
  Specs: `specs/cleanup.md` §4.4, §4.7, §4.8, §5.2, §5.3, §5.4
  Make `NpcDeployment.turnOfEntry` required (not optional). Narrow `DieValue` to `2 | 3 | 4 | 5 | 'star' | 'blank'`. Use stable IDs for combatant list keys in `BattleSetup.tsx` instead of array indices. Standardize dropdown close pattern (use ref-based click-outside from `BattleSetup.tsx`). Fix the `as unknown as` double-cast in `BlueprintPage.tsx:49`. Fix the dropdown z-index in `BlueprintPage.tsx:391`.

- [x] **Task 14: Fix test quality issues** ✅
  Specs: `specs/cleanup.md` §6.1, §6.2
  Rename the "mutual destruction" test in `combatEngine.test.ts:122-155` to match what it actually verifies. Update test files (`combatEngine.test.ts:23-47`, `hitAssignment.test.ts:14-60`) to import ship parts from `src/data/shipParts.ts` instead of defining inline duplicates. Run `npx vitest run`.

- [x] **Task 15: Move computeBlueprintStats out of types** ✅
  Specs: `specs/cleanup.md` §7.4
  Move `computeBlueprintStats` and `aggregateDieSymbols` from `types/game.ts` to `src/engine/blueprintStats.ts`. Update all imports. Keep `types/game.ts` as pure type definitions.

## Phase 4: Mobile UI — High Priority

- [x] **Task 16: Ship count stepper buttons** ✅
  Specs: `specs/ui-mobile.md` §1, §2, §3
  In `FactionPanel.tsx`, replace `<input type="number">` for ship counts with `−`/`+` stepper buttons and a plain text count. Minimum 44x44px tap targets (WCAG 2.5.8). Stack all four ship types vertically (single column) instead of the 2x2 grid. Disable `−` at 0, `+` at ship type max. Apply the same stepper pattern to NPC count and turn of entry inputs in `NpcPanel.tsx`, and turn of entry in `FactionPanel.tsx`.

- [x] **Task 17: Tabbed section layout on mobile** ✅
  Specs: `specs/ui-mobile.md` §8
  In `App.tsx`, switch to a tabbed layout on mobile where only one section (Blueprints, Battle, Results) is visible at a time. Use state to control which section renders. Style the header nav as a segmented control with a visible active indicator. On `sm:` and above, preserve the current scroll layout.

- [x] **Task 18: Sticky header** ✅
  Specs: `specs/ui-mobile.md` §15
  Make the header `sticky top-0 z-30` in `App.tsx:35-44`. Ensure it's compact (single row, no wasted vertical space). If tabbed layout (Task 17) is adopted, integrate the segmented control into the sticky header.

- [x] **Task 19: Horizontally scrollable faction tabs** ✅
  Specs: `specs/ui-mobile.md` §4
  In `BlueprintPage.tsx:153-168`, replace the wrapping `flex` layout for faction tabs with a horizontally scrollable row: `overflow-x-auto`, `flex-nowrap`, hide scrollbar. Add scroll snap (`snap-x snap-mandatory` on container, `snap-start` on items). Add edge fade/shadow to hint at scrollability.

## Phase 5: Mobile UI — Medium Priority

- [x] **Task 20: Full-screen part selector on mobile** ✅
  Specs: `specs/ui-mobile.md` §7
  In `ShipPartSelector.tsx:86-131`, on mobile (`max-sm:`) make the modal full-screen (`inset-0`, no max-width/height). Add `py-3` padding to each part button. Make close button 44x44px or add a visible "Cancel" button at bottom. Add a sticky header so the search box stays visible while scrolling.

- [x] **Task 21: Pie chart touch support** ✅
  Specs: `specs/ui-mobile.md` §9
  In `ResultsChart.tsx:98-114`, add `touchstart`/`touchend` handlers to toggle tooltips on tap. Or render percentage labels directly on pie segments when large enough. Ensure the chart is usable without hover.

- [x] **Task 22: Results table card layout on mobile** ✅
  Specs: `specs/ui-mobile.md` §10
  In `ResultsPage.tsx:218-268`, on mobile render each faction as a card instead of a table row (faction name, wins, win%, avg survivors). Keep the table layout for `sm:` and above. Remove the Avg Dmg column (should be gone after Task 4).

- [x] **Task 23: Controls Sector row stacking** ✅
  Specs: `specs/ui-mobile.md` §14
  In `FactionPanel.tsx:81-101`, stack Turn of Entry and "Controls Sector (Defender)" checkbox vertically on mobile (`flex-col`) and horizontally on `sm:` (`sm:flex-row`). Shorten checkbox label to "Defender" on mobile.

- [x] **Task 24: Full-width action buttons on mobile** ✅
  Specs: `specs/ui-mobile.md` §16
  Make "Run Simulation" (`BattlePage.tsx:178-184`) and "Re-run" (`ResultsPage.tsx:280-287`) buttons `w-full sm:w-auto`. Make "Re-run" more prominent since it's a frequent action.

- [x] **Task 25: Ship type tab abbreviations** ✅
  Specs: `specs/ui-mobile.md` §5
  In `BlueprintPage.tsx:285-299`, abbreviate ship type labels on mobile ("Int", "Cru", "Drd", "SB") below `sm:`, full labels at `sm:` and above. Ensure each tab is at least 44px tall.

- [x] **Task 26: Larger slot tap targets in BlueprintEditor** ✅
  Specs: `specs/ui-mobile.md` §6
  In `BlueprintEditor.tsx:70-103`, make `[Add]` a full-width button with `py-2` padding. Make `[Remove]` a 44x44px icon button in the top-right corner. Consider making empty slots themselves tappable to open the selector.

## Phase 6: Mobile UI — Low Priority

- [x] **Task 27: Simulation settings presets** ✅
  Specs: `specs/ui-mobile.md` §12
  In `BattlePage.tsx:127-162`, add preset buttons below each input: `[100] [500] [1000]` for runs, `[600] [1200]` for dice pool. For dice pool, use a stepper that increments by 6.

- [x] **Task 28: Add combatant dropdown sizing** ✅
  Specs: `specs/ui-mobile.md` §13
  In `BattleSetup.tsx:116-158`, increase dropdown item padding to `py-3` for 48px+ tap height. Use `min-w-[16rem]` or `w-full`. Consider replacing the ⊕ circle with a full-width "Add Combatant" button on mobile.

- [x] **Task 29: Compact simulation log on mobile** ✅
  Specs: `specs/ui-mobile.md` §11
  In `SimulationLog.tsx:48-77`, compress each event to two lines max. Consider hiding dice details behind a "show dice" toggle. Make the "Show More" button full-width and taller.

- [x] **Task 30: Blueprint stats summary readability** ✅
  Specs: `specs/ui-mobile.md` §17
  In `BlueprintEditor.tsx:118-150`, use a compact single-column list on mobile instead of the 2-col grid. Abbreviate initiative breakdown. Consider compact stat chips.
