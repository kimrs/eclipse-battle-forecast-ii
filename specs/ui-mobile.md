# Mobile UI Improvement Spec

Review of mobile usability issues and proposed fixes for Eclipse Combat Forecast II.
This app is phone-first; every interaction should be comfortable one-handed on a 375px screen.

---

## 1. FactionPanel: Replace Number Inputs with Stepper Buttons

**File:** `src/components/FactionPanel.tsx:64-78`

**Problem:** Ship counts are entered via `<input type="number">` in a 2x2 grid. On mobile,
the native number spinner arrows are tiny (roughly 10x10px), forcing users to tap into
the field and use the keyboard. For values that only range 0-8, this is unnecessary
friction.

**Fix:** Replace each number input with a row of: label, a `−` button, the current count
as plain text, and a `+` button. The buttons should be minimum 44x44px tap targets
(WCAG 2.5.8). Disable `−` at 0 and `+` at the ship type max.

Example layout per ship type:
```
Interceptors    [ − ]  3  [ + ]
Cruisers        [ − ]  1  [ + ]
Dreadnoughts    [ − ]  0  [ + ]
Starbases       [ − ]  2  [ + ]
```

Stack all four vertically (single column) instead of the current 2x2 grid, which crowds
the labels on narrow screens. The `w-28` fixed label width (line 67) currently truncates
"Dreadnoughts" on small screens.

---

## 2. NpcPanel: Same Stepper Treatment for Count

**File:** `src/components/NpcPanel.tsx:30-50`

**Problem:** Same `<input type="number">` issue for NPC count and turn of entry.

