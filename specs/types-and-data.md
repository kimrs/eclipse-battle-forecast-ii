# Types and Data — Eclipse Combat Forecast II

## File: `src/types/game.ts`

All core TypeScript types for the application.

### Dice Types

```typescript
type DieValue = number | 'star' | 'blank';

interface DieFace {
  value: DieValue;       // 'star' = always hit, 'blank' = always miss, number = compare vs threshold
  damage: number;        // damage dealt to target on hit
  selfDamage?: number;   // damage dealt to own ship (Rift Cannon backfire)
}

type DieColor = 'yellow' | 'orange' | 'blue' | 'red' | 'pink';

interface DieDefinition {
  color: DieColor;
  faces: [DieFace, DieFace, DieFace, DieFace, DieFace, DieFace]; // exactly 6 faces
  ignoresShields?: boolean;    // Rift Cannon: bypasses target shields
  ignoresComputers?: boolean;  // Rift Cannon: bypasses attacker computers
}
```

### Ship Part Types

```typescript
interface DieSymbol {
  color: DieColor;
  count: number; // number of dice of this color
}

interface ShipPart {
  id: string;
  name: string;
  cannons: DieSymbol[];    // dice rolled during engagement rounds
  missiles: DieSymbol[];   // dice rolled during missile phase (once)
  computers: number;       // added to die rolls
  shields: number;         // subtracted from opponent die rolls targeting this ship
  hull: number;            // damage absorption
  initiative: number;      // initiative contribution
  energyProduction: number; // positive = produces energy
  energyConsumption: number; // positive = consumes energy
  isAntimatter?: boolean;  // Antimatter Cannon/Splitter: damage can be split freely
  isRiftWeapon?: boolean;  // Rift Cannon/Conductor: ship can receive backfire damage
  requiresTech?: string;   // tech name required to use this part
}
```

### Blueprint Types

```typescript
type ShipType = 'interceptor' | 'cruiser' | 'dreadnought' | 'starbase';

interface Blueprint {
  shipType: ShipType;
  initiativeBonus: number; // printed on the blueprint tile
  slots: number;           // max number of ship part slots
  parts: ShipPart[];       // currently equipped parts
}

// Computed stats (pure functions, not stored)
function computeBlueprintStats(blueprint: Blueprint): {
  cannons: DieSymbol[];     // aggregated across all parts
  missiles: DieSymbol[];    // aggregated across all parts
  computers: number;        // sum
  shields: number;          // sum
  hull: number;             // sum
  initiative: number;       // initiativeBonus + sum of part initiatives
  energyBalance: number;    // total production - total consumption
}
```

### Faction Types

```typescript
interface Faction {
  id: string;
  name: string;
  blueprints: Record<ShipType, Blueprint>;
}
```

### Battle Setup Types

```typescript
type NpcType = 'ancient' | 'guardian' | 'gcds';

interface FactionDeployment {
  factionId: string;
  ships: { type: ShipType; count: number }[];
  turnOfEntry: number;       // lower = entered earlier
  controlsSector: boolean;   // true = this faction is the sector Defender
}

interface NpcDeployment {
  type: NpcType;
  blueprint: Blueprint;      // uses NPC blueprint tile
  count: number;             // number of NPC ships
}

interface SectorSetup {
  factions: FactionDeployment[];
  npcs: NpcDeployment[];
}

interface SimulationConfig {
  runs: number;       // default 100
  dicePool: number;   // default 600 — must be divisible by 6
}
```

### Simulation Result Types

```typescript
interface ShipSurvival {
  type: ShipType;
  count: number;
}

interface FactionResult {
  factionId: string;
  wins: number;
  avgSurvivors: Record<ShipType, number>;
  avgDamageDealt: number;
}

interface SimulationRunResult {
  winnerId: string | null;  // null = mutual destruction
  survivors: { factionId: string; ships: ShipSurvival[] }[];
}

interface SimulationResults {
  config: SimulationConfig;
  runs: SimulationRunResult[];
  summary: FactionResult[];
}
```

### Battle Runtime Types (internal to engine)

```typescript
interface BattleShip {
  id: string;              // unique per ship instance
  factionId: string;
  blueprint: Blueprint;
  currentHull: number;     // remaining HP, starts at totalHull
  hasFiredMissiles: boolean;
  hasRiftWeapon: boolean;  // true if any part has isRiftWeapon — eligible for backfire
}
```

---

## File: `src/data/dice.ts`

Die face definitions for each color.

All standard dice (yellow, orange, blue, red) share the same face *values* but differ in damage per hit. The "star" face always hits for the die's damage value. Numbered faces use the `value + computers - shields >= 6` check.

