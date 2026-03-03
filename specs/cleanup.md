# Codebase Cleanup Spec

Comprehensive analysis of antipatterns, redundancies, and simplification opportunities
across the Eclipse Combat Forecast II codebase.

---

## 1. Duplicated Code

### 1.1 `SHIP_TYPE_MAX` defined twice (identical)

- `src/pages/BattlePage.tsx:10-15`
- `src/components/FactionPanel.tsx:10-15`

Both define the exact same `Record<ShipType, number>` mapping. Should be extracted to a
shared constants file (e.g. `src/data/constants.ts`).

### 1.2 `SHIP_TYPES` array defined in multiple places

- `src/pages/BlueprintPage.tsx:8` — `const SHIP_TYPES: ShipType[] = [...]`
- `src/components/FactionPanel.tsx:17` — `const SHIP_TYPES: ShipType[] = [...]`
- Hardcoded inline in `ResultsPage.tsx:240` — `(['interceptor', 'cruiser', ...] as ShipType[])`

Should be a single shared constant.

### 1.3 `SHIP_TYPE_LABELS` defined twice with inconsistent casing

- `src/pages/BlueprintPage.tsx:53-58` — singular: `'Interceptor'`, `'Cruiser'`, etc.
- `src/components/FactionPanel.tsx:19-24` — plural: `'Interceptors'`, `'Cruisers'`, etc.
- `src/pages/ResultsPage.tsx:20-25` — abbreviated: `'Int'`, `'Cru'`, etc.

Three separate label maps for the same data. Extract to shared constants with singular
and plural forms, or a single labels object with both.

### 1.4 `DIE_COLOR_CLASSES` defined three times (identical)

- `src/components/BlueprintEditor.tsx:11-17` — `DIE_COLOR_CLASSES`
- `src/components/ShipPartSelector.tsx:29-35` — `DIE_COLOR_CLASSES`
- `src/components/SimulationLog.tsx:31-37` — `DIE_BG` (same values, different name)

Identical `Record<DieColor, string>` mapping for Tailwind die-color badges. Extract to
a shared UI constants file.

### 1.5 `getFactionName` / `getFactionDisplayName` — near-identical functions

- `src/pages/ResultsPage.tsx:27-34` — `getFactionDisplayName(id, factions)`
- `src/components/SimulationLog.tsx:11-17` — `getFactionName(factions, id)`

Both look up a faction by ID, fall back to parsing NPC IDs. Different argument order and
slightly different NPC ID formatting, but same intent. Consolidate into one shared utility.

### 1.6 Simulation aggregation logic duplicated entirely

- `src/engine/combatEngine.ts:358-419` — `runSimulations()` function
- `src/engine/simulationWorker.ts:21-86` — worker `onmessage` handler

These two blocks are near-identical: same `allFactionIds` construction, same `winCounts`
Map, same `survivorSums` Map, same aggregation loop, same `summary` builder, same
hardcoded `avgDamageDealt: 0`. The worker should call `runSimulations()` directly or they
should share extraction logic.

### 1.7 `resolveHits` duplicates `assignHitsOptimally` logic inline

`resolveHits()` in `hitAssignment.ts:182-345` contains a full inline reimplementation of
the greedy hit assignment algorithm that `assignHitsOptimally()` (lines 51-132) already
provides. The inline version adds per-target shield eligibility, but the core assignment
logic (antimatter pooling, sorted enemies, greedy kill, leftover dump) is copy-pasted.

**Fix:** Refactor `assignHitsOptimally` to accept pre-filtered eligible dice per target,
or have `resolveHits` call `assignHitsOptimally` after filtering.

---

## 2. Dead / Unused Code

### 2.1 `src/utils/stats.ts` is completely unused

The file exports `countWins`, `countDraws`, `avgSurvivors`, `aggregateStats`, and
`winRate`. **None of these are imported anywhere** in the codebase. Both
`combatEngine.ts` and `simulationWorker.ts` inline their own aggregation. Either:
- Delete the file entirely, or
- Refactor the engine/worker to use these utilities

### 2.2 `assignHitsOptimally` is exported but never called

The function in `hitAssignment.ts:51-132` is exported and has dedicated tests, but
`resolveHits()` never calls it — it duplicates the logic inline instead (see 1.7).
Either call it from `resolveHits` or delete it.

### 2.3 `FactionResult.avgDamageDealt` is always 0

