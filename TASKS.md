# Eclipse Combat Forecast II — Task List

Each task is a self-contained unit of work for `claude run`.
Mark completed tasks with ✅. Skip tasks already marked ✅.

Read the relevant spec file(s) in `specs/` before starting each task.
Run `npm run build` (once scaffolded) after your changes to verify no TypeScript errors.
Run `npx vitest run` after any task that includes tests.

---

## Tasks

- [x] **Task 1: Scaffold project**
  Specs: `specs/overview.md`
  Initialize a Vite + React 18 + TypeScript project. Install dependencies: react, react-dom, react-router-dom, d3. Install devDependencies: @types/react, @types/react-dom, @types/d3, typescript, vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer, vitest. Configure Tailwind CSS (tailwind.config.js, postcss.config.js, add Tailwind directives to index.css). Create the directory structure: `src/types/`, `src/data/`, `src/engine/`, `src/components/`, `src/pages/`, `src/hooks/`, `src/utils/`. Add a minimal `index.html`, `src/main.tsx`, and `src/App.tsx` placeholder. Verify `npm run dev` starts without errors.

- [x] **Task 2: Core types**
  Specs: `specs/types-and-data.md` (Types section)
  Create `src/types/game.ts` with all TypeScript types and interfaces: DieValue, DieFace, DieColor, DieDefinition, DieSymbol, ShipPart, ShipType, Blueprint, computeBlueprintStats function, Faction, NpcType, FactionDeployment, NpcDeployment, SectorSetup, SimulationConfig, ShipSurvival, FactionResult, SimulationRunResult, SimulationResults, BattleShip. Export everything. The computeBlueprintStats function should be a pure function that aggregates part stats.

- [x] **Task 3: Dice data**
  Specs: `specs/types-and-data.md` (dice.ts section)
  Create `src/data/dice.ts`. Define and export the `DICE` constant: a Record<DieColor, DieDefinition> with all 5 die colors (yellow, orange, blue, red, pink). Each die has exactly 6 faces. Pink die has ignoresShields and ignoresComputers set to true, and uses star/blank values with selfDamage. Import types from `src/types/game.ts`.

- [x] **Task 4: Ship parts data**
  Specs: `specs/types-and-data.md` (shipParts.ts section)
  Create `src/data/shipParts.ts`. Define and export `SHIP_PARTS: ShipPart[]` with all ship parts: Ion Cannon, Plasma Cannon, Soliton Cannon, Antimatter Cannon, Rift Cannon, Ion Missile, Plasma Missile, Antimatter Missile, Hull, Improved Hull, Electron Computer, Positron Computer, Gluon Computer, Gauss Shield, Phase Shield, Nuclear Drive, Fusion Drive, Tachyon Drive, Nuclear Source, Fusion Source, Tachyon Source, Antimatter Splitter, Rift Conductor. Each part has a unique id, name, and appropriate stats per the spec. Import types from `src/types/game.ts`.

- [x] **Task 5: Species presets data**
  Specs: `specs/types-and-data.md` (species.ts section)
  Create `src/data/species.ts`. Define and export `SPECIES_PRESETS: SpeciesPreset[]` for all 7 species: Terran, Eridani Empire, Hydran Progress, Planta, Descendants of Draco, Mechanema, Orion Hegemony. Each species defines default blueprints for all 4 ship types with initiativeBonus, slots, and defaultParts (referencing ShipPart IDs from shipParts.ts). Use reasonable defaults based on the Eclipse board game. Define the SpeciesPreset interface in this file.

- [x] **Task 6: NPC blueprints data**
  Specs: `specs/types-and-data.md` (npcBlueprints.ts section)
  Create `src/data/npcBlueprints.ts`. Define and export `NPC_BLUEPRINTS: Record<NpcType, { normal: Blueprint; advanced?: Blueprint }>` for Ancient, Guardian, and GCDS. Use the stats from the spec: Ancient (hull 1/2), Guardian (hull 2/3), GCDS (hull 7). Import types from `src/types/game.ts` and ship parts from `src/data/shipParts.ts`.

