# Mobile-First Redesign — Eclipse Combat Forecast II

## Purpose

Redesign the application with a phone-first approach. The tool becomes a single scrolling experience instead of separate pages, the Battle Setup is simplified by unifying factions and NPCs, the Results view replaces bars with a pie chart and removes the draw concept, and the Simulation Log uses blank die faces instead of the ø symbol.

---

## 1. Phone-First Scrolling Layout

### Current State

Three separate pages navigated via header links:

```
[Blueprints] → [Battle] → [Results]
```

### New Layout

All three sections live on a single scrolling page, stacked vertically:

```
┌──────────────────────────┐
│  Eclipse Combat Forecast │
│  II                      │
├──────────────────────────┤
│                          │
│  ┌──────────────────┐    │
│  │   BLUEPRINTS     │    │
│  │   (faction tabs, │    │
│  │    ship editor)  │    │
│  └──────────────────┘    │
│                          │
│  ┌──────────────────┐    │
│  │   BATTLE SETUP   │    │
│  │   (combatant     │    │
│  │    cards + sim   │    │
│  │    settings)     │    │
│  └──────────────────┘    │
│                          │
│  ┌──────────────────┐    │
│  │   RESULTS        │    │
│  │   (pie chart,    │    │
│  │    stats table,  │    │
│  │    sim log)      │    │
│  └──────────────────┘    │
│                          │
└──────────────────────────┘
```

### Implementation Details

- **Remove React Router**: Replace the three-page SPA (`BlueprintPage`, `BattlePage`, `ResultsPage`) with a single-page layout that renders all three sections sequentially.
- **Section anchors**: Each section (`#blueprints`, `#battle`, `#results`) gets an `id` so users can jump between them, but the primary interaction is vertical scrolling.
- **Header simplification**: The header no longer needs navigation links to separate pages. It can optionally include anchor links that smooth-scroll to each section, or be removed entirely in favor of the content speaking for itself.
- **Data flow simplification**: Since all sections are on one page, state can be lifted to a single parent component (or kept in hooks). No need to serialize data to `sessionStorage` for cross-page communication. The Results section reads directly from shared state.
- **Load priority**: The Blueprints and Battle sections render immediately. The Results section renders only after the user triggers a simulation run, showing a placeholder or empty state until then.
- **Sticky "Run Simulation" button**: Consider making the "Run Simulation" button sticky at the bottom of the viewport so users can trigger it without scrolling back to the Battle section. After running, auto-scroll to the Results section.

### Files Affected

- `src/App.tsx` — Remove router, render single-page layout
- `src/pages/BlueprintPage.tsx` — Convert to a section component
- `src/pages/BattlePage.tsx` — Convert to a section component
- `src/pages/ResultsPage.tsx` — Convert to a section component
- Remove `react-router-dom` dependency

---

## 2. Unified Combatant Cards (No Faction/NPC Separation)

### Current State

Battle Setup has two distinct sections:
- "Factions in Battle" with `[+ Add Faction]` button — renders `FactionPanel` cards
- "NPC Opponents" with `[+ Add NPC]` button — renders NPC panels with type/variant selectors

Factions and NPCs use different data structures (`FactionDeployment` vs `NpcDeployment`) and different UI components.

### New Design

NPCs are treated identically to factions. They are pre-configured factions with their own blueprints. There is a single list of combatant cards with a single `⊕` (plus) icon below them to add another combatant.

```
┌──────────────────────────┐
│  Battle Setup            │
│                          │
│  ┌──────────────────┐    │
│  │ My Fleet         │    │
│  │ Int: [2] Cru: [1]│    │
│  │ Drd: [0] SB:  [0]│    │
│  │ Turn: [1]         │    │
│  │ ☑ Controls Sector │    │
│  │            [✕]    │    │
│  └──────────────────┘    │
│                          │
│  ┌──────────────────┐    │
│  │ Enemy Fleet      │    │
│  │ Int: [3] Cru: [0]│    │
│  │ Drd: [1] SB:  [0]│    │
│  │ Turn: [3]         │    │
│  │ ☐ Controls Sector │    │
│  │            [✕]    │    │
│  └──────────────────┘    │
│                          │
│  ┌──────────────────┐    │
│  │ Ancient (Normal)  │    │
│  │ Count: [2]        │    │
│  │ Turn: [1]         │    │
│  │            [✕]    │    │
│  └──────────────────┘    │
│                          │
│         [ ⊕ ]            │
│                          │
│  Simulations: [1000]     │
│  Dice Pool:   [600]      │
│                          │
│  [▶ Run Simulation]      │
└──────────────────────────┘
```