**Fix:** Replace the NPC count input with stepper buttons (same pattern as #1). The count
range is small (1-4 typically). Turn of Entry is also low-range (1-3) and benefits from
the same treatment.

---

## 3. Turn of Entry: Stepper Everywhere

**Files:** `FactionPanel.tsx:82-90`, `NpcPanel.tsx:42-49`

**Problem:** Turn of entry uses the same problematic number input. Typical values are 1-3.

**Fix:** Use the same `−`/`+` stepper as ship counts. Keep min at 1. Same 44px tap targets.

---

## 4. Faction Tabs Overflow on Mobile

**File:** `src/pages/BlueprintPage.tsx:153-168`

**Problem:** With 7 default species, the faction tab buttons (`flex gap-2 flex-wrap`) wrap
onto 2-3 rows on a phone screen, consuming excessive vertical space and making it hard to
identify the active tab. Each tab shows the full species name (e.g., "Hydran Progress")
which eats horizontal space.

**Fix:** Replace the wrapping `flex` layout with a horizontally scrollable row:
- Use `overflow-x-auto` with `flex-nowrap` and hide the scrollbar (`scrollbar-hide`)
- Add scroll snap (`snap-x snap-mandatory` on container, `snap-start` on items)
- Visually fade the edges to hint at scrollability (gradient mask or shadow)

Alternative (if more than ~5 factions): replace tabs entirely with a `<select>` dropdown
on small screens, keeping tabs on `sm:` and above.

---

## 5. Ship Type Tabs Cramped

**File:** `src/pages/BlueprintPage.tsx:285-299`

**Problem:** Four ship type tabs ("Interceptor", "Cruiser", "Dreadnought", "Starbase") in a
`flex gap-1` row. "Dreadnought" alone is 11 characters. On a 375px screen with padding,
these wrap or the text gets cut off. The current `px-3 py-2 text-sm` styling provides
minimal tap area.

**Fix:** Abbreviate labels on mobile. Use short labels ("Int", "Cru", "Drd", "SB") below
`sm:` and full labels at `sm:` and above. Alternatively use icons alongside short labels.
Ensure each tab is at least 44px tall for tap targets.

---

## 6. BlueprintEditor: Larger Tap Targets for Slots

**File:** `src/components/BlueprintEditor.tsx:70-103`

**Problem:** Part slot cards are `min-h-[80px]` in a 2-col grid, which is fine. But the
`[Add]` and `[Remove]` links are `text-xs` plain text with no padding around the tap
area. On mobile these are roughly 20x12px — well below the 44x44px minimum.

**Fix:**
- Make `[Add]` a full-width button within the slot card with at least `py-2` padding
- Make `[Remove]` a small icon button (trash/X) in the top-right corner of filled slots,
  with a `min-w-[44px] min-h-[44px]` tap area
- Consider making empty slots themselves tappable (the entire card opens the selector)

---

## 7. ShipPartSelector: Full-Screen Modal on Mobile

**File:** `src/components/ShipPartSelector.tsx:86-131`

**Problem:** The modal uses `max-w-lg max-h-[80vh]` which is reasonable, but on a phone:
- The search input `autoFocus` triggers the keyboard, pushing the modal up
- Part rows have small implicit tap targets (just text with hover styles)
- The X close button (line 93) is small

**Fix:**
- On mobile (`max-sm:`), make the modal full-screen: `inset-0` with no max-width/height
  constraints, so it behaves like a page push rather than a centered dialog
- Add explicit `py-3` padding to each part button for comfortable tapping
- Make the close button larger (44x44px) or add a visible "Cancel" button at the bottom
- Add a sticky header so the search box stays visible while scrolling through parts

---

## 8. All-Page Scroll Layout: Consider Tab Navigation

**File:** `src/App.tsx:33-58`

**Problem:** The app renders all three sections (Blueprints, Battle, Results) in a single
scrollable page. On mobile, users must scroll past the entire Blueprint editor (which can
be very long with 7 factions) to reach the Battle section, and past Battle to see Results.
The header nav uses hash-link smooth scrolling, but there's no visual indication of which
section you're in.

**Fix:** On mobile, switch to a tabbed layout where only one section is visible at a time.
Keep the three header links but style them as a bottom tab bar or a segmented control in
the header. Use state (not scroll position) to control which section renders. This
eliminates long scrolling and gives each section the full viewport height.

On `sm:` and above, the current scroll layout can be preserved if preferred.

---

## 9. Pie Chart: Hover Doesn't Work on Touch

**File:** `src/components/ResultsChart.tsx:98-114`

**Problem:** The D3 pie chart uses `mouseenter`/`mousemove`/`mouseleave` for tooltips.
These events don't fire on touch devices. Users on phones see no tooltip and can't
identify which segment is which (they must rely on the legend below, but with similar
colors that can be ambiguous).

**Fix:**
- Add `touchstart`/`touchend` handlers that toggle the tooltip on tap
- Or: render percentage labels directly on each pie segment (if large enough) so the
  chart is self-describing without any interaction
- Or: replace the pie chart with a horizontal stacked bar or simple bar chart that
  includes inline labels — these are more readable on narrow screens anyway

---

## 10. Results Table: Card Layout on Mobile

**File:** `src/pages/ResultsPage.tsx:218-268`

**Problem:** The 5-column table (Faction, Wins, Win%, Avg Survivors, Avg Dmg) overflows
on mobile, requiring horizontal scrolling (`overflow-x-auto`). The "Avg Dmg" column
always shows 0.0 (see cleanup.md #2.3). Column headers use `text-xs uppercase` which is
hard to read. Sortable headers are small tap targets.

**Fix:**
- On mobile, render each faction as a card instead of a table row:
  ```
  ┌─────────────────────────┐
  │ Terran Federation       │
  │ Wins: 423 (42.3%)       │
  │ Survivors: 1.2 Int, ... │
  └─────────────────────────┘
  ```
- Remove or hide the Avg Dmg column (it's always 0 — see cleanup.md)
- Keep the table layout for `sm:` and above

---

## 11. Simulation Log: Compact Mobile View

**File:** `src/components/SimulationLog.tsx:48-77`, `95-161`

**Problem:** Each event row in the expanded log (`EventRow`) shows phase label, faction
name, ship count/type, damage, kills, and individual dice chips — all in a flex-wrap
layout. On a 375px screen this wraps into 3-4 lines per event, making logs very long and
hard to scan.

**Fix:**
- Collapse the event into two tight lines max:
  Line 1: `Missile | Terran 3x interceptor → 2 dmg, killed 1x cruiser`
  Line 2: dice chips (already on their own line)
- Consider hiding dice details behind a "show dice" toggle per event to reduce noise
- Make the "Show More" pagination button full-width and taller for easy tapping

---

## 12. Simulation Settings: Preset Buttons

**File:** `src/pages/BattlePage.tsx:127-162`

**Problem:** "Number of Simulations" and "Dice Pool Size" are free-form number inputs.
Most users will use standard values (100, 500, 1000 for runs; 600, 1200 for pool). Typing
exact numbers on a phone keyboard is tedious, and the divisible-by-6 constraint on dice
pool is confusing.

**Fix:**
- Add preset buttons below each input: `[100] [500] [1000]` for runs,
  `[600] [1200]` for dice pool
- Keep the input for custom values, but the presets should cover 90% of use cases
- For dice pool, use a stepper that increments by 6 instead of a free-form input

---

## 13. Add Combatant Button and Dropdown

**File:** `src/components/BattleSetup.tsx:116-158`

**Problem:** The `⊕` button is `w-11 h-11` (44px), which meets minimum tap size. However,
the dropdown items (`px-4 py-2 text-sm`) have tap targets of roughly 44x36px — the height
is borderline. The dropdown uses `min-w-[12rem]` which is narrow on mobile; with long
faction names it may overflow or truncate.

**Fix:**
- Increase dropdown item padding to `py-3` for comfortable 48px+ tap height
- Use `min-w-[16rem]` or `w-full` for the dropdown to avoid truncation
- Consider replacing the small ⊕ circle with a full-width "Add Combatant" bar/button,
  which is more discoverable on mobile

---

## 14. "Controls Sector" Checkbox Row Overflows

**File:** `src/components/FactionPanel.tsx:81-101`

**Problem:** Turn of Entry input and "Controls Sector (Defender)" checkbox are in a
single `flex items-center gap-4` row. On a 375px screen with card padding, this row is
~310px wide. "Turn of Entry:" label (90px) + input (64px) + gap (16px) + checkbox (16px)
+ "Controls Sector (Defender)" text (180px) = ~366px. This overflows, causing horizontal
scroll or text clipping inside the card.

**Fix:** Stack these vertically on mobile:
```
Turn of Entry:  [ − ] 1 [ + ]
☑ Controls Sector (Defender)
```
Use `flex-col` on mobile, `flex-row` on `sm:`. The checkbox label can be shortened to
"Defender" on mobile with a tooltip or parenthetical on larger screens.

---

## 15. Header: Sticky and More Prominent on Mobile

**File:** `src/App.tsx:35-44`

**Problem:** The header is not sticky — once users scroll down, they lose access to
section navigation. On a long single-page layout this means lots of scrolling to switch
sections. The nav links are plain text (`text-sm text-gray-300`) with no visual affordance
that they're navigation elements.

**Fix:**
- Make the header `sticky top-0 z-30` so navigation is always accessible
- If the tabbed layout (#8) is adopted, style the nav as a segmented control with a
  visible active indicator (underline, background fill, or pill shape)
- Ensure the header is compact: single row, no wasted vertical space

---

## 16. Action Buttons: Full-Width on Mobile

**Files:** `BattlePage.tsx:178-184`, `ResultsPage.tsx:280-287`

**Problem:** "Run Simulation" and "Re-run" buttons use fixed padding (`px-6 py-3` / `px-5
py-2.5`) and sit left-aligned. On mobile, a small button in the corner is easy to miss and
awkward to reach one-handed.

**Fix:** Make primary action buttons `w-full` on mobile (`w-full sm:w-auto`). This gives a
large, easy tap target and clearly signals the primary action. The "Re-run" button in
Results should be more prominent since it's a frequent action after reviewing results.

---

## 17. Blueprint Editor Stats Summary: Improve Readability

**File:** `src/components/BlueprintEditor.tsx:118-150`

**Problem:** The stats summary uses a 2-column grid (`grid-cols-2`) with label in column 1
and value in column 2. On mobile, the initiative row shows:
`Initiative: 3 (bonus: 2 + drives: 1)` which is long and wraps awkwardly in a narrow
column. The energy row uses colored text (green/red) which is good, but the check/cross
marks are redundant with the color.

**Fix:**
- Use a compact single-column list on mobile instead of the grid:
  `Cannons: 1xY 1xO` / `Shields: +1` / etc.
- Abbreviate the initiative breakdown or move it to a tooltip/expandable
- Consider using compact stat chips instead of a grid:
  `[⚔ 1Y 1O] [🛡 +1] [♥ 2] [⚡ 3] [⚙ +2]`

---

## Summary — Priority for Mobile

| Priority | Item | Impact |
|----------|------|--------|
| **HIGH** | #1 Ship count steppers | Core interaction, used every session |
| **HIGH** | #8 Tabbed layout | Eliminates the biggest mobile navigation pain |
| **HIGH** | #15 Sticky header | Navigation always accessible |
| **HIGH** | #4 Faction tab overflow | 7 factions wrapping is unusable |
| **MEDIUM** | #7 Full-screen part selector | Modal usability on small screens |
| **MEDIUM** | #9 Pie chart touch support | Chart is unreadable without tooltips |
| **MEDIUM** | #10 Results table cards | Table doesn't fit on mobile |
| **MEDIUM** | #14 Controls Sector overflow | Row overflows on narrow screens |
| **MEDIUM** | #16 Full-width action buttons | Ergonomics and discoverability |
| **MEDIUM** | #5 Ship type tab labels | Cramped on narrow screens |
| **MEDIUM** | #6 Slot tap targets | Current targets are too small |
| **LOW** | #2 NPC count stepper | Consistency with #1 |
| **LOW** | #3 Turn of Entry stepper | Consistency with #1 |
| **LOW** | #11 Compact sim log | Cosmetic, log is secondary feature |
| **LOW** | #12 Sim settings presets | Nice-to-have, typed input works |
| **LOW** | #13 Add combatant dropdown | Current size is borderline acceptable |
| **LOW** | #17 Stats summary readability | Cosmetic, works acceptably now |