- [x] **Task 7: Dice engine + tests**
  Specs: `specs/dice-engine.md`
  Create `src/engine/diceEngine.ts` with: Fisher-Yates shuffle, generatePool, createDicePool, createDiceEngine, createDeterministicPool. The DiceEngine creates one pool per die color using DICE definitions. Pool draws sequentially and reshuffles on exhaustion. Create `src/engine/__tests__/diceEngine.test.ts` with tests: uniform distribution (600 rolls, each face exactly 100 times), independence between color pools, pool exhaustion and reshuffle, edge cases (pool size not divisible by 6 throws error, pool size 0 throws error), deterministic pool returns faces in exact order.

- [x] **Task 8: Initiative resolver + tests**
  Specs: `specs/combat-engine.md` (initiativeResolver section)
  Create `src/engine/initiativeResolver.ts` with the resolveInitiativeOrder function. Initiative = blueprint.initiativeBonus + sum of part initiatives. Sort descending. Ties: Defender fires first. Create `src/engine/__tests__/initiativeResolver.test.ts` with tests: known initiative ordering, tie-breaking favors Defender, only present ship types included.

- [x] **Task 9: Hit assignment + tests**
  Specs: `specs/combat-engine.md` (hitAssignment section)
  Create `src/engine/hitAssignment.ts` with: hit determination logic (star/blank/numeric threshold), assignHitsOptimally (player: smallest first, NPC: largest first), assignBackfireDamage (largest Rift-armed first), resolveHits (combines all logic including per-target shield checks and Rift bypass). Create `src/engine/__tests__/hitAssignment.test.ts` with tests: 2 interceptors destroyed by 2 hits, dreadnought hull thresholds, optimal kill maximization, NPC largest-first assignment, Rift ignores shields/computers, backfire assignment to Rift-armed ships, mixed Rift + standard dice.

- [x] **Task 10: Combat engine + tests**
  Specs: `specs/combat-engine.md` (combatEngine section)
  Create `src/engine/combatEngine.ts` with: resolveBattlePair (missile phase then engagement rounds), simulateSectorBattle (multi-faction pairing logic), runSimulations (Monte Carlo runner with aggregation). Create `src/engine/__tests__/combatEngine.test.ts` with tests: simple 1v1 with deterministic dice, missiles fire before engagement, stalemate detection (attacker loses), multi-faction pairing order.

- [x] **Task 11: Hooks and utilities**
  Specs: `specs/overview.md`, `specs/results-ui.md`
  Create `src/hooks/useLocalStorage.ts` — a React hook that syncs state with localStorage (generic, typed, handles serialization/deserialization, returns [value, setValue]). Create `src/utils/stats.ts` — aggregation utilities for simulation results: count wins per faction, compute average survivors per ship type, compute average damage dealt, handle draws (winnerId = null).

- [x] **Task 12: Blueprint editor + ship part selector components**
  Specs: `specs/blueprint-ui.md` (BlueprintEditor and ShipPartSelector sections)
  Create `src/components/BlueprintEditor.tsx` — displays ship part slots as a grid of cards, [Add]/[Remove] buttons, computes and shows stats summary (cannons, missiles, computer, shield, hull, initiative, energy balance). Energy balance: green if >= 0, red if negative. Create `src/components/ShipPartSelector.tsx` — modal/dropdown listing all ship parts from SHIP_PARTS, grouped by category, with filter/search, shows part stats inline, excludeDrives prop for Starbases. Use Tailwind CSS.