### Adding a Combatant

When the user taps the `⊕` button, a selection appears (inline dropdown, bottom sheet, or modal) listing:

1. **User-created factions** — loaded from localStorage (e.g., "My Fleet", "Enemy Fleet", "Pirates")
2. **NPCs** — listed by name with variant:
   - Ancient (Normal)
   - Ancient (Advanced)
   - Guardian (Normal)
   - Guardian (Advanced)
   - GCDS

Selecting any option adds a new combatant card to the list.

### NPC Cards

NPC combatant cards look and behave like faction cards but with some differences:

- **Name**: Displayed as the NPC type and variant (e.g., "Ancient (Normal)"), not editable
- **Ship counts**: NPCs use a single "Count" input instead of per-ship-type inputs, since each NPC type corresponds to a single ship type (Ancient = Interceptor, Guardian = Cruiser, GCDS = Dreadnought)
- **Blueprints**: NPC blueprints are fixed and pre-configured (from `npcBlueprints.ts`). They do not appear in the Blueprints section and cannot be edited.
- **Turn of Entry**: Same as factions
- **Controls Sector**: NPCs cannot control the sector (checkbox hidden or disabled)

### Data Model Changes

Unify `FactionDeployment` and `NpcDeployment` into a single `CombatantDeployment` type:

```typescript
interface CombatantDeployment {
  id: string;                          // unique ID for this deployment
  type: 'faction' | 'npc';            // determines UI variant

  // Faction-specific
  factionId?: string;                  // references a Faction in localStorage
  ships?: { type: ShipType; count: number }[];
  controlsSector?: boolean;

  // NPC-specific
  npcType?: NpcType;                   // 'ancient' | 'guardian' | 'gcds'
  npcVariant?: 'normal' | 'advanced';
  count?: number;                      // number of this NPC ship

  // Shared
  turnOfEntry: number;
}
```

Alternatively, keep the existing types internally but present them in a unified list in the UI. The simpler approach is to keep `FactionDeployment[]` and `NpcDeployment[]` as separate arrays in state but render them interleaved in a single list, with the `⊕` button appending to the appropriate array based on the user's selection.

### The ⊕ Button

- **Appearance**: A circular or rounded button with a `+` icon, centered below the last combatant card.
- **Size**: Large enough to be an easy tap target on mobile (minimum 44×44px).
- **Style**: Subtle — outlined or lightly filled, not competing with the combatant cards. Uses the app's secondary/muted color.

### Files Affected

- `src/components/BattleSetup.tsx` — Merge faction and NPC sections into one list; replace two "Add" buttons with single ⊕
- `src/components/FactionPanel.tsx` — May need minor adjustments or a wrapper to handle NPC variant
- `src/pages/BattlePage.tsx` — Update state management to support unified list

---

## 3. Win Probability: Pie Chart, No Draw

### Current State

- Win Probability is displayed as horizontal bars (one per faction + one for "Draw")
- Draw is calculated as `totalRuns - totalWins` (mutual destruction)
- D3 renders horizontal bar chart with labels and percentage text

### New Design: No Draw Concept

A battle never ends in a draw. Remove the draw concept entirely from the Results UI:

- **Do not display a "Draw" entry** in the Win Probability chart
- **Do not display a "Draw" row** in the Per-Faction Statistics table
- If the engine still produces draw results internally (mutual destruction), they are excluded from the win probability calculation. Win percentages are computed only over runs that had a winner:
  ```
  winPct(faction) = faction.wins / totalWins
  ```
  where `totalWins = sum of all faction wins` (excluding draws).
- Alternatively, if draw runs are rare/impossible per game rules, the engine can be updated to always produce a winner. This is an engine-level decision outside the scope of this UI spec.
- The total run count in the header should still reflect all runs (including any excluded draws), but the chart and table only show factions.

### New Design: Pie Chart

