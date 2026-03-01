# Eclipse Combat Forecast II

A Monte Carlo combat simulator for the board game [Eclipse](https://boardgamegeek.com/boardgame/246900/eclipse-second-dawn-galaxy). Design ship blueprints, configure battle scenarios, and run thousands of simulations to forecast win probabilities and survival statistics.

## Features

- **Blueprint Designer** — Equip interceptors, cruisers, dreadnoughts, and starbases with weapons, shields, drives, and reactors. Load presets for 7 Eclipse species or build from scratch.
- **Battle Setup** — Deploy multiple factions and NPCs (Ancients, Guardians, GCDS), set turn order, and configure simulation parameters.
- **Combat Engine** — Faithful implementation of Eclipse combat rules: missile phases, engagement rounds, initiative ordering, shield thresholds, antimatter splitting, and Rift weapon backfire.
- **Monte Carlo Results** — Run 100–1,000+ simulations and view win rates, draw probabilities, and average survivors per ship type, visualized with D3.js charts.

## Tech Stack

React 18 | TypeScript | Vite | Tailwind CSS | D3.js | Vitest

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (default `http://localhost:5173`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run test suite |

## Project Structure

```
src/
  types/          # Core TypeScript interfaces
  data/           # Dice, ship parts, species presets, NPC blueprints
  engine/         # Combat simulation: dice pool, initiative, hit assignment, combat resolution
    __tests__/    # Unit and integration tests
  components/     # React components: blueprint editor, battle setup, results chart
  pages/          # Three-page SPA: Blueprints → Battle → Results
  hooks/          # useLocalStorage
  utils/          # Result aggregation and statistics
specs/            # Design specification documents
```

## How It Works

1. **Design** your fleet blueprints on the Blueprints page, choosing parts for each ship type.
2. **Configure** a battle on the Battle page — pick factions, set ship counts, add NPCs.
3. **Simulate** — the engine runs N independent battles using a fair dice pool (Fisher-Yates shuffle, uniform distribution). Each battle resolves missile fire, then alternating cannon rounds by initiative until one side is eliminated.
4. **Review** results — win percentages, average survivors, and detailed per-run logs.

## License

MIT