- Declared in `types/game.ts:139`
- Set to `0` in `combatEngine.ts:415`
- Set to `0` in `simulationWorker.ts:79`
- Displayed in `ResultsPage.tsx:129,259` (always shows "0.0")
- Sortable by in `ResultsPage.tsx:143` (sorting by a constant is meaningless)

Either implement damage tracking or remove the field and its UI column entirely.

### 2.4 The "Save to Browser" button is redundant

`BlueprintPage.tsx:319-328` has a manual `window.localStorage.setItem()` call. But
`useLocalStorage` in `App.tsx:10` already persists `factions` to localStorage on every
state change. The button does nothing that isn't already happening automatically. Remove
it, or at minimum remove the duplicate localStorage write and repurpose the button as a
"saved" indicator.

---

## 3. Antipatterns

### 3.1 Expensive recomputation in hot simulation loops

**The single biggest performance problem.** `computeBlueprintStats()` is called repeatedly
for the same immutable blueprint during a single battle:

| Call site | Frequency |
|---|---|
| `hasCannonDice()` — `combatEngine.ts:104` | Every ship, every round check |
| `buildDieResults()` — `combatEngine.ts:58` | Every firing group, every round |
| `resolveHits()` shields — `hitAssignment.ts:203` | Every enemy ship, every volley |
| `resolveInitiativeOrder()` — `initiativeResolver.ts:10` | Every round |

For 1000 Monte Carlo runs with multi-round battles, this means tens of thousands of
redundant `reduce()` calls over the same part arrays.

**Fix:** Pre-compute stats once per blueprint and store on `BattleShip` (or a lookup Map)
at battle creation time. The `BattleShip` type could include a `stats` field.

### 3.2 `getOrder()` rebuilds everything every engagement round

In `combatEngine.ts:146-156`, `getOrder()` is called every round of every battle. Each
call:
1. Creates two new `Set`s of ship types
2. Calls `buildBlueprints()` which creates a new `Map` + `Object.fromEntries()`
3. Calls `resolveInitiativeOrder()` which creates + sorts a new array

Initiative values don't change during combat. Only the set of surviving ship types
changes. The full order could be computed once and filtered per round.

### 3.3 `removeDead` creates new arrays on every call

`combatEngine.ts:99-101` — called twice per ship-type firing (once for `my`, once for
`enemy`), creating garbage arrays every round. In-place mutation with a dead flag would
be more efficient for a Monte Carlo simulation.

### 3.4 `fireShipType` inner function shadows outer `trackEvents` parameter

In `combatEngine.ts:160-167`, the inner function `fireShipType` has its own `trackEvents`
parameter that shadows the identically-named outer `resolveBattlePair` parameter. This
works but is confusing — the inner parameter is always passed the outer value.

### 3.5 `useEffect` dependency on `chartData` causes unnecessary redraws

In `ResultsChart.tsx:134`, `chartData` is in the dependency array but is a new array
reference on every render (created at line 121). This means `drawPieChart` runs on every
render cycle, not just when results change. Fix: memoize `chartData` with `useMemo`.

### 3.6 Object reference equality issue with `setup` dependency

In `ResultsPage.tsx:95-98`, the `useEffect` depends on `setup` which is a new object
each time the user clicks "Run Simulation". The `eslint-disable-next-line` comment
suppresses the `runSim` dependency warning, indicating awareness that this is fragile.
Better to use a run counter or ref to trigger re-runs explicitly.

### 3.7 `alert()` for save confirmation

`BlueprintPage.tsx:323` uses `alert('Factions saved to browser!')` — a blocking,
non-styled browser dialog. Replace with a toast/notification or inline feedback.

### 3.8 `buildBlueprintFromPreset` silently drops `innateX: 0` values

`BlueprintPage.tsx:19-23` uses conditional spread:
```ts
...(cfg.innateComputers && { innateComputers: cfg.innateComputers })
```
The `&&` operator will drop falsy values including `0`. While `0` is semantically the
same as `undefined` for these optional fields, it's a subtle bug waiting to happen if
any innate value is legitimately negative. Use `!= null` check instead.

---

## 4. Simplification Opportunities

### 4.1 Ship part definitions are excessively verbose

`src/data/shipParts.ts` (285 lines) defines ~22 parts, each specifying all 10+ fields
even when most are `0` or `[]`. Example: every non-weapon part has
`cannons: [], missiles: []` and every non-defense part has `computers: 0, shields: 0,
hull: 0`.