Replace the horizontal bar chart with a pie chart (or donut chart):

```
┌──────────────────────────┐
│  Win Probability         │
│                          │
│       ┌─────────┐        │
│      ╱ ·····.    ╲       │
│     │  65.3%  ·   │      │
│     │  Fleet   ·  │      │
│      ╲ ·····  ╱·  │      │
│       └──·───┘ ·  │      │
│          ·34.7%·   │      │
│          ·Enemy·         │
│                          │
│  ● Fleet   65.3%         │
│  ● Enemy   34.7%         │
│                          │
└──────────────────────────┘
```

#### Pie Chart Specs

- **Type**: Pie chart (full circle, not donut). Donut is also acceptable if it looks better on mobile.
- **Segments**: One per faction, sized by win percentage (excluding draws).
- **Colors**: Use the existing `PALETTE` array from `ResultsChart.tsx`, assigned by faction order.
- **Labels**:
  - On larger screens: percentage labels can appear inside or next to segments.
  - On mobile: a legend below the chart showing faction name + color swatch + percentage.
- **Legend**: Always visible below the chart. Each entry: colored circle/square + faction name + win percentage.
- **Interaction**: Tapping/hovering a segment highlights it and shows a tooltip with exact win count and percentage.
- **D3 Implementation**: Use `d3.pie()` and `d3.arc()` to generate the chart. The SVG should be responsive and centered in its container.
- **Responsive sizing**: The pie chart should scale to fit the container width. On phone screens (~375px), the chart diameter should be approximately 200–250px. On wider screens, cap at ~350px diameter.
- **Transition**: When results load or update, animate the pie segments growing from 0 to their target angle (D3 transition on `startAngle`/`endAngle`).

### Files Affected

- `src/components/ResultsChart.tsx` — Replace bar chart with pie chart; remove draw entry from data
- `src/pages/ResultsPage.tsx` — Remove draw row from statistics table

---

## 4. Simulation Log: Blank Die Face for Misses

### Current State

In the `DieChip` component within `SimulationLog.tsx`, a missed die roll (value `'blank'`) is rendered as `ø` (Unicode `\u00D8`):

```typescript
const label = value === 'star' ? '\u2605' : value === 'blank' ? '\u00D8' : String(value);
```

### New Design

When a die shows `'blank'` (a miss/loss), render the die chip with an empty face — no text content. The chip should still be visible as a colored rectangle (using the die's color from `DIE_BG`), but with no character inside.

```
Before:  [★] [5] [ø] [3] [ø]
After:   [★] [5] [ ] [3] [ ]
```

#### Implementation

Change the label for `'blank'` from `'\u00D8'` to an empty string or a non-breaking space (`'\u00A0'`) to maintain consistent chip sizing:

```typescript
const label = value === 'star' ? '\u2605' : value === 'blank' ? '' : String(value);
```

- The chip should maintain the same dimensions as a chip with a character. Use `min-width` to ensure the blank chip doesn't collapse:
  ```css
  min-width: 1.2em;  /* or equivalent Tailwind: min-w-[1.2em] */
  ```
- The blank chip still uses the die's background color, so it appears as a solid colored square/rectangle — visually communicating "this die was rolled but missed."

### Files Affected

- `src/components/SimulationLog.tsx` — Update `DieChip` component label and add min-width

---

## Summary of All Changes

| Area | Change | Key Detail |
|------|--------|------------|
| Layout | Single scrolling page | Blueprints → Battle → Results, remove router |
| Battle Setup | Unified combatant list | No faction/NPC separation, single ⊕ button below cards |
| Win Probability | Pie chart | Replace horizontal bars with D3 pie chart |
| Win Probability | Remove draw | No draw entry in chart or stats table |
| Simulation Log | Blank die face | Empty chip instead of ø for misses |

---

## Migration Notes

- **State management**: With a single page, `sessionStorage` for cross-page data transfer is no longer needed. All state lives in React state or `localStorage`.
- **Web Worker**: Still used for simulation. The Results section subscribes to worker messages and renders progressively.
- **Existing tests**: Engine tests are unaffected. UI changes are cosmetic and structural.
- **Backwards compatibility**: `localStorage` schema for factions does not change. Users' saved factions persist across this update.
