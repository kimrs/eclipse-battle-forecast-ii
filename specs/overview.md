# Overview — Eclipse Combat Forecast II

## Purpose

A static web application that simulates combat in **Eclipse: Second Dawn for the Galaxy**. Users configure ship blueprints per faction, set up a battle sector, and run Monte Carlo simulations to determine win probabilities.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18+ with TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Visualization | D3.js |
| Storage | Browser localStorage (no backend/database) |
| Deployment | Static files (GitHub Pages, Netlify, etc.) |

## Architecture

### Three-page SPA

1. **Blueprint Configuration** — Define factions and configure ship blueprints
2. **Battle Setup** — Configure the battle sector with factions, ships, and NPCs
3. **Results** — Run simulations and display win probabilities with charts

### Data Flow

```
Blueprint Config → localStorage → Battle Setup → Simulation Engine → Results
```

- All state lives in React state + localStorage
- No server calls; simulation runs entirely client-side
- Engine code is pure TypeScript with no UI dependencies (testable independently)

### Key Design Principles

- **Separation of concerns**: Engine logic (`engine/`) has zero React/DOM dependencies
- **Data-driven**: Ship parts, dice, species presets, and NPC blueprints are declarative data files (`data/`)
- **Deterministic testing**: Dice engine supports seeded/pre-generated pools for reproducible tests
- **Uniform dice**: Uses pre-shuffled pools instead of `Math.random()` to guarantee statistical uniformity

## File Structure

```
src/
  main.tsx                    — App entry point
  App.tsx                     — Router setup (3 pages)
  types/
    game.ts                   — Core type definitions
  data/
    dice.ts                   — Die face definitions (configurable)
    species.ts                — Default species blueprint presets
    shipParts.ts              — All ship part definitions
    npcBlueprints.ts          — Ancient/Guardian/GCDS blueprints
  engine/
    diceEngine.ts             — Uniform dice pool generator
    combatEngine.ts           — Battle simulation logic
    hitAssignment.ts          — Optimal hit assignment algorithm
    initiativeResolver.ts     — Initiative ordering logic
  components/
    BlueprintEditor.tsx       — Ship blueprint configuration UI
    ShipPartSelector.tsx      — Ship part picker
    BattleSetup.tsx           — Sector battle configuration
    FactionPanel.tsx          — Faction config within battle setup
    ResultsChart.tsx          — Win rate visualization (D3)
    SimulationLog.tsx         — Detailed simulation run log
  pages/
    BlueprintPage.tsx         — Blueprint configuration page
    BattlePage.tsx            — Battle setup page
    ResultsPage.tsx           — Results display page
  hooks/
    useLocalStorage.ts        — localStorage persistence hook
  utils/
    stats.ts                  — Aggregation utilities
package.json
vite.config.ts
tsconfig.json
tailwind.config.js
index.html
```

## Dependencies

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "d3": "^7"
  },
  "devDependencies": {
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/d3": "^7",
    "typescript": "^5",
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10",
    "vitest": "^1"
  }
}
```

## Verification Plan

1. **Unit tests** (Vitest) for dice engine — verify uniform distribution
2. **Unit tests** for combat engine — deterministic dice, known matchups
3. **Unit tests** for hit assignment — verify optimal kill maximization
4. **Manual testing** — replicate rulebook example (Johanna vs Vernor, pages 22-23)
5. **UI testing** — verify blueprint stat computation and battle setup validation

## Open Items

- **Exact die faces** for each color (yellow, orange, blue, red) — to be provided by user