**Fix:** Create a `defineShipPart(overrides)` factory that merges with defaults:
```ts
const DEFAULTS: ShipPart = {
  cannons: [], missiles: [], computers: 0, shields: 0,
  hull: 0, initiative: 0, energyProduction: 0, energyConsumption: 0,
};
function defineShipPart(id: string, name: string, overrides: Partial<ShipPart>): ShipPart {
  return { ...DEFAULTS, id, name, ...overrides };
}
```
This would reduce the file by ~60%.

### 4.2 `computeInitiative` in initiativeResolver.ts is redundant

`initiativeResolver.ts:10-12`:
```ts
function computeInitiative(blueprint: Blueprint): number {
  return blueprint.initiativeBonus + blueprint.parts.reduce((sum, p) => sum + p.initiative, 0);
}
```
This is exactly `computeBlueprintStats(blueprint).initiative`. Use the existing function
or (better) use pre-computed stats per 3.1.

### 4.3 Confirmation modals should be a shared component

`BlueprintPage.tsx` has two nearly identical modal patterns (lines 333-356 and 359-387):
- Same backdrop (`fixed inset-0 bg-black/60 ...`)
- Same card structure (`bg-white rounded-xl shadow-xl p-6 ...`)
- Same button layout (Cancel + Action)

Extract a `ConfirmDialog` component:
```tsx
<ConfirmDialog
  title="Reset to Defaults"
  message="This will replace all factions..."
  confirmLabel="Reset"
  confirmClass="bg-red-600"
  onConfirm={handleReset}
  onCancel={() => setShowResetConfirm(false)}
/>
```

### 4.4 `NpcDeployment.turnOfEntry` should not be optional

`types/game.ts:115` declares `turnOfEntry?: number` but it's always provided when
creating NPC deployments (`BattleSetup.tsx:89-90`). The optional marker forces
null-coalescing in `NpcPanel.tsx:47` (`npc.turnOfEntry ?? 1`). Make it required.

### 4.5 `runSimulations` in `combatEngine.ts` is redundant with the worker

`runSimulations()` (combatEngine.ts:358-419) is a synchronous main-thread version that
duplicates the worker's logic. It's only used by tests. Options:
- Keep it for tests but share the aggregation logic with the worker
- Or delete it and have tests use the worker directly (or extract shared aggregation)

### 4.6 `PART_BY_ID` lookup map should be shared

`BlueprintPage.tsx:10` creates `PART_BY_ID` for preset loading. `npcBlueprints.ts:4-8`
has its own `getPart(id)` doing `SHIP_PARTS.find()` (O(n) per call). Both are doing the
same ID-to-part resolution. Share a single lookup map.

### 4.7 `DieValue` type is overly broad

`types/game.ts:3`: `type DieValue = number | 'star' | 'blank'` allows any number. The
actual valid numeric values are only `2 | 3 | 4 | 5`. Narrow the type:
```ts
type DieValue = 2 | 3 | 4 | 5 | 'star' | 'blank';
```

### 4.8 Combatant list keys use array indices

`BattleSetup.tsx:98-99` uses `key={`faction-${i}`}` and `key={`npc-${i}`}`. When items
are reordered or removed, React may incorrectly reuse DOM. Use stable IDs instead
(factionId for factions, generate an ID for NPCs on creation).

---

## 5. UI / Styling Issues

### 5.1 `bg-gray-750` is not a valid Tailwind class

`ResultsPage.tsx:248` uses `bg-gray-750` in alternating row styling. Tailwind's default
gray scale goes 700, 800 — there is no 750. This class is silently ignored, making
even/odd rows visually identical. Use `bg-gray-800/50` or add a custom color.

### 5.2 Dropdown backdrop z-index conflict

`BlueprintPage.tsx:391` uses `z-0` on the backdrop overlay for the preset dropdown, while
the dropdown content inside has no explicit z-index. This creates potential stacking
issues. The backdrop should use a higher z-index or the dropdown should use a portal
pattern or `useRef`-based click-outside detection (like `BattleSetup.tsx` already does).

### 5.3 Two different click-outside patterns for dropdowns

- `BlueprintPage.tsx:390-392` uses a full-screen `div` overlay with `onClick`
- `BattleSetup.tsx:40-49` uses a `mousedown` event listener with `ref`-based detection

