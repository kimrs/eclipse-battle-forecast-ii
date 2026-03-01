# Results UI — Eclipse Combat Forecast II

## File: `src/pages/ResultsPage.tsx`

## Purpose

Display the results of Monte Carlo combat simulations. Shows win probabilities, per-faction statistics, and optional detailed logs of individual simulation runs.

---

## Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Eclipse Combat Forecast II     [Blueprints]   [Battle]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Simulation Results (1000 runs)          [← Back]       │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │              Win Probability                        ││
│  │                                                     ││
│  │  ██████████████████████████░░░░░░░░░░  65.3%  Fleet ││
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░██████████░  31.2%  Enemy ││
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██   3.5%  Draw  ││
│  │                                                     ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │              Per-Faction Statistics                  ││
│  │                                                     ││
│  │  Faction    | Wins | Avg Survivors        | Avg Dmg ││
│  │  ───────────┼──────┼──────────────────────┼─────────││
│  │  My Fleet   | 653  | 1.2 Int, 0.8 Cru     | 4.7    ││
│  │  Enemy      | 312  | 0.5 Int, 0.3 Drd     | 3.2    ││
│  │  Draw       |  35  |                      |        ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Simulation Log                    [Expand All]     ││
│  │                                                     ││
│  │  ▶ Run #1: My Fleet wins (2 Int surviving)          ││
│  │  ▶ Run #2: Enemy wins (1 Drd surviving)             ││
│  │  ▶ Run #3: My Fleet wins (1 Cru surviving)          ││
│  │  ...                                                ││
│  │  [Show More]                                        ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  [Re-run Simulation]  [Modify Setup]                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### `ResultsPage.tsx` (page)

Responsibilities:
- Receive battle setup data from BattlePage (via React context/state)
- Run the simulation on mount (or trigger manually)
- Show a loading/progress indicator during simulation
- Display results using child components
- "Re-run" button reruns with same config (new random pools)
- "Modify Setup" navigates back to BattlePage

### Running the Simulation

- Call `runSimulations(setup, factions, config)` from `combatEngine.ts`
- Consider running in a **Web Worker** for large run counts (>500) to avoid UI freeze
- Show progress bar: `Running simulation {current}/{total}...`
- If Web Worker is too complex for initial implementation, run synchronously with periodic UI updates via `requestAnimationFrame` or chunked execution

### `ResultsChart.tsx` (component)

Props:
```typescript
interface ResultsChartProps {
  results: SimulationResults;
  factions: Faction[];
}
```

Uses **D3.js** to render:

#### Win Rate Bar Chart
- Horizontal stacked bar or grouped bars
- One bar per faction + "Draw" category
- Color-coded per faction
- Percentage labels on each bar
- Tooltip on hover: exact count and percentage

#### Alternative: Pie/Donut Chart
- Segments sized by win count
- Legend with faction names and percentages
- Consider making chart type toggleable (bar vs pie)

#### D3 Integration with React
- Use `useRef` for the SVG container
- Use `useEffect` to run D3 bindings when results change
- Clean up D3 selections on unmount
- Responsive: listen to container resize, redraw chart

### `SimulationLog.tsx` (component)

Props:
```typescript
interface SimulationLogProps {
  runs: SimulationRunResult[];
  factions: Faction[];
}
```

Features:
- Shows first 20 runs by default, with [Show More] to load more (paginated or virtual scroll)
- Each run is a collapsible row:
  - **Collapsed**: "Run #N: {winner} wins ({survivors summary})" or "Run #N: Draw"
  - **Expanded**: Battle pair details, dice rolls per round (if logged), ships destroyed per round
- [Expand All] / [Collapse All] toggle

---

## Data Flow

```
BattlePage → (setup data via context) → ResultsPage
                                            │
                                            ▼
                                     runSimulations()
                                            │
                                            ▼
                                    SimulationResults
                                     /      |       \
                          ResultsChart  StatsTable  SimulationLog
```

---

## Statistics Table

Display per-faction aggregated stats:

| Column | Description |
|--------|-------------|
| Faction | Faction name |
| Wins | Number of simulation runs won |
| Win % | Percentage of total runs |
| Avg Survivors | Average count of each ship type surviving (when this faction wins) |
| Avg Damage Dealt | Average total damage dealt per run |

---

## Edge Cases

- **No factions win** (mutual destruction): counted as "Draw"
- **Only 1 faction**: simulation still runs (fighting NPCs only)
- **0 simulations**: show empty state with message
- **Very large run counts**: show progress, consider chunking

---

## Styling Notes

- Charts: clean, modern look with smooth transitions
- Use faction colors consistently (assign colors from a palette based on faction order)
- Stats table: zebra-striped rows, sortable columns (click header)
- Simulation log: monospace font for detailed logs, subtle background for expanded rows
- Loading state: skeleton or spinner with progress text
- Responsive: chart resizes with container, table scrolls horizontally on narrow screens

---

## Future Enhancements (not in scope for v1)

- Export results as CSV
- Shareable result URLs
- Confidence intervals on win percentages
- Ship survival distribution histograms
- Animation of a sample battle