- [x] **Task 13: Blueprint page**
  Specs: `specs/blueprint-ui.md` (BlueprintPage and page layout sections)
  Create `src/pages/BlueprintPage.tsx` — manages list of factions in state, renders faction tabs, active faction's blueprint editor with ship type tabs (Interceptor/Cruiser/Dreadnought/Starbase). Faction CRUD: create, rename, delete. "Load Preset" dropdown loads species presets. "Save to Browser" persists to localStorage via useLocalStorage hook. Default ship type properties: Interceptor 4 slots, Cruiser 6, Dreadnought 8, Starbase 5 (initiative bonus 4). Use Tailwind CSS. Navigation links to Battle and Results pages.

- [x] **Task 14: Battle setup + faction panel components**
  Specs: `specs/battle-setup-ui.md` (FactionPanel and BattleSetup sections)
  Create `src/components/FactionPanel.tsx` — faction selector dropdown, ship count inputs (0-max per type), turn of entry input, "Controls Sector" checkbox, remove button. Create `src/components/BattleSetup.tsx` — wraps list of FactionPanels and NPC panels, manages add/remove logic for both factions and NPCs. NPC panel: type selector (Ancient/Guardian/GCDS), variant (Normal/Advanced), count input. Use Tailwind CSS.

- [x] **Task 15: Battle page**
  Specs: `specs/battle-setup-ui.md` (BattlePage and validation sections)
  Create `src/pages/BattlePage.tsx` — loads factions from localStorage, manages FactionDeployment[] and NpcDeployment[] state, simulation config (runs, dicePool). Validation: at least 2 combatants, each faction has ships, ship counts within max, at most 1 sector controller, pool size divisible by 6, runs >= 1. Inline validation errors. "Run Simulation" button disabled until valid. On click: collect data, navigate to Results page passing setup data via React context or state. Use Tailwind CSS.

- [x] **Task 16: Results chart + simulation log components**
  Specs: `specs/results-ui.md` (ResultsChart and SimulationLog sections)
  Create `src/components/ResultsChart.tsx` — D3.js horizontal bar chart showing win probability per faction + Draw. Use useRef for SVG container, useEffect for D3 bindings. Color-coded bars, percentage labels, tooltips on hover. Responsive. Create `src/components/SimulationLog.tsx` — shows first 20 runs with [Show More], each run is collapsible (collapsed: winner + survivors summary, expanded: battle details). [Expand All]/[Collapse All] toggle. Use Tailwind CSS.

- [x] **Task 17: Results page**
  Specs: `specs/results-ui.md` (ResultsPage and data flow sections)
  Create `src/pages/ResultsPage.tsx` — receives battle setup from BattlePage via React context/state, runs runSimulations() on mount, shows loading/progress indicator, displays ResultsChart + statistics table + SimulationLog. Stats table: faction name, wins, win %, avg survivors per ship type, avg damage dealt. "Re-run Simulation" button. "Modify Setup" navigates back to BattlePage. Handle edge cases: mutual destruction as Draw, 0 simulations shows empty state. Use Tailwind CSS.

- [x] **Task 18: App router + navigation**
  Specs: `specs/overview.md` (Architecture section)
  Update `src/App.tsx` with React Router: 3 routes for BlueprintPage (/), BattlePage (/battle), ResultsPage (/results). Add a shared navigation header with links to all 3 pages. Set up React context or state management for passing battle setup data from BattlePage to ResultsPage. Update `src/main.tsx` to wrap App in BrowserRouter. Verify all pages are accessible and navigation works. Run `npm run build` to confirm no errors.

- [x] **Task 19: Integration test**
  Specs: `specs/combat-engine.md` (Testing Requirements section), `specs/overview.md` (Verification Plan)
  Create `src/engine/__tests__/integration.test.ts`. Set up a test that replicates a plausible Eclipse battle: create two factions with configured blueprints (e.g., Terran-style interceptors vs cruisers), run 1000 simulations via runSimulations(), verify results are plausible (win rates sum to ~100%, no crashes, survivors make sense). Also test: NPC battle (player vs Ancient), multi-faction 3-way battle resolves without errors, GCDS battle. All tests should pass with `npx vitest run`.