These solve the same problem differently. Standardize on one approach (the ref-based
pattern is more robust as it doesn't interfere with other click targets).

### 5.4 `makeEmptyFaction` uses unsafe double-cast

`BlueprintPage.tsx:49`:
```ts
) as unknown as Faction['blueprints'],
```
The `as unknown as` double-cast bypasses type safety entirely. The issue is that the
inline object literal doesn't include all optional Blueprint fields. Fix by constructing
proper `Blueprint` objects (reuse `DEFAULT_SHIP_PROPS` with explicit typing).

---

## 6. Test Quality Issues

### 6.1 Test for "mutual destruction" doesn't actually test mutual destruction

`combatEngine.test.ts:122-155`: The test is titled "mutual destruction returns winnerId
null" but the test body acknowledges it can't force mutual destruction with the current
engine, and instead verifies attacker wins. The comment block (lines 138-146) explains
this but the test name is misleading. Either:
- Rename the test to match what it actually verifies
- Find a way to test actual mutual destruction (e.g., Rift backfire scenario)

### 6.2 Tests duplicate ShipPart definitions instead of importing from data

Test files (`combatEngine.test.ts:23-47`, `hitAssignment.test.ts:14-60`) define their own
inline ship parts that mirror `SHIP_PARTS` entries. Import from `src/data/shipParts.ts`
instead to ensure tests reflect actual game data.

---

## 7. Architecture Improvements

### 7.1 Extract shared constants module

Create `src/data/constants.ts` containing:
- `SHIP_TYPES` array
- `SHIP_TYPE_MAX` map
- `SHIP_TYPE_LABELS` (singular, plural, abbreviated)
- `DIE_COLOR_CLASSES` Tailwind map
- `PART_BY_ID` lookup map

This eliminates duplications from sections 1.1-1.4 and 4.6.

### 7.2 Pre-compute battle stats on BattleShip creation

Extend `BattleShip` with a `stats` field computed once at creation:
```ts
interface BattleShip {
  // ...existing fields...
  stats: {
    cannons: DieSymbol[];
    missiles: DieSymbol[];
    computers: number;
    shields: number;
    hull: number;
    initiative: number;
  };
}
```
This eliminates the expensive repeated `computeBlueprintStats()` calls (section 3.1) and
the redundant `computeInitiative()` function (section 4.2).

### 7.3 Share simulation aggregation logic

Extract the win-count + survivor-sum + summary-building code into a shared function in
`src/engine/simulationAggregator.ts` (or similar), called by both `runSimulations()` and
the worker. This eliminates duplication from section 1.6 and makes `stats.ts` either
useful or deletable.

### 7.4 Consider moving `computeBlueprintStats` out of `types/game.ts`

`types/game.ts` is a type definitions file, but `computeBlueprintStats` and
`aggregateDieSymbols` are runtime functions. Move them to a utility module
(e.g., `src/engine/blueprintStats.ts`) to keep types pure.

---

## Summary — Priority Matrix

| Priority | Item | Impact | Effort |
|----------|------|--------|--------|
| **HIGH** | 3.1 Pre-compute blueprint stats | Perf: eliminates thousands of redundant computations per sim | Medium |
| **HIGH** | 1.6 Deduplicate simulation aggregation | Maintainability: two copies of core logic | Low |
| **HIGH** | 2.3 Remove or implement `avgDamageDealt` | UX: column always shows 0.0 | Low |
| **HIGH** | 1.7 / 2.2 Consolidate `assignHitsOptimally` | Maintainability: duplicated algorithm | Medium |
| **MEDIUM** | 2.1 Delete or use `stats.ts` | Dead code | Low |
| **MEDIUM** | 1.1-1.4 Extract shared constants | Maintainability: 5+ duplicated maps | Low |
| **MEDIUM** | 3.2 Cache initiative order | Perf: rebuilt every round | Low |
| **MEDIUM** | 4.1 Ship part factory function | Maintainability: 285 lines to ~120 | Low |
| **MEDIUM** | 3.5 Memoize `chartData` | Bug: unnecessary D3 redraws | Low |
| **MEDIUM** | 5.1 Fix `bg-gray-750` | Bug: alternating rows don't alternate | Low |
| **LOW** | 2.4 Remove redundant save button | UX cleanup | Low |
| **LOW** | 4.3 Shared ConfirmDialog component | DRY UI | Low |
| **LOW** | 3.7 Replace `alert()` with toast | UX polish | Low |
| **LOW** | 4.7 Narrow `DieValue` type | Type safety | Low |
| **LOW** | 5.3 Standardize dropdown close pattern | Consistency | Low |
| **LOW** | 5.4 Fix unsafe double-cast | Type safety | Low |
| **LOW** | 6.1 Fix misleading test name | Test clarity | Low |