```typescript
const DICE: Record<DieColor, DieDefinition> = {
  yellow: {
    color: 'yellow',
    faces: [
      { value: 'star', damage: 1 },  // Ion Cannon hit = 1 damage
      { value: 5, damage: 1 },
      { value: 4, damage: 1 },
      { value: 3, damage: 1 },
      { value: 2, damage: 1 },
      { value: 'blank', damage: 0 }, // miss
    ]
  },
  orange: {
    color: 'orange',
    faces: [
      { value: 'star', damage: 2 },  // Plasma Cannon hit = 2 damage
      { value: 5, damage: 2 },
      { value: 4, damage: 2 },
      { value: 3, damage: 2 },
      { value: 2, damage: 2 },
      { value: 'blank', damage: 0 },
    ]
  },
  blue: {
    color: 'blue',
    faces: [
      { value: 'star', damage: 3 },  // Soliton Cannon hit = 3 damage
      { value: 5, damage: 3 },
      { value: 4, damage: 3 },
      { value: 3, damage: 3 },
      { value: 2, damage: 3 },
      { value: 'blank', damage: 0 },
    ]
  },
  red: {
    color: 'red',
    faces: [
      { value: 'star', damage: 4 },  // Antimatter Cannon hit = 4 damage
      { value: 5, damage: 4 },
      { value: 4, damage: 4 },
      { value: 3, damage: 4 },
      { value: 2, damage: 4 },
      { value: 'blank', damage: 0 },
    ]
  },
  pink: {
    color: 'pink',
    ignoresShields: true,     // Rift Cannon bypasses all shields
    ignoresComputers: true,   // Rift Cannon bypasses all computers
    faces: [
      { value: 'star', damage: 1, selfDamage: 0 },  // 1 damage to target
      { value: 'star', damage: 2, selfDamage: 0 },  // 2 damage to target
      { value: 'star', damage: 3, selfDamage: 1 },  // 3 damage to target + 1 backfire
      { value: 'star', damage: 0, selfDamage: 1 },  // backfire only
      { value: 'blank', damage: 0, selfDamage: 0 }, // miss
      { value: 'blank', damage: 0, selfDamage: 0 }, // miss (2nd blank — TBC)
    ]
  },
};
```

> **Note on Rift Cannon die**: All non-blank Rift faces use `'star'` as the value because Rift Cannon ignores computers and shields — hits are determined purely by the face (hit or blank), not by a numeric threshold. The 6th face is assumed to be a second blank/miss. **Verify against physical dice — the 6th face distribution may differ.**

Each die has exactly 6 faces. Export as `DICE` constant.

---

## File: `src/data/shipParts.ts`

All available ship parts. Each entry is a `ShipPart` object.

### Categories of Parts

**Weapons (Cannons)**
- Ion Cannon — 1 yellow cannon die
- Plasma Cannon — 1 orange cannon die
- Soliton Cannon — 1 blue cannon die
- Antimatter Cannon — 1 red cannon die; `isAntimatter: true`
- Rift Cannon — 1 pink cannon die; `isRiftWeapon: true`; Rare Tech; energy: -2

**Weapons (Missiles)**
- Ion Missile — 1 yellow missile die (Terran starting missile uses yellow)
- Plasma Missile — 1 orange missile die
- Antimatter Missile — 1 red missile die

**Defense**
- Hull — +1 hull
- Improved Hull — +2 hull
- Electron Computer — +1 computer
- Positron Computer — +2 computer
- Gluon Computer — +3 computer
- Gauss Shield — +1 shield
- Phase Shield — +2 shield

**Propulsion**
- Nuclear Drive — +1 initiative, +1 movement (energy: -1)
- Fusion Drive — +2 initiative, +2 movement (energy: -2)
- Tachyon Drive — +3 initiative, +3 movement (energy: -3)

**Energy**
- Nuclear Source — +3 energy production
- Fusion Source — +6 energy production
- Tachyon Source — +9 energy production

**Special**
- Antimatter Splitter — enables splitting antimatter damage across targets
- Rift Conductor — +1 hull, 1 pink cannon die, `isRiftWeapon: true`; Discovery tile; energy: -1

> **Note**: Exact stats (energy costs, etc.) should be verified against the rulebook. The data file should be easy to edit.

Export as `SHIP_PARTS: ShipPart[]` array.

---

## File: `src/data/species.ts`

Default blueprint presets for each species. Each species defines default blueprints for all 4 ship types.

### Species List

1. **Terran** (base game default)
2. **Eridani Empire**
3. **Hydran Progress**
4. **Planta**
5. **Descendants of Draco**
6. **Mechanema**
7. **Orion Hegemony**

Each species entry:
```typescript
interface SpeciesPreset {
  id: string;
  name: string;
  blueprints: Record<ShipType, {
    initiativeBonus: number;
    slots: number;
    defaultParts: string[]; // ShipPart IDs
  }>;
}
```

Export as `SPECIES_PRESETS: SpeciesPreset[]`.

> **Note**: Default parts for each species' starting blueprints should match the player boards from the rulebook/game components. Exact values to be filled in during implementation.

---

## File: `src/data/npcBlueprints.ts`

NPC opponent blueprint definitions.

### Ancient Ship
- Hull: 1 (normal) / 2 (advanced)
- Weapons: 1 yellow cannon, 1 orange cannon (normal) / additional red cannon (advanced)
- Computer: +1 (normal) / +1 (advanced)
- Initiative: 0
- Shield: 0

### Guardian Ship
- Hull: 2 (normal) / 3 (advanced)
- Weapons: 1 yellow cannon, 1 orange cannon (normal) / additional (advanced)
- Computer: +1 (normal) / +2 (advanced)
- Initiative: 0
- Shield: 0

### GCDS
- Hull: 7
- Weapons: 1 yellow, 1 orange, 1 blue, 1 red cannon
- Computer: +1
- Initiative: 0
- Shield: 0

> **Note**: Exact NPC stats should be verified against Blueprint Tiles in the game. Provide both "normal" and "advanced" variants where applicable.

Export as:
```typescript
const NPC_BLUEPRINTS: Record<NpcType, { normal: Blueprint; advanced?: Blueprint }>;
```
